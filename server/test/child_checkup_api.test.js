const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'child-checkup-api-test-secret';

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
const childrenRouter = require('../routes/children');

test('health worker child check-up saves monitoring data and rejects a different group', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const savedCheckupQueries = [];
  const notifications = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      return [[{
        user_id: 8,
        email: 'worker@example.test',
        role: 'Health worker',
        status: 'Active',
        school_id: 12,
        group_id: params[0] === 'session-99' ? 99 : 20,
        first_name: 'Health',
        middle_initial: null,
        last_name: 'Worker',
        contact_number: null,
        location: null,
        consent_accepted_at: '2026-01-01 00:00:00',
      }]];
    }
    if (sql.includes('FROM children c LEFT JOIN mothers m') && sql.includes('COALESCE(c.group_id, m.group_id)')) {
      return [Number(params[2]) === 20
        ? [{
          id: 31,
          child_code: 'CHD-31',
          first_name: 'Jamie',
          last_name: 'Santos',
          community_id: 12,
          group_id: 20,
          mother_community_id: 12,
          mother_group_id: 20,
        }]
        : []];
    }
    if (sql.startsWith('SELECT id FROM child_checkups')) return [[]];
    if (sql.startsWith('INSERT INTO child_checkups')) {
      savedCheckupQueries.push({ sql, params });
      return [{ insertId: 71 }];
    }
    if (sql.includes('SELECT c.*, m.first_name AS mother_first_name')) {
      return [[{
        id: 31,
        child_code: 'CHD-31',
        first_name: 'Jamie',
        last_name: 'Santos',
        community_id: 12,
        group_id: 20,
        mother_community_id: 12,
        mother_group_id: 20,
      }]];
    }
    if (sql.startsWith('SELECT * FROM child_medical_conditions') || sql.startsWith('SELECT * FROM child_vaccinations')) return [[]];
    if (sql.includes('FROM child_checkups cc')) {
      return [[{
        id: 71,
        child_id: 31,
        week_number: 12,
        visit_date: '2026-10-21',
        next_checkup_date: '2026-10-28',
        weight: '8.4',
        height: '70',
      }]];
    }
    if (sql.startsWith('INSERT INTO notifications')) {
      notifications.push(params);
      return [{ insertId: notifications.length }];
    }
    if (sql.startsWith('INSERT IGNORE INTO activity_logs')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected child check-up SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const request = (groupId, body) => {
    const token = jwt.sign({ id: 8, sid: `session-${groupId}`, role: 'Health worker', school_id: 12, group_id: groupId }, process.env.JWT_SECRET);
    return fetch(`http://127.0.0.1:${server.address().port}/api/children/CHD-31/checkups`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const response = await request(20, {
    week: 12,
    checkupDate: '2026-10-21',
    nextCheckupDate: '2026-10-28',
    weight: '8.4',
    height: '70',
    serviceProvider: 'Health Worker',
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.child.completedWeeks, [12]);
  assert.equal(result.child.checkups[0].weekNumber, 12);
  assert.equal(result.child.checkups[0].weight, '8.4');
  assert.equal(savedCheckupQueries.length, 1);
  assert.equal(savedCheckupQueries[0].params[0], 31);
  assert.equal(savedCheckupQueries[0].params[1], '2026-10-28');
  assert.equal(savedCheckupQueries[0].params[15], 12);
  assert.deepEqual(savedCheckupQueries[0].params.slice(16), [8, 8, 8]);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0][0], 'monitoring.child.checkup_created');
  assert.equal(notifications[0][7], 12);
  assert.equal(notifications[0][8], 20);
  assert.equal(notifications[0][11], 8);

  const cancelledReminderResponse = await request(20, {
    week: 13,
    checkupDate: '2026-10-28',
    nextCheckupDate: '',
  });
  assert.equal(cancelledReminderResponse.status, 200);
  assert.equal(savedCheckupQueries[1].params[1], null, 'a blank next date cancels reminder scheduling');

  const invalidReminderDateResponse = await request(20, {
    week: 14,
    checkupDate: '2026-10-28',
    nextCheckupDate: '2026-02-30',
  });
  assert.equal(invalidReminderDateResponse.status, 400);
  assert.equal(savedCheckupQueries.length, 2);

  const wrongGroupResponse = await request(99, { week: 13 });
  assert.equal(wrongGroupResponse.status, 404);
  assert.equal(savedCheckupQueries.length, 2, 'a child outside the worker group must not be persisted');
});
