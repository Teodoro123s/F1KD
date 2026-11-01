const test = require('node:test');
const assert = require('node:assert/strict');

const mysql = require('mysql2/promise');
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({ query: async () => [[]], release() {} }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const express = require('express');
const communityRouter = require('../routes/community');

test('community reference options return only scoped hierarchy data without beneficiary records', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes('FROM communities c')) {
      return [[{ id: 8, name: 'North School', area: 'North', coordinator_id: 3, coordinator_name: 'Coordinator' }]];
    }
    if (sql.includes('FROM groups g')) {
      return [[{ id: 12, community_id: 8, name: 'Group A', community: 'North School', leader: '', members: 0, status: 'Active' }]];
    }
    if (sql.includes('FROM batches b')) {
      return [[{ id: 4, batch_code: 'BAT-0004', name: 'Batch 4', community: 'North School', records: 0, status: 'Active', group_ids: '12', group_names: 'Group A' }]];
    }
    throw new Error(`Unexpected reference-options SQL: ${sql}`);
  };

  const app = express();
  app.use('/api/community', (req, res, next) => {
    req.schoolId = 8;
    req.groupId = 12;
    next();
  }, communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/reference-options`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    communities: [{ id: 8, name: 'North School', area: 'North', coordinatorId: 3, coordinatorName: 'Coordinator' }],
    groups: [{ id: 12, name: 'Group A', communityId: 8, community_id: 8, community: 'North School', leader: '', members: 0, status: 'Active' }],
    batches: [{ id: 'BAT-0004', databaseId: 4, code: 'BAT-0004', name: 'Batch 4', community: 'North School', records: 0, status: 'Active', groupIds: '12', groupNames: 'Group A' }],
  });

  assert.equal(queries.length, 3);
  assert.ok(queries.every(({ sql }) => !/SELECT\s+m\.\*|mother_checkups/i.test(sql)));
  assert.ok(queries.every(({ sql }) => /WHERE\s+(?:c\.archived_at|g\.archived_at|b\.archived_at)/i.test(sql)));
  assert.deepEqual(queries.map(({ params }) => params), [[8], [12], [12]]);
});
