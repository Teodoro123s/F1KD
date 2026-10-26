import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressReportCsv,
  getCsvIdentityFields,
  getCsvIdentityValue,
} from './csvIdentity.mjs';

function parseCsvRow(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

test('CSV identity columns include beneficiary name and basic demographic details', () => {
  const fields = getCsvIdentityFields([['measurementDate', 'Check-up Date'], ['child', 'Child Name']], 'child');

  assert.deepEqual(fields, [
    ['child', 'Beneficiary Name'],
    ['mother', 'Mother Name'],
    ['age', 'Age (months)'],
    ['gender', 'Sex'],
    ['dateOfBirth', 'Date of Birth'],
    ['measurementDate', 'Check-up Date'],
  ]);
});

test('CSV beneficiary name falls back to the name in monthly summary rows', () => {
  assert.equal(getCsvIdentityValue({ beneficiaryName: 'Araw Sample' }, 'child', 'child'), 'Araw Sample');
});

test('CSV data stays aligned with its headers and escapes spreadsheet-dangerous values', () => {
  const csv = buildProgressReportCsv(
    [{ child: 'Araw, "Sample"', mother: '\t=HYPERLINK("x")', age: 12, gender: 'Female', dateOfBirth: '2020-07-11' }],
    [['measurementDate', 'Check-up Date']],
    'child',
  );
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  const headers = parseCsvRow(lines[0]);
  const values = parseCsvRow(lines[1]);
  assert.equal(headers.length, values.length);
  assert.equal(values[0], 'Araw, "Sample"');
  assert.equal(values[1], "'\t=HYPERLINK(\"x\")");
});

test('monthly BMI CSV headers are unambiguous when opened in spreadsheet apps', () => {
  const csv = buildProgressReportCsv(
    [{ mother: 'Araw Sample', '2027-01': 23.4, '2027-01Interpretation': 'Normal' }],
    [['2027-01', 'Jan-27'], ['2027-01Interpretation', 'Jan-27 Interpretation']],
    'mother',
  );
  const headers = parseCsvRow(csv.split('\r\n')[0]);

  assert.deepEqual(headers, [
    'Beneficiary Name',
    'Age (years)',
    'Date of Birth',
    'BMI Jan 2027',
    'BMI Jan 2027 Interpretation',
  ]);
});
