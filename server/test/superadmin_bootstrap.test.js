const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');

test('does nothing when bootstrap credentials are not configured', async () => {
  let called = false;
  const result = await ensureSuperadminAccount({
    query: async () => { called = true; },
  }, { email: '', password: '' });

  assert.equal(result.status, 'disabled');
  assert.equal(called, false);
});

test('creates the configured Superadmin with a hashed password', async () => {
  const queries = [];
  const result = await ensureSuperadminAccount({
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT')) return [[]];
      return [{ insertId: 12 }];
    },
  }, {
    email: 'Superadmin@example.test',
    password: 'a-private-bootstrap-password',
  });

  assert.equal(result.status, 'created');
  assert.equal(queries.length, 2);
  assert.match(queries[1].sql, /INSERT INTO users/);
  assert.equal(queries[1].params[2], 'superadmin@example.test');
  assert.equal(queries[1].params[3], 'Superadmin');
  assert.equal(await bcrypt.compare('a-private-bootstrap-password', queries[1].params[5]), true);
});

test('does not overwrite an existing Superadmin password', async () => {
  const queries = [];
  const result = await ensureSuperadminAccount({
    async query(sql) {
      queries.push(sql);
      return [[{ id: 12, role: 'super_admin', password_hash: '$2b$existing-hash' }]];
    },
  }, {
    email: 'superadmin@example.test',
    password: 'a-private-bootstrap-password',
  });

  assert.equal(result.status, 'already_exists');
  assert.equal(queries.length, 1);
});

test('refuses to promote a non-Superadmin account matching the configured email', async () => {
  const result = ensureSuperadminAccount({
    async query() {
      return [[{ id: 12, role: 'admin', password_hash: 'existing-hash' }]];
    },
  }, {
    email: 'superadmin@example.test',
    password: 'a-private-bootstrap-password',
  });

  await assert.rejects(result, /refusing to change its role/);
});
