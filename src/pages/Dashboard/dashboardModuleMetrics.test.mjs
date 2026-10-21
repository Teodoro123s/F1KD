import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDashboardModuleSummaries, buildOperationalStaffMetrics } from './dashboardModuleMetrics.mjs';

test('builds scoped beneficiary, monitoring, program, and progress summaries', () => {
  const modules = buildDashboardModuleSummaries({
    mothers: [
      { checkups: [[{ checkupDate: '2026-05-18' }]] },
      { checkups: [[null]] },
    ],
    children: [
      { checkups: [{ checkupDate: '2026-04-25' }] },
    ],
    programs: [
      { status: 'Active', received: 8, target: 10 },
      { status: 'Ended', received: 20, target: 20 },
    ],
    now: new Date(2026, 4, 21),
  });

  assert.deepEqual(modules.map((module) => module.key), [
    'beneficiaries',
    'monitoring',
    'programs',
    'progress',
  ]);
  assert.deepEqual(modules[0].metrics.slice(0, 3).map(({ value }) => value), [3, 2, 1]);
  assert.deepEqual(modules[1].metrics.map(({ value }) => value), [1, 2]);
  assert.deepEqual(modules[2].metrics.map(({ value }) => value), [1, '8 / 10']);
  assert.deepEqual(modules[3].metrics.map(({ value }) => value), [2, 3, '67%']);
});

test('limits Superadmin summaries to its available modules', () => {
  const superAdminModules = buildDashboardModuleSummaries({
    isSuperAdmin: true,
    staffMetrics: { total: 8, active: 5, suspended: 2, unassigned: 1 },
    communityMetrics: { schools: 4, groups: 9 },
    reportMetrics: { signIns: 120, signInsLast30Days: 36 },
    notificationMetrics: { all: 7, unread: 2 },
  });

  test('counts only operational roles that require school or group assignments as unassigned', () => {
    const metrics = buildOperationalStaffMetrics([
      { role: 'Admin', status: 'Active' },
      { role: 'Partner', status: 'Active' },
      { role: 'Community Organizer', status: 'Active' },
      { role: 'Health worker', status: 'Active', school_id: 4 },
      { role: 'Health worker', status: 'Active', school_id: 4, group_id: 8 },
      { role: 'Community Organizer', status: 'Suspended' },
    ]);

    assert.deepEqual(metrics, {
      total: 6,
      active: 5,
      suspended: 1,
      unassigned: 2,
    });
  });
  const organizerModules = buildDashboardModuleSummaries({
    isCommunityOrganizer: true,
    staffMetrics: { active: 3, suspended: 0, unassigned: 0 },
  });
  const otherRoleModules = buildDashboardModuleSummaries();

  assert.deepEqual(superAdminModules.map((module) => module.key), [
    'users',
    'community',
    'reports',
    'notifications',
  ]);
  assert.deepEqual(superAdminModules.map((module) => module.to), [
    '/user-management',
    '/community',
    '/reports',
    '/notifications',
  ]);
  assert.deepEqual(superAdminModules.map((module) => module.metrics.flatMap(({ value }) => value)), [
    [8, 5, 2, 1],
    [4, 9],
    [120, 36],
    [2, 7],
  ]);
  assert.equal(superAdminModules.some((module) => /beneficiar|program|monitor|progress/i.test(module.key)), false);
  assert.equal(organizerModules.at(-1).key, 'users');
  assert.deepEqual(organizerModules.at(-1).metrics.map(({ value }) => value), [3]);
  assert.equal(otherRoleModules.some((module) => module.key === 'users'), false);
});
