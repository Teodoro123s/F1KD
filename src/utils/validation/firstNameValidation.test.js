import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_NAME_INVALID_MESSAGE,
  getFirstNameValidationError,
  isValidFirstName,
  normalizeFirstName,
} from './firstNameValidation.js';

test('accepts compound, accented, Filipino, hyphenated, and apostrophe names', () => {
  for (const name of ['Juan Miguel', 'Ñora', 'José', 'Jose\u0301', 'Mary-Jane', "D'Angelo", 'Ma. Cristina']) {
    assert.equal(getFirstNameValidationError(name), '', name);
  }
});

test('requires 2–50 characters after trimming and whitespace normalization', () => {
  assert.equal(getFirstNameValidationError(' '), 'First name is required.');
  assert.match(getFirstNameValidationError('A'), /at least 2 characters/);
  assert.equal(isValidFirstName(`  Juan   Miguel  `), true);
  assert.match(getFirstNameValidationError('A'.repeat(51)), /no more than 50 characters/);
  assert.equal(normalizeFirstName('  Juan   Miguel  '), 'Juan Miguel');
});

test('rejects digits, emoji, and unsupported punctuation', () => {
  for (const name of ['Juan2', 'Juan😀', 'Juan_', 'Mary--Jane', "D''Angelo"]) {
    assert.equal(getFirstNameValidationError(name), FIRST_NAME_INVALID_MESSAGE, name);
  }
});
