const test = require('node:test');
const assert = require('node:assert/strict');
const { programScopesBelongToSchool } = require('../utils/programScope');

test('coordinators can manage programs scoped entirely to their school', () => {
  assert.equal(programScopesBelongToSchool([
    { scope_type: 'School', owned_by_school: 1 },
    { scope_type: 'Group', owned_by_school: 1 },
    { scope_type: 'Batch', owned_by_school: 1 },
  ]), true);
});

test('coordinators cannot manage unscoped or out-of-school programs', () => {
  assert.equal(programScopesBelongToSchool([]), false);
  assert.equal(programScopesBelongToSchool([{ scope_type: 'School', owned_by_school: 0 }]), false);
  assert.equal(programScopesBelongToSchool([
    { scope_type: 'School', owned_by_school: 1 },
    { scope_type: 'Group', owned_by_school: 0 },
  ]), false);
});

test('coordinators can add their first scope to an unscoped program', () => {
  assert.equal(programScopesBelongToSchool([], { allowUnscoped: true }), true);
});
