const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, authorizeOperational } = require('../middleware/authorize');

test('normalizeRole maps common role labels to canonical values', () => {
  assert.equal(normalizeRole('Super Admin'), 'super_admin');
  assert.equal(normalizeRole('Administrator'), 'admin');
  assert.equal(normalizeRole('Community Organizer'), 'partner');
  assert.equal(normalizeRole('Health worker'), 'partner');
});

test('authorizeOperational allows scoped users without a school assignment for read access', () => {
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

  assert.equal(called, true);
  assert.equal(req.schoolId, null);
  assert.equal(res.code, undefined);
});
