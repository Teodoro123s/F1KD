import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckupScheduleStatus } from './checkupStatus.mjs';

const now = new Date(2026, 9, 26, 12);

test('classifies a check-up due today or in the future as pending', () => {
  assert.equal(getCheckupScheduleStatus({ nextCheckupDate: '2026-10-26' }, now), 'Pending');
  assert.equal(getCheckupScheduleStatus({ nextCheckupDate: '2026-10-29' }, now), 'Pending');
});

test('classifies an overdue scheduled check-up as missing', () => {
  assert.equal(getCheckupScheduleStatus({ nextCheckupDate: '2026-10-25' }, now), 'Missing');
});

test('treats beneficiaries without a scheduled check-up as pending', () => {
  assert.equal(getCheckupScheduleStatus({}, now), 'Pending');
});

test('uses the latest recorded check-up instead of an older schedule', () => {
  assert.equal(getCheckupScheduleStatus({
    checkups: [
      { checkupDate: '2026-10-01', nextCheckupDate: '2026-10-10' },
      { checkupDate: '2026-10-11', nextCheckupDate: '2026-11-11' },
    ],
    nextCheckupDate: '2026-10-10',
  }, now), 'Pending');
});

test('does not fall back to an older appointment when the latest check-up has no next date', () => {
  assert.equal(getCheckupScheduleStatus({
    checkups: [
      { checkupDate: '2026-10-01', nextCheckupDate: '2026-10-10' },
      { checkupDate: '2026-10-11' },
    ],
    nextCheckupDate: '2026-10-10',
  }, now), 'Pending');
});
