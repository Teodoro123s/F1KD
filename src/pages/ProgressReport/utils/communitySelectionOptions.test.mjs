import assert from 'node:assert/strict';
import test from 'node:test';
import {
  batchAvailableForGroup,
  filterReportBatches,
  filterReportGroups,
  reportBatchOptionLabels,
} from './communitySelectionOptions.mjs';

const groups = [
  { id: 1, schoolId: 10 },
  { id: 2, schoolId: 20 },
];

const batches = [
  { id: 101, schoolId: 10, groupIds: '1' },
  { id: 102, schoolId: 20, groupIds: '2' },
  { id: 103, schoolId: 10, groupIds: '' },
];

test('group options include all accessible schools unless a school is selected', () => {
  assert.deepEqual(filterReportGroups(groups, ''), groups);
  assert.deepEqual(filterReportGroups(groups, 20), [groups[1]]);
});

test('batch options respect selected school and group, including mother-linked batches', () => {
  const mothers = [{ id: 9, groupId: 1, batchId: 103 }];
  assert.deepEqual(filterReportBatches(batches, '', 1, mothers), [batches[0], batches[2]]);
  assert.deepEqual(filterReportBatches(batches, 20, '', mothers), [batches[1]]);
  assert.equal(batchAvailableForGroup(batches[2], 1, mothers), true);
});

test('duplicate batch names are disambiguated by group, code, or id', () => {
  const duplicateBatches = [
    { id: 101, name: 'Batch 1', code: 'B-101', groupIds: '1' },
    { id: 102, name: 'Batch 1', code: 'B-102', groupIds: '2' },
    { id: 103, name: 'Batch 1', groupIds: '' },
    { id: 104, name: 'Batch 1', groupIds: '' },
  ];
  const labels = reportBatchOptionLabels(duplicateBatches, [
    { id: 1, name: 'North Group' },
    { id: 2, name: 'South Group' },
  ]);

  assert.deepEqual(labels.map(({ label }) => label), [
    'Batch 1 — North Group',
    'Batch 1 — South Group',
    'Batch 1 (ID 103)',
    'Batch 1 (ID 104)',
  ]);
});
