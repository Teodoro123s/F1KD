const test = require('node:test');
const assert = require('node:assert/strict');
const { getNotificationScope, getNotificationFilters } = require('../services/notificationAccess');

test('Superadmins receive global notification scope', () => {
  assert.deepEqual(getNotificationScope({ role: 'super_admin', school_id: 4 }), {
    global: true,
    schoolId: null,
    superAdmin: true,
    categories: ['Community', 'User Management'],
  });
});

test('Admins receive global scope without user-management notifications', () => {
  assert.deepEqual(getNotificationScope({ role: 'Admin' }), {
    global: true,
    schoolId: null,
    excludeUserManagement: true,
  });
});

test('Community Organizers receive only their assigned school scope', () => {
  assert.deepEqual(getNotificationScope({ role: 'Community Organizer', school_id: 4 }), {
    global: false,
    schoolId: 4,
    excludeUserManagement: true,
  });
});

test('Partners receive global notification scope without user-management notifications', () => {
  assert.deepEqual(getNotificationScope({ role: 'Partner' }), {
    global: true,
    schoolId: null,
    excludeUserManagement: true,
  });
});

test('Health workers receive monitoring scope for their assigned school and group', () => {
  assert.deepEqual(getNotificationScope({ role: 'Health worker', school_id: 4, group_id: 9 }), {
    global: false,
    schoolId: 4,
    groupId: 9,
    healthWorker: true,
  });
});

test('unassigned Community Organizers have no school scope', () => {
  assert.deepEqual(getNotificationScope({ role: 'community_coordinator', school_id: null }), {
    global: false,
    schoolId: null,
    excludeUserManagement: true,
  });
});

test('unsupported roles cannot receive notifications', () => {
  assert.equal(getNotificationScope({ role: 'viewer', school_id: 4 }), null);
});

test('notification filters apply recipient, assigned-school, category, and search constraints', () => {
  const filters = getNotificationFilters(
    { id: 14, role: 'Community Organizer', school_id: 4 },
    { category: 'Community', search: 'group created' },
  );

  assert.match(filters.where, /recipient_user_ids/);
  assert.match(filters.where, /school_scope_ids/);
  assert.match(filters.where, /n\.category = \?/);
  assert.match(filters.where, /n\.title LIKE \?/);
  assert.deepEqual(filters.params, [
    '14',
    4,
    4,
    'User Management',
    'Community',
    '%group created%',
    '%group created%',
    '%group created%',
    '%group created%',
    '%group created%',
  ]);
});

test('unassigned school-scoped users receive no notification filters', () => {
  const filters = getNotificationFilters({ id: 14, role: 'health_worker', school_id: null });
  assert.equal(filters.where, '1 = 0');
  assert.deepEqual(filters.params, []);
});