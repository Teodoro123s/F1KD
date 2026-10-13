const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { getWhoGrowthStandards } = require('../services/whoGrowthStandards');

const dateAfterDays = (start, days) => new Date(Date.parse(`${start}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const readReference = (filename) => readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8');
const medianAtAge = (raw, ageInDays) => {
  const [header, ...rows] = raw.trim().split(/\r?\n/);
  const columns = header.split(/\s+/);
  const row = rows.map((line) => line.split(/\s+/)).find((values) => (
    Number(values[columns.indexOf('sex')]) === 1
    && Number(values[columns.indexOf('age')]) === ageInDays
  ));
  return Number(row[columns.indexOf('m')]);
};

test('does not return WHO scores after the second birthday', async () => {
  const calculate = await getWhoGrowthStandards();
  const afterSecondBirthday = calculate({
    sex: 'male',
    birthDate: '2020-01-01',
    measurementDate: '2022-01-02',
    weight: 12,
    lengthHeight: 85,
    headCircumference: 47,
    armCircumference: 14,
    tricepsSkinfold: 8,
    subscapularSkinfold: 5,
  });

  assert.equal(afterSecondBirthday.ageInDays, null);
  assert.equal(afterSecondBirthday.weightForAgeZScore, null);
  assert.equal(afterSecondBirthday.lengthForAgeZScore, null);
  assert.equal(afterSecondBirthday.weightForLengthZScore, null);
  assert.equal(afterSecondBirthday.bmiForAgeZScore, null);
  assert.equal(afterSecondBirthday.headCircumferenceForAgeZScore, null);
  assert.equal(afterSecondBirthday.armCircumferenceForAgeZScore, null);
  assert.equal(afterSecondBirthday.tricepsSkinfoldForAgeZScore, null);
  assert.equal(afterSecondBirthday.subscapularSkinfoldForAgeZScore, null);
});

test('uses the calendar second birthday for leap-day births', async () => {
  const calculate = await getWhoGrowthStandards();
  const onSecondBirthday = calculate({
    sex: 'female',
    birthDate: '2024-02-29',
    measurementDate: '2026-02-28',
    weight: 12,
    lengthHeight: 85,
  });
  const afterSecondBirthday = calculate({
    sex: 'female',
    birthDate: '2024-02-29',
    measurementDate: '2026-03-01',
    weight: 12,
    lengthHeight: 85,
  });

  assert.notEqual(onSecondBirthday.weightForAgeZScore, null);
  assert.equal(afterSecondBirthday.weightForAgeZScore, null);
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

test('calculates all eight WHO Anthro indicators and matches additional reference medians', async () => {
  const calculate = await getWhoGrowthStandards();
  const ageInDays = 100;
  const measurementDate = dateAfterDays('2026-01-01', ageInDays);
  const height = 100;
  const bmi = medianAtAge(readReference('who-bmianthro.txt'), ageInDays);
  const scores = calculate({
    sex: 'male',
    birthDate: '2026-01-01',
    measurementDate,
    weight: bmi * ((height / 100) ** 2),
    lengthHeight: height,
    headCircumference: medianAtAge(readReference('who-hcanthro.txt'), ageInDays),
    armCircumference: medianAtAge(readReference('who-acanthro.txt'), ageInDays),
    tricepsSkinfold: medianAtAge(readReference('who-tsanthro.txt'), ageInDays),
    subscapularSkinfold: medianAtAge(readReference('who-ssanthro.txt'), ageInDays),
  });

  assert.ok(Number.isFinite(scores.weightForAgeZScore));
  assert.ok(Number.isFinite(scores.lengthForAgeZScore));
  assert.ok(Number.isFinite(scores.weightForLengthZScore));
  assert.equal(scores.bmiForAgeZScore, 0);
  assert.equal(scores.headCircumferenceForAgeZScore, 0);
  assert.equal(scores.armCircumferenceForAgeZScore, 0);
  assert.equal(scores.tricepsSkinfoldForAgeZScore, 0);
  assert.equal(scores.subscapularSkinfoldForAgeZScore, 0);
});

test('does not score arm circumference or skinfolds before their WHO reference ages', async () => {
  const calculate = await getWhoGrowthStandards();
  const scores = calculate({
    sex: 'female',
    birthDate: '2026-01-01',
    measurementDate: '2026-01-01',
    weight: 3.2,
    lengthHeight: 50,
    headCircumference: medianAtAge(readReference('who-hcanthro.txt'), 0),
    armCircumference: 10,
    tricepsSkinfold: 5,
    subscapularSkinfold: 5,
  });

  assert.notEqual(scores.bmiForAgeZScore, null);
  assert.notEqual(scores.headCircumferenceForAgeZScore, null);
  assert.equal(scores.armCircumferenceForAgeZScore, null);
  assert.equal(scores.tricepsSkinfoldForAgeZScore, null);
  assert.equal(scores.subscapularSkinfoldForAgeZScore, null);
});
