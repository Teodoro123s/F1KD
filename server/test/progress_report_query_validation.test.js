const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProgressReportQuery } = require('../utils/progressReportQueryValidation');

test('accepts empty, valid and all-scope progress report queries', () => {
  assert.equal(validateProgressReportQuery(), null);
  assert.equal(validateProgressReportQuery({
    page: '3',
    perPage: '100',
    schoolId: '12',
    motherId: 'all',
    benefitPeriod: 'MONTH',
    benefitMonth: '2024-02',
    granularity: 'MOTHER',
    export: '1',
    search: 'Ana',
  }), null);
});

test('rejects malformed identifiers and pagination rather than dropping the filter', () => {
  for (const query of [
    { schoolId: '1e2' },
    { groupId: '0' },
    { motherId: '12.2' },
    { page: '2.5' },
    { perPage: '-1' },
  ]) {
    assert.notEqual(validateProgressReportQuery(query), null);
  }
});

test('rejects unknown filter values, invalid months, and oversized search text', () => {
  for (const query of [
    { benefitPeriod: 'year' },
    { granularity: 'both' },
    { benefitMonth: '2024-13' },
    { export: 'yes' },
    { search: 'x'.repeat(201) },
    { search: ['unexpected'] },
  ]) {
    assert.notEqual(validateProgressReportQuery(query), null);
  }
});

test('caps page size when checking offsets without silently accepting invalid pages', () => {
  assert.equal(validateProgressReportQuery({ perPage: '500' }), null);
  assert.equal(validateProgressReportQuery({ page: '9007199254740991' }), 'page is too large');
});
