import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  filterMonitoringReportCheckups,
  getLatestMonitoringReportCheckup,
  getMonitoringReportCheckups,
  getMonitoringReportValue,
  escapeMonitoringReportCsvValue,
  MONITORING_REPORT_FIELD_LABELS,
} from './monitoringReportUtils.mjs';

const require = createRequire(import.meta.url);
const { MONITORING_REPORT_FIELDS } = require('../../../server/utils/progressReportAI.js');

const motherCheckup = {
  checkupDate: '2026-10-18T00:00:00.000Z',
  nextCheckupDate: '2026-11-18',
  gestationalAge: 28,
  weight: 65,
  height: 160,
  bmi: 25.4,
  nutritionalStatus: 'Normal',
  bp: '120/80',
  fundalHeight: 28,
  fhr: 140,
  developmentalStatus: 'Needs Follow-up',
  serviceProvider: 'Midwife',
  referral: true,
  laboratoryRequests: ['CBC', 'Urinalysis'],
  amount: 1500,
  sourceOfFunds: 'Municipal Fund',
  facilityType: 'Hospital',
  bp: '120/80',
  remarks: 'Follow-up requested',
};

const childCheckup = {
  visit_date: '2026-10-17T00:00:00.000Z',
  nextCheckupDate: '2026-11-17',
  currentAgeMonths: 6,
  breastfeedingStatus: 'Yes',
  weight: 12.5,
  height: 90,
  bmi: 15.4,
  referred_to_hospital: 1,
  laboratory_requests: 'CBC',
  assistance_amount: 900,
  source_of_funds: 'Program Funds',
  facility_type: 'Clinic',
  developmental_status: 'Normal',
  service_provider: 'Health Worker',
  notes: 'Review next month',
};

test('every mother and child AI report field has a table label and renders its saved value', () => {
  const samples = { Mother: motherCheckup, Child: childCheckup };

  for (const [beneficiaryType, fields] of Object.entries(MONITORING_REPORT_FIELDS)) {
    for (const [metricId] of fields) {
      assert.ok(MONITORING_REPORT_FIELD_LABELS[metricId], `${beneficiaryType}.${metricId} needs a column label`);
      const value = getMonitoringReportValue(samples[beneficiaryType], metricId);
      assert.notEqual(value, '—', `${beneficiaryType}.${metricId} should show its saved value`);
    }
  }

  assert.equal(getMonitoringReportValue(motherCheckup, 'measurementDate'), '2026-10-18');
  assert.equal(getMonitoringReportValue(motherCheckup, 'laboratoryRequests'), 'CBC, Urinalysis');
  assert.equal(getMonitoringReportValue(motherCheckup, 'hospitalReferral'), 'Yes');
  assert.equal(getMonitoringReportValue(childCheckup, 'hospitalReferral'), 'Yes');
  assert.equal(getMonitoringReportValue(childCheckup, 'facilityType'), 'Clinic');
  assert.equal(getMonitoringReportValue(childCheckup, 'bmi'), 15.4);
  assert.equal(getMonitoringReportValue(childCheckup, 'currentAgeMonths'), 6);
});

test('maternal and child check-ups flatten into rows, preserving each saved visit', () => {
  const mother = { checkups: [[motherCheckup, null], [null, { ...motherCheckup, checkupNumber: 2 }]] };
  const child = { checkups: [childCheckup, null, { ...childCheckup, week_number: 2 }] };

  assert.equal(getMonitoringReportCheckups(mother, 'Mother').length, 2);
  assert.equal(getMonitoringReportCheckups(child, 'Child').length, 2);
});

test('yes-only referral filtering keeps only visits with an explicitly positive referral', () => {
  const visits = [
    { referral: true },
    { referral: false },
    { referred_to_hospital: 1 },
    { referred_to_hospital: 0 },
    {},
  ];

  assert.deepEqual(filterMonitoringReportCheckups(visits, true), [visits[0], visits[2]]);
  assert.deepEqual(filterMonitoringReportCheckups(visits, false), visits);
});

