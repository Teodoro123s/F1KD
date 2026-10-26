import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiReportCsv,
  getAgeAtCheckupMonths,
  getMotherCheckupSlot,
  isLatestCheckupRequest,
} from './aiReportCsv.mjs';

const labels = new Map([
  ['batch', 'Batch'],
  ['school', 'School'],
  ['child', 'Child Name'],
  ['mother', 'Mother Name'],
  ['age', 'Age'],
  ['ageAtCheckupMonths', 'Age at Check-up (months)'],
  ['gender', 'Sex'],
  ['dateOfBirth', 'Date of Birth'],
  ['measurementDate', 'Check-up Date'],
  ['weightForLengthInterpretation', 'Weight-for-Length Interpretation'],
  ['weightForAgeInterpretation', 'Weight-for-Age Interpretation'],
  ['lengthForAgeInterpretation', 'Length-for-Age Interpretation'],
  ['bmiForAge', 'BMI'],
]);

test('custom monitor CSV includes scope columns, beneficiary identity, requested fields, and one row per visit', () => {
  const result = buildAiReportCsv({
    rows: [{
      child: 'Sample Child',
      mother: 'Sample Mother',
      age: 20,
      gender: 'Female',
      dateOfBirth: '2025-01-01',
      batch: 'Batch A',
      growthSeries: [
        { date: '2025-02-01', weightForAgeInterpretation: 'Normal' },
        { date: '2025-03-01', weightForAgeInterpretation: 'Underweight' },
      ],
    }],
    proposal: {
      reportCategory: 'monitor',
      beneficiaryType: 'child',
      metricIds: ['measurementDate', 'weightForAgeInterpretation'],
    },
    selection: { schoolId: '1', groupId: '2', batchId: '' },
    fieldLabels: labels,
    getValue: (row, point, field) => field === 'measurementDate'
      ? point?.date || ''
      : field === 'ageAtCheckupMonths'
        ? getAgeAtCheckupMonths(row.dateOfBirth, point?.date)
        : point?.[field] ?? row[field],
  });

  assert.equal(result.rowCount, 2);
  assert.deepEqual(result.fields, ['batch', 'child', 'mother', 'ageAtCheckupMonths', 'gender', 'dateOfBirth', 'measurementDate', 'weightForAgeInterpretation']);
  assert.equal(result.filename, 'progress-report-ai-monitor-child.csv');
  assert.deepEqual(result.previewRows, [
    ['Batch A', 'Sample Child', 'Sample Mother', 1, 'Female', '2025-01-01', '2025-02-01', 'Normal'],
    ['Batch A', 'Sample Child', 'Sample Mother', 2, 'Female', '2025-01-01', '2025-03-01', 'Underweight'],
  ]);
  assert.match(result.csv, /"Batch","Child Name","Mother Name"/);
  assert.match(result.csv, /"2025-02-01","Normal"/);
  assert.match(result.csv, /"2025-03-01","Underweight"/);
});

test('age at check-up is derived in completed months from birth and visit dates', () => {
  assert.equal(getAgeAtCheckupMonths('2025-10-25', '2025-11-25'), 1);
  assert.equal(getAgeAtCheckupMonths('2025-10-25', '2025-11-24'), 0);
  assert.equal(getAgeAtCheckupMonths('2025-10-25', '2025-10-24'), '');
  assert.equal(getAgeAtCheckupMonths('', '2025-11-25'), '');
});

