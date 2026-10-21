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
  pool.query = async (sql, params = []) => {
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

  const token = jwt.sign({ id: 1, role: 'Community Organizer', school_id: 12 }, process.env.JWT_SECRET);
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
    ['', 'PUT', { name: 'Changed', provider: 'Test Provider' }],
    ['/end', 'PATCH'],
    ['/restore', 'PATCH'],
    ['', 'DELETE'],
    ['/clusters', 'POST', { scopes: [{ type: 'School', name: 'Assigned School' }] }],
    ['/clusters/complete', 'PATCH', { type: 'School', name: 'Other School', beneficiaries: 2 }],
    ['/clusters/1/complete', 'PATCH'],
    ['/monitoring', 'PATCH', { beneficiaryId: 'MTH-1', beneficiaryType: 'mother', date: '2026-10-17', monitored: true }],
  ];

  for (const [path, method, body] of attempts) {
    const response = await request(path, method, body);
    assert.equal(response.status, 403, `${method} ${path || '/'}`);
    assert.match((await response.json()).error, /assigned school/);
  }
  assert.equal(queries.length, attempts.length);
  assert.ok(queries.every(({ sql }) => /^\s*SELECT\b/i.test(sql)), 'denied requests must not mutate program data');
});

test('Superadmins are denied all Program API access', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let queryCount = 0;
  pool.query = async (sql, params = []) => {
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

  const token = jwt.sign({ id: 2, role: 'Super Admin' }, process.env.JWT_SECRET);
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
