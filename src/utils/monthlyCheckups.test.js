import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCheckupThisMonth } from './monthlyCheckups.js';

const now = new Date(2026, 9, 17);

test('detects a check-up this month for nested maternal records', () => {
  assert.equal(hasCheckupThisMonth({
    checkups: [[null, { checkupDate: '2026-10-05' }], [null]],
  }, now), true);
});

test('detects a check-up this month for child records with snake-case dates', () => {
  assert.equal(hasCheckupThisMonth({
    checkups: [{ visit_date: '2026-10-17T00:00:00.000Z' }],
  }, now), true);
});

test('ignores dates outside this month and incomplete records', () => {
  assert.equal(hasCheckupThisMonth({
    checkups: [[null, { checkupDate: '2026-09-30' }], [{ nextCheckupDate: '2026-10-20' }]],
  }, now), false);
});

test('ignores invalid dates', () => {
  assert.equal(hasCheckupThisMonth({
    checkups: [{ checkupDate: '2026-10-32' }],
  }, now), false);
});
