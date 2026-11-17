import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatReportAction,
  formatReportDate,
  getReportDateRange,
} from './reportUtils.mjs';

test('report action labels format known and generic actions', () => {
  assert.equal(formatReportAction('sign_in'), 'Signed in');
  assert.equal(formatReportAction('user.updated'), 'User Updated');
});

test('report dates return display fields or the unavailable marker', () => {
  assert.equal(formatReportDate('invalid'), '—');
  const formatted = formatReportDate('2026-10-27T13:15:00.000Z');
  assert.equal(typeof formatted.date, 'string');
  assert.equal(typeof formatted.time, 'string');
  assert.equal(formatted.iso, '2026-10-27T13:15:00.000Z');
});

test('all-time range has no date boundaries and today range is a single day', () => {
  assert.deepEqual(getReportDateRange('all'), { from: '', to: '' });
  const today = getReportDateRange('today');
  assert.equal(today.from, today.to);
});
