import assert from 'node:assert/strict';
import test from 'node:test';
import {
  summarizeInterpretationCohort,
  summarizeNumericCohort,
} from './cohortSummary.mjs';

test('numeric cohort summaries report median, quartiles, and monthly sample counts', () => {
  const summary = summarizeNumericCohort([
    { timeline: '2025-01', value: 1 },
    { timeline: '2025-01', value: 3 },
    { timeline: '2025-01', value: 9 },
    { timeline: '2025-02', value: 4 },
    { timeline: '2025-02', value: null },
  ]);

  assert.deepEqual(summary, [
    { timeline: '2025-01', count: 3, median: 3, lowerQuartile: 2, upperQuartile: 6 },
    { timeline: '2025-02', count: 1, median: 4, lowerQuartile: 4, upperQuartile: 4 },
  ]);
});

test('cohort summaries honor a selected month range and count valid interpretations only', () => {
  const summary = summarizeInterpretationCohort([
    { timeline: '2025-01', interpretation: 'Normal' },
    { timeline: '2025-02', interpretation: 'Normal' },
    { timeline: '2025-02', interpretation: 'Stunted' },
    { timeline: '2025-02', interpretation: '' },
  ], ['Stunted', 'Normal'], 'range:2025-02:2025-02');

  assert.deepEqual(summary, [{
    timeline: '2025-02',
    count: 2,
    categories: { Stunted: 1, Normal: 1 },
  }]);
});
