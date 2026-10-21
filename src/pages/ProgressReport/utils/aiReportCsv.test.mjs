import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiReportCsv } from './aiReportCsv.mjs';

const labels = new Map([
  ['batch', 'Batch'],
  ['child', 'Child Name'],
  ['mother', 'Mother Name'],
  ['age', 'Age'],
  ['gender', 'Sex'],
  ['dateOfBirth', 'Date of Birth'],
  ['measurementDate', 'Check-up Date'],
  ['weightForAgeInterpretation', 'Weight-for-Age Interpretation'],
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
    getValue: (row, point, field) => field === 'measurementDate' ? point?.date || '' : point?.[field] ?? row[field],
  });

  assert.equal(result.rowCount, 2);
  assert.deepEqual(result.fields, ['batch', 'child', 'mother', 'age', 'gender', 'dateOfBirth', 'measurementDate', 'weightForAgeInterpretation']);
  assert.equal(result.filename, 'progress-report-ai-monitor-child.csv');
  assert.deepEqual(result.previewRows, [
    ['Batch A', 'Sample Child', 'Sample Mother', 20, 'Female', '2025-01-01', '2025-02-01', 'Normal'],
    ['Batch A', 'Sample Child', 'Sample Mother', 20, 'Female', '2025-01-01', '2025-03-01', 'Underweight'],
  ]);
  assert.match(result.csv, /"Batch","Child Name","Mother Name"/);
  assert.match(result.csv, /"2025-02-01","Normal"/);
  assert.match(result.csv, /"2025-03-01","Underweight"/);
});

test('custom CSV escapes spreadsheet formulas and quotes', () => {
  const { csv } = buildAiReportCsv({
    rows: [{ mother: '=SUM(1,1)', age: 30, dateOfBirth: '', contactNumber: 'She said "hello"' }],
    proposal: { reportCategory: 'profile', beneficiaryType: 'mother', metricIds: ['contactNumber'] },
    selection: { schoolId: '1', groupId: '', batchId: '' },
    fieldLabels: new Map([...labels, ['contactNumber', 'Contact Number']]),
  });

  assert.match(csv, /"'\=SUM\(1,1\)"/);
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
