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

test('batch creation requires a group and stores the association', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const connectionQueries = [];

  pool.query = async (sql) => {
    if (sql === 'SELECT id FROM communities WHERE id = ? AND archived_at IS NULL LIMIT 1') {
      return [[{ id: 91 }]];
    }
    if (sql.includes('FROM groups g')) return [[{ id: 12 }]];
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 501 }];
    if (sql.includes('INSERT IGNORE INTO activity_logs')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      connectionQueries.push({ sql, params });
      if (sql.includes('AS nextNo FROM batches')) return [[{ nextNo: 1 }]];
      if (sql.startsWith('INSERT INTO batches')) return [{ insertId: 5 }];
      if (sql.startsWith('SELECT id, batch_code AS code')) {
        return [[{
          id: 5,
          code: 'BAT-0001',
          name: 'Batch 1',
          records: 0,
          progress: 0,
          status: 'Active',
          community_id: 91,
        }]];
      }
      if (sql === 'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)') {
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
  });

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 7, role: 'Community Organizer' };
    req.isCommunityOrganizer = true;
    req.schoolId = 91;
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

  const create = (groupId) => fetch(`http://127.0.0.1:${server.address().port}/api/community/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Batch 1', community: '91', groupId }),
  });

  for (const groupId of ['', 'not-a-group-id']) {
    const response = await create(groupId);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Select a group for the batch' });
  }
  assert.equal(connectionQueries.length, 0);

  const response = await create('12');
  assert.equal(response.status, 201);
  assert.equal((await response.json()).batch.groupId, 12);
  assert.deepEqual(
    connectionQueries.find(({ sql }) => sql === 'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)').params,
    [12, 5],
  );
});
