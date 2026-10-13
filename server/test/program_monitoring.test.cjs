const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isBeneficiaryInProgramScope, isDateWithinProgramSchedule } = require('../services/programMonitoring');

const beneficiary = {
  community_id: 7,
  community_name: 'School A',
  group_name: 'Group A',
  batch_name: 'Batch A',
};

test('unclustered programs allow beneficiaries already visible in the caller scope', () => {
  assert.equal(isBeneficiaryInProgramScope([], beneficiary), true);
});

test('school scope includes beneficiaries in any group or batch at that school', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'School', scope_name: 'School A' }], beneficiary),
    true,
  );
});

test('community coordinators cannot record receipts for beneficiaries assigned elsewhere', () => {
  assert.equal(isBeneficiaryInProgramScope([], beneficiary, 1), false);
  assert.equal(isBeneficiaryInProgramScope([], beneficiary, 0), false);
  assert.equal(isBeneficiaryInProgramScope([], beneficiary, 7), true);
});

test('health workers cannot record receipts outside their assigned group', () => {
  assert.equal(isBeneficiaryInProgramScope([], { ...beneficiary, group_id: 15 }, 7, 15), true);
  assert.equal(isBeneficiaryInProgramScope([], { ...beneficiary, group_id: 16 }, 7, 15), false);
});

test('group and batch scopes require matching beneficiary membership', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'Group', scope_name: 'Group A' }], beneficiary),
    true,
  );
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'Group', scope_name: 'Group B' }], beneficiary),
    false,
  );
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'Batch', scope_name: 'Batch B' }], beneficiary),
    false,
  );
});

test('a matching batch cannot bypass a conflicting explicit group scope', () => {
  assert.equal(
    isBeneficiaryInProgramScope([
      { scope_type: 'Group', scope_name: 'Group B' },
      { scope_type: 'Batch', scope_name: 'Batch A' },
    ], beneficiary),
    false,
  );
});

test('a matching batch can scope a record when its group is not set', () => {
  assert.equal(
    isBeneficiaryInProgramScope([
      { scope_type: 'Group', scope_name: 'Group A' },
      { scope_type: 'Batch', scope_name: 'Batch A' },
    ], { ...beneficiary, group_name: null }),
    true,
  );
});

test('scope matching ignores name casing and surrounding whitespace', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'School', scope_name: ' school a ' }], beneficiary),
    true,
  );
});

test('school scope names with a display suffix still match the real school', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'School', scope_name: 'School A School' }], beneficiary),
    true,
  );
});

test('a school scope does not accept a beneficiary from another school', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'School', scope_name: 'School B' }], beneficiary),
    false,
  );
});

test('unknown cluster types do not grant beneficiary access', () => {
  assert.equal(
    isBeneficiaryInProgramScope([{ scope_type: 'Community', scope_name: 'School A' }], beneficiary),
    false,
  );
});

test('receipt dates must fall within the inclusive program schedule', () => {
  assert.equal(isDateWithinProgramSchedule('2026-10-01', '2026-10-01', '2026-10-31'), true);
  assert.equal(isDateWithinProgramSchedule('2026-10-31', '2026-10-01', '2026-10-31'), true);
  assert.equal(isDateWithinProgramSchedule('2026-09-30', '2026-10-01', '2026-10-31'), false);
  assert.equal(isDateWithinProgramSchedule('2026-11-01', '2026-10-01', '2026-10-31'), false);
  assert.equal(isDateWithinProgramSchedule('2026-10-10', null, '2026-10-31'), false);
});
