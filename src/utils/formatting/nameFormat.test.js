import test from 'node:test';
import assert from 'node:assert/strict';

import {
  capitalizeFirstNameCharacter,
  capitalizeNameValue,
  formatCompactName,
  getInitials,
} from './nameFormat.js';

test('name formatting helpers handle missing or blank values without throwing', () => {
  assert.equal(capitalizeNameValue(''), '');
  assert.equal(capitalizeNameValue(null), '');
  assert.equal(formatCompactName(null), '');
  assert.equal(formatCompactName('  '), '');
  assert.equal(getInitials(undefined), '');
  assert.equal(getInitials('  '), '');
});

test('name formatting helpers preserve common naming conventions', () => {
  assert.equal(capitalizeNameValue('mary ann santos'), 'Mary Ann Santos');
  assert.equal(capitalizeFirstNameCharacter('mary ann'), 'Mary ann');
  assert.equal(capitalizeFirstNameCharacter('  élise'), '  Élise');
  assert.equal(formatCompactName('mary ann santos'), 'M. A. santos');
  assert.equal(getInitials('mary ann santos'), 'MA');
});
