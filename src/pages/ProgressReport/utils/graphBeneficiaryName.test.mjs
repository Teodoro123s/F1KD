import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGraphBeneficiaryName } from './graphBeneficiaryName.mjs';

test('graph beneficiary names show surname followed by given-name initials', () => {
  assert.equal(formatGraphBeneficiaryName('Araw Sample'), 'Sample, A.');
  assert.equal(formatGraphBeneficiaryName('Ana Maria Santos'), 'Santos, A. M.');
});

test('graph beneficiary names preserve suffixes and handle incomplete names', () => {
  assert.equal(formatGraphBeneficiaryName('Ana Maria Santos Jr.'), 'Santos Jr., A. M.');
  assert.equal(formatGraphBeneficiaryName('  Cher  '), 'Cher');
  assert.equal(formatGraphBeneficiaryName(''), 'Beneficiary');
});
