const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, authorizeOperational, authorizeProgressReport } = require('../middleware/authorize');

test('normalizeRole maps common role labels to canonical values', () => {
  assert.equal(normalizeRole('Super Admin'), 'super_admin');
  assert.equal(normalizeRole('Administrator'), 'admin');
  assert.equal(normalizeRole('Community Organizer'), 'community_coordinator');
  assert.equal(normalizeRole('Community Coordinator'), 'community_coordinator');
  assert.equal(normalizeRole('Health worker'), 'health_worker');
});

test('authorizeProgressReport allows operational roles and denies super admins', () => {
  for (const role of ['Admin', 'Partner', 'Community Coordinator', 'Health worker']) {
    let called = false;
    authorizeProgressReport({ user: { role } }, {}, () => {
      called = true;
    });
    assert.equal(called, true);
  }

  for (const role of ['Super Admin', 'viewer']) {
    let called = false;
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    authorizeProgressReport({ user: { role } }, res, () => { called = true; });
    assert.equal(called, false);
    assert.equal(res.code, 403);
  }
});

test('authorizeOperational gives Admin and Partner global read scope without assignments', () => {
  for (const role of ['Admin', 'Partner']) {
    const req = { method: 'GET', user: { role } };
    let called = false;
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    authorizeOperational(req, res, () => { called = true; });
    assert.equal(called, true, `${role} should read without a school assignment`);
    assert.equal(req.schoolId, null);
    assert.equal(req.groupId, null);
  }
});

test('authorizeOperational denies scoped users without a school assignment to prevent data leaks', () => {
  let called = false;
  const req = {
    method: 'GET',
    user: { role: 'Health worker', school_id: null },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(req.schoolId, undefined);
  assert.equal(res.code, 403);
  assert.equal(res.payload.code, 'PERMISSION_DENIED');
  assert.equal(res.payload.message, 'This account is not assigned to a school');
});

test('authorizeOperational gives unassigned community organizers an empty school scope', () => {
  let called = false;
  const req = {
    method: 'GET',
    user: { role: 'Community Organizer', school_id: null },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.schoolId, -1);
  assert.equal(req.groupId, null);
  assert.equal(res.code, undefined);
});

test('authorizeOperational attaches both school and group scope for assigned partner users', () => {
  let called = false;
  const req = {
    method: 'GET',
    user: { role: 'Health worker', school_id: 7, group_id: 15 },
  };

  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.schoolId, 7);
  assert.equal(req.groupId, 15);
  assert.equal(res.code, undefined);
});

test('authorizeOperational keeps community coordinators at school scope', () => {
  let called = false;
  const req = {
    method: 'GET',
    user: { role: 'Community Organizer', school_id: 7, group_id: 15 },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.schoolId, 7);
  assert.equal(req.groupId, null);
  assert.equal(res.code, undefined);
});

