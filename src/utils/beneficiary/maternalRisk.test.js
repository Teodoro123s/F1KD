import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgeAtDate, hasMaternalHighRiskTriggers } from './maternalRisk.js';

test('calculates age on the expected delivery date', () => {
  assert.equal(getAgeAtDate('2000-10-18', '2019-10-17'), 18);
  assert.equal(getAgeAtDate('2000-10-18', '2019-10-18'), 19);
  assert.equal(getAgeAtDate('1991-01-01', '2026-01-01'), 35);
  assert.equal(getAgeAtDate('2020-02-30', '2026-01-01'), null);
});

test('flags maternal risk from age, miscarriage count, and specified conditions', () => {
  assert.equal(hasMaternalHighRiskTriggers({ dob: '2000-10-18', eddDate: '2019-10-17' }), true);
  assert.equal(hasMaternalHighRiskTriggers({ dob: '1991-01-01', eddDate: '2026-01-01' }), true);
  assert.equal(hasMaternalHighRiskTriggers({ miscarriages: '3' }), true);
  assert.equal(hasMaternalHighRiskTriggers({ medicalConditions: { eclampsia: true } }), true);
  assert.equal(hasMaternalHighRiskTriggers({ dob: '2000-01-01', eddDate: '2026-01-01', miscarriages: '2' }), false);
});
