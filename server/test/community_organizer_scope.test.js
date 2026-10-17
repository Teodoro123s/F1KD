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
  const queries = [];
  pool.query = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes('FROM groups g') && sql.includes('AND g.community_id = ?')) {
      assert.deepEqual(params, [91, 12]);
      return [[]];
    }
    if (sql.includes('FROM groups WHERE id = ? AND community_id = ?')) return [[]];
    if (sql.includes('FROM batches WHERE id = ? AND community_id = ?')) return [[]];
    if (sql.includes('FROM batches b') && sql.includes('WHERE b.id = ? AND b.community_id = ?')) return [[]];
    if (sql.includes('FROM batches WHERE (id = ? OR batch_code = ? OR name = ?) AND community_id = ?')) return [[]];
    if (sql.includes('FROM mothers WHERE (id = ? OR mother_code = ?) AND community_id = ?')) return [[]];
    throw new Error(`Unexpected test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
  app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
  app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const organizer = { id: 1, role: 'Community Organizer', school_id: 12 };
  const token = jwt.sign(organizer, process.env.JWT_SECRET);
  const superAdminToken = jwt.sign({ id: 2, role: 'Super Admin' }, process.env.JWT_SECRET);
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
  assert.equal(foreignGroupDelete.status, 404);

  const foreignBatchUpdate = await request('/community/batches/93', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Changed', community: '12' }),
  });
  assert.equal(foreignBatchUpdate.status, 404);

  const foreignBatchDelete = await request('/community/batches/93', { method: 'DELETE' });
  assert.equal(foreignBatchDelete.status, 404);

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
    }),
  });
  assert.equal(foreignGroupMother.status, 403);

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
