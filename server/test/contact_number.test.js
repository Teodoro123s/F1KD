const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidContactNumber, validateContactNumber } = require('../utils/contactNumber');

test('contact number policy accepts exactly 11 digits starting with 09', () => {
  assert.equal(isValidContactNumber('09171234567'), true);
  assert.equal(isValidContactNumber('0917123456'), false);
  assert.equal(isValidContactNumber('091712345678'), false);
  assert.equal(isValidContactNumber('08171234567'), false);
  assert.equal(isValidContactNumber('+639171234567'), false);
  assert.equal(isValidContactNumber(' 09171234567 '), false);
});

test('contact number validation permits blank optional fields and rejects malformed values', () => {
  assert.equal(validateContactNumber(''), null);
  assert.equal(validateContactNumber(null), null);
  assert.equal(validateContactNumber('09171234567'), null);
  assert.equal(
    validateContactNumber('0917123456', 'Emergency contact'),
    'Emergency contact must contain exactly 11 digits and start with 09',
  );
});
