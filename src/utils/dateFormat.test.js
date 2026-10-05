import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonthsPreservingDay, formatDateForDisplay, maskDateInput, normalizeDateValue } from './dateFormat.js';

test('date display and input masks use DD/MM/YYYY while storage remains ISO', () => {
  assert.equal(formatDateForDisplay('2026-09-29'), '29/09/2026');
  assert.equal(maskDateInput('2026-09-29'), '29/09/2026');
  assert.equal(normalizeDateValue('29/09/2026'), '2026-09-29');
});

test('single-digit day and month stay in their entered positions and are zero-padded', () => {
  assert.equal(maskDateInput('8/1/2026'), '08/01/2026');
  assert.equal(maskDateInput('1/1/2026'), '01/01/2026');
  assert.equal(normalizeDateValue('1/1/2026'), '2026-01-01');
});

test('invalid date values do not leak inconsistent formats into the UI', () => {
  assert.equal(formatDateForDisplay('not-a-date'), '—');
  assert.equal(normalizeDateValue('31/02/2026'), '');
  assert.equal(normalizeDateValue('01/00/2026'), '');
  assert.equal(normalizeDateValue('01/13/2026'), '');
});

test('monthly dates retain their original day across month boundaries', () => {
  assert.equal(addMonthsPreservingDay('2026-09-10', 1, 10), '2026-10-10');
  assert.equal(addMonthsPreservingDay('2026-09-10', 2, 10), '2026-11-10');
  assert.equal(addMonthsPreservingDay('2026-09-10', 3, 10), '2026-12-10');
});

test('monthly dates clamp short months without shifting the original anchor day', () => {
  assert.equal(addMonthsPreservingDay('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(addMonthsPreservingDay('2026-01-31', 2, 31), '2026-03-31');
  assert.equal(addMonthsPreservingDay('2028-01-31', 1, 31), '2028-02-29');
});