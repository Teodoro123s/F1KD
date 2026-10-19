import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmi, calculateGestationalDetails } from './beneficiaryHelpers.js';
import {
  getMotherMonitoringProgress,
  getMotherMonitoringStartIndex,
  getMotherCheckupDate,
  getMotherNextCheckupDate,
  hasCompletedMotherPregnancy,
} from './motherProgress.js';

test('calculateBmi uses kilograms and centimeters and returns one decimal place', () => {
  assert.equal(calculateBmi('70', '175'), '22.9');
  assert.equal(calculateBmi('0', '175'), '0.0');
  assert.equal(calculateBmi('70', '0'), '');
  assert.equal(calculateBmi('unknown', '175'), '');
});

test('calculateGestationalDetails keeps first-trimester monitoring aligned with the LMP-based month progression', () => {
  const julyToSeptember = calculateGestationalDetails('2026-07-01', '2026-09-15');
  assert.equal(julyToSeptember.trimester, '1st Trimester');
  assert.equal(julyToSeptember.monthInTrimester, 2);

  const afterFirstTrimester = calculateGestationalDetails('2026-07-01', '2026-11-01');
  assert.equal(afterFirstTrimester.trimester, '2nd Trimester');
  assert.equal(afterFirstTrimester.monthInTrimester, 1);
});

test('calculateGestationalDetails uses the requested week boundaries for trimesters', () => {
  const registrationDate = (weeks) => {
    const date = new Date(2026, 0, 1 + weeks * 7);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  assert.equal(calculateGestationalDetails('2026-01-01', registrationDate(12)).trimester, '1st Trimester');
  assert.equal(calculateGestationalDetails('2026-01-01', registrationDate(13)).trimester, '2nd Trimester');
  assert.equal(calculateGestationalDetails('2026-01-01', registrationDate(27)).trimester, '2nd Trimester');
  assert.equal(calculateGestationalDetails('2026-01-01', registrationDate(28)).trimester, '3rd Trimester');
});

test('getMotherMonitoringProgress starts in September when the LMP was in July and August is skipped', () => {
  const mother = {
    lmpDate: '2026-07-01',
    gestationalAge: '10',
    trimester: '1st Trimester',
    checkups: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
  };
  const progress = getMotherMonitoringProgress(mother);

  assert.equal(getMotherMonitoringStartIndex(mother), 1);
  assert.equal(progress.total, 8);
  assert.equal(progress.completed, 0);
  assert.equal(progress.percentage, 0);
});

test('getMotherMonitoringStartIndex skips T1-C1 at five weeks', () => {
  assert.equal(getMotherMonitoringStartIndex({ trimester: '1st Trimester', gestationalAge: '5' }), 1);
});

test('getMotherMonitoringProgress counts remaining checkups from the second trimester correctly', () => {
  const progress = getMotherMonitoringProgress({
    gestationalAge: '16',
    trimester: '2nd Trimester',
    checkups: [
      [null, null, null],
      [{ completed: true }, { completed: true }, null],
      [null, null, null],
    ],
  });

  assert.equal(progress.total, 6);
  assert.equal(progress.completed, 2);
  assert.equal(progress.percentage, 33);
});

test('getMotherMonitoringProgress includes recorded checkups before the registration trimester', () => {
  const progress = getMotherMonitoringProgress({
    gestationalAge: '36',
    trimester: '3rd Trimester',
    checkups: [
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  });

  assert.equal(progress.total, 9);
  assert.equal(progress.completed, 9);
  assert.equal(progress.percentage, 100);
});

test('getMotherMonitoringProgress still counts only visits from late registration when earlier slots are empty', () => {
  const progress = getMotherMonitoringProgress({
    gestationalAge: '36',
    trimester: '3rd Trimester',
    checkups: [
      [null, null, null],
      [null, null, null],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  });

  assert.equal(progress.total, 3);
  assert.equal(progress.completed, 3);
  assert.equal(progress.percentage, 100);
});

test('allows child registration after all checkups expected from the registration trimester', () => {
  const firstTrimesterMother = {
    trimester: '1st Trimester',
    checkups: [
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  };
  const secondTrimesterMother = {
    trimester: '2nd Trimester',
    checkups: [
      [null, null, null],
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  };
  const thirdTrimesterMother = {
    trimester: '3rd Trimester',
    checkups: [
      [null, null, null],
      [null, null, null],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  };

  assert.equal(hasCompletedMotherPregnancy(firstTrimesterMother), true);
  assert.equal(hasCompletedMotherPregnancy(secondTrimesterMother), true);
  assert.equal(hasCompletedMotherPregnancy(thirdTrimesterMother), true);
  assert.equal(hasCompletedMotherPregnancy({
    ...secondTrimesterMother,
    checkups: [
      [null, null, null],
      [{ completed: true }, { completed: true }, null],
      [{ completed: true }, { completed: true }, { completed: true }],
    ],
  }), false);
});

test('uses the previous check-up next date as the following visit date', () => {
  assert.equal(getMotherCheckupDate(
    null,
    { nextCheckupDate: '2026-11-19' },
  ), '2026-11-19');
  assert.equal(getMotherCheckupDate(
    { checkupDate: '2026-11-22' },
    { nextCheckupDate: '2026-11-19' },
  ), '2026-11-22');
  assert.equal(getMotherCheckupDate(
    null,
    { nextCheckupDate: '2026-11-19' },
    '2026-10-01',
  ), '2026-11-19');
});

test('defaults the next check-up date one month after the current visit and preserves a saved date', () => {
  assert.equal(getMotherNextCheckupDate('2026-12-12'), '2027-01-12');
  assert.equal(getMotherNextCheckupDate('2026-12-12', '2027-01-20'), '2027-01-20');
});

test('does not treat an incomplete or unmarked check-up list as a completed pregnancy', () => {
  const oneOfNine = {
    trimester: '1st Trimester',
    checkups: [
      [{ completed: true }, null, null],
      [null, null, null],
      [null, null, null],
    ],
  };
  const incompleteSecondTrimester = {
    trimester: '2nd Trimester',
    checkups: [
      [null, null, null],
      [{ completed: true }, { completed: true }, { completed: true }],
      [{ completed: true }, { completed: true }, null],
    ],
  };

  assert.equal(hasCompletedMotherPregnancy(oneOfNine), false);
  assert.equal(hasCompletedMotherPregnancy(incompleteSecondTrimester), false);
  assert.equal(hasCompletedMotherPregnancy({
    trimester: '1st Trimester',
    checkups: Array.from({ length: 9 }, () => ({})),
  }), false);
});
