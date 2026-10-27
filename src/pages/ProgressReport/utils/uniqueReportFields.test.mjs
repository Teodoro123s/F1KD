import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueReportFields } from './uniqueReportFields.mjs';

test('keeps only the first column definition for each field id', () => {
  assert.deepEqual(uniqueReportFields([
    ['bloodType', 'Blood Type', 'Profile'],
    ['tt1Date', 'TT1 Date', 'Profile'],
    ['bloodType', 'Blood Type', 'Medical'],
    ['tt1Date', 'TT 1 Date', 'Profile'],
  ]), [
    ['bloodType', 'Blood Type', 'Profile'],
    ['tt1Date', 'TT1 Date', 'Profile'],
  ]);
});
