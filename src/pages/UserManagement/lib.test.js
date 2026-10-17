import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDobForInput, getDobValidationMessage } from './lib.js';

test('DOB formatting accepts manually entered day-first dates', () => {
  assert.equal(formatDobForInput('31/12/2002'), '2002-12-31');
  assert.equal(formatDobForInput('2002-12-31'), '2002-12-31');
});

test('DOB validation rejects impossible dates and accepts a valid past date', () => {
  assert.equal(getDobValidationMessage('31/02/2002'), 'Please enter a valid date.');
  assert.equal(getDobValidationMessage('31/12/2002'), null);
});
