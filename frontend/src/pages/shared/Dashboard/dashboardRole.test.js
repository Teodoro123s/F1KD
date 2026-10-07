import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardRole } from './dashboardRole.js';

test('getDashboardRole resolves normalized supported roles to their own dashboards', () => {
  assert.equal(getDashboardRole('super_admin'), 'super_admin');
  assert.equal(getDashboardRole('Administrator'), 'admin');
  assert.equal(getDashboardRole('Community Coordinator'), 'community_coordinator');
  assert.equal(getDashboardRole('Partner'), 'partner');
  assert.equal(getDashboardRole('Health Worker'), 'health_worker');
});

test('getDashboardRole does not provide a dashboard for an unknown role', () => {
  assert.equal(getDashboardRole('unrecognized-role'), null);
  assert.equal(getDashboardRole(''), null);
});
