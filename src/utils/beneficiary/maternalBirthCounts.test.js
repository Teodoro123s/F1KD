import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotalChildren, getMaternalBirthCountErrors, hasMiscarriageHighRiskCount } from './maternalBirthCounts.js';

test('calculates total children from living and deceased child counts', () => {
  assert.equal(calculateTotalChildren('3', '1'), '4');
  assert.equal(calculateTotalChildren('0', '0'), '0');
  assert.equal(calculateTotalChildren('3', ''), '');
  assert.equal(calculateTotalChildren('3.5', '1'), '');
});

test('accepts birth counts whose living and deceased children equal total children', () => {
  assert.deepEqual(getMaternalBirthCountErrors({
    totalChildren: '4',
    childrenBornAlive: '3',
    childrenDiedAfterBirth: '1',
    miscarriages: '2',
  }), {});
});

test('accepts zero born children for a mother who is currently pregnant', () => {
  assert.equal(calculateTotalChildren('0', '0'), '0');
  assert.deepEqual(getMaternalBirthCountErrors({
    totalChildren: '0',
    childrenBornAlive: '0',
    childrenDiedAfterBirth: '0',
    miscarriages: '0',
  }, { requireAll: true }), {});
});

test('rejects child totals that do not equal living plus deceased children', () => {
  const errors = getMaternalBirthCountErrors({
    totalChildren: '4',
    childrenBornAlive: '2',
    childrenDiedAfterBirth: '1',
    miscarriages: '0',
  });
  assert.match(errors.totalChildren, /Must equal/);
});

test('rejects living or deceased child counts greater than total children', () => {
  const livingErrors = getMaternalBirthCountErrors({
    totalChildren: '2',
    childrenBornAlive: '3',
    childrenDiedAfterBirth: '0',
    miscarriages: '0',
  });
  assert.match(livingErrors.childrenBornAlive, /Cannot exceed/);
  assert.match(livingErrors.totalChildren, /Must equal/);

  const deceasedErrors = getMaternalBirthCountErrors({
    totalChildren: '2',
    childrenBornAlive: '0',
    childrenDiedAfterBirth: '3',
    miscarriages: '0',
  });
  assert.match(deceasedErrors.childrenDiedAfterBirth, /Cannot exceed/);
});

test('requires whole, non-negative birth counts when creating a mother', () => {
  const errors = getMaternalBirthCountErrors({
    totalChildren: '-1',
    childrenBornAlive: '1.5',
    miscarriages: '0',
    childrenDiedAfterBirth: '',
  }, { requireAll: true });
  assert.equal(Object.keys(errors).length, 3);
  assert.match(errors.totalChildren, /whole number/);
  assert.match(errors.childrenBornAlive, /whole number/);
  assert.match(errors.childrenDiedAfterBirth, /required/);
});

test('flags three or more miscarriages as high risk', () => {
  assert.equal(hasMiscarriageHighRiskCount({ miscarriages: '2' }), false);
  assert.equal(hasMiscarriageHighRiskCount({ miscarriages: '3' }), true);
  assert.equal(hasMiscarriageHighRiskCount({ miscarriages: '4' }), true);
});
