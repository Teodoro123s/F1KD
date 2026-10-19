const test = require('node:test');
const assert = require('node:assert/strict');
const { getFirstNameValidationError, normalizeFirstName } = require('../utils/firstNameValidation');

test('backend accepts compound, accented, Filipino, hyphenated, and apostrophe names', () => {
  for (const name of ['Juan Miguel', 'Ñora', 'José', 'Jose\u0301', 'Mary-Jane', "D'Angelo", 'Ma. Cristina']) {
    assert.equal(getFirstNameValidationError(name), '', name);
  }
});

test('backend enforces trimmed 2–50 character first names', () => {
  assert.equal(getFirstNameValidationError(' '), 'First name is required.');
  assert.match(getFirstNameValidationError('A'), /at least 2 characters/);
  assert.equal(getFirstNameValidationError(' Juan   Miguel '), '');
  assert.match(getFirstNameValidationError('A'.repeat(51)), /no more than 50 characters/);
  assert.equal(normalizeFirstName('  Juan   Miguel  '), 'Juan Miguel');
});

test('backend rejects digits, emoji, and unsupported punctuation', () => {
  for (const name of ['Juan2', 'Juan😀', 'Juan_', 'Mary--Jane', "D''Angelo"]) {
    assert.match(getFirstNameValidationError(name), /letters, spaces, internal hyphens or apostrophes/);
  }
});
