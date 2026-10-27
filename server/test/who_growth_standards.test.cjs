const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { getWhoGrowthStandards } = require('../services/whoGrowthStandards');

const dateAfterDays = (start, days) => new Date(Date.parse(`${start}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

function getLmsRow(filename, measureName, measureValue) {
  const [headerLine, ...rows] = readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8').trim().split(/\r?\n/);
  const columns = Object.fromEntries(headerLine.trim().split(/\s+/).map((name, index) => [name, index]));
  const row = rows
    .map((line) => line.trim().split(/\s+/))
    .find((values) => Number(values[columns.sex]) === 1 && Number(values[columns[measureName]]) === measureValue);
  assert.ok(row, `Missing male WHO reference for ${measureName}=${measureValue}`);
  return {
    l: Number(row[columns.l]),
    m: Number(row[columns.m]),
    s: Number(row[columns.s]),
  };
}

function valueAtZScore({ l, m, s }, zScore) {
  return Math.abs(l) < 1e-8
    ? m * Math.exp(s * zScore)
    : m * (1 + l * s * zScore) ** (1 / l);
}

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
  assert.equal(male.weightForLengthInterpretation, 'Moderate acute malnutrition');
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

test('includes the two-year birthday and excludes measurements after 24 months when requested', async () => {
  const calculate = await getWhoGrowthStandards();
  const onSecondBirthday = calculate({
    sex: 'male',
    birthDate: '2024-01-01',
    measurementDate: '2026-01-01',
    weight: 12,
    lengthHeight: 85,
    maxAgeMonths: 24,
  });
  const afterSecondBirthday = calculate({
    sex: 'male',
    birthDate: '2024-01-01',
    measurementDate: '2026-01-02',
    weight: 12,
    lengthHeight: 85,
    maxAgeMonths: 24,
  });

  assert.notEqual(onSecondBirthday.weightForAgeZScore, null);
  assert.notEqual(onSecondBirthday.weightForLengthZScore, null);
  assert.equal(afterSecondBirthday.weightForAgeZScore, null);
  assert.equal(afterSecondBirthday.weightForLengthZScore, null);
});

test('uses WHO interpretation bands at their exact lower and upper cutoffs', async () => {
  const calculate = await getWhoGrowthStandards();
  const birthDate = '2025-01-01';
  const measurementDate = dateAfterDays(birthDate, 365);
  const weightForAgeLms = getLmsRow('who-weianthro.txt', 'age', 365);
  const lengthForAgeLms = getLmsRow('who-lenanthro.txt', 'age', 365);
  const weightForLengthLms = getLmsRow('who-wflanthro.txt', 'length', 70);

  const weightForAgeCases = [
    [-3.01, 'Severely Underweight'],
    [-3, 'Underweight'],
    [-2.01, 'Underweight'],
    [-2, 'Normal'],
    [2, 'Normal'],
    [2.01, 'High weight-for-age'],
  ];
  for (const [zScore, expected] of weightForAgeCases) {
    const result = calculate({
      sex: 'male', birthDate, measurementDate,
      weight: valueAtZScore(weightForAgeLms, zScore), lengthHeight: 70,
    });
    assert.equal(result.weightForAgeInterpretation, expected, `weight-for-age at z=${zScore}`);
  }

  const lengthForAgeCases = [
    [-3.01, 'Severely Stunted'],
    [-3, 'Stunted'],
    [-2.01, 'Stunted'],
    [-2, 'Normal'],
    [2, 'Normal'],
    [2.01, 'Tall'],
    [3, 'Tall'],
    [3.01, 'Very Tall'],
  ];
  for (const [zScore, expected] of lengthForAgeCases) {
    const result = calculate({
      sex: 'male', birthDate, measurementDate,
      weight: 8, lengthHeight: valueAtZScore(lengthForAgeLms, zScore),
    });
    assert.equal(result.lengthForAgeInterpretation, expected, `length-for-age at z=${zScore}`);
  }

  const weightForLengthCases = [
    [-3.01, 'Severe acute malnutrition'],
    [-3, 'Moderate acute malnutrition'],
    [-2.01, 'Moderate acute malnutrition'],
    [-2, 'Normal'],
    [2, 'Normal'],
    [2.01, 'Overweight'],
    [3, 'Overweight'],
    [3.01, 'Obese'],
  ];
  for (const [zScore, expected] of weightForLengthCases) {
    const result = calculate({
      sex: 'male', birthDate, measurementDate,
      weight: valueAtZScore(weightForLengthLms, zScore), lengthHeight: 70,
    });
    assert.equal(result.weightForLengthInterpretation, expected, `weight-for-length at z=${zScore}`);
  }
});
