import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getContactNumberError,
  isValidContactNumber,
  sanitizeContactNumber,
} from './contactNumber.js';

test('contact number policy requires 11 digits starting with 09', () => {
  assert.equal(isValidContactNumber('09171234567'), true);
  assert.equal(isValidContactNumber('0917123456'), false);
  assert.equal(isValidContactNumber('091712345678'), false);
  assert.equal(isValidContactNumber('08171234567'), false);
  assert.equal(isValidContactNumber('+639171234567'), false);
  assert.equal(isValidContactNumber(' 09171234567 '), false);
});

test('contact number input removes formatting but preserves excess digits for validation', () => {
  assert.equal(sanitizeContactNumber('09 1712-34567'), '09171234567');
  assert.equal(sanitizeContactNumber('09 1712-3456789'), '0917123456789');
  assert.equal(sanitizeContactNumber('09abc'), '09');
});

test('contact number errors cover missing required numbers and short or long numbers', () => {
  assert.equal(getContactNumberError(''), '');
  assert.equal(getContactNumberError('', { required: true }), 'Contact number is required.');
  assert.equal(getContactNumberError('0917123456'), 'Enter exactly 11 digits starting with 09.');
  assert.equal(getContactNumberError('091712345678'), 'Enter exactly 11 digits starting with 09.');
  assert.equal(getContactNumberError('09171234567'), '');
});
