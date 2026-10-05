import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgeInMonths, getAgeInDecimalMonths } from './childAge.mjs';

test('getAgeInMonths returns a stable month count for month boundaries', () => {
  assert.equal(getAgeInMonths('2024-01-31', '2024-03-01'), 1);
  assert.equal(getAgeInMonths('2024-01-31', '2024-02-29'), 1);
  assert.equal(getAgeInMonths('2023-12-10', '2024-02-15'), 2);
  assert.equal(getAgeInMonths('2023-10-01', '2026-09-27'), 35);
});

test('getAgeInDecimalMonths calculates fractional age across multiple months', () => {
  assert.equal(getAgeInDecimalMonths('2024-01-15', '2024-02-01'), 0.55);
  assert.equal(getAgeInDecimalMonths('2024-01-01', '2024-01-16'), 0.48);
  assert.equal(getAgeInDecimalMonths('2023-10-01', '2026-09-27'), 35.87);
});

test('getAgeInDecimalMonths clamps month-end anniversaries and accepts displayed dates', () => {
  assert.equal(getAgeInDecimalMonths('2024-01-31', '2024-02-29'), 1);
  assert.equal(getAgeInDecimalMonths('2024-01-31', '2024-03-15'), 1.48);
  assert.equal(getAgeInDecimalMonths('31/01/2024', '15/03/2024'), 1.48);
});
