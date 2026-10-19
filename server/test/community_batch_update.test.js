const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-batch-update-test-secret';

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

test('community organizer can assign a batch to a group in their school', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const queryCalls = [];
  const notificationCalls = [];

  pool.query = async (sql, params = []) => {
    queryCalls.push({ sql, params });
    if (sql === 'SELECT id FROM batches WHERE id = ? AND community_id = ? LIMIT 1') {
      return [[{ id: 5 }]];
    }
    if (sql === 'SELECT id FROM groups WHERE id = ? AND community_id = ? LIMIT 1') {
      return [[{ id: 12 }]];
    }
    if (sql.startsWith('INSERT INTO notifications')) {
      notificationCalls.push({ sql, params });
      return [{ insertId: 501 }];
    }
    if (sql.includes('INSERT IGNORE INTO activity_logs')) {
      notificationCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      if (sql.startsWith('UPDATE batches SET')) return [{ affectedRows: 1 }];
      if (sql === 'DELETE FROM group_batch WHERE batch_id = ?') return [{ affectedRows: 0 }];
      if (sql === 'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)') return [{ affectedRows: 1 }];
      if (sql.includes('FROM batches b WHERE b.id = ? AND b.community_id = ?')) {
        return [[{
          id: 5,
          code: 'BAT-0005',
          name: 'Batch 5',
          records: 2,
          progress: 20,
          status: 'Active',
          community_id: 91,
          group_id: 12,
        }]];
      }
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
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/batches/5`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Batch 5',
      community: '91',
      groupId: '12',
      records: 2,
      progress: 20,
      status: 'Active',
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.batch.group_id, 12);
  assert.equal(body.batch.id, 'BAT-0005');
  assert.deepEqual(queryCalls.find(({ sql }) => sql === 'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)').params, [12, 5]);
  assert.deepEqual(queryCalls.filter(({ sql }) => sql.includes('FROM batches b WHERE b.id = ? AND b.community_id = ?'))[0].params, [5, 91]);
  assert.equal(notificationCalls.length, 2);
});
