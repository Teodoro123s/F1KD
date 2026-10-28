import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatActivityDate,
  addUnrecordedProgramRecipients,
  getDistinctProjectsForDate,
  getMonthCalendarDays,
  parseLocalDateKey,
  getProjectActivityStatusSummary,
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

test('selected-date activities deduplicate by project identity, not name', () => {
  const activities = [
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Done' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Pending' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Missing' },
    { program_id: 2, program_name: 'Nutrition', activity_date: '2026-10-27', status: 'Done' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-28', status: 'Done' },
  ];
  assert.deepEqual(getDistinctProjectsForDate(activities, '2026-10-27').map(({ id, name, activityCounts }) => [id, name, activityCounts]), [
    ['1', 'Nutrition', { done: 1, absent: 2 }],
    ['2', 'Nutrition', { done: 1, absent: 0 }],
  ]);
});

test('calendar counts recipients with no saved response as absent', () => {
  const programs = [{ id: 1, name: 'Nutrition' }];
  const recipients = [
    { sourceType: 'mother', sourceId: 11 },
    { sourceType: 'mother', sourceId: 12 },
    { sourceType: 'child', sourceId: 13 },
  ];
  const activities = [
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-27', beneficiary_type: 'mother', beneficiary_id: 11, monitored: 1, status: 'Done' },
    { program_id: 1, program_name: 'Nutrition', activity_date: '2026-10-28', beneficiary_type: 'mother', beneficiary_id: 11, monitored: 0, status: 'Pending' },
  ];

  const result = addUnrecordedProgramRecipients(
    activities,
    programs,
    () => recipients,
  );

  assert.deepEqual(result.slice(2).map(({ activity_date, beneficiary_type, beneficiary_id, status }) => [
    activity_date,
    beneficiary_type,
    String(beneficiary_id),
    status,
  ]), [
    ['2026-10-27', 'mother', '12', 'Absent'],
    ['2026-10-27', 'child', '13', 'Absent'],
    ['2026-10-28', 'mother', '12', 'Absent'],
    ['2026-10-28', 'child', '13', 'Absent'],
  ]);
});

test('calendar status summary combines no check-ins as absent', () => {
  assert.equal(getProjectActivityStatusSummary({ done: 1, absent: 5 }), 'Done 1 · Absent 5');
  assert.equal(getProjectActivityStatusSummary({ done: 1, absent: 0 }), 'Done 1');
});
