const test = require('node:test');
const assert = require('node:assert/strict');

const { getEffectiveRecordCount, getBatchProgress } = require('../routes/community');

test('prefers the live mother count over stale stored batch record totals', () => {
  assert.equal(getEffectiveRecordCount({ records: 1, actual_records: 2 }), 2);
  assert.equal(getEffectiveRecordCount({ records: 5, actual_records: 0 }), 0);
});

test('falls back to the stored record total when live counts are unavailable', () => {
  assert.equal(getEffectiveRecordCount({ records: 7 }), 7);
});

test('averages maternal monitoring progress without weighting mothers by child count', () => {
  const rows = [
    { motherId: 1, motherProgress: 11 },
    { motherId: 2, motherProgress: 100 },
    { motherId: 3, motherProgress: 100 },
    { motherId: 4, motherProgress: 11 },
    { motherId: 5, motherProgress: 11 },
  ];

  assert.equal(getBatchProgress(rows), 47);
});

test('counts mothers with no monitoring progress as zero', () => {
  const rows = [
    { motherId: 1, motherProgress: 100 },
    { motherId: 2, motherProgress: null },
  ];

  assert.equal(getBatchProgress(rows), 50);
});

test('ignores missing mother IDs and bounds invalid progress values', () => {
  const rows = [
    { motherId: 1, progress: 120 },
    { motherId: 2, progress: -10 },
    { motherId: null, progress: 100 },
  ];

  assert.equal(getBatchProgress(rows), 50);
});
