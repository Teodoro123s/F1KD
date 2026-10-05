const test = require('node:test');
const assert = require('node:assert/strict');
const { createSuperadminNotification, getBeneficiaryUpdateRecipients } = require('../services/notifications');

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
    null,
    7,
  ]);
});

test('records recipient user ids and resolves the editing worker with school coordinators', async () => {
  const calls = [];
  const database = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [[{ id: 12 }, { id: 13 }, { id: 12 }]];
    },
  };

  const recipients = await getBeneficiaryUpdateRecipients(database, 5, 7);
  assert.deepEqual(recipients, [7, 12, 13]);
  assert.match(calls[0].sql, /school_id = \?/);
  assert.match(calls[0].sql, /LOWER\(TRIM\(status\)\) = 'active'/);
  assert.match(calls[0].sql, /'partner'/);
  assert.deepEqual(calls[0].params, [5]);

  await createSuperadminNotification({ message: 'Mother updated', recipientUserIds: recipients }, database);
  assert.equal(calls[1].params[10], '7,12,13');
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