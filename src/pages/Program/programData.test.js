import test from 'node:test';
import assert from 'node:assert/strict';
import { recordMatchesProgramScope } from './programData.js';

test('beneficiaries only match the program scope they belong to', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    community: 'UC',
    clusters: [
      { type: 'School', name: 'UC' },
      { type: 'Group', name: 'Group A' },
    ],
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

test('school scope does not pull records from another explicit group in the same school', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    clusters: [
      { type: 'School', name: 'UC' },
      { type: 'Group', name: 'Sanciangko' },
    ],
  };

  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Sanciangko' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Osmena' }, program), false);
});

test('batch matches should still work when the beneficiary record has the correct batch but no group value', () => {
  const program = {
    beneficiaryType: 'Mother and Child',
    clusters: [
      { type: 'School', name: 'UC' },
      { type: 'Group', name: 'Sanciangko' },
      { type: 'Batch', name: 'Batch-1' },
    ],
  };

  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', batch: 'Batch-1' }, program), true);
  assert.equal(recordMatchesProgramScope({ type: 'mother', school: 'UC', group: 'Osmena', batch: 'Batch-1' }, program), false);
});
