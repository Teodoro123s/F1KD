const test = require('node:test');
const assert = require('node:assert/strict');
const { getProgramClusterVisibilityFilter, getProgramVisibilityFilter } = require('../utils/programAccess');

test('school program visibility uses stable scope IDs and rejects ambiguous legacy names', () => {
  const filter = getProgramVisibilityFilter({ schoolId: 12 });

  assert.deepEqual(filter.values, [12, 12, 12]);
  assert.match(filter.sql, /scoped_cluster\.scope_id = scoped_group\.id/);
  assert.match(filter.sql, /scoped_cluster\.scope_id = scoped_batch\.id/);
  assert.match(filter.sql, /duplicate_group\.name = scoped_cluster\.scope_name/);
  assert.match(filter.sql, /duplicate_batch\.name = scoped_cluster\.scope_name/);
});

test('health-worker program visibility matches assigned group and batch IDs', () => {
  const filter = getProgramVisibilityFilter({ groupId: 42 });

  assert.deepEqual(filter.values, [42, 42, 42]);
  assert.match(filter.sql, /scoped_cluster\.scope_id = assigned_group\.id/);
  assert.match(filter.sql, /scoped_cluster\.scope_id = assigned_batch\.id/);
});

test('program detail responses can restrict clusters to the requester scope', () => {
  const filter = getProgramClusterVisibilityFilter({ schoolId: 12 }, 'pc');

  assert.deepEqual(filter.values, [12, 12, 12]);
  assert.match(filter.sql, /pc\.scope_id = scoped_group\.id/);
  assert.match(filter.sql, /pc\.scope_id = scoped_batch\.id/);
});
