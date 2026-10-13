import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createWhoGrowthStandards } from './whoGrowthStandardsCore.mjs';
import { createWhoGrowthStandards as createAdminWhoGrowthStandards } from '../pages/roles/admin/_shared/utils/whoGrowthStandardsCore.mjs';
import { createWhoGrowthStandards as createCoordinatorWhoGrowthStandards } from '../pages/roles/community_coordinator/_shared/utils/whoGrowthStandardsCore.mjs';
import { createWhoGrowthStandards as createHealthWorkerWhoGrowthStandards } from '../pages/roles/health_worker/_shared/utils/whoGrowthStandardsCore.mjs';
import { createWhoGrowthStandards as createSuperAdminWhoGrowthStandards } from '../pages/roles/super_admin/_shared/utils/whoGrowthStandardsCore.mjs';

const readReference = (filename) => readFileSync(new URL(`../data/${filename}`, import.meta.url), 'utf8');
const references = {
  weightForAge: readReference('who-weianthro.txt'),
  lengthForAge: readReference('who-lenanthro.txt'),
  weightForLength: readReference('who-wflanthro.txt'),
  weightForHeight: readReference('who-wfhanthro.txt'),
  bmiForAge: readReference('who-bmianthro.txt'),
  headCircumferenceForAge: readReference('who-hcanthro.txt'),
  armCircumferenceForAge: readReference('who-acanthro.txt'),
  tricepsSkinfoldForAge: readReference('who-tsanthro.txt'),
  subscapularSkinfoldForAge: readReference('who-ssanthro.txt'),
};
const calculators = [
  createWhoGrowthStandards,
  createAdminWhoGrowthStandards,
  createCoordinatorWhoGrowthStandards,
  createHealthWorkerWhoGrowthStandards,
  createSuperAdminWhoGrowthStandards,
].map((createCalculator) => createCalculator(references));

const dateAfterDays = (start, days) => new Date(Date.parse(`${start}T00:00:00Z`) + days * 86400000)
  .toISOString()
  .slice(0, 10);

test('limits WHO scores to check-ups on or before the second birthday', () => {
  calculators.forEach((calculate) => {
    const onSecondBirthday = calculate({
      sex: 'male',
      birthDate: '2020-01-01',
      measurementDate: '2022-01-01',
      weight: 12,
      lengthHeight: 85,
    });
    const afterSecondBirthday = calculate({
      sex: 'male',
      birthDate: '2020-01-01',
      measurementDate: '2022-01-02',
      weight: 12,
      lengthHeight: 85,
    });

    assert.notEqual(onSecondBirthday.weightForAgeZScore, null);
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
});

test('uses the calendar second birthday for leap-day births', () => {
  const onSecondBirthday = calculators[0]({
    sex: 'female',
    birthDate: '2024-02-29',
    measurementDate: '2026-02-28',
    weight: 12,
    lengthHeight: 85,
  });
  const afterSecondBirthday = calculators[0]({
    sex: 'female',
    birthDate: '2024-02-29',
    measurementDate: '2026-03-01',
    weight: 12,
    lengthHeight: 85,
  });

  assert.notEqual(onSecondBirthday.weightForAgeZScore, null);
  assert.equal(afterSecondBirthday.weightForAgeZScore, null);
});

const medianAtAge = (reference, ageInDays) => {
  const [header, ...rows] = reference.trim().split(/\r?\n/);
  const columns = header.split(/\s+/);
  const ageIndex = columns.indexOf('age');
  const sexIndex = columns.indexOf('sex');
  const medianIndex = columns.indexOf('m');
  const row = rows.map((line) => line.split(/\s+/))
    .find((values) => Number(values[sexIndex]) === 1 && Number(values[ageIndex]) === ageInDays);
  return Number(row[medianIndex]);
};

test('calculates all eight WHO Anthro indicators and matches additional reference medians', () => {
  const referenceAge = 100;
  const maleMedianWeight = medianAtAge(references.weightForAge, referenceAge);
  const maleMedianHeight = medianAtAge(references.lengthForAge, referenceAge);
  const medianBmi = medianAtAge(references.bmiForAge, referenceAge);
  const measuredHeight = 100;
  const scores = calculators[0]({
    sex: 'male',
    birthDate: '2026-01-01',
    measurementDate: dateAfterDays('2026-01-01', referenceAge),
    weight: medianBmi * ((measuredHeight / 100) ** 2),
    lengthHeight: measuredHeight,
    headCircumference: medianAtAge(references.headCircumferenceForAge, referenceAge),
    armCircumference: medianAtAge(references.armCircumferenceForAge, referenceAge),
    tricepsSkinfold: medianAtAge(references.tricepsSkinfoldForAge, referenceAge),
    subscapularSkinfold: medianAtAge(references.subscapularSkinfoldForAge, referenceAge),
  });

  assert.ok(Number.isFinite(scores.weightForAgeZScore));
  assert.ok(Number.isFinite(scores.lengthForAgeZScore));
  assert.ok(Number.isFinite(scores.weightForLengthZScore));
  assert.equal(scores.bmiForAgeZScore, 0);
  assert.equal(scores.headCircumferenceForAgeZScore, 0);
  assert.equal(scores.armCircumferenceForAgeZScore, 0);
  assert.equal(scores.tricepsSkinfoldForAgeZScore, 0);
  assert.equal(scores.subscapularSkinfoldForAgeZScore, 0);
  assert.ok(Number.isFinite(maleMedianWeight));
  assert.ok(Number.isFinite(maleMedianHeight));
});

test('returns no WHO score where age is outside an indicator reference table', () => {
  const atBirth = calculators[0]({
    sex: 'female',
    birthDate: '2026-01-01',
    measurementDate: '2026-01-01',
    weight: 3.2,
    lengthHeight: 50,
    headCircumference: medianAtAge(references.headCircumferenceForAge, 0),
    armCircumference: 10,
    tricepsSkinfold: 5,
    subscapularSkinfold: 5,
  });

  assert.equal(atBirth.bmiForAgeZScore === null, false);
  assert.equal(atBirth.headCircumferenceForAgeZScore === null, false);
  assert.equal(atBirth.armCircumferenceForAgeZScore, null);
  assert.equal(atBirth.tricepsSkinfoldForAgeZScore, null);
  assert.equal(atBirth.subscapularSkinfoldForAgeZScore, null);
});
