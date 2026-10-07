const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRole,
  authorizeOperational,
  authorizeProgressReport,
  retainHealthFields,
} = require('../middleware/authorize');

function responseMock() {
  return {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function authorizeRequest({ role, baseUrl, method = 'GET', path = '/', school_id = 7, group_id = null, body }) {
  const req = { user: { role, school_id, group_id }, baseUrl, method, path, body };
  const res = responseMock();
  let called = false;
  authorizeOperational(req, res, () => { called = true; });
  return { req, res, called };
}

test('normalizeRole maps common role labels to canonical values', () => {
  assert.equal(normalizeRole('Super Admin'), 'super_admin');
  assert.equal(normalizeRole('Administrator'), 'admin');
  assert.equal(normalizeRole('Community Organizer'), 'community_coordinator');
  assert.equal(normalizeRole('Community Coordinator'), 'community_coordinator');
  assert.equal(normalizeRole('Health worker'), 'health_worker');
});

test('operational API modules follow the role access matrix', () => {
  const cases = [
    ['Super Admin', '/api/community', true],
    ['Super Admin', '/api/mothers', false],
    ['Super Admin', '/api/children', false],
    ['Super Admin', '/api/programs', false],
    ['Super Admin', '/api/progress-report', false],
    ['Super Admin', '/api/documents', false],
    ['Admin', '/api/community', true],
    ['Admin', '/api/mothers', true],
    ['Admin', '/api/children', true],
    ['Admin', '/api/programs', true],
    ['Admin', '/api/progress-report', false],
    ['Community Coordinator', '/api/community', true],
    ['Community Coordinator', '/api/mothers', true],
    ['Community Coordinator', '/api/children', true],
    ['Community Coordinator', '/api/progress-report', true],
    ['Community Coordinator', '/api/programs', true],
    ['Partner', '/api/programs', true],
    ['Partner', '/api/progress-report', true],
    ['Partner', '/api/community', false],
    ['Partner', '/api/mothers', false],
    ['Health worker', '/api/mothers', true],
    ['Health worker', '/api/children', true],
    ['Health worker', '/api/community', false],
    ['Health worker', '/api/programs', false],
    ['Health worker', '/api/progress-report', false],
  ];

  for (const [role, baseUrl, allowed] of cases) {
    const { req, res, called } = authorizeRequest({ role, baseUrl });
    assert.equal(called, allowed, `${role} access to ${baseUrl}`);
    assert.equal(res.code, allowed ? undefined : 403);
    if (allowed && role !== 'Super Admin') {
      assert.equal(req.schoolId, 7);
    }
  }
});

test('all non-superadmin operational access requires an assigned school', () => {
  for (const role of ['Admin', 'Community Coordinator', 'Partner', 'Health worker']) {
    const { called, res } = authorizeRequest({
      role,
      baseUrl: role === 'Partner' ? '/api/programs' : '/api/mothers',
      school_id: null,
    });
    assert.equal(called, false, `${role} without assignment`);
    assert.equal(res.code, 403);
    assert.equal(res.payload.message, 'This account is not assigned to a school');
  }
});

test('superadmins have global scope while other roles are forced to assigned scope', () => {
  const superadmin = authorizeRequest({ role: 'Super Admin', baseUrl: '/api/community', school_id: 44 });
  assert.equal(superadmin.called, true);
  assert.equal(superadmin.req.schoolId, null);
  assert.equal(superadmin.req.groupId, null);

  const partner = authorizeRequest({
    role: 'Partner',
    baseUrl: '/api/programs',
    school_id: 7,
    group_id: 15,
  });

  test('superadmins are denied progress report API access', () => {
    const req = { user: { role: 'Super Admin' } };
    const res = responseMock();
    let called = false;

    authorizeProgressReport(req, res, () => { called = true; });

    assert.equal(called, false);
    assert.equal(res.code, 403);
  });
  assert.equal(partner.called, true);
  assert.equal(partner.req.schoolId, 7);
  assert.equal(partner.req.groupId, null);

  const healthWorker = authorizeRequest({
    role: 'Health worker',
    baseUrl: '/api/children',
    school_id: 7,
    group_id: 15,
  });
  assert.equal(healthWorker.called, true);
  assert.equal(healthWorker.req.schoolId, 7);
  assert.equal(healthWorker.req.groupId, 15);
});

test('Admin and Partner are read-only', () => {
  for (const [role, baseUrl, method, path] of [
    ['Admin', '/api/community', 'POST', '/groups'],
    ['Admin', '/api/mothers', 'PUT', '/MTH-1'],
    ['Partner', '/api/programs', 'PATCH', '/4/monitoring'],
  ]) {
    const { called, res } = authorizeRequest({ role, baseUrl, method, path });
    assert.equal(called, false, `${role} ${method} ${baseUrl}${path}`);
    assert.equal(res.code, 403);
    assert.equal(res.payload.message, 'This role has read-only access to this module');
  }

  const partnerReportWrite = authorizeRequest({
    role: 'Partner',
    baseUrl: '/api/progress-report',
    method: 'POST',
    path: '/',
  });
  assert.equal(partnerReportWrite.called, false);
  assert.equal(partnerReportWrite.res.code, 403);
  assert.equal(partnerReportWrite.res.payload.message, 'Progress reports are read-only');
});

test('Community Coordinators can manage assigned groups and batches but cannot mutate schools', () => {
  for (const path of ['/batches', '/groups']) {
    const result = authorizeRequest({
      role: 'Community Organizer',
      baseUrl: '/api/community',
      method: 'POST',
      path,
    });
    assert.equal(result.called, true);
    assert.equal(result.req.isCommunityOrganizer, true);
  }

  for (const [method, path] of [
    ['POST', '/communities'],
    ['PUT', '/communities/7'],
    ['DELETE', '/communities/7'],
  ]) {
    const { called, res } = authorizeRequest({
      role: 'Community Coordinator',
      baseUrl: '/api/community',
      method,
      path,
    });

    assert.equal(called, false);
    assert.equal(res.code, 403);
  }
});

test('Progress report endpoints are read-only for all permitted roles', () => {
  for (const role of ['Community Coordinator', 'Partner']) {
    const { called, res } = authorizeRequest({
      role,
      baseUrl: '/api/progress-report',
      method: 'POST',
      path: '/',
    });
    assert.equal(called, false, `${role} cannot mutate progress reports`);
    assert.equal(res.code, 403);
    assert.equal(res.payload.message, 'Progress reports are read-only');
  }
});

test('Health Workers can write only beneficiary health workflows', () => {
  for (const [baseUrl, method, path] of [
    ['/api/mothers', 'PUT', '/MTH-1'],
    ['/api/mothers', 'POST', '/MTH-1/checkups'],
    ['/api/children', 'PUT', '/CH-1'],
    ['/api/children', 'POST', '/CH-1/checkups'],
  ]) {
    const { called } = authorizeRequest({
      role: 'Health worker',
      baseUrl,
      method,
      path,
      group_id: 15,
    });
    assert.equal(called, true, `${method} ${baseUrl}${path}`);
  }

  for (const [baseUrl, method, path] of [
    ['/api/mothers', 'POST', '/'],
    ['/api/mothers', 'POST', '/MTH-1/documents'],
    ['/api/children', 'POST', '/'],
    ['/api/children', 'POST', '/CH-1/documents'],
    ['/api/programs', 'PATCH', '/4/monitoring'],
    ['/api/community', 'POST', '/groups'],
  ]) {
    const { called } = authorizeRequest({
      role: 'Health worker',
      baseUrl,
      method,
      path,
      group_id: 15,
    });
    assert.equal(called, false, `${method} ${baseUrl}${path}`);
  }
});

test('Health Worker profile updates strip demographic and assignment fields', () => {
  const mother = authorizeRequest({
    role: 'Health worker',
    baseUrl: '/api/mothers',
    method: 'PUT',
    path: '/MTH-1',
    group_id: 15,
    body: {
      firstName: 'Changed',
      address: 'Changed address',
      groupId: 999,
      lmpDate: '2026-01-02',
      medicalConditions: { anemia: true },
    },
  });
  assert.deepEqual(mother.req.body, {
    lmpDate: '2026-01-02',
    medicalConditions: { anemia: true },
  });

  const child = authorizeRequest({
    role: 'Health worker',
    baseUrl: '/api/children',
    method: 'PUT',
    path: '/CH-1',
    group_id: 15,
    body: {
      firstName: 'Changed',
      motherId: 999,
      birthWeight: 3.1,
      bcgDose1: '2026-01-02',
    },
  });
  assert.deepEqual(child.req.body, { birthWeight: 3.1, bcgDose1: '2026-01-02' });
  assert.deepEqual(retainHealthFields({ address: 'private', healthStatus: 'Healthy' }, ['healthStatus']), {
    healthStatus: 'Healthy',
  });
});

test('Progress Report is available only to Community Coordinator and Partner', () => {
  for (const role of ['Community Coordinator', 'Partner']) {
    let called = false;
    authorizeProgressReport({ user: { role } }, {}, () => { called = true; });
    assert.equal(called, true, role);
  }
  for (const role of ['Super Admin', 'Admin', 'Health worker', 'viewer']) {
    const res = responseMock();
    let called = false;
    authorizeProgressReport({ user: { role } }, res, () => { called = true; });
    assert.equal(called, false, role);
    assert.equal(res.code, 403);
  }
});
