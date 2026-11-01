const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-mother-transfer-test-secret';

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

test('mother transfer updates the mother and all linked children within the school and group', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const calls = [];
  let destinationAvailable = true;
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions')) {
      return [[{
        user_id: 7,
        role: 'Community Organizer',
        status: 'Active',
        school_id: 91,
        group_id: null,
        first_name: 'Community',
        last_name: 'Organizer',
        consent_accepted_at: new Date(),
      }]];
    }
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      if (sql.includes('FROM batches b') && sql.includes('FOR UPDATE')) {
        return [destinationAvailable ? [{ id: 6, batch_code: 'BAT-0006', name: 'Batch 6' }] : []];
      }
      if (sql.includes('FROM mothers m') && sql.includes('FOR UPDATE')) {
        return [[{
          id: 21,
          mother_code: 'MTH-0021',
          community_id: 91,
          group_id: 12,
          batch_id: 5,
        }]];
      }
      if (sql.startsWith('UPDATE mothers SET batch_id')) return [{ affectedRows: 1 }];
      if (sql.includes('UPDATE children')) return [{ affectedRows: 2 }];
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

  const token = jwt.sign({ id: 7, sid: 'session-1' }, process.env.JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/mothers/MTH-0021/batch`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batchId: 6 }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    mother: { id: 'MTH-0021', batchId: 'BAT-0006', batchName: 'Batch 6' },
    movedChildren: 2,
  });
  const motherUpdate = calls.find(({ sql }) => sql.startsWith('UPDATE mothers SET batch_id'));
  const childrenUpdate = calls.find(({ sql }) => sql.includes('UPDATE children'));
  assert.deepEqual(motherUpdate.params, [6, 21]);
  assert.deepEqual(childrenUpdate.params, [91, 12, 6, 21]);
  const destinationLookup = calls.find(({ sql }) => sql.includes('FROM batches b'));
  assert.match(destinationLookup.sql, /b\.community_id = \?[\s\S]*WHERE scoped_batch\.batch_id = b\.id AND scoped_batch\.group_id = \?/);
  assert.deepEqual(destinationLookup.params, [6, 91, 91, 12]);

  destinationAvailable = false;
  const updateCount = calls.filter(({ sql }) => sql.startsWith('UPDATE mothers SET batch_id') || sql.includes('UPDATE children')).length;
  const invalidDestinationResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/community/mothers/MTH-0021/batch`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batchId: 99 }),
  });
  assert.equal(invalidDestinationResponse.status, 400);
  assert.equal(
    calls.filter(({ sql }) => sql.startsWith('UPDATE mothers SET batch_id') || sql.includes('UPDATE children')).length,
    updateCount,
  );
});
