const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');
const mysql = require('mysql2/promise');

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};

mysql.createPool = () => testPool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const { authorizeOperational } = require('../middleware/authorize');
const programsRouter = require('../routes/programs');
const setTestUser = (req, res, next) => {
  req.user = { id: 1, role: 'Community Organizer', school_id: 12 };
  next();
};

test('project activity calendar returns real check-ins in the requested date range', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const activities = [
    { activity_id: 1, program_id: 12, program_name: 'Nutrition', activity_date: '2026-10-27', monitored: 1, status: 'Done' },
    { activity_id: 2, program_id: 12, program_name: 'Nutrition', activity_date: '2026-10-27', monitored: 0, status: 'Missing' },
    { activity_id: 3, program_id: 12, program_name: 'Nutrition', activity_date: '2026-10-28', monitored: 0, status: 'Pending' },
  ];
  let capturedQuery = null;
  pool.query = async (sql, params = []) => {
    capturedQuery = { sql, params };
    return [activities];
  };

  const app = express();
  app.use('/api/programs', setTestUser, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs/activity-calendar`;
  const response = await fetch(`${baseUrl}?from=2026-10-01&to=2026-10-31`);

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).activities, activities);
  assert.match(capturedQuery.sql, /INNER JOIN programs p ON p\.id = ml\.program_id/);
  assert.match(capturedQuery.sql, /CASE\s+WHEN ml\.monitored = 1 THEN 'Done'\s+WHEN ml\.monitored_date < CURDATE\(\) THEN 'Missing'\s+ELSE 'Pending'/);
  assert.match(capturedQuery.sql, /ml\.monitored,/);
  assert.doesNotMatch(capturedQuery.sql, /WHERE\s+ml\.monitored = 1/);
  assert.match(capturedQuery.sql, /ml\.monitored_date >= \? AND ml\.monitored_date <= \?/);
  assert.deepEqual(capturedQuery.params, [12, 12, 12, '2026-10-01', '2026-10-31']);
});

test('project activity calendar rejects invalid or reversed date ranges', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  pool.query = async () => {
    throw new Error('Invalid date ranges must not query the database');
  };

  const app = express();
  app.use('/api/programs', setTestUser, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs/activity-calendar`;
  for (const range of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-31&to=2026-10-01']) {
    const response = await fetch(`${baseUrl}?${range}`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid activity date range/);
  }
});
