import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDashboardModuleSummaries } from './dashboardModuleMetrics.mjs';

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

test('limits User Management summaries to roles with user-management data', () => {
  const superAdminModules = buildDashboardModuleSummaries({
    isSuperAdmin: true,
    staffMetrics: { active: 5, suspended: 2, unassigned: 1 },
  });
  const organizerModules = buildDashboardModuleSummaries({
    isCommunityOrganizer: true,
    staffMetrics: { active: 3, suspended: 0, unassigned: 0 },
  });
  const otherRoleModules = buildDashboardModuleSummaries();

  assert.deepEqual(superAdminModules.map((module) => module.key), ['users']);
  assert.deepEqual(superAdminModules[0].metrics.map(({ value }) => value), [5, 2, 1]);
  assert.equal(organizerModules.at(-1).key, 'users');
  assert.deepEqual(organizerModules.at(-1).metrics.map(({ value }) => value), [3]);
  assert.equal(otherRoleModules.some((module) => module.key === 'users'), false);
});
