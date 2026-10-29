import test from 'node:test';
import assert from 'node:assert/strict';
import { filterInterpretationFields } from './interpretationFields.mjs';
import {
  growthTableFieldsForMetric,
  withoutGrowthScores,
  GROWTH_TABLE_FIELDS,
  normalizeReferralValue,
  monitoringDetailValue,
} from './growthTableUtils.mjs';
import {
  formatProfileReportCellValue,
  formatPhilHealthNumberForReport,
  formatPresenceProfileValue,
} from './profileFieldFormatting.mjs';
import { formatFirstAndSurname, splitFirstAndSurname } from '../../../utils/formatting/personName.mjs';

test('contact numbers are not classified as presence fields', () => {
  assert.equal(formatPresenceProfileValue('contactNumber', '09171234567'), null);
});

test('profile table identifies uploaded documents without leaving missing uploads blank', () => {
  assert.equal(formatPresenceProfileValue('motherBirthCertificate', 'birth-certificate.pdf'), 'Yes');
  assert.equal(formatPresenceProfileValue('motherBirthCertificate', ''), 'No');
  assert.equal(formatPresenceProfileValue('programConsentDocument', null), 'No');
  assert.equal(formatPresenceProfileValue('philhealthMember', false), 'No');
  assert.equal(formatPresenceProfileValue('philhealthMember', true), 'Yes');
  assert.equal(formatPresenceProfileValue('philhealthMember', 0), 'No');
});

test('profile table keeps unrecorded birth place distinguishable from presence fields', () => {
  assert.equal(formatPresenceProfileValue('birthPlace', ''), null);
});

test('profile report leaves empty values blank while preserving explicit values', () => {
  assert.equal(formatProfileReportCellValue('—'), '');
  assert.equal(formatProfileReportCellValue('No'), 'No');
  assert.equal(formatProfileReportCellValue('None'), 'None');
  assert.equal(formatProfileReportCellValue('0'), '0');
  assert.equal(formatProfileReportCellValue('Cebu City'), 'Cebu City');
});

test('PhilHealth number report shows None when no number is recorded', () => {
  assert.equal(formatPhilHealthNumberForReport(''), 'None');
  assert.equal(formatPhilHealthNumberForReport(null), 'None');
  assert.equal(formatPhilHealthNumberForReport('  '), 'None');
  assert.equal(formatPhilHealthNumberForReport('12-345678901-2'), '12-345678901-2');
});

test('stored contact names split into first name and surname form fields', () => {
  assert.equal(formatFirstAndSurname(' Ana Maria ', 'Santos '), 'Ana Maria Santos');
  assert.deepEqual(splitFirstAndSurname('Ana Maria Santos'), {
    firstName: 'Ana Maria',
    surname: 'Santos',
  });
  assert.deepEqual(splitFirstAndSurname(''), { firstName: '', surname: '' });
});

test('interpretation columns can be excluded from report fields', () => {
  const fields = [
    ['group', 'Group'],
    ['weightForAgeZScore', 'Weight-for-Age Z-Score'],
    ['weightForAgeInterpretation', 'Weight-for-Age Interpretation'],
    ['2025-04', 'Apr-25'],
    ['2025-04Interpretation', 'Apr-25 Interpretation'],
  ];

  assert.deepEqual(filterInterpretationFields(fields, false), [
    ['group', 'Group'],
    ['weightForAgeZScore', 'Weight-for-Age Z-Score'],
    ['2025-04', 'Apr-25'],
  ]);
});

test('interpretation columns are included by default', () => {
  const fields = [['2025-04Interpretation', 'Apr-25 Interpretation']];

  assert.deepEqual(filterInterpretationFields(fields), fields);
});

test('monitoring tables show measurements and interpretations without WHO z-score columns', () => {
  assert.deepEqual(growthTableFieldsForMetric('weightForAgeInterpretation'), [
    'weightForAge',
    'weightForAgeInterpretation',
  ]);
  assert.deepEqual(growthTableFieldsForMetric('lengthForAgeInterpretation'), [
    'heightForAge',
    'lengthForAgeInterpretation',
  ]);
  assert.deepEqual(growthTableFieldsForMetric('weightForLengthInterpretation'), [
    'weightForLengthInterpretation',
  ]);
  assert.deepEqual(withoutGrowthScores([
    'measurementDate',
    'weightForAgeZScore',
    'weightForAgeInterpretation',
    'lengthForAgeZScore',
    'lengthForAgeInterpretation',
    'weightForLengthZScore',
  ]), [
    'measurementDate',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
  ]);
});

test('maternal referral metric appears in selected monitoring table fields', () => {
  assert.equal(GROWTH_TABLE_FIELDS.has('hospitalReferral'), true);
  assert.deepEqual(growthTableFieldsForMetric('hospitalReferral'), ['hospitalReferral']);
});

test('referral table values preserve yes, no, and not-recorded states', () => {
  assert.equal(normalizeReferralValue(true), true);
  assert.equal(normalizeReferralValue(0), false);
  assert.equal(normalizeReferralValue('0'), false);
  assert.equal(normalizeReferralValue(null), null);
});

test('check-up details preserve raw values and tri-state Boolean values', () => {
  const point = {
    weekNumber: 8,
    laboratoryRequests: 'CBC, urinalysis',
    hospitalReferral: false,
    labAssistanceProvided: true,
    milkSubsidyProvided: null,
  };

  assert.equal(monitoringDetailValue(point, 'weekNumber'), 8);
  assert.equal(monitoringDetailValue(point, 'laboratoryRequests'), 'CBC, urinalysis');
  assert.equal(monitoringDetailValue(point, 'hospitalReferral'), false);
  assert.equal(monitoringDetailValue(point, 'labAssistanceProvided'), true);
  assert.equal(monitoringDetailValue(point, 'milkSubsidyProvided'), null);
});
