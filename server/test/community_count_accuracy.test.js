const test = require('node:test');
const assert = require('node:assert/strict');

const { getEffectiveRecordCount } = require('../routes/community');

test('prefers the live mother count over stale stored batch record totals', () => {
  assert.equal(getEffectiveRecordCount({ records: 1, actual_records: 2 }), 2);
  assert.equal(getEffectiveRecordCount({ records: 5, actual_records: 0 }), 0);
});

test('falls back to the stored record total when live counts are unavailable', () => {
  assert.equal(getEffectiveRecordCount({ records: 7 }), 7);
});
