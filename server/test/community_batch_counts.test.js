const test = require('node:test');
const assert = require('node:assert/strict');

const mysql = require('mysql2/promise');
const queryLog = [];
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({ query: async () => [[]], release() {} }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const express = require('express');
const communityRouter = require('../routes/community');

test('community summary counts batches linked through mothers in their group', async (t) => {
  await pool.ready;
  testPool.query = async (sql) => {
    queryLog.push(sql);
    if (sql.includes('FROM communities c')) {
      return [[{ id: 1, name: 'School', batches: 1, records: 1 }]];
    }
    if (sql.includes('FROM batches b')) {
      if (sql.includes('AVG(COALESCE(m.progress, 0))')) {
        return [[{
          id: 3,
          code: 'BAT-0003',
          name: 'Batch 3',
          community: 'School',
          records: 5,
          progress: 47,
        }]];
      }
      return [[{
        id: 3,
        batch_code: 'BAT-0003',
        name: 'Batch 3',
        community: 'School',
        actual_records: 1,
        group_ids: '2',
        group_names: 'Group 2',
      }]];
    }
    if (sql.includes('FROM groups g')) {
      return [
        [
          { id: 2, community_id: 1, name: 'Group 2', batches: 0 },
          { id: 4, community_id: 1, name: 'Group 4', batches: 1 },
        ],
      ];
    }
    if (sql.includes('FROM users')) return [[{ total: 0 }]];
    if (sql.includes('FROM mothers m') && sql.includes('motherProgress')) {
      return [[
        { batchId: 3, motherId: 1, motherProgress: 11 },
        { batchId: 3, motherId: 2, motherProgress: 100 },
        { batchId: 3, motherId: 3, motherProgress: 100 },
        { batchId: 3, motherId: 4, motherProgress: 11 },
        { batchId: 3, motherId: 5, motherProgress: 11 },
      ]];
    }
    if (sql.includes('FROM mothers m')) return [[]];
    throw new Error(`Unexpected community summary SQL: ${sql}`);
  };
  queryLog.length = 0;

  const app = express();
  app.use('/api/community', communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/summary`);
  assert.equal(response.status, 200);
  const summary = await response.json();

  assert.equal(summary.groups[0].batches, 1);
  assert.equal(summary.groups[1].batches, 0);
  assert.equal(summary.batches[0].groupIds, '2');
  assert.equal(summary.batches[0].progress, 47);
  assert.ok(queryLog.filter((sql) => sql.includes('FROM groups g') || sql.includes('FROM batches b'))
    .every((sql) => sql.includes('UNION') && sql.includes('JOIN mothers m')));

  const batchesResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/community/batches`);
  assert.equal(batchesResponse.status, 200);
  const batches = await batchesResponse.json();
  assert.equal(batches.batches[0].progress, 47);
});
