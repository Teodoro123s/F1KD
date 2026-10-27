import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMonitoringDate,
  getMaternalMonitoringActivities,
  getMonitoringMonthDays,
  parseMonitoringDateKey,
} from './monitoringActivityCalendarUtils.mjs';

test('calendar date keys validate and format as local dates', () => {
  assert.equal(parseMonitoringDateKey('2026-10-27T23:30:00Z'), '2026-10-27');
  assert.equal(parseMonitoringDateKey('2026-02-30'), '');
  assert.equal(formatMonitoringDate('2026-10-27'), 'October 27, 2026');
});

test('month grid includes only dates in the month and starts on Sunday', () => {
  const days = getMonitoringMonthDays(new Date(2026, 9, 15));
  assert.equal(days.length % 7, 0);
  const monthDays = days.filter(Boolean);
  assert.equal(monthDays.length, 31);
  assert.equal(monthDays[0].date.getDay(), 4);
  assert.equal(monthDays[0].key, '2026-10-01');
});

test('calendar uses actual completed dates and only explicitly saved scheduled dates', () => {
  const mothers = [{
    id: 8,
    firstName: 'Maria',
    lastName: 'Santos',
    checkups: [
      [
        { checkupDate: '2026-10-10', trimester: '1st Trimester', checkupNumber: 1, nextCheckupDate: '2026-11-10' },
        { checkupDate: '', trimester: '1st Trimester', checkupNumber: 2 },
        null,
      ],
      [null, null, null],
      [null, null, null],
    ],
  }];
  const activities = getMaternalMonitoringActivities(mothers, new Date(2026, 9, 27));

  assert.deepEqual(activities.map(({ activityDate, activity, checkupNumber, trimester, status }) => (
    { activityDate, activity, checkupNumber, trimester, status }
  )), [
    { activityDate: '2026-10-10', activity: 'Check-up 1', checkupNumber: 1, trimester: '1st Trimester', status: 'Completed' },
    { activityDate: '2026-11-10', activity: 'Check-up 2', checkupNumber: 2, trimester: '1st Trimester', status: 'Scheduled' },
  ]);
});

test('calendar marks a saved appointment overdue and a completed visit on its recorded date', () => {
  const mother = {
    id: 9,
    name: 'Ana Reyes',
    checkups: [
      [
        { checkupDate: '2026-10-01', trimester: '1st Trimester', checkupNumber: 1, nextCheckupDate: '2026-10-15' },
        { checkupDate: '2026-10-20', trimester: '1st Trimester', checkupNumber: 2 },
        null,
      ],
      [null, null, null],
      [null, null, null],
    ],
  };
  const activities = getMaternalMonitoringActivities([mother], new Date(2026, 9, 27));

  assert.deepEqual(activities.map(({ activityDate, activity, status }) => ({ activityDate, activity, status })), [
    { activityDate: '2026-10-01', activity: 'Check-up 1', status: 'Completed' },
    { activityDate: '2026-10-15', activity: 'Check-up 2', status: 'Missed' },
    { activityDate: '2026-10-20', activity: 'Check-up 2', status: 'Completed' },
  ]);
});

test('calendar does not duplicate a completed check-up on its scheduled date', () => {
  const mother = {
    id: 10,
    name: 'Elena Cruz',
    checkups: [
      [
        { checkupDate: '2026-10-01', trimester: '1st Trimester', checkupNumber: 1, nextCheckupDate: '2026-10-20' },
        { checkupDate: '2026-10-20', trimester: '1st Trimester', checkupNumber: 2 },
        null,
      ],
      [null, null, null],
      [null, null, null],
    ],
  };
  const activities = getMaternalMonitoringActivities([mother], new Date(2026, 9, 27));
  const scheduledDateActivities = activities.filter((activity) => activity.activityDate === '2026-10-20');

  assert.equal(scheduledDateActivities.length, 1);
  assert.equal(scheduledDateActivities[0].status, 'Completed');
});

test('calendar does not fabricate appointments for mothers without a saved scheduled date', () => {
  const mother = {
    id: 11,
    name: 'No Schedule',
    checkups: [[null, null, null], [null, null, null], [null, null, null]],
  };

  assert.deepEqual(getMaternalMonitoringActivities([mother], new Date(2026, 9, 27)), []);
});
