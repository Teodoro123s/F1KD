const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');
const mysql = require('mysql2/promise');

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
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
const communityRouter = require('../routes/community');

test('school and group creation reject duplicate names in their scope', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const transactionQueries = [];

  pool.query = async (sql) => {
    if (sql === 'SELECT id FROM communities WHERE id = ? AND archived_at IS NULL LIMIT 1') {
      return [[{ id: 4 }]];
    }
    if (sql.includes('REGEXP_REPLACE')) return [[{ id: 4 }, { id: 5 }]];
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      transactionQueries.push({ sql, params });
      if (sql === 'SELECT id FROM communities ORDER BY id FOR UPDATE') return [[]];
      if (sql.includes('FROM communities') && sql.includes('archived_at IS NULL')) return [[{ id: 3 }]];
      if (sql.includes('FROM communities WHERE id = ? AND archived_at IS NULL')) return [[{ id: 4 }]];
      if (sql.includes('FROM groups') && sql.includes('community_id = ?')) return [[{ id: 9 }]];
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
  });

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 7, role: 'Admin' };
    req.isCommunityOrganizer = false;
    next();
  });
  app.use('/api/community', communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const request = (path, body) => fetch(`http://127.0.0.1:${server.address().port}/api/community${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const duplicateSchool = await request('/communities', { name: ' UC ', area: 'Poblacion' });
  assert.equal(duplicateSchool.status, 409);
  assert.deepEqual(await duplicateSchool.json(), {
    error: 'A school with this name already exists in this area.',
  });

  const duplicateGroup = await request('/groups', { name: 'Group A', community: 4 });
  assert.equal(duplicateGroup.status, 409);
  assert.deepEqual(await duplicateGroup.json(), {
    error: 'A group with this name already exists in this school.',
  });

  const ambiguousSchool = await request('/batches', { name: 'Batch 2', community: 'UC', groupId: 9 });
  assert.equal(ambiguousSchool.status, 409);
  assert.deepEqual(await ambiguousSchool.json(), {
    error: 'This school name is ambiguous. Select the school by ID.',
  });
  assert.equal(transactionQueries.some(({ sql }) => sql.includes('FROM communities') && sql.includes('archived_at IS NULL')), true);
  assert.equal(transactionQueries.some(({ sql }) => sql.includes('FROM groups') && sql.includes('community_id = ?')), true);
});
