const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTokenSearchCondition, getSearchTokens, normalizeSearchText } = require('../utils/tokenSearch');

test('normalizes case, whitespace, accents, and punctuation consistently', () => {
  assert.equal(normalizeSearchText("  MARÍA   O'Neil-Santos. "), 'maria o neil santos');
  assert.deepEqual(getSearchTokens('Santos   María'), ['santos', 'maria']);
});

test('builds AND across tokens and OR across searchable fields', () => {
  const result = buildTokenSearchCondition(
    ['m.first_name', 'm.middle_name', 'm.last_name', 'm.address'],
    'Santos Maria',
  );
  assert.equal((result.sql.match(/LIKE \?/g) || []).length, 8);
  assert.ok(result.sql.includes(') AND ('));
  assert.deepEqual(result.params, Array(4).fill('%santos%').concat(Array(4).fill('%maria%')));
});

test('treats punctuation in input as separators instead of SQL wildcards', () => {
  const result = buildTokenSearchCondition(['u.email'], 'alpha%_beta');
  assert.deepEqual(result.params, ['%alpha%', '%beta%']);
});

test('ignores punctuation-only queries rather than generating a match-all clause', () => {
  assert.deepEqual(buildTokenSearchCondition(['m.first_name'], '---'), { sql: '1 = 0', params: [] });
  assert.deepEqual(buildTokenSearchCondition(['m.first_name'], ''), { sql: '', params: [] });
});

test('allows exact matching for one-character identifiers without substring matching', () => {
  const result = buildTokenSearchCondition(['m.mother_code', 'm.first_name'], 'X');
  assert.equal(result.sql, "(LOWER(COALESCE(m.mother_code, '')) = ? OR LOWER(COALESCE(m.first_name, '')) = ?)");
  assert.deepEqual(result.params, ['x', 'x']);
});
