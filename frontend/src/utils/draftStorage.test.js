import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserDraftKey } from './draftStorage.js';

test('draft keys are isolated by authenticated user', () => {
  assert.notEqual(getUserDraftKey('create-mother', 1), getUserDraftKey('create-mother', 2));
});

test('draft keys safely encode the form type and user identifier', () => {
  assert.equal(getUserDraftKey('create/mother', 'user 1'), 'f1kd.draft.create%2Fmother.user%201');
});

test('draft keys are not created without a user identifier', () => {
  assert.equal(getUserDraftKey('create-child', null), null);
  assert.equal(getUserDraftKey('create-child', ''), null);
});
