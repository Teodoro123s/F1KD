const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'program-scope-api-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};

mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational } = require('../middleware/authorize');
const programsRouter = require('../routes/programs');

test('coordinators cannot mutate programs owned by another school through the API', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  const testSessions = new Map();
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      const role = testSessions.get(String(params[0]));
      return [role ? [{
        user_id: 1,
        role,
        status: 'Active',
        school_id: role === 'Community Organizer' ? 12 : null,
        group_id: null,
        consent_accepted_at: new Date(),
      }] : []];
    }
    queries.push({ sql, params });
    if (sql.includes('FROM programs p') && sql.includes('LEFT JOIN program_clusters pc')) {
      return [[{ scope_type: 'School', scope_name: 'Other School', owned_by_school: 0 }]];
    }
    throw new Error(`Unexpected program API SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/programs', verifyToken, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const sid = 'program-scope-coordinator-session';
  testSessions.set(sid, 'Community Organizer');
  const token = jwt.sign({ id: 1, sid }, process.env.JWT_SECRET);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs/123`;
  const request = (path, method, body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const attempts = [
    ['', 'PUT', { name: 'Changed', provider: 'Test Provider' }, 403, /assigned school/],
    ['/end', 'PATCH', undefined, 403, /assigned school/],
    ['/restore', 'PATCH', undefined, 403, /assigned school/],
    ['/archive-impact', 'GET', undefined, 403, /assigned school/],
    ['/archive', 'POST', { reason: 'Out of scope' }, 403, /assigned school/],
    ['/archive/restore', 'POST', undefined, 403, /assigned school/],
    ['', 'DELETE', undefined, 405, /permanent deletion is disabled/i],
    ['/clusters', 'POST', { scopes: [{ type: 'School', name: 'Assigned School' }] }, 403, /assigned school/],
    ['/clusters/complete', 'PATCH', { type: 'School', name: 'Other School', beneficiaries: 2 }, 403, /assigned school/],
    ['/clusters/1/complete', 'PATCH', undefined, 403, /assigned school/],
    ['/monitoring', 'PATCH', { beneficiaryId: 'MTH-1', beneficiaryType: 'mother', date: '2026-10-17', monitored: true }, 403, /assigned school/],
  ];

  for (const [path, method, body, expectedStatus, expectedMessage] of attempts) {
    const response = await request(path, method, body);
    assert.equal(response.status, expectedStatus, `${method} ${path || '/'}`);
    assert.match((await response.json()).error, expectedMessage);
  }
  assert.equal(queries.length, attempts.length - 1);
  assert.ok(queries.every(({ sql }) => /^\s*SELECT\b/i.test(sql)), 'denied requests must not mutate program data');
});

test('Superadmins are denied all Program API access', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let queryCount = 0;
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      return [[{
        user_id: 2,
        role: 'Super Admin',
        status: 'Active',
        school_id: null,
        group_id: null,
        consent_accepted_at: new Date(),
      }]];
    }
    queryCount += 1;
    throw new Error(`Superadmin Program requests must not query the database: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/programs', verifyToken, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = jwt.sign({ id: 2, sid: 'program-scope-superadmin-session' }, process.env.JWT_SECRET);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs`;
  for (const [url, method] of [[baseUrl, 'GET'], [baseUrl, 'POST'], [`${baseUrl}/123`, 'GET']]) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify({ name: 'Blocked', provider: 'F1KD' }) } : {}),
    });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Superadmins do not have access/);
  }
  assert.equal(queryCount, 0);
});
