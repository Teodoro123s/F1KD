import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGestationalDetails } from './beneficiaryHelpers.js';
import { getMotherMonitoringProgress, getMotherMonitoringStartIndex } from './motherProgress.js';

test('calculateGestationalDetails keeps first-trimester monitoring aligned with the LMP-based month progression', () => {
  const julyToSeptember = calculateGestationalDetails('2026-07-01', '2026-09-15');
  assert.equal(julyToSeptember.trimester, '1st Trimester');
  assert.equal(julyToSeptember.monthInTrimester, 2);

  const afterFirstTrimester = calculateGestationalDetails('2026-07-01', '2026-11-01');
  assert.equal(afterFirstTrimester.trimester, '2nd Trimester');
  assert.equal(afterFirstTrimester.monthInTrimester, 1);
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
