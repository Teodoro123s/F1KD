import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNaegeleEdd } from './maternalPregnancy.js';

test("calculates EDD with Naegele's calendar year, month, and day adjustments", () => {
  assert.equal(calculateNaegeleEdd('2026-06-08'), '2027-03-15');
  assert.equal(calculateNaegeleEdd('2024-02-29'), '2024-12-05');
  assert.equal(calculateNaegeleEdd('2026-01-31'), '2026-11-07');
  assert.equal(calculateNaegeleEdd('2026-02-30'), '');
});
