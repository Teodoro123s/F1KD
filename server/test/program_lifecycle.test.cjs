const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeProgramStatus, programStatusNeedsUpdate } = require('../services/programLifecycle');

test('ending active programs and resuming ended programs are allowed status changes', () => {
  assert.equal(programStatusNeedsUpdate('Active', 'Ended'), true);
  assert.equal(programStatusNeedsUpdate('Ended', 'Active'), true);
});

test('repeating an end or resume request is an idempotent no-op', () => {
  assert.equal(programStatusNeedsUpdate('Ended', 'Ended'), false);
  assert.equal(programStatusNeedsUpdate('Active', 'Active'), false);
});

test('status comparisons ignore capitalization and surrounding whitespace', () => {
  assert.equal(normalizeProgramStatus('  ENDED '), 'ended');
  assert.equal(programStatusNeedsUpdate(' ended ', 'Ended'), false);
  assert.equal(programStatusNeedsUpdate(' active ', 'Ended'), true);
});

test('only active and ended are accepted as lifecycle targets', () => {
  assert.equal(programStatusNeedsUpdate('Active', 'Deleted'), false);
  assert.equal(programStatusNeedsUpdate('Active', ''), false);
});
