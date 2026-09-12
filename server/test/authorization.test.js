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
