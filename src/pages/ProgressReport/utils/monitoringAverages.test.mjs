import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressReportCsv } from './csvIdentity.mjs';
import { buildMonitoringAverageRow } from './monitoringAverages.mjs';

test('monitoring average rows average numeric measurements and skip blank or interpretation values', () => {
  const averageRow = buildMonitoringAverageRow([
    { measurementDate: '2026-06-27', weightForAge: 82.7, lengthForAgeInterpretation: 'Normal' },
    { measurementDate: '2026-07-27', weightForAge: 83.6, lengthForAgeInterpretation: 'Normal' },
    { measurementDate: '2026-08-27', weightForAge: '', lengthForAgeInterpretation: 'Normal' },
  ], ['measurementDate', 'weightForAge', 'lengthForAgeInterpretation'], 'measurementDate');

  assert.deepEqual(averageRow, {
    measurementDate: 'Average',
    weightForAge: 83.2,
  });
});

test('monitoring average row is omitted when selected measurements have no numeric values', () => {
  const averageRow = buildMonitoringAverageRow([
    { lengthForAgeInterpretation: 'Normal' },
  ], ['lengthForAgeInterpretation'], 'measurementDate');

  assert.equal(averageRow, null);
});

test('monitoring CSV appends the same average summary after check-up rows', () => {
  const rows = [
    { child: 'Araw Sample', measurementDate: '2026-06-27', weightForAge: 82.7 },
    { child: 'Araw Sample', measurementDate: '2026-07-27', weightForAge: 83.7 },
  ];
  const averageRow = buildMonitoringAverageRow(rows, ['weightForAge'], 'measurementDate');
  Object.assign(averageRow, { child: rows[0].child });

  const csv = buildProgressReportCsv(
    [...rows, averageRow],
    [['measurementDate', 'Check-up Date'], ['weightForAge', 'Weight (kg)']],
    'child',
  );
  const lines = csv.split('\r\n');

  assert.equal(lines.at(-1), '"Araw Sample","","","","","Average","83.2"');
});
