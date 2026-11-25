import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSchoolPerformanceChartData } from './schoolPerformanceChartData.mjs';

test('builds completeness percentages from expected visits and sorts least complete schools first', () => {
  const chartData = buildSchoolPerformanceChartData([
    {
      id: 1,
      name: 'Higher completeness',
      monitoring: {
        mothers: { expectedVisits: 10, completeForms: 8, recordedVisits: 9 },
        children: { expectedVisits: 10, completeForms: 6, recordedVisits: 7 },
      },
    },
    {
      id: 2,
      name: 'Lower completeness',
      monitoring: {
        mothers: { expectedVisits: 10, completeForms: 4, recordedVisits: 6 },
        children: { expectedVisits: 10, completeForms: 2, recordedVisits: 5 },
      },
    },
  ]);

  assert.deepEqual(chartData.map(({ name }) => name), ['Lower completeness', 'Higher completeness']);
  assert.equal(chartData[0].maternalPercentage, 40);
  assert.equal(chartData[0].childPercentage, 20);
  assert.equal(chartData[0].maternalRecordedVisits, 6);
});

test('represents no-due categories without inventing zero-percent completeness', () => {
  const [school] = buildSchoolPerformanceChartData([{
    id: 1,
    name: 'No maternal visits due',
    monitoring: {
      mothers: { expectedVisits: 0, completeForms: 0, recordedVisits: 0 },
      children: { expectedVisits: 4, completeForms: 2, recordedVisits: 3 },
    },
  }]);

  assert.equal(school.maternalPercentage, null);
  assert.equal(school.childPercentage, 50);
});
