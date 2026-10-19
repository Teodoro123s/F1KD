const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidEmail,
  normalizeEmail,
  parsePositiveIntegerId,
  parseUserStatus,
  validateAccountPassword,
} = require('../utils/userInputValidation');

test('email validation is case-insensitive and normalization trims and lowercases', () => {
  assert.equal(isValidEmail('  Alex.Example@Example.COM  '), true);
  assert.equal(normalizeEmail('  Alex.Example@Example.COM  '), 'alex.example@example.com');
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail(`${'a'.repeat(244)}@example.com`), false);
});

test('user status aliases are normalized while unknown values are rejected', () => {
  assert.equal(parseUserStatus(' ACTIVE '), 'Active');
  assert.equal(parseUserStatus('disabled'), 'Suspended');
  assert.equal(parseUserStatus('suspendd'), null);
  assert.equal(parseUserStatus(''), null);
});

test('route IDs must be positive safe integers in decimal notation', () => {
  assert.equal(parsePositiveIntegerId('42'), 42);
  for (const invalid of ['0', '-1', '1.5', '1e2', 'abc', '9007199254740992', '']) {
    assert.equal(parsePositiveIntegerId(invalid), null);
  }
});

test('password validation preserves exact casing and respects bcrypt input limits', () => {
  assert.equal(validateAccountPassword('CaseSensitive1'), null);
  assert.equal(validateAccountPassword('casesensitive1'), null);
  assert.equal(validateAccountPassword('short'), 'Password must be at least 8 characters');
  assert.equal(validateAccountPassword('x'.repeat(73)), 'Password must be 72 UTF-8 bytes or fewer');
});
