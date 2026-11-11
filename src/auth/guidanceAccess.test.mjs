import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldLoadGuidancePreferences } from './guidanceAccess.mjs';

test('guidance preferences should be skipped before consent is accepted', () => {
  assert.equal(shouldLoadGuidancePreferences({ id: 1, has_accepted_terms: false }), false);
  assert.equal(shouldLoadGuidancePreferences({ id: 1 }), true);
  assert.equal(shouldLoadGuidancePreferences({ id: 1, has_accepted_terms: true }), true);
  assert.equal(shouldLoadGuidancePreferences(null), false);
});
