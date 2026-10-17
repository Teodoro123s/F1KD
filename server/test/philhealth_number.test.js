const test = require('node:test');
const assert = require('node:assert/strict');
const { formatPhilHealthNumber, validatePhilHealthNumber } = require('../utils/philHealthNumber');

test('PhilHealth PIN accepts 12 digits with optional hyphens', () => {
  assert.equal(validatePhilHealthNumber('123456789012'), null);
  assert.equal(validatePhilHealthNumber('12-345678901-2'), null);
  assert.equal(formatPhilHealthNumber('123456789012'), '12-345678901-2');
});

test('PhilHealth PIN rejects incorrect lengths and unsupported characters', () => {
  assert.notEqual(validatePhilHealthNumber('12345678901'), null);
  assert.notEqual(validatePhilHealthNumber('1234567890123'), null);
  assert.notEqual(validatePhilHealthNumber('12-34567890A-2'), null);
  assert.notEqual(validatePhilHealthNumber('--123456789012'), null);
});

test('PhilHealth PIN is required only when the member flag is set', () => {
  assert.equal(validatePhilHealthNumber('', false), null);
  assert.notEqual(validatePhilHealthNumber('', true), null);
});
