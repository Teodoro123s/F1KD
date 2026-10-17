const test = require('node:test');
const assert = require('node:assert/strict');
const { PHILHEALTH_CLAIM_STATUSES, normalizePhilHealthClaim } = require('../utils/philHealthClaim');

test('normalizes valid PhilHealth claim fields and defaults status to Draft', () => {
  assert.deepEqual(normalizePhilHealthClaim({
    claimReference: ' REF-123 ',
    claimDate: '2026-10-17',
    amount: '50030.5',
  }), {
    claim: {
      claimReference: 'REF-123',
      claimDate: '2026-10-17',
      status: 'Draft',
      amount: '50030.50',
      notes: null,
    },
  });
});

test('accepts each supported claim status', () => {
  for (const status of PHILHEALTH_CLAIM_STATUSES) {
    assert.equal(normalizePhilHealthClaim({
      claimDate: '2026-10-17',
      amount: '0',
      status,
    }).claim.status, status);
  }
});

test('rejects malformed dates, statuses, amounts, and oversized fields', () => {
  const validClaim = { claimDate: '2026-10-17', amount: '10.00' };
  for (const amount of ['-1', '+1', '1,000', '1.001', '1e3', '1000000.01', 'NaN']) {
    assert.ok(normalizePhilHealthClaim({ ...validClaim, amount }).error, `expected invalid amount ${amount}`);
  }
  assert.ok(normalizePhilHealthClaim({ ...validClaim, claimDate: '2026-02-30' }).error);
  assert.ok(normalizePhilHealthClaim({ ...validClaim, status: 'Processing' }).error);
  assert.ok(normalizePhilHealthClaim({ ...validClaim, claimReference: 'r'.repeat(81) }).error);
  assert.ok(normalizePhilHealthClaim({ ...validClaim, notes: 'n'.repeat(1001) }).error);
});
