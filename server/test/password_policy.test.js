const assert = require('node:assert/strict');
const test = require('node:test');
const { getPasswordPolicyError } = require('../services/passwordPolicy');

test('password policy accepts a long mixed-character password', () => {
  assert.equal(getPasswordPolicyError('River!Cedar7Moon'), null);
});

test('password policy reports every missing strength requirement', () => {
  assert.equal(
    getPasswordPolicyError('short'),
    'Password must include at least 12 characters, an uppercase letter, a number, a symbol.',
  );
});

test('password policy rejects non-string values', () => {
  assert.match(getPasswordPolicyError(null), /at least 12 characters/);
});
