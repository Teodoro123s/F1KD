const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-group-delete-test-secret';

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

test('deleting a group unassigns its batches and beneficiaries but preserves their records', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const transactionCalls = [];
  const notificationCalls = [];

  pool.query = async (sql, params = []) => {
    notificationCalls.push({ sql, params });
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 301 }];
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
      if (sql.includes('FROM groups WHERE id = ?') && sql.includes('FOR UPDATE')) {
        return [[{ id: 12, name: 'Group 12', community_id: 91 }]];
      }
      if (sql === 'SELECT batch_id FROM group_batch WHERE group_id = ? FOR UPDATE') {
        return [[{ batch_id: 51 }, { batch_id: 52 }]];
      }
      if (sql.startsWith('SELECT id FROM mothers WHERE group_id = ?')) {
        return [[{ id: 101 }, { id: 102 }, { id: 103 }]];
      }
      if (sql.startsWith('UPDATE mothers')) return [{ affectedRows: 3 }];
      if (sql.startsWith('UPDATE children')) return [{ affectedRows: 4 }];
      if (sql === 'UPDATE users SET group_id = NULL WHERE group_id = ?') return [{ affectedRows: 1 }];
      if (sql === 'DELETE FROM group_batch WHERE group_id = ?') return [{ affectedRows: 2 }];
      if (sql.startsWith('DELETE FROM groups WHERE id = ?')) return [{ affectedRows: 1 }];
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
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/community/groups/12`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, deleted: true });

  const updates = transactionCalls.filter(({ type, sql }) => type === 'query' && sql.startsWith('UPDATE '));
  assert.match(updates[0].sql, /SET group_id = NULL/);
  assert.match(updates[0].sql, /batch_id = CASE WHEN batch_id IN \(\?, \?\)\s+THEN NULL/);
  assert.match(updates[0].sql, /WHERE group_id = \? OR batch_id IN \(\?, \?\)/);
  assert.deepEqual(updates[0].params, [51, 52, 12, 51, 52]);
  assert.match(updates[1].sql, /SET group_id = NULL/);
  assert.match(updates[1].sql, /batch_id = CASE WHEN batch_id IN \(\?, \?\)\s+THEN NULL/);
  assert.match(updates[1].sql, /OR mother_id IN \(\?, \?, \?\)/);
  assert.deepEqual(updates[1].params, [51, 52, 12, 51, 52, 101, 102, 103]);
  assert.equal(transactionCalls.some(({ type, sql }) => type === 'query' && /DELETE FROM (mothers|children|batches)/.test(sql)), false);
  assert.equal(transactionCalls.filter(({ type }) => type === 'commit').length, 1);
  assert.equal(notificationCalls.length, 2);
});

test('group deletion impact counts include beneficiaries assigned through its batches', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let impactQuery = '';
  pool.query = async (sql) => {
    if (!sql.includes('FROM groups g')) throw new Error(`Unexpected pool SQL: ${sql}`);
    impactQuery = sql;
    return [[{
      id: 12,
      name: 'Group 12',
      community: 'School 91',
      batches: 2,
      mothers: 3,
      children: 4,
      health_workers: 1,
    }]];
  };

  const app = express();
  app.use(express.json());
  app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = jwt.sign({ id: 7, role: 'Community Organizer', school_id: 91 }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/community/groups/12/delete-impact`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    group: {
      id: 12,
      name: 'Group 12',
      community: 'School 91',
      batches: 2,
      mothers: 3,
      children: 4,
      healthWorkers: 1,
    },
  });
  assert.match(impactQuery, /m\.batch_id IN \(SELECT gb\.batch_id FROM group_batch gb WHERE gb\.group_id = g\.id\)/);
  assert.match(impactQuery, /ch\.batch_id IN \(SELECT gb\.batch_id FROM group_batch gb WHERE gb\.group_id = g\.id\)/);
});
