const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getWhoGrowthStandards } = require('../services/whoGrowthStandards');

const dateAfterDays = (start, days) => new Date(Date.parse(`${start}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

test('matches documented WHO Anthro z-score examples', async () => {
  const calculate = await getWhoGrowthStandards();
  const male = calculate({
    sex: 'male',
    birthDate: '2000-01-01',
    measurementDate: dateAfterDays('2000-01-01', 1001),
    weight: 18,
    lengthHeight: 120,
  });
  const female = calculate({
    sex: 'female',
    birthDate: '2000-01-01',
    measurementDate: dateAfterDays('2000-01-01', 1000),
    weight: 15,
    lengthHeight: 80,
  });

  assert.equal(male.weightForAgeZScore, 2.2);
  assert.equal(male.lengthForAgeZScore, 7.31);
  assert.equal(male.weightForLengthZScore, -2.39);
  assert.equal(male.weightForAgeInterpretation, 'High weight-for-age');
  assert.equal(male.weightForLengthInterpretation, 'Wasted');
  assert.equal(female.weightForAgeZScore, 0.95);
  assert.equal(female.lengthForAgeZScore, -3.5);
  assert.equal(female.weightForLengthZScore, 4.13);
  assert.equal(female.weightForLengthInterpretation, 'Obese');
  assert.equal(female.lengthForAgeInterpretation, 'Severely Stunted');
});

test('uses exact WHO median LMS values and requires recorded sex', async () => {
  const calculate = await getWhoGrowthStandards();
  const atBirth = calculate({
    sex: 'male',
    birthDate: '2026-01-01',
    measurementDate: '2026-01-01',
    weight: 3.3464,
    lengthHeight: 50,
  });
  const atBirthLengthMedian = calculate({
    sex: 'male',
    birthDate: '2026-01-01',
    measurementDate: '2026-01-01',
    weight: 3.3464,
    lengthHeight: 49.8842,
  });
  const unknownSex = calculate({
    sex: '',
    birthDate: '2026-01-01',
    measurementDate: '2026-01-01',
    weight: 3.3464,
    lengthHeight: 50,
  });

  assert.equal(atBirth.weightForAgeZScore, 0);
  assert.equal(atBirth.weightForLengthZScore, 0.06);
  assert.equal(atBirthLengthMedian.lengthForAgeZScore, 0);
  assert.equal(unknownSex.weightForAgeZScore, null);
  assert.equal(unknownSex.weightForLengthZScore, null);
  assert.equal(unknownSex.lengthForAgeZScore, null);
});
