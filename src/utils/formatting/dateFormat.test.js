import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonthsPreservingDay, formatDateForDisplay, getDateInputError, maskDateInput, normalizeDateValue } from './dateFormat.js';

test('date display and input masks use DD/MM/YYYY while storage remains ISO', () => {
  assert.equal(formatDateForDisplay('2026-09-29'), '29/09/2026');
  assert.equal(maskDateInput('2026-09-29'), '29/09/2026');
  assert.equal(normalizeDateValue('29/09/2026'), '2026-09-29');
});

test('month-first date inputs format and normalize as MM/DD/YYYY', () => {
  assert.equal(maskDateInput('2026-09-29', 'mdy'), '09/29/2026');
  assert.equal(normalizeDateValue('09/29/2026', 'mdy'), '2026-09-29');
  assert.equal(getDateInputError('09/29/2026', { order: 'mdy' }), '');
  assert.match(getDateInputError('9/29/2026', { order: 'mdy' }), /MM\/DD\/YYYY/);
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

test('date input validation enforces month range and calendar day counts', () => {
  assert.equal(getDateInputError('20/20/2050'), 'Month must be between 01 and 12.');
  assert.equal(getDateInputError('31/04/2024'), 'Day must be between 01 and 30 for this month and year.');
  assert.equal(getDateInputError('29/02/2024'), '');
  assert.equal(getDateInputError('29/02/2023'), 'Day must be between 01 and 28 for this month and year.');
});

test('date input validation rejects future dates and handles required empty values', () => {
  assert.equal(getDateInputError('01/01/2050', { max: '2049-12-31' }), 'Date cannot be in the future.');
  assert.equal(getDateInputError('', { required: true }), 'Date is required.');
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