const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-batch-delete-test-secret';

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

test('batch deletion removes assigned beneficiaries and health records in one transaction', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const transactionCalls = [];
  const notificationCalls = [];
  let transactionMode = 'success';

  pool.query = async (sql, params = []) => {
    notificationCalls.push({ sql, params });
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 201 }];
    if (sql.includes('INSERT IGNORE INTO activity_logs')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => transactionCalls.push({ type: 'begin' }),
    commit: async () => transactionCalls.push({ type: 'commit' }),
    rollback: async () => transactionCalls.push({ type: 'rollback' }),
    release: () => transactionCalls.push({ type: 'release' }),
    query: async (sql, params = []) => {
      transactionCalls.push({ type: 'query', sql, params });
      if (sql.includes('FROM batches b') && sql.includes('FOR UPDATE')) {
        if (transactionMode === 'not-found') return [[]];
        return [[{ id: 5, name: 'Batch 5', community_id: 91, group_id: 12 }]];
      }
      if (sql === 'SELECT id FROM mothers WHERE batch_id = ? FOR UPDATE') {
        return [[{ id: 31 }, { id: 32 }]];
      }
      if (sql.includes('SELECT c.id FROM children c')) {
        return [[{ id: 41 }, { id: 42 }, { id: 43 }]];
      }
      if (sql.startsWith('DELETE FROM mothers')) return [{ affectedRows: 2 }];
      if (sql === 'DELETE FROM children WHERE batch_id = ?') {
        if (transactionMode === 'failure') throw new Error('health record constraint failure');
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('DELETE FROM batches WHERE id = ?')) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = jwt.sign({ id: 7, role: 'Community Organizer', school_id: 91 }, process.env.JWT_SECRET);
  const requestDelete = () => fetch(
    `http://127.0.0.1:${server.address().port}/api/community/batches/5`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );

  const response = await requestDelete();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    deleted: true,
    deletedMothers: 2,
    deletedChildren: 3,
  });
  const transactionQueries = transactionCalls.filter(({ type }) => type === 'query');
  const mothersDeleteIndex = transactionQueries.findIndex(({ sql }) => sql.startsWith('DELETE FROM mothers'));
  const directChildrenDeleteIndex = transactionQueries.findIndex(({ sql }) => sql === 'DELETE FROM children WHERE batch_id = ?');
  const batchDeleteIndex = transactionQueries.findIndex(({ sql }) => sql.includes('DELETE FROM batches WHERE id = ?'));
  assert.ok(mothersDeleteIndex >= 0 && mothersDeleteIndex < directChildrenDeleteIndex);
  assert.ok(directChildrenDeleteIndex < batchDeleteIndex);
  assert.match(transactionQueries[0].sql, /b\.community_id = \?/);
  assert.deepEqual(transactionQueries[0].params, [5, 91]);
  assert.match(transactionQueries[2].sql, /c\.mother_id IN \(\?, \?\)/);
  assert.deepEqual(transactionQueries[2].params, [5, 31, 32]);
  const batchDelete = transactionQueries.find(({ sql }) => sql.includes('DELETE FROM batches WHERE id = ?'));
  assert.match(batchDelete.sql, /AND community_id = \?/);
  assert.doesNotMatch(batchDelete.sql, /b\.community_id/);
  assert.deepEqual(transactionCalls.filter(({ type }) => type === 'commit').length, 1);
  assert.equal(notificationCalls.length, 2);
  assert.match(notificationCalls[0].params[3], /2 mothers and 3 children/);

  transactionMode = 'failure';
  transactionCalls.length = 0;
  notificationCalls.length = 0;
  const failedResponse = await requestDelete();
  assert.equal(failedResponse.status, 500);
  assert.deepEqual(transactionCalls.filter(({ type }) => type === 'rollback').length, 1);
  assert.equal(transactionCalls.some(({ type }) => type === 'commit'), false);
  assert.equal(notificationCalls.length, 0);

  transactionMode = 'not-found';
  transactionCalls.length = 0;
  const missingResponse = await requestDelete();
  assert.equal(missingResponse.status, 404);
  assert.equal(transactionCalls.some(({ sql }) => sql?.startsWith('DELETE FROM')), false);
});
