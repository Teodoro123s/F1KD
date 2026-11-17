import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBeneficiaryName,
  isReceiptReceived,
  normalizeProgramBeneficiaryType,
  supportsBeneficiaryType,
} from './beneficiaryProgramReportUtils.mjs';

test('normalizes program beneficiary types and supports combined programs', () => {
  assert.equal(normalizeProgramBeneficiaryType('Mother & Child'), 'mother and child');
  assert.equal(supportsBeneficiaryType('Mother & Child', 'child'), true);
  assert.equal(supportsBeneficiaryType('Child', 'mother'), false);
});

test('uses beneficiary name fields and sensible type-specific fallbacks', () => {
  assert.equal(getBeneficiaryName({ first_name: 'Ada', last_name: 'Lovelace' }, 'mother'), 'Ada Lovelace');
  assert.equal(getBeneficiaryName({}, 'child'), 'Child');
});

test('recognizes the supported receipt status values', () => {
  [true, 1, '1', 'true'].forEach((value) => assert.equal(isReceiptReceived(value), true));
  [false, 0, 'false', null].forEach((value) => assert.equal(isReceiptReceived(value), false));
});