test('latest-checkup requests keep only the newest monitoring visit per beneficiary', () => {
  const result = buildAiReportCsv({
    rows: [
      {
        child: 'Sample Child',
        growthSeries: [
          { date: '2025-02-01', weightForAgeInterpretation: 'Normal' },
          { date: '2025-03-01', weightForAgeInterpretation: 'Underweight' },
        ],
      },
      {
        child: 'Another Child',
        growthSeries: [
          { date: '2025-01-15', weightForAgeInterpretation: 'Normal' },
          { date: '2025-04-01', weightForAgeInterpretation: 'Normal' },
        ],
      },
    ],
    proposal: { reportCategory: 'monitor', beneficiaryType: 'child', metricIds: ['weightForAgeInterpretation'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
    latestCheckupOnly: true,
    getValue: (_row, point, field) => field === 'measurementDate'
      ? point?.date
      : point?.[field] ?? '',
  });

  assert.equal(result.rowCount, 2);
  assert.deepEqual(result.previewRows.map((row) => row.slice(-2)), [
    ['2025-03-01', 'Underweight'],
    ['2025-04-01', 'Normal'],
  ]);
});

test('latest child monitor CSV includes all three requested growth indicators', () => {
  const result = buildAiReportCsv({
    rows: [{
      child: 'Sample Child',
      growthSeries: [{
        date: '2025-03-01',
        weightForLengthInterpretation: 'Normal',
        weightForAgeInterpretation: 'Underweight',
        lengthForAgeInterpretation: 'Normal',
      }],
    }],
    proposal: {
      reportCategory: 'monitor',
      beneficiaryType: 'child',
      metricIds: [
        'weightForAgeInterpretation',
        'lengthForAgeInterpretation',
        'weightForLengthInterpretation',
      ],
    },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
    latestCheckupOnly: true,
    getValue: (_row, point, field) => field === 'measurementDate'
      ? point?.date
      : point?.[field],
  });

  assert.deepEqual(result.fields.slice(-4), [
    'measurementDate',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
    'weightForLengthInterpretation',
  ]);
  assert.deepEqual(result.previewRows[0].slice(-4), [
    '2025-03-01',
    'Underweight',
    'Normal',
    'Normal',
  ]);
});

test('monitor CSV trims extra whitespace in interpretation labels', () => {
  const result = buildAiReportCsv({
    rows: [{
      child: 'Sample Child',
      dateOfBirth: '2025-01-01',
      growthSeries: [{
        date: '2025-02-01',
        weightForAgeInterpretation: '  Custom   interpretation  ',
      }],
    }],
    proposal: {
      reportCategory: 'monitor',
      beneficiaryType: 'child',
      metricIds: ['weightForAgeInterpretation'],
    },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
    getValue: (_row, point, field) => point?.[field],
  });

  assert.equal(result.previewRows[0].at(-1), 'Custom interpretation');
});

test('latest-checkup detection recognizes latest, most recent, and last wording', () => {
  assert.equal(isLatestCheckupRequest('mother latest BMI'), true);
  assert.equal(isLatestCheckupRequest('most recent mother check-up'), true);
  assert.equal(isLatestCheckupRequest('mother last recorded BMI'), true);
  assert.equal(isLatestCheckupRequest('mother BMI from last 3 months'), false);
  assert.equal(isLatestCheckupRequest('mother BMI history'), false);
});

test('maternal trimester/check-up requests include only the matching monitor visit', () => {
  const result = buildAiReportCsv({
    rows: [{
      mother: 'Sample Mother',
      growthSeries: [
        { date: '2026-03-14', trimester: '3rd Trimester', checkupNumber: 1, bmi: 22.1 },
        { date: '2026-04-14', trimester: '3rd Trimester', checkupNumber: 2, bmi: 22.5 },
        { date: '2026-05-14', trimester: '3rd Trimester', checkupNumber: 3, bmi: 22.9 },
      ],
    }],
    proposal: { reportCategory: 'monitor', beneficiaryType: 'mother', metricIds: ['bmiForAge'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
    motherCheckupSlot: getMotherCheckupSlot('Mother: BMI T3-c3 if available'),
    getValue: (_row, point, field) => field === 'measurementDate'
      ? point?.date
      : field === 'bmiForAge' ? point?.bmi : '',
  });

  assert.deepEqual(getMotherCheckupSlot('Mother: BMI T3-c3 if available'), {
    trimester: 3,
    checkupNumber: 3,
  });
  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.previewRows[0].slice(-2), ['2026-05-14', 22.9]);
  assert.equal(getMotherCheckupSlot('mother latest BMI'), null);
});

test('maternal trimester/check-up requests report when the requested visit is unavailable', () => {
  assert.throws(() => buildAiReportCsv({
    rows: [{
      mother: 'Sample Mother',
      growthSeries: [{ date: '2026-05-14', trimester: 3, checkupNumber: 2, bmi: 22.9 }],
    }],
    proposal: { reportCategory: 'monitor', beneficiaryType: 'mother', metricIds: ['bmiForAge'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
    motherCheckupSlot: { trimester: 3, checkupNumber: 3 },
  }), /No maternal check-up was recorded for trimester 3, check-up 3/);
});

test('custom monitor CSV rejects a scope with no recorded monitoring visits', () => {
  assert.throws(() => buildAiReportCsv({
    rows: [{ child: 'Sample Child', mother: 'Sample Mother', measurementDate: '', growthSeries: [] }],
    proposal: { reportCategory: 'monitor', beneficiaryType: 'child', metricIds: ['measurementDate', 'weightForAge'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
  }), /No monitoring check-ups were found for this scope/);
});

test('custom CSV escapes spreadsheet formulas and quotes', () => {
  const { csv } = buildAiReportCsv({
    rows: [{ mother: ' \t=SUM(1,1)', age: 30, dateOfBirth: '', contactNumber: 'She said "hello"' }],
    proposal: { reportCategory: 'profile', beneficiaryType: 'mother', metricIds: ['contactNumber'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: new Map([...labels, ['contactNumber', 'Contact Number']]),
  });

  assert.match(csv, /"'\s+=SUM\(1,1\)"/);
  assert.match(csv, /"She said ""hello"""/);
});

test('school-wide custom CSV places group and batch before identity columns', () => {
  const { fields } = buildAiReportCsv({
    rows: [],
    proposal: { reportCategory: 'program', beneficiaryType: 'mother', metricIds: ['receivedBenefitTotal'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: labels,
  });

  assert.deepEqual(fields.slice(0, 2), ['group', 'batch']);
});

test('all-accessible custom CSV includes school, group, and batch context before identity columns', () => {
  const { fields } = buildAiReportCsv({
    rows: [],
    proposal: { reportCategory: 'profile', beneficiaryType: 'child', metricIds: ['gender'] },
    selection: { schoolId: '', groupId: '', batchId: '' },
    fieldLabels: labels,
  });

  assert.deepEqual(fields.slice(0, 3), ['school', 'group', 'batch']);
});