test('non-normal screening filter returns only recorded Needs Follow-up or At Risk check-ups', () => {
  const visits = [
    { developmentalStatus: 'Normal' },
    { developmentalStatus: 'Needs Follow-up' },
    { developmental_status: 'At Risk' },
    { developmentalStatus: 'Needs_Follow_Up' },
    { developmentalStatus: 'Pending review' },
    { developmentalStatus: 'Unknown' },
    {},
  ];

  assert.deepEqual(filterMonitoringReportCheckups(visits, false, true), [visits[1], visits[2], visits[3]]);
  assert.deepEqual(filterMonitoringReportCheckups(visits, false, false), visits);
  assert.deepEqual(
    filterMonitoringReportCheckups([{ referral: true, developmentalStatus: 'At Risk' }, { referral: false, developmentalStatus: 'At Risk' }], true, true),
    [{ referral: true, developmentalStatus: 'At Risk' }],
  );
});

test('monitoring CSV values neutralize formulas preceded by whitespace or control characters', () => {
  assert.equal(escapeMonitoringReportCsvValue('=1+1'), "'=1+1");
  assert.equal(escapeMonitoringReportCsvValue('\t=1+1'), "'\t=1+1");
  assert.equal(escapeMonitoringReportCsvValue(' \r@SUM(A1)'), "' \r@SUM(A1)");
  assert.equal(escapeMonitoringReportCsvValue('Needs follow-up'), 'Needs follow-up');
});

test('latest check-up selection uses visit dates and keeps the last recorded visit if dates are absent', () => {
  const older = { checkupDate: '2026-01-01' };
  const latest = { checkupDate: '2026-06-15' };
  const latestSameDay = { checkupDate: '2026-06-15', weekNumber: 4 };
  const noDateFirst = { weekNumber: 1 };
  const noDateLatest = { weekNumber: 3 };

  assert.equal(getLatestMonitoringReportCheckup([latest, older]), latest);
  assert.equal(getLatestMonitoringReportCheckup([latest, latestSameDay]), latestSameDay);
  assert.equal(getLatestMonitoringReportCheckup([noDateFirst, noDateLatest]), noDateLatest);
  const referrals = filterMonitoringReportCheckups([
    { checkupDate: '2026-06-15', referral: false },
    { checkupDate: '2026-03-15', referral: true },
  ], true);
  assert.equal(getLatestMonitoringReportCheckup(referrals).checkupDate, '2026-03-15');
  assert.equal(getLatestMonitoringReportCheckup([]), null);
});

test('report field aliases and empty or calculated values are handled safely', () => {
  assert.equal(getMonitoringReportValue({
    referredToHospital: 'yes',
    assistance_amount: 0,
    laboratory_requests: [],
  }, 'hospitalReferral'), 'Yes');
  assert.equal(getMonitoringReportValue({ assistance_amount: 0 }, 'assistanceAmount'), 0);
  assert.equal(getMonitoringReportValue({ weight: 70, height: 175 }, 'bmi'), '22.9');
  assert.equal(getMonitoringReportValue({ service_provider: 'Nurse' }, 'serviceProvider'), 'Nurse');
  assert.equal(getMonitoringReportValue({ gestational_age_weeks: 24 }, 'gestationalAge'), 24);
  assert.equal(getMonitoringReportValue({ next_checkup_date: '2026-11-05T00:00:00.000Z' }, 'nextCheckupDate'), '2026-11-05');
  assert.equal(getMonitoringReportValue({ exclusive_breastfeeding: 'Yes' }, 'breastfeedingStatus'), 'Yes');
  assert.equal(getMonitoringReportValue({ referral: false }, 'hospitalReferral'), 'No');
  assert.equal(getMonitoringReportValue({ referral: '' }, 'hospitalReferral'), 'No');
  assert.equal(getMonitoringReportValue({ referral: null }, 'hospitalReferral'), 'No');
  assert.equal(getMonitoringReportValue({ fundal_height_cm: 25 }, 'fundalHeight'), 25);
  assert.equal(getMonitoringReportValue({ fetal_heart_rate_bpm: 138 }, 'fetalHeartRate'), 138);
  assert.equal(getMonitoringReportValue({}, 'laboratoryRequests'), '—');
  assert.equal(getMonitoringReportValue({}, 'hospitalReferral'), 'No');
});
