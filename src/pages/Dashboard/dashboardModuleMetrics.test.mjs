import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardModuleSummaries,
  buildOperationalStaffMetrics,
  getBatchChildMonitoringProgress,
  getIncompleteBatchProgressOptions,
} from './dashboardModuleMetrics.mjs';

test('builds scoped monitoring, projects, and progress summaries', () => {
  const modules = buildDashboardModuleSummaries({
    mothers: [
      { checkups: [[{ checkupDate: '2026-05-18', developmentalStatus: 'Needs Follow-up' }]] },
      { checkups: [[null]] },
    ],
    children: [
      {
        batchId: 7,
        completedWeeks: Array.from({ length: 24 }, (_, index) => index + 1),
        checkups: [{ checkupDate: '2026-04-25', developmental_status: 'At Risk' }],
      },
      {
        batchId: 7,
        completedWeeks: Array.from({ length: 23 }, (_, index) => index + 1),
        checkups: [],
      },
    ],
    programs: [
      { status: 'Active', received: 8, target: 10 },
      { status: 'Ended', received: 20, target: 20 },
    ],
    now: new Date(2026, 4, 21),
  });

  assert.deepEqual(modules.map((module) => module.key), [
    'monitoring',
    'batch-progress',
    'projects',
  ]);
  assert.equal(modules[0].title, 'Monitoring');
  assert.deepEqual(modules[0].metrics.map(({ value }) => value), [1, 3, 1, 0, 0, 1]);
  assert.deepEqual(modules[0].metrics.slice(2).map(({ label, to }) => [label, to]), [
    ['Mothers needing follow-up', '/monitoring?beneficiaryType=Mother&screening=Needs%20Follow-up'],
    ['Mothers at risk', '/monitoring?beneficiaryType=Mother&screening=At%20Risk'],
    ['Children needing follow-up', '/monitoring?beneficiaryType=Child&screening=Needs%20Follow-up'],
    ['Children at risk', '/monitoring?beneficiaryType=Child&screening=At%20Risk'],
  ]);
  assert.deepEqual(modules[2].metrics.map(({ label, value }) => [label, value]), [
    ['Active projects', 1],
    ['Total projects', 2],
  ]);
  assert.equal(modules[2].to, '/program');
  assert.deepEqual(modules[1].metrics.map(({ value }) => value), ['50%']);
  assert.match(modules[1].note, /1 of 2 children completed all 24 monitoring months/);
  assert.equal(modules.some((module) => module.key === 'beneficiaries'), false);
});

test('shows unavailable project counts when project data fails to load', () => {
  const modules = buildDashboardModuleSummaries({
    programs: [{ status: 'Active' }],
    programsAvailable: false,
  });
  const projects = modules.find((module) => module.key === 'projects');

  assert.deepEqual(projects.metrics.map(({ value }) => value), ['—', '—']);
});

test('batch monitoring progress counts distinct completed months only for batched children', () => {
  const children = [
    { batchId: 7, completedWeeks: [...Array.from({ length: 23 }, (_, index) => index + 1), 23] },
    { batchId: 8, checkups: Array.from({ length: 24 }, (_, index) => ({ week_number: index + 1 })) },
    { completedWeeks: Array.from({ length: 24 }, (_, index) => index + 1) },
  ];

  assert.deepEqual(getBatchChildMonitoringProgress(children), {
    completed: 1,
    total: 2,
    percentage: 50,
  });
  assert.deepEqual(getBatchChildMonitoringProgress([]), {
    completed: 0,
    total: 0,
    percentage: null,
  });
});

test('batch progress options exclude completed batches and provide batch names', () => {
  const completedMonths = Array.from({ length: 24 }, (_, index) => index + 1);
  const partialMonths = Array.from({ length: 12 }, (_, index) => index + 1);
  const options = getIncompleteBatchProgressOptions([
    { batchId: 7, completedWeeks: completedMonths },
    { batchId: 8, batch_name: 'Group B Batch', completedWeeks: partialMonths },
    { batch_id: 8, completedWeeks: [] },
    { completedWeeks: partialMonths },
  ], [
    { id: 7, name: 'Completed Batch' },
    { id: 8, name: 'Group B Batch' },
  ]);

  assert.deepEqual(options, [{
    id: '8',
    name: 'Group B Batch',
    completed: 0,
    total: 2,
    percentage: 0,
  }]);
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
    staffMetrics: { active: 3, suspended: 2, unassigned: 0 },
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
  assert.deepEqual(organizerModules.at(-1).metrics.map(({ label, value }) => [label, value]), [
    ['Active health workers', 3],
    ['Suspended health workers', 2],
  ]);
  assert.equal(otherRoleModules.some((module) => module.key === 'users'), false);
});
