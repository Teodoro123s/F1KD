import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBatchesForGroup,
  hasPendingBeneficiaryDocuments,
  matchesBeneficiarySearch,
} from './beneficiaryUtils.js';

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

test('matches beneficiary searches case-insensitively across name and assignment fields', () => {
  const child = {
    name: 'Ana Cruz',
    community: 'North School',
    original: {
      group_name: 'Health Group',
      batch_name: 'Batch Blue',
      mother: { name: 'Maria Cruz' },
    },
  };

  assert.equal(matchesBeneficiarySearch(child, 'ANA'), true);
  assert.equal(matchesBeneficiarySearch(child, 'north health'), true);
  assert.equal(matchesBeneficiarySearch(child, 'maria blue'), true);
  assert.equal(matchesBeneficiarySearch(child, 'unrelated'), false);
});

test('pending documents filter identifies mothers missing either required document', () => {
  assert.equal(hasPendingBeneficiaryDocuments({
    birth_certificate_document_name: 'birth-certificate.pdf',
    birth_certificate_document_path: '/documents/birth-certificate.pdf',
    consent_document_name: 'consent.pdf',
  }, 'Mother'), true);

  assert.equal(hasPendingBeneficiaryDocuments({
    birth_certificate_document_name: 'birth-certificate.pdf',
    birth_certificate_document_path: '/documents/birth-certificate.pdf',
    consent_document_name: 'consent.pdf',
    consent_document_path: '/documents/consent.pdf',
  }, 'Mother'), false);
});

test('pending documents filter checks the child birth document', () => {
  assert.equal(hasPendingBeneficiaryDocuments({ birth_document_name: '', birth_document_path: '' }, 'Child'), true);
  assert.equal(hasPendingBeneficiaryDocuments({
    birth_document_name: 'birth-certificate.pdf',
    birth_document_path: '/documents/birth-certificate.pdf',
  }, 'Child'), false);
});
