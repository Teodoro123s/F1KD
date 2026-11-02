import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageGuide,
  getRoleFlow,
  GUIDE_ROLES,
  normalizeGuideRole,
  PAGE_GUIDES,
  ROLE_FLOW,
  ROLE_TOURS,
} from './kinFlowGuides.mjs';

test('Kin flow guides cover every application role', () => {
  const roles = Object.keys(GUIDE_ROLES);
  assert.deepEqual(Object.keys(ROLE_TOURS).sort(), [...roles].sort());
  assert.deepEqual(ROLE_FLOW.map((item) => item.role).sort(), [...roles].sort());

  ROLE_FLOW.forEach((item) => {
    assert.ok(item.once.length > 0, `${item.role} needs once-only guidance`);
    assert.ok(item.daily.length > 0, `${item.role} needs daily guidance`);
    assert.ok(item.weekly.length > 0, `${item.role} needs weekly guidance`);
  });
});

test('every role tour has a page path and a spotlight target for each step', () => {
  Object.entries(ROLE_TOURS).forEach(([role, steps]) => {
    assert.ok(steps.length > 0, `${role} needs tour steps`);
    steps.forEach((step) => {
      assert.ok(step.to.startsWith('/'), `${role} tour path must be internal`);
      assert.ok(step.target, `${role} tour step needs a page target`);
      assert.ok(step.title && step.body, `${role} tour step needs plain-language guidance`);
    });
  });
});

test('page explanations include every primary application section', () => {
  const paths = [
    '/dashboard',
    '/community',
    '/beneficiary',
    '/monitoring',
    '/program',
    '/progress-report',
    '/user-management',
    '/reports',
    '/archive',
    '/notifications',
    '/profile',
    '/settings',
    '/ai-setting',
  ];

  paths.forEach((path) => {
    assert.notEqual(getPageGuide(path).title, 'This page', `${path} needs an explanation`);
  });
  assert.ok(PAGE_GUIDES.length >= paths.length);
});

test('role names normalize across labels used by the app', () => {
  assert.equal(normalizeGuideRole('Super Admin'), 'super_admin');
  assert.equal(normalizeGuideRole('Community Coordinator'), 'community_coordinator');
  assert.equal(normalizeGuideRole('Health Worker'), 'health_worker');
});

test('workflow guidance is selected from the signed-in account role', () => {
  Object.keys(GUIDE_ROLES).forEach((role) => {
    assert.equal(getRoleFlow(role).role, role);
  });
  assert.equal(getRoleFlow('Community Organizer').role, 'community_coordinator');
  assert.equal(getRoleFlow('Unknown Role'), undefined);
});

test('community guidance distinguishes coordinator setup from school administration', () => {
  const coordinatorGuide = getPageGuide('/community', 'community_coordinator');
  const superAdminGuide = getPageGuide('/community', 'super_admin');
  const healthWorkerGuide = getPageGuide('/community', 'health_worker');

  assert.match(coordinatorGuide.description, /Your assigned school is already selected/);
  assert.match(coordinatorGuide.description, /already selected/);
  assert.ok(coordinatorGuide.sections.some((section) => section.title === 'Groups in your school'));
  assert.ok(!coordinatorGuide.sections.some((section) => section.text.includes('Create School')));

  assert.ok(superAdminGuide.sections.some((section) => section.text.includes('Create School')));
  assert.ok(!healthWorkerGuide.sections.some((section) => section.target === 'community-create'));
});

test('coordinator setup uses the automatic school assignment', () => {
  const coordinatorFlow = ROLE_FLOW.find((item) => item.role === 'community_coordinator');
  const tourStep = ROLE_TOURS.community_coordinator[0];

  assert.ok(!coordinatorFlow.once[0].path.includes('Select a school'));
  assert.match(tourStep.title, /assigned school/i);
  assert.match(tourStep.body, /already assigned/i);
  assert.ok(!tourStep.points.some((point) => /choose a school/i.test(point)));
});

test('creation and check-up guidance follows role permissions', () => {
  const coordinatorBeneficiaryGuide = getPageGuide('/beneficiary', 'community_coordinator');
  const partnerBeneficiaryGuide = getPageGuide('/beneficiary', 'partner');
  const healthWorkerMonitoringGuide = getPageGuide('/monitoring', 'health_worker');
  const partnerMonitoringGuide = getPageGuide('/monitoring', 'partner');

  assert.ok(coordinatorBeneficiaryGuide.sections.some((section) => section.target === 'beneficiary-create'));
  assert.ok(!partnerBeneficiaryGuide.sections.some((section) => section.target === 'beneficiary-create'));
  assert.match(healthWorkerMonitoringGuide.description, /record or update a check-up/);
  assert.match(partnerMonitoringGuide.description, /does not allow editing check-ups/);
});
