const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidIsoDate } = require('../utils/dateValidation');

test('accepts real ISO calendar dates, including leap days', () => {
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2025-12-31'), true);
});

test('rejects malformed and impossible ISO calendar dates', () => {
  for (const value of ['2025-02-29', '2025-13-01', '2025-04-31', '2025-1-01', '01/02/2025', '']) {
    assert.equal(isValidIsoDate(value), false);
  }
});
