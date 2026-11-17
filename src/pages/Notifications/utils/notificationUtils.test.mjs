import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRelativeTimestamp,
  getNotificationDateGroup,
} from './notificationUtils.mjs';
import { getNotificationDestination } from '../../../utils/notificationUtils.mjs';

function localDateAtNoon(date) {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  return value.toISOString();
}

test('notification date groups distinguish today, yesterday, and earlier dates', () => {
  const today = new Date();
  const yesterday = new Date(today);
  const earlier = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  earlier.setDate(earlier.getDate() - 2);

  assert.equal(getNotificationDateGroup(localDateAtNoon(today)), 'Today');
  assert.equal(getNotificationDateGroup(localDateAtNoon(yesterday)), 'Yesterday');
  assert.equal(getNotificationDateGroup(localDateAtNoon(earlier)), 'Earlier');
  assert.equal(getNotificationDateGroup('invalid'), 'Earlier');
});

test('invalid notification timestamps use the unavailable marker', () => {
  assert.equal(formatRelativeTimestamp('invalid'), '—');
});

test('notification destinations accept only safe in-app paths outside the notifications page', () => {
  assert.equal(getNotificationDestination({ linkTo: ' /beneficiary/mother/23?tab=profile ' }), '/beneficiary/mother/23?tab=profile');
  assert.equal(getNotificationDestination({ linkTo: '//example.com' }), '');
  assert.equal(getNotificationDestination({ linkTo: '/\\example' }), '');
  assert.equal(getNotificationDestination({ linkTo: '/notifications' }), '');
});
