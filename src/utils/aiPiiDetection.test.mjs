import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPotentialPii } from './aiPiiDetection.mjs';

test('detects common contact details and explicitly identified people or records', () => {
  for (const prompt of [
    'Email maria@example.com about this report.',
    'Call 09171234567 after the meeting.',
    'Show the record for beneficiary ID: BEN-12345.',
    'Show the report for the child named Maria Santos.',
    'Filter by full name is Juan Dela Cruz.',
  ]) {
    assert.equal(detectPotentialPii(prompt), true, prompt);
  }
});

test('allows ordinary aggregate reporting requests and date filters', () => {
  for (const prompt of [
    'Show maternal monitoring reports by community.',
    'Compare child checkups from 2026-01-01 to 2026-01-31.',
    'How many mothers are assigned to each batch?',
    'Show reports for children named by community, without identifying details.',
  ]) {
    assert.equal(detectPotentialPii(prompt), false, prompt);
  }
});
