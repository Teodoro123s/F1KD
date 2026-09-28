import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateForDisplay, maskDateInput, normalizeDateValue } from './dateFormat.js';

test('date display and input masks use DD/MM/YYYY while storage remains ISO', () => {
  assert.equal(formatDateForDisplay('2026-09-29'), '29/09/2026');
  assert.equal(maskDateInput('2026-09-29'), '29/09/2026');
  assert.equal(normalizeDateValue('29/09/2026'), '2026-09-29');
});

test('invalid date values do not leak inconsistent formats into the UI', () => {
  assert.equal(formatDateForDisplay('not-a-date'), '—');
  assert.equal(normalizeDateValue('31/02/2026'), '');
});