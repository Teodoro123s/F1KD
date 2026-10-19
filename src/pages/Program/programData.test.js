import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProgramBeneficiaryRecords,
  filterPrograms,
  getReceiptRecipientKeysForRows,
  recordMatchesProgramScope,
} from './programData.js';

test('group coverage includes all beneficiaries in the selected group', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    community: 'UC',
    clusters: [{ type: 'Group', name: 'Group A' }],
  };

  const groupARecord = { type: 'mother', school: 'UC', group: 'Group A', batch: 'Batch 1' };
  const groupBRecord = { type: 'mother', school: 'UC', group: 'Group B', batch: 'Batch 2' };

  assert.equal(recordMatchesProgramScope(groupARecord, program), true);
  assert.equal(recordMatchesProgramScope(groupBRecord, program), false);
});

test('type filtering still works when a program targets one beneficiary type', () => {
  const program = {
    beneficiaryType: 'Mother',
    clusters: [{ type: 'Group', name: 'Group A' }],
  };

  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Group A' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'child', school: 'UC', group: 'Group A' }, program), false);
});

test('school scope automatically includes all beneficiaries in that school', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    clusters: [
      { type: 'School', name: 'UC' },
      { type: 'Group', name: 'Sanciangko' },
    ],
  };

  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Sanciangko' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Osmena' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'Another school', group: 'Osmena' }, program), false);
});

test('group and batch scopes include matching beneficiaries', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    clusters: [{ type: 'Group', name: 'Sanciangko' }, { type: 'Batch', name: 'Batch-1' }],
  };

  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', batch: 'Batch-1' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'Another school', group: 'Sanciangko' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Osmena', batch: 'Batch-2' }, program), false);
});

test('programs without assigned scopes do not include beneficiaries', () => {
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC' }, { clusters: [] }), false);
});

test('receipt edits select only beneficiaries already recorded for that date', () => {
  const recipients = [
    { type: 'mother', id: 11 },
    { type: 'mother', id: 12 },
    { type: 'mother', id: 13 },
  ];
  const rows = [
    { beneficiary_key: 'mother:11', monitored: true },
    { beneficiary_key: 'mother:12', monitored: true },
  ];

  assert.deepEqual(getReceiptRecipientKeysForRows(rows, recipients), ['mother:11', 'mother:12']);
});

test('legacy recipient exclusions do not remove beneficiaries from a selected scope', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    clusters: [{ type: 'School', name: 'UC' }],
    recipientExclusions: [{ type: 'mother', id: 12 }],
  };
  const records = [
    { sourceType: 'mother', sourceId: 12, type: 'Mother', school: 'UC' },
    { sourceType: 'mother', sourceId: 13, type: 'Mother', school: 'UC' },
    { sourceType: 'child', sourceId: 12, type: 'Child', school: 'UC' },
    { sourceType: 'mother', sourceId: 14, type: 'Mother', school: 'Another school' },
  ];

  assert.deepEqual(filterProgramBeneficiaryRecords(program, records), records.slice(0, 3));
});

test('program search is case-insensitive while preserving status filters', () => {
  const programs = [
    { name: 'Mabini Nutrition Support', status: 'Active', community: 'Cebu' },
    { name: 'Mabini Wellness', status: 'Ended' },
  ];

  assert.deepEqual(filterPrograms(programs, 'mAbInI nUtRiTiOn', 'Active'), [programs[0]]);
  assert.deepEqual(filterPrograms(programs, 'nutrition cebu', 'Active'), [programs[0]]);
  assert.deepEqual(filterPrograms(programs, 'MABINI', 'Ended'), [programs[1]]);
});
