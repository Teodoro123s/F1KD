const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const express = require('express');
const mysql = require('mysql2/promise');
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: (...args) => testPool.query(...args),
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

test('child profile updates reject a mother from a different school/group/batch hierarchy', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const writes = [];
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
    if (sql.includes('current_mother_community_id')) {
      return [[{
        id: 31,
        child_code: 'CHD-31',
        mother_id: 7,
        community_id: 12,
        group_id: 20,
        batch_id: 30,
        current_mother_community_id: 12,
        current_mother_group_id: 20,
        current_mother_batch_id: 30,
        first_name: 'Jamie',
        last_name: 'Santos',
      }]];
    }
    if (sql.includes('SELECT id, community_id, group_id, batch_id FROM mothers')) {
      return [[{ id: 8, community_id: 12, group_id: 99, batch_id: 30 }]];
    }
    if (/^(UPDATE|DELETE|INSERT)/.test(sql.trim())) writes.push(sql);
    throw new Error(`Unexpected child update SQL: ${sql}`);
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

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/children/CHD-31`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motherId: 8 }),
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /matching school, group, and batch assignments/);
  assert.deepEqual(writes, [], 'a rejected hierarchy change must not write profile or related records');
});

test('child creation rejects assignments outside the selected mother hierarchy', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const writes = [];
  pool.query = async (sql) => {
    if (sql.includes('SELECT m.id, m.community_id, m.group_id, m.batch_id FROM mothers m')) {
      return [[{ id: 7, community_id: 12, group_id: 20, batch_id: 30 }]];
    }
    if (/^(INSERT|UPDATE|DELETE)/.test(sql.trim())) writes.push(sql);
    throw new Error(`Unexpected child create SQL: ${sql}`);
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

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      motherId: 7,
      communityId: 99,
      groupId: 20,
      batchId: 30,
      firstName: 'Jamie',
      lastName: 'Santos',
      birthDate: '2024-01-15',
    }),
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /matching school, group, and batch assignments/);
  assert.deepEqual(writes, [], 'a rejected child assignment must not create records');
});

test('child check-up week migration documents duplicate handling and adds a composite unique key', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '20261113_unique_child_checkup_weeks.sql'),
    'utf8',
  );
  assert.match(migration, /GROUP BY child_id, week_number\s+HAVING COUNT\(\*\) > 1/i);
  assert.match(migration, /ALTER TABLE child_checkups ADD UNIQUE KEY uq_child_checkups_child_week \(child_id, week_number\)/i);
  assert.match(migration, /information_schema\.statistics/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b|\bUPDATE\s+child_checkups\b/i);
});
