import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAssistanceAmountBins,
  collectReferralVisits,
  countReferralCategories,
  filterReferralRowsByMonth,
  getReferralMonthCounts,
} from './referralGraphData.js';

test('collects referred check-ups only and accepts database boolean formats', () => {
  const visits = collectReferralVisits([
    { mother: 'A', growthSeries: [{ date: '2026-01-01', hospitalReferral: 1 }, { hospitalReferral: false }] },
    { mother: 'B', growthSeries: [{ date: '2026-02-01', hospitalReferral: 'true' }] },
  ]);

  assert.equal(visits.length, 2);
  assert.deepEqual(visits.map((visit) => visit.beneficiary), ['B', 'A']);
});

test('counts assistance categories and distinguishes missing values', () => {
  const categories = countReferralCategories([
    { labAssistanceProvided: true },
    { labAssistanceProvided: 1 },
    { labAssistanceProvided: false },
    {},
  ], 'labAssistanceProvided');

  assert.deepEqual(categories, [
    { label: 'Yes', count: 2 },
    { label: 'No', count: 1 },
    { label: 'Not recorded', count: 1 },
  ]);
});

test('builds amount histogram bins without counting missing amounts', () => {
  const result = buildAssistanceAmountBins([
    { assistanceAmount: 100 },
    { assistanceAmount: 200 },
    { assistanceAmount: 300 },
    { assistanceAmount: null },
  ]);

  assert.equal(result.includedCount, 3);
  assert.equal(result.excludedCount, 1);
  assert.equal(result.bins.reduce((sum, bin) => sum + bin.count, 0), 3);
  assert.equal(result.bins.at(-1).end, 300);
});

test('sorts referral month counts chronologically', () => {
  const months = getReferralMonthCounts([
    { date: '2026-12-01' },
    { date: '2026-02-01' },
    { date: '2026-02-15' },
  ]);

  assert.deepEqual(months.map(({ count }) => count), [2, 1]);
  assert.match(months[0].label, /Feb/);
  assert.match(months[1].label, /Dec/);
});

test('filters referral check-ups to the selected month range', () => {
  const rows = filterReferralRowsByMonth([
    { mother: 'A', growthSeries: [{ date: '2026-01-31' }, { date: '2026-02-01' }, { date: '2026-04-01' }] },
  ], 'range:2026-02:2026-03');

  assert.deepEqual(rows[0].growthSeries.map(({ date }) => date), ['2026-02-01']);
});
