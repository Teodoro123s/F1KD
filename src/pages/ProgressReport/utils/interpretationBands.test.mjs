import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInterpretationLevels,
  mapInterpretationToBand,
  normalizeNutritionLabel,
} from './interpretationBands.mjs';

test('growth report uses separate weight-for-length and length-for-age interpretation bands', () => {
  assert.deepEqual(getInterpretationLevels('weightForLengthInterpretation'), [
    'Severe acute malnutrition',
    'Moderate acute malnutrition',
    'Normal',
    'Overweight',
    'Obese',
  ]);
  assert.deepEqual(getInterpretationLevels('Length-for-Age'), [
    'Severely Stunted',
    'Stunted',
    'Normal',
    'Tall',
    'Very Tall',
  ]);
  assert.equal(mapInterpretationToBand('Overweight', 'weightForLengthInterpretation'), 'Overweight');
  assert.equal(mapInterpretationToBand('Obese', 'weightForLengthInterpretation'), 'Obese');
});

test('legacy wasting labels map to the acute malnutrition report bands', () => {
  assert.equal(normalizeNutritionLabel('Severely Wasted'), 'Severe acute malnutrition');
  assert.equal(mapInterpretationToBand('Severely Wasted', 'weightForLengthInterpretation'), 'Severe acute malnutrition');
  assert.equal(mapInterpretationToBand('Wasted', 'weightForLengthInterpretation'), 'Moderate acute malnutrition');
});

test('very tall remains distinct from tall in report categories', () => {
  assert.equal(mapInterpretationToBand('Tall', 'lengthForAgeInterpretation'), 'Tall');
  assert.equal(mapInterpretationToBand('Very Tall', 'lengthForAgeInterpretation'), 'Very Tall');
});
