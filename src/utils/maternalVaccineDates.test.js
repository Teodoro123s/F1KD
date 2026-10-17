import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaternalVaccineDateErrors } from './maternalVaccineDates.js';

const today = new Date(2026, 9, 17);

test('accepts chronological vaccine doses through today', () => {
  assert.deepEqual(getMaternalVaccineDateErrors({
    tt1Date: '2026-01-01',
    tt2Date: '2026-02-01',
    influenzaDate: '2026-10-17',
  }, today), {});
});

test('requires preceding doses and rejects non-chronological or future dates', () => {
  const errors = getMaternalVaccineDateErrors({
    tt2Date: '2026-02-01',
    influenzaDate: '2026-03-01',
    influenzaDose2Date: '2026-02-01',
    covid19Date: '2026-10-18',
  }, today);

  assert.match(errors.tt2Date, /Dose 1/);
  assert.match(errors.influenzaDose2Date, /on or after/);
  assert.match(errors.covid19Date, /future/);
});
