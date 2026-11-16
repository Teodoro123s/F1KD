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
  let programScopes = [{ scope_type: 'School', scope_name: 'Other School', owned_by_school: 0 }];
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
      return [programScopes];
    }
    if (sql.includes('SELECT status, archived_at FROM programs WHERE id = ?')) return [[{ status: 'Active', archived_at: null }]];
    if (sql.startsWith('UPDATE programs SET name =')) return [{ affectedRows: 1 }];
    if (sql.includes('SELECT p.*') && sql.includes('FROM programs p LEFT JOIN users')) {
      return [[{ id: 123, name: 'Updated project', provider: 'Test Provider', beneficiary_type: 'Mother' }]];
    }
    if (sql.includes('SELECT pc.id, pc.scope_type AS type')) {
      return [[{ id: 1, type: 'School', name: 'Assigned School', scopeId: 12, beneficiaries: 1, received: 0 }]];
    }
    if (sql.includes('SELECT COUNT(DISTINCT CONCAT(LOWER(TRIM(ml.beneficiary_type))')) return [[{ received: 0 }]];
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 0 }];
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

  programScopes = [
    { scope_type: 'School', scope_name: 'Assigned School', scope_id: 12, owned_by_school: 1 },
    { scope_type: 'School', scope_name: 'Other School', scope_id: 23, owned_by_school: 0 },
  ];
  const mixedScopeEdit = await request('', 'PUT', {
    name: 'Updated project',
    provider: 'Test Provider',
  });
  assert.equal(mixedScopeEdit.status, 200);
  assert.equal((await mixedScopeEdit.json()).program.name, 'Updated project');

  const mixedScopeChange = await request('/clusters', 'POST', {
    scopes: [{ type: 'School', name: 'Another School', scopeId: 34 }],
  });
  assert.equal(mixedScopeChange.status, 403);
  assert.match((await mixedScopeChange.json()).error, /assigned school/);
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

test('program list returns authorized summary counts including archived projects for coordinators', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const testSessions = new Map([
    ['program-counts-coordinator-session', 'Community Organizer'],
    ['program-counts-admin-session', 'Admin'],
  ]);
  const countQueries = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      const role = testSessions.get(String(params[0]));
      return [role ? [{
        user_id: 4,
        role,
        status: 'Active',
        school_id: role === 'Community Organizer' ? 12 : null,
        group_id: null,
        consent_accepted_at: new Date(),
      }] : []];
    }
    if (sql.includes('SELECT p.* FROM programs p')) return [[]];
    if (sql.includes('COUNT(CASE WHEN p.archived_at IS NULL THEN 1 END)')) {
      countQueries.push({ sql, params });
      return [[Number(params[0]) === 1
        ? { total: 0, active: 0, ended: 0, archived: 2 }
        : { total: 1, active: 1, ended: 0, archived: 0 }]];
    }
    throw new Error(`Unexpected program count SQL: ${sql}`);
  };

  const app = express();
  app.use('/api/programs', verifyToken, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs`;
  const fetchCounts = async (sid) => {
    const token = jwt.sign({ id: 4, sid }, process.env.JWT_SECRET);
    const response = await fetch(baseUrl, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    return response.json();
  };

  const coordinatorResult = await fetchCounts('program-counts-coordinator-session');
  assert.deepEqual(coordinatorResult.counts, { total: 0, active: 0, ended: 0, archived: 2 });
  assert.deepEqual(countQueries[0].params, [1, 12, 12, 12]);
  assert.match(countQueries[0].sql, /scoped_cluster\.program_id = p\.id/);

  const adminResult = await fetchCounts('program-counts-admin-session');
  assert.deepEqual(adminResult.counts, { total: 1, active: 1, ended: 0, archived: 0 });
  assert.deepEqual(countQueries[1].params, [0]);
});

test('Community Coordinator monitoring reads are school-scoped and reject foreign same-name clusters', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      return [[{
        user_id: 3,
        role: 'Community Organizer',
        status: 'Active',
        school_id: 12,
        group_id: null,
        consent_accepted_at: new Date(),
      }]];
    }
    queries.push({ sql, params });
    if (sql.includes('SELECT p.id FROM programs p')) return [[{ id: 123 }]];
    if (sql.includes('SELECT status FROM programs WHERE id = ?')) return [[{ status: 'Active' }]];
    if (sql.includes('SELECT scope_name, scope_id FROM program_clusters')) {
      return [[{ scope_name: 'Shared Group', scope_id: 99 }]];
    }
    if (sql.includes('SELECT g.id FROM groups g') || sql.includes('SELECT g.id FROM `groups` g')) return [[]];
    if (sql.includes('FROM monitoring_logs ml')) return [[]];
    throw new Error(`Unexpected monitoring read SQL: ${sql}`);
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

  const token = jwt.sign({ id: 3, sid: 'program-monitoring-coordinator-session' }, process.env.JWT_SECRET);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs/123/monitoring`;
  const request = (path) => fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const statusResponse = await request('?date=2026-11-13');
  assert.equal(statusResponse.status, 200);
  const statusQuery = queries.find(({ sql }) => sql.includes('FROM monitoring_logs ml'));
  assert.ok(statusQuery);
  assert.match(statusQuery.sql, /scoped_mother\.community_id = \?/);
  assert.match(statusQuery.sql, /COALESCE\(scoped_child\.community_id, scoped_parent\.community_id\) = \?/);
  assert.deepEqual(statusQuery.params, ['123', '2026-11-13', 12, 12]);

  const clusterResponse = await request('/cluster-report/group/Shared%20Group');
  assert.equal(clusterResponse.status, 404);
  assert.equal(queries.filter(({ sql }) => sql.includes('FROM monitoring_logs ml')).length, 1);

  const beneficiaryResponse = await request('/report/child/100');
  assert.equal(beneficiaryResponse.status, 200);
  const monitoringQueries = queries.filter(({ sql }) => sql.includes('FROM monitoring_logs ml'));
  const beneficiaryQuery = monitoringQueries[monitoringQueries.length - 1];
  assert.match(beneficiaryQuery.sql, /m\.community_id = \? OR COALESCE\(c\.community_id, parent_m\.community_id\) = \?/);
  assert.deepEqual(beneficiaryQuery.params.slice(-2), [12, 12]);
});
