import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgeInMonths, getAgeInHalfMonths } from './childAge.js';

test('getAgeInMonths returns a stable month count for month boundaries', () => {
  assert.equal(getAgeInMonths('2024-01-31', '2024-03-01'), 1);
  assert.equal(getAgeInMonths('2023-12-10', '2024-02-15'), 2);
  assert.equal(getAgeInMonths('2023-10-01', '2026-09-27'), 35);
});

test('getAgeInHalfMonths rounds to a consistent half-month display value', () => {
  assert.equal(getAgeInHalfMonths('2024-01-15', '2024-02-01'), 0.5);
  assert.equal(getAgeInHalfMonths('2024-01-31', '2024-03-01'), 1);
  assert.equal(getAgeInHalfMonths('2024-01-01', '2024-01-16'), 0.5);
  assert.equal(getAgeInHalfMonths('2023-10-01', '2026-09-27'), 35.5);
});
