const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-organizer-scope-test-secret';

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
const communityRouter = require('../routes/community');
const mothersRouter = require('../routes/mothers');
const childrenRouter = require('../routes/children');

test('Community Organizers cannot read or mutate records outside their assigned school', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const queries = [];
  const testSessions = new Map();
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      const session = testSessions.get(String(params[0]));
      return [session ? [{
        user_id: session.id,
        role: session.role,
        status: 'Active',
        school_id: session.school_id,
        group_id: session.group_id ?? null,
        consent_accepted_at: new Date(),
      }] : []];
    }
    queries.push({ sql, params });
    if (sql.includes('FROM groups g') && sql.includes('AND g.community_id = ?')) {
      assert.deepEqual(params, [91, 12]);
      return [[]];
    }
    if (sql.includes('FROM groups WHERE id = ? AND community_id = ?')) return [[]];
    if (sql.includes('FROM batches WHERE id = ? AND community_id = ?')) return [[]];
    if (sql.includes('FROM batches WHERE id = ? AND archived_at IS NULL')) return [[{ id: 93 }]];
    if (sql.includes('FROM communities WHERE id = ? AND archived_at IS NULL')) return [[{ id: 12 }]];
    if (sql.includes('SELECT c.id FROM communities c') && sql.includes('JOIN groups g ON g.id = ?')) return [[]];
    if (sql.includes('FROM batches b') && sql.includes('WHERE b.id = ? AND b.community_id = ?')) return [[]];
    if (sql.includes('FROM batches WHERE (id = ? OR batch_code = ? OR name = ?) AND community_id = ?')) return [[]];
    if (sql.includes('FROM mothers WHERE (id = ? OR mother_code = ?) AND community_id = ?')) return [[]];
    throw new Error(`Unexpected test SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM groups WHERE id = ? AND community_id = ?')) return [[]];
      if (sql.includes('FROM batches b') && sql.includes('WHERE b.id = ? AND b.community_id = ?')) return [[]];
      throw new Error(`Unexpected scoped transaction SQL: ${sql}`);
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
  app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
  app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const tokenFor = (user) => {
    const sid = `scope-session-${user.id}`;
    testSessions.set(sid, user);
    return jwt.sign({ id: user.id, sid }, process.env.JWT_SECRET);
  };
  const token = tokenFor({ id: 1, role: 'Community Organizer', school_id: 12 });
  const superAdminToken = tokenFor({ id: 2, role: 'Super Admin', school_id: null });
  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const superAdminBatchCreate = await fetch(`${baseUrl}/community/batches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Not allowed', community: '12' }),
  });
  assert.equal(superAdminBatchCreate.status, 403);
  assert.deepEqual(await superAdminBatchCreate.json(), { error: 'Super Admin accounts cannot create batches' });

  const groupWorkers = await request('/community/groups/91/health-workers');
  assert.equal(groupWorkers.status, 200);
  assert.deepEqual((await groupWorkers.json()).users, []);
  assert.ok(queries[0].sql.includes('AND g.community_id = ?'));

  const foreignSchoolUpdate = await request('/community/communities/13', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Changed', area: 'North' }),
  });
  assert.equal(foreignSchoolUpdate.status, 404);

  const foreignGroupUpdate = await request('/community/groups/92', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Changed', community: '12' }),
  });
  assert.equal(foreignGroupUpdate.status, 404);

  const foreignGroupDelete = await request('/community/groups/92', { method: 'DELETE' });
  assert.equal(foreignGroupDelete.status, 405);

  const foreignBatchUpdate = await request('/community/batches/93', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Changed', community: '12' }),
  });
  assert.equal(foreignBatchUpdate.status, 404);

  const foreignBatchDelete = await request('/community/batches/93', { method: 'DELETE' });
  assert.equal(foreignBatchDelete.status, 405);

  const foreignSchoolMother = await request('/mothers', {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Example',
      lastName: 'Mother',
      dob: '1990-01-01',
      contactNumber: '09171234567',
      communityId: 13,
    }),
  });
  assert.equal(foreignSchoolMother.status, 403);

  const foreignGroupMother = await request('/mothers', {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Example',
      lastName: 'Mother',
      dob: '1990-01-01',
      contactNumber: '09171234567',
      communityId: 12,
      groupId: 92,
      batchId: 93,
    }),
  });
  assert.equal(foreignGroupMother.status, 409);

  const foreignSchoolChild = await request('/children', {
    method: 'POST',
    body: JSON.stringify({
      motherId: 55,
      firstName: 'Example',
      lastName: 'Child',
    }),
  });
  assert.equal(foreignSchoolChild.status, 400);
  assert.equal(
    queries.some(({ sql }) => /^(INSERT INTO (mothers|children)|UPDATE (communities|groups|batches)|DELETE FROM (groups|batches))/.test(sql)),
    false,
  );
});
