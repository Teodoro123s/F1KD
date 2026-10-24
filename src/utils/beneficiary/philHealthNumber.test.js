import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhilHealthNumber, getPhilHealthNumberError } from './philHealthNumber.js';

test('formats 12 digits as XX-XXXXXXXXX-X and supports partially entered values', () => {
  assert.equal(formatPhilHealthNumber('123456789012'), '12-345678901-2');
  assert.equal(formatPhilHealthNumber('12-345'), '12-345');
});

test('validates exactly 12 digits and permits omitted optional PINs', () => {
  assert.equal(getPhilHealthNumberError('12-345678901-2'), '');
  assert.equal(getPhilHealthNumberError('123456789012'), '');
  assert.notEqual(getPhilHealthNumberError('12345678901'), '');
  assert.notEqual(getPhilHealthNumberError('12-34567890A-2'), '');
  assert.notEqual(getPhilHealthNumberError('--123456789012'), '');
  assert.equal(getPhilHealthNumberError('', false), '');
  assert.notEqual(getPhilHealthNumberError('', true), '');
});
