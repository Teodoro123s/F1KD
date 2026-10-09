import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateReportRows } from './reportAggregation.js';

test('aggregates program totals and frequencies while averaging monthly rates', () => {
  const rows = [
    { group: 'Asasa', receivedBenefitTotal: 3, receivedBenefitFrequency: 3, receivedBenefitAveragePerMonth: 1.5 },
    { group: 'Asasa', receivedBenefitTotal: 2, receivedBenefitFrequency: 2, receivedBenefitAveragePerMonth: 1 },
    { group: 'Other', receivedBenefitTotal: 4, receivedBenefitFrequency: 4, receivedBenefitAveragePerMonth: 2 },
  ];

  const result = aggregateReportRows(rows, 'group-school');
  const group = result.find(({ group: name }) => name === 'Asasa');
  const other = result.find(({ group: name }) => name === 'Other');

  assert.equal(group.receivedBenefitTotal, 5);
  assert.equal(group.receivedBenefitFrequency, 5);
  assert.equal(group.receivedBenefitAveragePerMonth, 1.3);
  assert.equal(other.receivedBenefitAveragePerMonth, 2);
});
