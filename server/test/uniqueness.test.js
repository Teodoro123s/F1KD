const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findDuplicateBeneficiary,
  findDuplicateUser,
  normalizeEmail,
  normalizeFullName,
  withUniquenessLocks,
} = require('../services/uniqueness');

test('normalizes full names and emails consistently', () => {
  assert.equal(normalizeFullName(['  Ａda ', '  M. ', 'Lovelace  ']), 'ada m. lovelace');
  assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
});

test('findDuplicateUser checks normalized email and full name', async () => {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return [[{ id: 2 }]];
    },
  };

  assert.equal(await findDuplicateUser(pool, {
    email: ' USER@EXAMPLE.COM ',
    fullName: 'Ada M. Lovelace',
    excludeId: 1,
  }), 'email');
  assert.equal(queries.length, 1);
  assert.equal(queries[0].params[0], 'user@example.com');
});

test('findDuplicateUser checks the normalized full name when no email is supplied', async () => {
  let query;
  const pool = {
    query: async (sql, params) => {
      query = { sql, params };
      return [[{ id: 2 }]];
    },
  };

  assert.equal(await findDuplicateUser(pool, {
    fullName: '  Ada   M. Lovelace ',
    excludeId: 1,
  }), 'full name');
  assert.match(query.sql, /middle_initial/);
  assert.deepEqual(query.params, ['ada m. lovelace', 1, 1]);
});

test('findDuplicateBeneficiary checks a global cross-table full name', async () => {
  let query;
  const pool = {
    query: async (sql, params) => {
      query = { sql, params };
      return [[{ record_type: 'child', id: 4 }]];
    },
  };

  assert.equal(await findDuplicateBeneficiary(pool, {
    fullName: 'Jane Doe',
    excludeType: 'mother',
    excludeId: 3,
  }), 'full name');
  assert.match(query.sql, /UNION ALL/);
  assert.deepEqual(query.params, ['jane doe', 'mother', 3]);
});

test('serializes lock acquisition and releases acquired locks', async () => {
  const calls = [];
  const connection = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return [[{ acquired: 1 }]];
    },
    release: () => calls.push({ released: true }),
  };
  const pool = { getConnection: async () => connection };

  const value = await withUniquenessLocks(pool, ['second', 'first', 'first'], async () => 'done');
  const acquired = calls.filter((call) => call.sql?.includes('GET_LOCK'));
  const released = calls.filter((call) => call.sql?.includes('RELEASE_LOCK'));

  assert.equal(value, 'done');
  assert.equal(acquired.length, 2);
  assert.ok(acquired[0].params[0] < acquired[1].params[0]);
  assert.deepEqual(released.map((call) => call.params[0]), acquired.map((call) => call.params[0]).reverse());
  assert.equal(calls.at(-1).released, true);
});

test('reports lock timeouts and releases connection', async () => {
  let released = false;
  const pool = {
    getConnection: async () => ({
      query: async () => [[{ acquired: 0 }]],
      release: () => { released = true; },
    }),
  };

  await assert.rejects(
    withUniquenessLocks(pool, ['identity'], async () => {}),
    { code: 'UNIQUENESS_LOCK_TIMEOUT' },
  );
  assert.equal(released, true);
});
