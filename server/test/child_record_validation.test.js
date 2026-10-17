const test = require('node:test');
const assert = require('node:assert/strict');
const { getChildRecordValidationError } = require('../utils/childRecordValidation');

const today = new Date(2026, 9, 17);

test('requires valid non-future child birth dates', () => {
  assert.match(getChildRecordValidationError({}, today), /Birth date is required/);
  assert.match(getChildRecordValidationError({ birthDate: '2026-02-30' }, today), /valid birth date/);
  assert.match(getChildRecordValidationError({ birthDate: '2026-10-18' }, today), /future/);
  assert.equal(getChildRecordValidationError({ birthDate: '2026-10-17' }, today), '');
});

test('validates optional child measurements and Apgar values', () => {
  assert.match(getChildRecordValidationError({
    birthDate: '2026-10-17',
    birthWeight: '-2',
  }, today), /Birth weight/);
  assert.match(getChildRecordValidationError({
    birthDate: '2026-10-17',
    noOfChildDelivered: '1.5',
  }, today), /whole number/);
  assert.match(getChildRecordValidationError({
    birthDate: '2026-10-17',
    apgarScore: '12/10',
  }, today), /Apgar score/);
});

test('validates child vaccine dose order, chronology, and date bounds', () => {
  assert.match(getChildRecordValidationError({
    birthDate: '2026-01-01',
    bcgDose2: '2026-02-01',
  }, today), /Dose 1/);
  assert.match(getChildRecordValidationError({
    birthDate: '2026-01-01',
    bcgDose1: '2026-03-01',
    bcgDose2: '2026-02-01',
  }, today), /on or after/);
  assert.match(getChildRecordValidationError({
    birthDate: '2026-01-01',
    opvDose1: '2025-12-31',
  }, today), /before the child's birth date/);
});
