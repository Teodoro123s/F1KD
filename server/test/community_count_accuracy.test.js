const test = require('node:test');
const assert = require('node:assert/strict');

const { getEffectiveRecordCount, getMotherWeightedProgress } = require('../routes/community');

test('prefers the live mother count over stale stored batch record totals', () => {
  assert.equal(getEffectiveRecordCount({ records: 1, actual_records: 2 }), 2);
  assert.equal(getEffectiveRecordCount({ records: 5, actual_records: 0 }), 0);
});

test('falls back to the stored record total when live counts are unavailable', () => {
  assert.equal(getEffectiveRecordCount({ records: 7 }), 7);
});

test('weights batch progress by mothers instead of the number of children', () => {
  const rows = [
    { motherId: 1, childId: 11, childCheckups: 24 },
    { motherId: 1, childId: 12, childCheckups: 24 },
    { motherId: 1, childId: 13, childCheckups: 24 },
    { motherId: 2, childId: 21, childCheckups: 0 },
  ];

  assert.equal(getMotherWeightedProgress(rows), 50);
});

test('averages child progress within each mother before averaging mothers', () => {
  const rows = [
    { motherId: 1, childId: 11, childCheckups: 24 },
    { motherId: 1, childId: 12, childCheckups: 0 },
    { motherId: 2, childId: 21, childCheckups: 0 },
  ];

  assert.equal(getMotherWeightedProgress(rows), 25);
});

test('includes mothers without children as zero progress', () => {
  const rows = [
    { motherId: 1, childId: 11, childCheckups: 24 },
    { motherId: 2, childId: null, childCheckups: 0 },
  ];

  assert.equal(getMotherWeightedProgress(rows), 50);
});
