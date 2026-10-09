import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateProgramGraphRows } from './programReportGraphData.js';

const rows = [
  { motherId: 1, mother: 'Lea Example', groupId: 5, group: 'Asasa', receivedBenefitTotal: 3, receivedBenefitAveragePerMonth: 1.5 },
  { motherId: 2, mother: 'Maya Sample', groupId: 5, group: 'Asasa', receivedBenefitTotal: 2, receivedBenefitAveragePerMonth: 1 },
  { motherId: 3, mother: 'Nina Demo', groupId: 5, group: 'Asasa', receivedBenefitTotal: 2, receivedBenefitAveragePerMonth: 2 },
  { motherId: 4, mother: 'Alex Test', groupId: 6, group: 'Group B', receivedBenefitTotal: 1, receivedBenefitAveragePerMonth: 0.5 },
];

test('breaks program metrics down by beneficiary without dropping rows', () => {
  const points = aggregateProgramGraphRows(rows, 'receivedBenefitTotal', 'beneficiary', 'mother');

  assert.equal(points.length, 4);
  assert.equal(points[0].label, 'Lea Example');
  assert.equal(points[0].value, 3);
});

test('sums totals by group and preserves separate groups', () => {
  const points = aggregateProgramGraphRows(rows, 'receivedBenefitTotal', 'group');

  assert.deepEqual(points.map(({ label, value }) => [label, value]), [['Asasa', 7], ['Group B', 1]]);
  assert.equal(points[0].count, 3);
});

test('averages monthly rates by group instead of summing per-person averages', () => {
  const points = aggregateProgramGraphRows(rows, 'receivedBenefitAveragePerMonth', 'group');

  assert.equal(points.find(({ label }) => label === 'Asasa').value, 1.5);
});
