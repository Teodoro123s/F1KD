const test = require('node:test');
const assert = require('node:assert/strict');
const { createSuperadminNotification } = require('../services/notifications');

test('records notification event details in the notifications table', async () => {
  const calls = [];
  const database = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [{ insertId: 12 }];
    },
  };

  await createSuperadminNotification({
    eventType: 'user.created',
    category: 'User Management',
    title: 'User created',
    message: 'User account created: Example User (Partner).',
    entityType: 'user',
    entityId: 44,
    linkTo: '/user-management/user/44',
    schoolId: 5,
    groupId: 3,
    schoolIds: [5, 6, 5],
    actorUserId: 7,
  }, database);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO notifications/);
  assert.deepEqual(calls[0].params, [
    'user.created',
    'User Management',
    'User created',
    'User account created: Example User (Partner).',
    'user',
    '44',
    '/user-management/user/44',
    5,
    3,
    '5,6',
    7,
  ]);
});

test('skips empty events and does not throw if notification storage fails', async () => {
  let calls = 0;
  const database = {
    async query() {
      calls += 1;
      throw new Error('database unavailable');
    },
  };

  await createSuperadminNotification({ message: '   ' }, database);
  await createSuperadminNotification({ message: 'A committed action.' }, database);

  assert.equal(calls, 1);
});