import test from 'node:test';
import assert from 'node:assert/strict';
import { getChildRecordErrors } from './childRecordValidation.js';
import { capitalizeNameValue } from './nameFormat.js';

const today = new Date(2026, 9, 17);

test('accepts compound and hyphenated child names and rejects invalid characters or excessive length', () => {
  assert.deepEqual(getChildRecordErrors({
    firstName: 'Mary Princess',
    middleName: 'Anne-Marie',
    lastName: "Al-quera O'Neil",
  }, today), { birthDate: 'Birth date is required.' });

  const errors = getChildRecordErrors({
    firstName: '<script>',
    lastName: 'A'.repeat(101),
    birthDate: '2026-10-17',
  }, today);
  assert.match(errors.firstName, /letters, spaces, hyphens/);
  assert.match(errors.lastName, /maximum 100 characters/);
  assert.equal(capitalizeNameValue('mary princess'), 'Mary Princess');
  assert.equal(capitalizeNameValue('al-quera'), 'Al-Quera');
});

test('requires a valid non-future birth date', () => {
  assert.equal(getChildRecordErrors({}, today).birthDate, 'Birth date is required.');
  assert.match(getChildRecordErrors({ birthDate: '2026-02-30' }, today).birthDate, /valid birth date/);
  assert.match(getChildRecordErrors({ birthDate: '2026-10-18' }, today).birthDate, /future/);
  assert.deepEqual(getChildRecordErrors({ birthDate: '2026-10-17' }, today), {});
});

test('validates optional measurements and Apgar score without requiring them', () => {
  assert.deepEqual(getChildRecordErrors({ birthDate: '2026-10-17' }, today), {});
  assert.deepEqual(getChildRecordErrors({
    birthDate: '2026-10-17',
    noOfChildDelivered: '1',
  }, today), {});

  const errors = getChildRecordErrors({
    birthDate: '2026-10-17',
    birthWeight: '-2',
    birthLength: '100',
    noOfChildDelivered: '1.5',
    apgarScore: '12/10',
  }, today);
  assert.match(errors.birthWeight, /Birth weight/);
  assert.match(errors.birthLength, /Birth length/);
  assert.match(errors.noOfChildDelivered, /Number of children/);
  assert.match(errors.apgarScore, /Apgar score/);
  assert.match(getChildRecordErrors({
    birthDate: '2026-10-17',
    noOfChildDelivered: '0',
  }, today).noOfChildDelivered, /Number of children/);
});

test('validates vaccine sequence, chronology, birth date, and future dates', () => {
  const errors = getChildRecordErrors({
    birthDate: '2026-01-01',
    hepbDose2: '2026-02-01',
    opvDose1: '2025-12-31',
    mmrDose1: '2026-10-18',
  }, today);
  assert.match(errors.hepbDose2, /Dose 1/);
  assert.match(errors.opvDose1, /before the child/);
  assert.match(errors.mmrDose1, /future/);
});

test('requires each following vaccine dose to be on or after the preceding dose', () => {
  const errors = getChildRecordErrors({
    birthDate: '2026-01-01',
    bcgDose1: '2026-03-01',
    bcgDose2: '2026-02-01',
  }, today);
  assert.match(errors.bcgDose2, /on or after/);
});
