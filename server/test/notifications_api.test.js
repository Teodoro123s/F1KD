const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'notifications-api-test-secret';

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
const notificationsRouter = require('../routes/notifications');
const sessionUsers = new Map();

function signInTestUser(user) {
  const sid = `test-session-${sessionUsers.size + 1}`;
  sessionUsers.set(sid, user);
  return jwt.sign({ ...user, sid }, process.env.JWT_SECRET);
}

function getTestSessionRows(params) {
  const session = sessionUsers.get(params[0]);
  if (!session) return [[]];
  return [[{
    user_id: session.id,
    email: `user-${session.id}@example.test`,
    role: session.role,
    status: 'Active',
    school_id: session.school_id ?? null,
    group_id: session.group_id ?? null,
    first_name: 'Test',
    middle_initial: null,
    last_name: 'User',
    contact_number: null,
    location: null,
    consent_accepted_at: '2026-01-01 00:00:00',
  }]];
}

test('notification read-state endpoints persist scoped individual and bulk changes', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return getTestSessionRows(params);
    calls.push({ sql, params });
    if (sql.trimStart().startsWith('SELECT n.id')) {
      return [[{ id: 12 }]];
    }
    if (sql.startsWith('DELETE FROM notification_reads')) {
      return [{ affectedRows: 2 }];
    }
    if (sql.includes('DELETE nr FROM notification_reads')) {
      return [{ affectedRows: 2 }];
    }
    if (sql.includes('INSERT IGNORE INTO notification_reads')) {
      return [{ affectedRows: 3 }];
    }
    throw new Error(`Unexpected notification test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = signInTestUser({ id: 7, role: 'Community Organizer', school_id: 91 });
  const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/notifications${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const markUnread = await request('/12/read', {
    method: 'PATCH',
    body: JSON.stringify({ isRead: false }),
  });
  assert.equal(markUnread.status, 200);
  assert.deepEqual(await markUnread.json(), { success: true, isRead: false, changed: 2 });
  assert.match(calls[0].sql, /n\.school_id = \? OR FIND_IN_SET\(\?, n\.school_scope_ids\)/);
  assert.deepEqual(calls[0].params, ['7', 91, 91, 'User Management', '7', 12]);
  assert.match(calls[1].sql, /DELETE FROM notification_reads WHERE notification_id = \? AND user_id = \?/);
  assert.deepEqual(calls[1].params, [12, 7]);

  const markRead = await request('/12/read', {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
  assert.equal(markRead.status, 200);
  assert.deepEqual(await markRead.json(), { success: true, isRead: true, changed: 3 });
  assert.match(calls[3].sql, /INSERT IGNORE INTO notification_reads \(notification_id, user_id\) VALUES/);
  assert.deepEqual(calls[3].params, [12, 7]);

  const bulkUnread = await request('/bulk-read', {
    method: 'POST',
    body: JSON.stringify({ ids: [12, 13], isRead: false }),
  });
  assert.equal(bulkUnread.status, 200);
  assert.deepEqual(await bulkUnread.json(), { success: true, isRead: false, changed: 2 });
  assert.match(calls[4].sql, /INNER JOIN notifications n/);
  assert.match(calls[4].sql, /n\.school_id = \? OR FIND_IN_SET\(\?, n\.school_scope_ids\)/);
  assert.deepEqual(calls[4].params, [7, '7', 91, 91, 'User Management', '7', 12, 13]);

  const bulkRead = await request('/bulk-read', {
    method: 'POST',
    body: JSON.stringify({ ids: [12, 13], isRead: true }),
  });
  assert.equal(bulkRead.status, 200);
  assert.deepEqual(await bulkRead.json(), { success: true, isRead: true, changed: 3 });
  assert.match(calls[5].sql, /INSERT IGNORE INTO notification_reads/);
  assert.deepEqual(calls[5].params, [7, 7, '7', 91, 91, 'User Management', '7', 12, 13]);

  const readAll = await request('/read-all', { method: 'POST' });
  assert.equal(readAll.status, 200);
  assert.deepEqual(await readAll.json(), { success: true, changed: 3 });
  assert.match(calls[6].sql, /INSERT IGNORE INTO notification_reads/);
  assert.match(calls[6].sql, /nr\.notification_id IS NULL/);
  assert.deepEqual(calls[6].params, [7, 7, '7', 91, 91, 'User Management', '7']);
});

test('notification summary counts remain scoped but independent of list filters', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return getTestSessionRows(params);
    calls.push({ sql, params });
    if (sql.includes('SUM(nr.notification_id IS NOT NULL)')) {
      return [[{ total: 7, readCount: 2, unreadCount: 5 }]];
    }
    if (sql.includes('SELECT COUNT(*) AS total')) return [[{ total: 1 }]];
    if (sql.includes('SELECT n.id, n.event_type')) {
      return [[{
        id: 12,
        title: 'School updated',
        category: 'Community',
        message: 'A school was updated.',
        isRead: false,
      }]];
    }
    throw new Error(`Unexpected notification test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = signInTestUser({ id: 7, role: 'Community Organizer', school_id: 91 });
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/notifications?category=Community&search=school&readStatus=unread`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 1);
  assert.deepEqual(body.counts, { all: 7, read: 2, unread: 5 });
  assert.equal(body.notifications.length, 1);
  assert.deepEqual(calls[0].params, [7, '7', 91, 91, 'User Management', '7']);
  assert.match(calls[0].sql, /np\.user_id = \? AND np\.category = n\.category AND np\.enabled = FALSE/);
  assert.match(calls[1].sql, /np\.user_id = \? AND np\.category = n\.category AND np\.enabled = FALSE/);
  assert.doesNotMatch(calls[0].sql, /n\.category = \?|LIKE \?/);
});

test('notification preferences are role-scoped and persist category visibility', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return getTestSessionRows(params);
    calls.push({ sql, params });
    if (sql.startsWith('SELECT category, enabled FROM notification_preferences')) {
      return [[{ category: 'Community', enabled: 0 }]];
    }
    if (sql.startsWith('INSERT INTO notification_preferences')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected notification preference SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = signInTestUser({ id: 7, role: 'Community Organizer', school_id: 91 });
  const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/notifications${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const getResponse = await request('/preferences');
  assert.equal(getResponse.status, 200);
  const { preferences } = await getResponse.json();
  assert.equal(preferences.length, 5);
  assert.equal(preferences.find(({ category }) => category === 'Community').enabled, false);
  assert.equal(preferences.find(({ category }) => category === 'Programs').enabled, true);
  assert.deepEqual(calls[0].params, [7, 'Beneficiaries', 'Monitoring', 'Programs', 'Downloads', 'Community']);

  const saved = await request('/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences: [{ category: 'Community', enabled: false }] }),
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), {
    success: true,
    preferences: [{ category: 'Community', enabled: false }],
  });
  assert.deepEqual(calls[1].params, [7, 'Community', false]);
  assert.match(calls[1].sql, /ON DUPLICATE KEY UPDATE enabled = VALUES\(enabled\)/);

  const unsupported = await request('/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences: [{ category: 'User Management', enabled: false }] }),
  });
  assert.equal(unsupported.status, 400);
  assert.equal(calls.length, 2);
});

test('notification bulk read endpoint rejects invalid input and unauthorized records stay hidden', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return getTestSessionRows(params);
    if (sql.includes('SELECT n.id') && sql.includes('FROM notifications n')) return [[]];
    throw new Error(`Unexpected notification test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = signInTestUser({ id: 7, role: 'Community Organizer', school_id: 91 });
  const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/notifications${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const invalidIds = await request('/bulk-read', {
    method: 'POST',
    body: JSON.stringify({ ids: [0], isRead: true }),
  });
  assert.equal(invalidIds.status, 400);

  const invalidState = await request('/42/read', {
    method: 'PATCH',
    body: JSON.stringify({ isRead: 'true' }),
  });
  assert.equal(invalidState.status, 400);

  const inaccessible = await request('/42/read', {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
  assert.equal(inaccessible.status, 404);
});

test('progress report downloads are recorded for every role allowed to export', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const insertedNotifications = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return getTestSessionRows(params);
    if (sql.startsWith('INSERT INTO notifications')) {
      insertedNotifications.push(params);
      return [{ insertId: insertedNotifications.length }];
    }
    if (sql.startsWith('INSERT IGNORE INTO activity_logs')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected notification test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  for (const [id, role] of [
    [21, 'Admin'],
    [22, 'Community Coordinator'],
    [23, 'Partner'],
    [24, 'Health worker'],
  ]) {
    const token = signInTestUser({ id, role, school_id: 91, group_id: 92 });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/notifications/download-success`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 201, `${role} should be able to record a report export`);
    assert.deepEqual(await response.json(), { success: true });
  }

  assert.equal(insertedNotifications.length, 4);
  assert.ok(insertedNotifications.every((params) => params[0] === 'download.progress_report.csv'));
  assert.ok(insertedNotifications.every((params) => params[2] === 'Progress report download started'));
  assert.equal(insertedNotifications[1][7], 91);
  assert.equal(insertedNotifications[1][11], 22);
  assert.equal(insertedNotifications[3][7], 91);
  assert.equal(insertedNotifications[3][11], 24);
});
