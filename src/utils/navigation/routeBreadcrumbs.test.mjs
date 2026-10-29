import test from 'node:test';
import assert from 'node:assert/strict';
import { getRouteBreadcrumbs } from './routeBreadcrumbs.mjs';

test('builds navigable breadcrumbs for nested beneficiary routes without exposing ids', () => {
  assert.deepEqual(getRouteBreadcrumbs('/beneficiary/child/123/edit'), [
    { label: 'Beneficiaries', to: '/beneficiary' },
    { label: 'Child Profile', to: '/beneficiary/child/123' },
    { label: 'Edit Child' },
  ]);
});

test('builds community and project hierarchy breadcrumbs', () => {
  assert.deepEqual(getRouteBreadcrumbs('/community/group/45/health-workers'), [
    { label: 'Community', to: '/community' },
    { label: 'Group', to: '/community/group/45' },
    { label: 'Health Workers' },
  ]);
  assert.deepEqual(getRouteBreadcrumbs('/program/9/batch/12'), [
    { label: 'Projects', to: '/program' },
    { label: 'Project', to: '/program/9' },
    { label: 'Batch' },
  ]);
  assert.deepEqual(getRouteBreadcrumbs('/program/9'), [
    { label: 'Projects', to: '/program' },
    { label: 'Project' },
  ]);
  assert.deepEqual(getRouteBreadcrumbs('/program/9/beneficiaries/child/123/receipt-history'), [
    { label: 'Projects', to: '/program' },
    { label: 'Project', to: '/program/9' },
    { label: 'Receipt History' },
  ]);
});

test('builds a navigable Dashboard parent for Progress Report', () => {
  assert.deepEqual(getRouteBreadcrumbs('/progress-report'), [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Progress Report' },
  ]);
  assert.deepEqual(getRouteBreadcrumbs('/ai-setting'), [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'AI Setting' },
  ]);
});

test('keeps the previous user-management view as the breadcrumb return target', () => {
  assert.deepEqual(getRouteBreadcrumbs('/user-management/user/123', {
    returnTo: '/user-management/health-workers',
  }), [
    { label: 'User Management', to: '/user-management/health-workers' },
    { label: 'User Details' },
  ]);
});

test('uses the originating community hierarchy for user details opened from community', () => {
  assert.deepEqual(getRouteBreadcrumbs('/user-management/user/123', {
    returnTo: '/community/group/45/health-workers',
  }), [
    { label: 'Community', to: '/community' },
    { label: 'Group', to: '/community/group/45' },
    { label: 'Health Workers', to: '/community/group/45/health-workers' },
    { label: 'User Details' },
  ]);
});
