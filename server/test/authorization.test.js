const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, authorizeOperational } = require('../middleware/authorize');

test('normalizeRole maps common role labels to canonical values', () => {
  assert.equal(normalizeRole('Super Admin'), 'super_admin');
  assert.equal(normalizeRole('Administrator'), 'admin');
  assert.equal(normalizeRole('Community Organizer'), 'partner');
  assert.equal(normalizeRole('Health worker'), 'partner');
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
