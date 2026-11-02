import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchTokens, matchesSearch, normalizeSearchText } from './search.mjs';

test('normalizes case, whitespace, accents, and punctuation for matching', () => {
  assert.equal(normalizeSearchText("  MARÍA   O'Neil-Santos. "), 'maria o neil santos');
  assert.deepEqual(getSearchTokens('Santos   María'), ['santos', 'maria']);
});

test('matches reordered name parts and partial multi-term queries', () => {
  const fields = ['Maria', 'Clara', 'Santos'];
  assert.equal(matchesSearch('Santos Maria', fields), true);
  assert.equal(matchesSearch('Maria C. Santos', fields), true);
  assert.equal(matchesSearch('Mari Sant', fields), true);
  assert.equal(matchesSearch('Maria Other', fields), false);
});

test('matches combined address components but avoids single-character substring noise', () => {
  const fields = ['Purok 3, Barangay Lahug', 'Cebu City', '09171234567'];
  assert.equal(matchesSearch('Lahug Cebu', fields), true);
  assert.equal(matchesSearch('purok   3', fields), true);
  assert.equal(matchesSearch('x', fields), false);
  assert.equal(matchesSearch('0917', fields), true);
});

test('empty search matches all and punctuation-only search matches none', () => {
  assert.equal(matchesSearch('  ', ['Maria Santos']), true);
  assert.equal(matchesSearch('---', ['Maria Santos']), false);
});
