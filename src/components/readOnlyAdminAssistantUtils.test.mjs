import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAdminAssistantRecords,
  summarizeAdminAssistantRecords,
} from './readOnlyAdminAssistantUtils.mjs';

const records = [
  { id: 1, name: 'Alma Santos', role: 'Community Organizer', status: 'Active', community: 'North District', entityType: 'Account' },
  { id: 2, name: 'Ben Cruz', role: 'Health worker', status: 'Suspended', community: 'North District', entityType: 'Account' },
  { id: 3, name: 'Central Group', status: 'Active', community: 'North District', entityType: 'Group' },
  { id: 4, name: 'South Group', status: 'Inactive', community: 'South District', entityType: 'Group' },
];

test('assistant lookup filters authorized local records by combined fields and intent', () => {
  const matches = filterAdminAssistantRecords(records, {
    mode: 'lookup',
    searchText: 'north alma',
    role: 'Community Organizer',
    status: 'Active',
    entityType: 'All',
  });
  assert.deepEqual(matches.map((record) => record.id), [1]);
});

test('assistant summaries group matching local community records by type or status', () => {
  const activeGroups = filterAdminAssistantRecords(records, {
    mode: 'summary',
    searchText: 'north',
    role: 'All',
    status: 'Active',
    entityType: 'Group',
  });
  assert.deepEqual(activeGroups.map((record) => record.id), [3]);
  assert.deepEqual(summarizeAdminAssistantRecords(activeGroups, 'entityType'), [['Group', 1]]);
  assert.deepEqual(summarizeAdminAssistantRecords(records.slice(0, 2), 'role'), [
    ['Community Organizer', 1],
    ['Health worker', 1],
  ]);
});

test('setup intents do not filter or summarize any records', () => {
  assert.deepEqual(filterAdminAssistantRecords(records, { mode: 'setup' }), []);
  assert.deepEqual(summarizeAdminAssistantRecords([], 'status'), []);
});
