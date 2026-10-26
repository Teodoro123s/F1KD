import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidContactNumber, sanitizeContactNumber } from './contactNumber.js';

test('contact number policy requires 11 digits starting with 09', () => {
  assert.equal(isValidContactNumber('09171234567'), true);
  assert.equal(isValidContactNumber('0917123456'), false);
  assert.equal(isValidContactNumber('091712345678'), false);
  assert.equal(isValidContactNumber('08171234567'), false);
  assert.equal(isValidContactNumber('+639171234567'), false);
  assert.equal(isValidContactNumber(' 09171234567 '), false);
});

test('contact number input keeps only the first 11 digits', () => {
  assert.equal(sanitizeContactNumber('09 1712-3456789'), '09171234567');
  assert.equal(sanitizeContactNumber('09abc'), '09');
});
