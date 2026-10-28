import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmi, calculateGestationalDetails } from './beneficiaryHelpers.js';
import {
  getMotherMonitoringProgress,
  getMotherMonitoringStartIndex,
  getMotherCheckupDate,
  getMotherNextCheckupDate,
  hasNextMotherCheckup,
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

test('getMotherMonitoringStartIndex uses the next scheduled checkup at five weeks', () => {
  assert.equal(getMotherMonitoringStartIndex({ trimester: '1st Trimester', gestationalAge: '5' }), 0);
});

test('getMotherMonitoringProgress derives variable targets from gestational age at registration', () => {
  const makeMother = (gestationalAge) => ({
    gestationalAge: String(gestationalAge),
    checkups: Array.from({ length: 3 }, () => [null, null, null]),
  });

  assert.equal(getMotherMonitoringProgress(makeMother(10)).total, 8);
  assert.equal(getMotherMonitoringProgress(makeMother(12)).total, 7);
  assert.equal(getMotherMonitoringProgress(makeMother(20)).total, 5);
});

test('getMotherMonitoringStartIndex derives registration age from LMP and registration date', () => {
  const mother = {
    lmpDate: '2026-01-01',
    prenatalRegDate: '2026-05-21',
  };
  assert.equal(getMotherMonitoringStartIndex(mother), 4);
  assert.equal(getMotherMonitoringProgress(mother).total, 5);
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

test('allows child registration after every checkup required from the computed registration week', () => {
  const checkups = [
    [null, null, null],
    [null, null, { completed: true }],
    [{ completed: true }, { completed: true }, { completed: true }],
  ];
  assert.equal(hasCompletedMotherPregnancy({
    gestationalAge: '20',
    checkups,
  }), false);
  checkups[1][1] = { completed: true };
  assert.equal(hasCompletedMotherPregnancy({
    gestationalAge: '20',
    checkups,
  }), true);
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

test('only T3-C3 is excluded from next maternal check-up scheduling', () => {
  assert.equal(hasNextMotherCheckup(7), true);
  assert.equal(hasNextMotherCheckup(8), false);
  assert.equal(hasNextMotherCheckup(-1), false);
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