test('authorizeOperational allows assigned community organizers to create batches and groups', () => {
  for (const path of ['/batches', '/groups']) {
    let called = false;
    const req = {
      method: 'POST',
      baseUrl: '/api/community',
      path,
      user: { role: 'Community Organizer', school_id: 7 },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    authorizeOperational(req, res, () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(req.schoolId, 7);
    assert.equal(req.isCommunityOrganizer, true);
    assert.equal(res.code, undefined);
  }
});

test('authorizeOperational keeps health workers read-only for community creation', () => {
  let called = false;
  const req = {
    method: 'POST',
    baseUrl: '/api/community',
    path: '/batches',
    user: { role: 'Health worker', school_id: 7, group_id: 15 },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.code, 403);
  assert.equal(res.payload.message, 'Admin and Partner accounts are read-only');
});

test('authorizeOperational does not allow community organizers to create schools', () => {
  let called = false;
  const req = {
    method: 'POST',
    baseUrl: '/api/community',
    path: '/communities',
    user: { role: 'Community Organizer', school_id: 7 },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.code, 403);
});

test('authorizeOperational keeps Admin and Partner read-only while allowing coordinator and health-worker beneficiary writes', () => {
  const requests = [
    { method: 'PUT', path: '/MTH-1', role: 'Admin', allowed: false },
    { method: 'PUT', path: '/MTH-1', role: 'Partner', allowed: false },
    { method: 'PUT', path: '/MTH-1', role: 'Community Organizer', school_id: 7, schoolId: 7, groupId: null, allowed: true },
    { method: 'PUT', path: '/MTH-1', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
    { method: 'POST', path: '/MTH-1/checkups', role: 'Admin', allowed: false },
    { method: 'POST', path: '/MTH-1/checkups', role: 'Partner', allowed: false },
    { method: 'POST', path: '/MTH-1/checkups', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
    { method: 'POST', path: '/MTH-1/documents', role: 'Admin', allowed: false },
    { method: 'POST', path: '/MTH-1/documents', role: 'Partner', allowed: false },
    { method: 'POST', path: '/MTH-1/documents', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
    { method: 'PUT', baseUrl: '/api/children', path: '/CH-1', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
  ];

  for (const request of requests) {
    let called = false;
    const req = {
      method: request.method,
      baseUrl: request.baseUrl || '/api/mothers',
      path: request.path,
      user: {
        role: request.role,
        school_id: request.school_id,
        group_id: request.group_id,
      },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    authorizeOperational(req, res, () => {
      called = true;
    });

    assert.equal(called, request.allowed, `${request.role} ${request.method} ${request.path}`);
    if (request.allowed) {
      assert.equal(req.schoolId ?? null, request.schoolId);
      assert.equal(req.groupId ?? null, request.groupId);
    }
    assert.equal(res.code, request.allowed ? undefined : 403);
  }
});

test('authorizeOperational keeps child profile updates restricted to health workers', () => {
  for (const role of ['Admin', 'Partner']) {
    const req = {
      method: 'PUT',
      baseUrl: '/api/children',
      path: '/CH-1',
      user: { role, school_id: 7 },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    let called = false;
    authorizeOperational(req, res, () => { called = true; });
    assert.equal(called, false);
    assert.equal(res.code, 403);
  }
});

test('authorizeOperational allows community organizers to create, edit, delete, end, and restore programs', () => {
  const requests = [
    { method: 'POST', path: '/', role: 'Community Organizer', allowed: true },
    { method: 'POST', path: '/12/clusters', role: 'communityorganizer', allowed: true },
    { method: 'PATCH', path: '/12/end', role: 'Community Organizer', allowed: true },
    { method: 'PATCH', path: '/12/restore', role: 'Community Organizer', allowed: true },
    { method: 'PUT', path: '/12', role: 'Community Organizer', allowed: true },
    { method: 'DELETE', path: '/12', role: 'Community Organizer', allowed: true },
    { method: 'POST', path: '/', role: 'Health worker', allowed: false },
  ];

  for (const request of requests) {
    let called = false;
    const req = {
      method: request.method,
      baseUrl: '/api/programs',
      path: request.path,
      user: { role: request.role, school_id: 7 },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    authorizeOperational(req, res, () => {
      called = true;
    });

    assert.equal(called, request.allowed, `${request.role} ${request.method} ${request.path}`);
    assert.equal(res.code, request.allowed ? undefined : 403);
  }
});

test('authorizeOperational allows community organizers to use CRUD on non-user-management resources', () => {
  const requests = [
    { method: 'POST', baseUrl: '/api/community', path: '/groups', role: 'Community Organizer', allowed: true },
    { method: 'PUT', baseUrl: '/api/community', path: '/groups/12', role: 'Community Organizer', allowed: true },
    { method: 'DELETE', baseUrl: '/api/community', path: '/groups/12', role: 'Community Organizer', allowed: true },
    { method: 'POST', baseUrl: '/api/mothers', path: '/', role: 'Community Organizer', allowed: true },
    { method: 'PUT', baseUrl: '/api/mothers', path: '/12', role: 'Community Organizer', allowed: true },
    { method: 'DELETE', baseUrl: '/api/mothers', path: '/12', role: 'Community Organizer', allowed: true },
    { method: 'POST', baseUrl: '/api/children', path: '/', role: 'Community Organizer', allowed: true },
    { method: 'PUT', baseUrl: '/api/children', path: '/12', role: 'Community Organizer', allowed: true },
    { method: 'DELETE', baseUrl: '/api/children', path: '/12', role: 'Community Organizer', allowed: true },
  ];

  for (const request of requests) {
    let called = false;
    const req = {
      method: request.method,
      baseUrl: request.baseUrl,
      path: request.path,
      user: { role: request.role, school_id: 7 },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    authorizeOperational(req, res, () => {
      called = true;
    });

    assert.equal(called, request.allowed, `${request.role} ${request.method} ${request.baseUrl}${request.path}`);
    assert.equal(res.code, request.allowed ? undefined : 403);
  }
});

test('authorizeOperational keeps user-management restricted to super admins', () => {
  let called = false;
  const req = {
    method: 'DELETE',
    baseUrl: '/api/users',
    path: '/12',
    user: { role: 'Community Organizer', school_id: 7 },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  authorizeOperational(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.code, 403);
});

test('authorizeOperational allows coordinators and health workers, but not Admin/Partner, to write child records', () => {
  const requests = [
    { method: 'POST', path: '/C-1/checkups', role: 'Community Organizer', school_id: 7, schoolId: 7, groupId: null, allowed: true },
    { method: 'POST', path: '/C-1/checkups', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
    { method: 'POST', path: '/C-1/checkups', role: 'Admin', allowed: false },
    { method: 'POST', path: '/C-1/checkups', role: 'Partner', allowed: false },
    { method: 'PUT', path: '/C-1', role: 'Community Organizer', school_id: 7, schoolId: 7, groupId: null, allowed: true },
    { method: 'PUT', path: '/C-1', role: 'Community Coordinator', school_id: 7, schoolId: 7, groupId: null, allowed: true },
    { method: 'PUT', path: '/C-1', role: 'Health worker', school_id: 7, group_id: 15, schoolId: 7, groupId: 15, allowed: true },
  ];

  for (const request of requests) {
    let called = false;
    const req = {
      method: request.method,
      baseUrl: '/api/children',
      path: request.path,
      user: {
        role: request.role,
        school_id: request.school_id,
        group_id: request.group_id,
      },
    };
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    authorizeOperational(req, res, () => {
      called = true;
    });

    assert.equal(called, request.allowed, `${request.role} ${request.method} ${request.path}`);
    if (request.allowed) {
      assert.equal(req.schoolId ?? null, request.schoolId);
      assert.equal(req.groupId ?? null, request.groupId);
    }
    assert.equal(res.code, request.allowed ? undefined : 403);
  }
});
