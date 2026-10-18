const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'reports-activity-test-secret';

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
const reportsRouter = require('../routes/reports');

async function startReportsServer(t) {
  await pool.ready;
  const app = express();
  app.use('/api/reports', reportsRouter);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}/api/reports/activity`;
}

async function requestActivity(baseUrl, role, schoolId, query = '') {
  const token = jwt.sign({ id: 7, role, school_id: schoolId }, process.env.JWT_SECRET);
  const response = await fetch(`${baseUrl}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { response, body: await response.json() };
}

test('organizers can view activity for a health worker in their assigned school', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('SELECT id FROM users')) return [[{ id: 21 }]];
    if (sql.includes('COUNT(*) AS total')) return [[{ total: 1 }]];
    if (sql.includes('AS sign_ins')) return [[{ sign_ins: 1 }]];
    if (sql.includes('DATE_FORMAT(activity_date')) return [[{ date: '2026-10-19', count: 1 }]];
    if (sql.includes('SELECT id, actor_user_id AS actorUserId')) {
      return [[{
        id: 33,
        actorUserId: 21,
        actorName: 'Case Worker',
        actorRole: 'Health Worker',
        category: 'Monitoring',
        action: 'update',
        entityType: 'child',
        entityId: '55',
        description: 'Child check-up was updated.',
        createdAt: '2026-10-19 00:00:00',
      }]];
    }
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const { response, body } = await requestActivity(baseUrl, 'Community Organizer', 4, '?actorUserId=21&page=1&perPage=20');
  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
  assert.equal(body.activities[0].actorName, 'Case Worker');
  assert.equal(body.activities[0].action, 'update');
  assert.deepEqual(calls[0].params, [21, 4]);
  assert.match(calls.find((call) => call.sql.includes('COUNT(*) AS total')).sql, /actor_user_id = \?/);
  assert.doesNotMatch(calls.find((call) => call.sql.includes('COUNT(*) AS total')).sql, /action = 'sign_in'/);
});

test('organizers cannot request global or out-of-school activity', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const globalRequest = await requestActivity(baseUrl, 'Community Organizer', 4);
  assert.equal(globalRequest.response.status, 403);
  assert.equal(calls.length, 0);

  const otherSchoolRequest = await requestActivity(baseUrl, 'Community Organizer', 4, '?actorUserId=21');
  assert.equal(otherSchoolRequest.response.status, 404);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [21, 4]);
});

test('superadmin global activity report continues to show sign-ins only', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql) => {
    calls.push(sql);
    if (sql.includes('COUNT(*) AS total')) return [[{ total: 0 }]];
    if (sql.includes('AS sign_ins')) return [[{ sign_ins: 0 }]];
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const { response } = await requestActivity(baseUrl, 'Super Admin', 0);
  assert.equal(response.status, 200);
  const totalQuery = calls.find((sql) => sql.includes('COUNT(*) AS total'));
  assert.match(totalQuery, /category = 'User Management'/);
  assert.match(totalQuery, /action = 'sign_in'/);
});
