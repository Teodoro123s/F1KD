import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBatchesForGroup } from './beneficiaryUtils.js';

test('getBatchesForGroup includes unassigned batches from the selected school', () => {
  const batches = [
    { id: 'school-batch', community: 'School A', groupIds: '' },
    { id: 'other-school-batch', community: 'School B', groupIds: '' },
    { id: 'other-group-batch', community: 'School A', groupIds: '22' },
    { id: 'assigned-batch', community: 'School A', groupIds: '21,22' },
  ];

  assert.deepEqual(
    getBatchesForGroup(batches, '21', 'School A').map((batch) => batch.id),
    ['school-batch', 'assigned-batch'],
  );
});

test('getBatchesForGroup does not return batches without a selected group', () => {
  assert.deepEqual(getBatchesForGroup([{ id: 'batch', community: 'School A' }], '', 'School A'), []);
});
