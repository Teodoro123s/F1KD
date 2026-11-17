import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatActivityDate,
  getDistinctProjectsForDate,
  getMonthCalendarDays,
  parseLocalDateKey,
  getProjectActivityCheckInSummary,
  toLocalDateKey,
} from './projectActivityCalendarUtils.mjs';

test('calendar date keys parse and format in local calendar time', () => {
  const date = parseLocalDateKey('2026-10-27');
  assert.ok(date);
  assert.equal(toLocalDateKey(date), '2026-10-27');
  assert.equal(parseLocalDateKey('2026-02-30'), null);
  assert.equal(parseLocalDateKey('2026-1-02'), null);
  assert.match(formatActivityDate('2026-10-27'), /October 27, 2026/);
});

test('month grid has seven columns and includes each date in the displayed month', () => {
  const days = getMonthCalendarDays(new Date(2026, 9, 15));
  assert.equal(days.length % 7, 0);
  const monthDays = days.filter(Boolean);
  assert.equal(monthDays.length, 31);
  assert.equal(monthDays.find(({ key }) => key === '2026-10-01').date.getDay(), 4);
});

test('selected-date tally counts recorded check-ins by project identity, regardless of response status', () => {
  const activities = [
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Done' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Pending' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Missing' },
    { program_id: 2, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Done' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-28', status: 'Done' },
  ];
  assert.deepEqual(getDistinctProjectsForDate(activities, '2026-10-27').map(({ id, name, checkIns }) => [id, name, checkIns]), [
    ['1', 'Nutrition', 3],
    ['2', 'Nutrition', 1],
  ]);
});

test('check-in summary labels singular and plural counts', () => {
  assert.equal(getProjectActivityCheckInSummary(1), '1 check-in');
  assert.equal(getProjectActivityCheckInSummary(3), '3 check-ins');
});
