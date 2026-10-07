import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessModule, can, ROLES } from './permissions.js';

test('module access matches the role allocation', () => {
  const access = {
    [ROLES.SUPER_ADMIN]: ['dashboard', 'community', 'beneficiary', 'monitoring', 'notifications', 'program', 'progressReport', 'userManagement'],
    [ROLES.ADMIN]: ['dashboard', 'community', 'beneficiary', 'monitoring', 'notifications', 'program'],
    [ROLES.COMMUNITY_COORDINATOR]: ['dashboard', 'community', 'beneficiary', 'monitoring', 'notifications', 'progressReport'],
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
});
