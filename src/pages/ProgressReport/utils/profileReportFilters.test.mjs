import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProfileReportRows,
  getProfileReportScopeOptions,
  resolveIncludedProfileSection,
} from './profileReportFilters.mjs';

const rows = [
  { groupId: 1, group: 'North', batchId: 10, batch: 'North A', child: 'A' },
  { groupId: 1, group: 'North', batchId: 11, batch: 'North B', child: 'B' },
  { groupId: 2, group: 'South', batchId: 20, batch: 'South A', child: 'C' },
];

test('profile report filters rows by group and/or batch', () => {
  assert.deepEqual(filterProfileReportRows(rows).map(({ child }) => child), ['A', 'B', 'C']);
  assert.deepEqual(filterProfileReportRows(rows, '1').map(({ child }) => child), ['A', 'B']);
  assert.deepEqual(filterProfileReportRows(rows, '', '20').map(({ child }) => child), ['C']);
  assert.deepEqual(filterProfileReportRows(rows, '1', '11').map(({ child }) => child), ['B']);
});

test('profile report filter options use ids and unique names', () => {
  assert.deepEqual(getProfileReportScopeOptions(rows, 'group'), [
    { id: '1', name: 'North' },
    { id: '2', name: 'South' },
  ]);
});

test('profile results use an included section when the current section has no selected metrics', () => {
  assert.equal(
    resolveIncludedProfileSection('vaccine', ['gender', 'address'], {
      gender: 'general',
      address: 'general',
      bcgDate: 'vaccine',
    }, ['general', 'vaccine']),
    'general',
  );
});

test('profile results keep the current section when it is included', () => {
  assert.equal(
    resolveIncludedProfileSection('vaccine', ['gender', 'bcgDate'], {
      gender: 'general',
      bcgDate: 'vaccine',
    }, ['general', 'vaccine']),
    'vaccine',
  );
});
