import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInterpretationLevels,
  getMetricForYAxis,
  getPointInterpretation,
  hasGrowthMetricData,
  INTERPRETATION_METRICS,
  isHospitalReferral,
} from './progressReportConfig.js';

test('Y-axis selection preserves the matching growth indicator', () => {
  assert.equal(getMetricForYAxis('weightForAgeInterpretation', 'numeric'), 'weightForAgeZScore');
  assert.equal(getMetricForYAxis('lengthForAgeZScore', 'interpretation'), 'lengthForAgeInterpretation');
  assert.equal(getMetricForYAxis('bmiInterpretation', 'numeric', 'mother'), 'bmiForAge');
  assert.equal(getMetricForYAxis('bmiForAge', 'interpretation', 'mother'), 'bmiInterpretation');
});

test('maternal BMI interpretations render as categorical bands', () => {
  assert.equal(INTERPRETATION_METRICS.has('bmiInterpretation'), true);
  assert.deepEqual(getInterpretationLevels('bmiInterpretation'), [
    'Underweight screening range',
    'Normal screening range',
    'Overweight screening range',
    'Obese screening range',
  ]);
  assert.equal(getPointInterpretation({ bmi: 17.8 }, 'bmiInterpretation'), 'Underweight screening range');
  assert.equal(getPointInterpretation({ bmi: 22.4 }, 'bmiInterpretation'), 'Normal screening range');
  assert.equal(getPointInterpretation({ bmi: 27.1 }, 'bmiInterpretation'), 'Overweight screening range');
  assert.equal(getPointInterpretation({ bmi: 31.2 }, 'bmiInterpretation'), 'Obese screening range');
});

test('BMI interpretation labels are matched case-sensitively', () => {
  assert.equal(
    getPointInterpretation({ bmiInterpretation: 'Normal screening range' }, 'bmiInterpretation'),
    'Normal screening range',
  );
  assert.equal(
    getPointInterpretation({ bmiInterpretation: 'normal screening range' }, 'bmiInterpretation'),
    '',
  );
});

test('hospital referral flags are recognized and retained for the results table', () => {
  assert.equal(isHospitalReferral(true), true);
  assert.equal(isHospitalReferral(1), true);
  assert.equal(isHospitalReferral('1'), true);
  assert.equal(isHospitalReferral('0'), false);
  assert.equal(hasGrowthMetricData({ growthSeries: [{ hospitalReferral: true }] }, 'hospitalReferral'), true);
  assert.equal(hasGrowthMetricData({ growthSeries: [{ hospitalReferral: false }] }, 'hospitalReferral'), false);
});
