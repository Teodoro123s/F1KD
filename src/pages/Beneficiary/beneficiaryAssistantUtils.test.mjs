import assert from 'node:assert/strict';
import test from 'node:test';
import { filterBeneficiaryAssistantRecords, getBeneficiaryScreeningMatches } from './beneficiaryAssistantUtils.mjs';

const records = [
  {
    id: 'M-1',
    entityType: 'Mother',
    name: 'Mary Princess',
    community: 'North Barangay',
    checkups: [[{ developmental_status: 'Needs Follow-up', checkup_date: '2026-01-02' }]],
  },
  {
    id: 2,
    entityType: 'Child',
    name: 'Alex Cruz',
    community: 'North Barangay',
    checkups: [{ developmentalStatus: 'Normal' }, { developmentalStatus: 'At Risk' }],
  },
  {
    id: 3,
    entityType: 'Child',
    name: 'Sam Doe',
    checkups: [{ developmentalStatus: '' }],
  },
];

test('beneficiary lookup filters by entity and all requested profile terms', () => {
  assert.deepEqual(
    filterBeneficiaryAssistantRecords(records, {
      mode: 'lookup', entityType: 'Mother', searchText: 'mary north',
    }).map((record) => record.id),
    ['M-1'],
  );
  assert.deepEqual(
    filterBeneficiaryAssistantRecords(records, {
      mode: 'lookup', entityType: 'Child', searchText: 'child alex',
    }).map((record) => record.id),
    [2],
  );
});

test('screening lookup includes only explicitly saved statuses and supports non-normal results', () => {
  const matches = filterBeneficiaryAssistantRecords(records, {
    mode: 'screening', entityType: 'All', searchText: '', screeningStatus: 'Non-normal',
  });
  assert.deepEqual(matches.map((record) => record.id), ['M-1', 2]);
  assert.deepEqual(getBeneficiaryScreeningMatches(matches[1], 'Non-normal'), [{ status: 'At Risk', date: '' }]);
  assert.deepEqual(filterBeneficiaryAssistantRecords(records, {
    mode: 'screening', entityType: 'All', searchText: '', screeningStatus: 'Normal',
  }).map((record) => record.id), [2]);
});

test('redirect intents never search locally loaded beneficiary data', () => {
  assert.deepEqual(filterBeneficiaryAssistantRecords(records, { mode: 'redirect' }), []);
  assert.deepEqual(filterBeneficiaryAssistantRecords(records, { mode: 'clinical-info' }), []);
});

test('profile-change requests require a named match and never produce an all-record result', () => {
  assert.deepEqual(filterBeneficiaryAssistantRecords(records, {
    mode: 'profile-change', entityType: 'All', searchText: '',
  }), []);
  assert.deepEqual(filterBeneficiaryAssistantRecords(records, {
    mode: 'profile-change', entityType: 'All', searchText: 'Mary',
  }).map((record) => record.id), ['M-1']);
});
