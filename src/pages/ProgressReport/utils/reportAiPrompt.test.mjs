import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportClarificationRequest,
  getReportClarificationMaxLength,
} from './reportAiPrompt.mjs';

test('each clarification uses the original request instead of accumulating earlier answers', () => {
  const prompt = 'Show the latest BMI for mothers.';
  const firstRequest = buildReportClarificationRequest(prompt, 'BMI value only');
  const secondRequest = buildReportClarificationRequest(prompt, 'BMI interpretation only');

  assert.equal(firstRequest.length <= 1000, true);
  assert.equal(secondRequest.length <= 1000, true);
  assert.equal(secondRequest.includes('BMI value only'), false);
});

test('clarification input and suggestions respect the remaining request limit', () => {
  const prompt = 'x'.repeat(970);
  const maximumLength = getReportClarificationMaxLength(prompt);

  assert.equal(maximumLength, 14);
  assert.equal('BMI interpretation only'.length > maximumLength, true);
  assert.equal(getReportClarificationMaxLength('x'.repeat(1000)), 0);
});
