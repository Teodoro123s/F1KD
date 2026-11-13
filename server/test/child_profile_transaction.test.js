const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');
const mysql = require('mysql2/promise');
const transactionEvents = [];
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: (...args) => testPool.query(...args),
    beginTransaction: async () => transactionEvents.push('begin'),
    commit: async () => transactionEvents.push('commit'),
    rollback: async () => transactionEvents.push('rollback'),
    release() {},
  }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const childrenRouter = require('../routes/children');

test('child create and profile replacement roll back all writes on a related-record failure', async (t) => {
  await pool.ready;
  transactionEvents.length = 0;
  const originalQuery = pool.query;
  const writes = [];
  let failConditionInsert = true;
  pool.query = async (sql) => {
    if (sql.includes('school_archived_at') && sql.includes('FROM children c')) {
      return [[{
        archived_at: null,
        mother_archived_at: null,
        school_archived_at: null,
        group_archived_at: null,
        batch_archived_at: null,
      }]];
    }
    if (sql.includes('FROM mothers m') && sql.includes('JOIN communities c')) {
      return [[{ id: 5, community_id: 12, group_id: 20, batch_id: 30 }]];
    }
    if (sql.includes('SELECT c.id FROM communities c')) return [[{ id: 12 }]];
    if (sql.includes('current_mother_community_id')) {
      return [[{
        id: 31,
        child_code: 'CHD-31',
        mother_id: 5,
        community_id: 12,
        group_id: 20,
        batch_id: 30,
        current_mother_community_id: 12,
        current_mother_group_id: 20,
        current_mother_batch_id: 30,
        first_name: 'Jamie',
        middle_name: null,
        last_name: 'Santos',
      }]];
    }
    if (sql.includes('SELECT id, community_id, group_id, batch_id FROM mothers')) {
      return [[{ id: 5, community_id: 12, group_id: 20, batch_id: 30 }]];
    }
    if (/^(UPDATE|DELETE|INSERT)/.test(sql.trim())) writes.push(sql);
    if (failConditionInsert && sql.startsWith('INSERT INTO child_medical_conditions')) {
      failConditionInsert = false;
      throw new Error('simulated related-record failure');
    }
    if (sql.startsWith('INSERT INTO children')) return [{ insertId: 31 }];
    return [{ affectedRows: 1 }];
  };

  const app = express();
  app.use(express.json());
  app.use('/api/children', childrenRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/children`;

  const createResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      motherId: 5,
      firstName: 'Jamie',
      lastName: 'Santos',
      birthDate: '2024-01-01',
      medicalConditions: { Asthma: true },
    }),
  });
  assert.equal(createResponse.status, 500);
  assert.deepEqual(transactionEvents, ['begin', 'rollback']);
  assert.ok(writes.some((sql) => sql.startsWith('INSERT INTO children')));
  assert.ok(writes.some((sql) => sql.startsWith('INSERT INTO child_medical_conditions')));

  transactionEvents.length = 0;
  writes.length = 0;
  failConditionInsert = true;
  const updateResponse = await fetch(`${baseUrl}/CHD-31`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicalConditions: { Asthma: true } }),
  });
  assert.equal(updateResponse.status, 500);
  assert.deepEqual(transactionEvents, ['begin', 'rollback']);
  assert.ok(writes.some((sql) => sql.startsWith('UPDATE children SET')));
  assert.ok(writes.some((sql) => sql.startsWith('DELETE FROM child_medical_conditions')));
  assert.ok(writes.some((sql) => sql.startsWith('INSERT INTO child_medical_conditions')));
});
