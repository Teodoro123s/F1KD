const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');

test('recreates the default superadmin when its row is missing', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT id, role')) return [[]];
      return [{}];
    },
  };

  await ensureSuperadminAccount(pool, {
    email: 'recovery@example.test',
    password: 'Recovery123!',
  });

  assert.equal(queries.length, 2);
  assert.match(queries[1].sql, /INSERT INTO users/);
  assert.deepEqual(queries[1].params.slice(0, 5), [
    'Super',
    'Admin',
    'recovery@example.test',
    'Superadmin',
    'Active',
  ]);
  assert.ok(queries[1].params[5].startsWith('$2'), 'password should be bcrypt-hashed');
});