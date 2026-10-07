import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessModule, can, ROLES } from './permissions.js';

test('module access matches the role allocation', () => {
  const access = {
    [ROLES.SUPER_ADMIN]: ['dashboard', 'community', 'notifications', 'userManagement'],
    [ROLES.ADMIN]: ['dashboard', 'community', 'beneficiary', 'monitoring', 'notifications', 'program'],
    [ROLES.COMMUNITY_COORDINATOR]: ['dashboard', 'community', 'beneficiary', 'monitoring', 'notifications', 'program', 'progressReport'],
    [ROLES.PARTNER]: ['dashboard', 'notifications', 'program', 'progressReport'],
    [ROLES.HEALTH_WORKER]: ['dashboard', 'beneficiary', 'monitoring', 'notifications'],
  };

  for (const role of Object.values(ROLES)) {
    for (const module of [
      'dashboard',
      'community',
      'beneficiary',
      'monitoring',
      'notifications',
      'program',
      'progressReport',
      'userManagement',
    ]) {
      assert.equal(canAccessModule(role, module), access[role].includes(module), `${role} -> ${module}`);
    }
  }
});

test('read-only and beneficiary write permissions are role-specific', () => {
  assert.equal(can(ROLES.ADMIN, 'program-resources', 'read'), true);
  assert.equal(can(ROLES.ADMIN, 'program-resources', 'update'), false);
  assert.equal(can(ROLES.PARTNER, 'progress-report', 'create'), false);
  assert.equal(can(ROLES.HEALTH_WORKER, 'beneficiary-resources', 'update'), true);
  assert.equal(can(ROLES.HEALTH_WORKER, 'beneficiary-resources', 'create'), false);
  assert.equal(can(ROLES.COMMUNITY_COORDINATOR, 'beneficiary-resources', 'create'), true);
  assert.equal(can(ROLES.COMMUNITY_COORDINATOR, 'program-resources', 'create'), true);
  assert.equal(can(ROLES.SUPER_ADMIN, 'beneficiary-resources', 'read'), false);
  assert.equal(can(ROLES.SUPER_ADMIN, 'program-resources', 'read'), false);
  assert.equal(can(ROLES.SUPER_ADMIN, 'progress-report', 'read'), false);
});

test('CRUD permissions match actual role capabilities', () => {
  const expected = {
    'user-management': {
      read: [ROLES.SUPER_ADMIN],
      create: [ROLES.SUPER_ADMIN],
      update: [ROLES.SUPER_ADMIN],
      delete: [ROLES.SUPER_ADMIN],
    },
    'community-resources': {
      read: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR],
      create: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
      update: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
      delete: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
    },
    'beneficiary-resources': {
      read: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
      create: [ROLES.COMMUNITY_COORDINATOR],
      update: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
      delete: [ROLES.COMMUNITY_COORDINATOR],
    },
    'program-resources': {
      read: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER],
      create: [ROLES.COMMUNITY_COORDINATOR],
      update: [ROLES.COMMUNITY_COORDINATOR],
      delete: [ROLES.COMMUNITY_COORDINATOR],
    },
    'monitor-resources': {
      read: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
      create: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
      update: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
      delete: [ROLES.COMMUNITY_COORDINATOR],
    },
    'progress-report': {
      read: [ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER],
    },
  };

  for (const [resource, actions] of Object.entries(expected)) {
    for (const action of ['read', 'create', 'update', 'delete']) {
      for (const role of Object.values(ROLES)) {
        assert.equal(
          can(role, resource, action),
          actions[action]?.includes(role) || false,
          `${role} -> ${resource} ${action}`,
        );
      }
    }
  }
});
