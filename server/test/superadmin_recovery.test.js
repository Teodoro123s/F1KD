const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

test('database startup creates schema without seeding accounts or RBAC rows', async () => {
  const statements = [];
  const pool = {
    async query(sql) {
      statements.push(sql);
      return [[]];
    },
    async getConnection() {
      return {
        async query(sql) {
          statements.push(sql);
          return [[]];
        },
        release() {},
      };
    },
  };
  mysql.createPool = () => pool;
  mysql.createConnection = async () => ({
    async query(sql) {
      statements.push(sql);
      return [[]];
    },
    async end() {},
  });

  const db = require('../db');
  await db.ready;

  const inserts = statements.filter((sql) => /^\s*INSERT\b/i.test(sql));
  assert.equal(
    inserts.some((sql) => /^\s*INSERT\b(?:\s+IGNORE)?\s+INTO\s+users\b/i.test(sql)),
    false,
  );
  assert.equal(
    inserts.some((sql) => /^\s*INSERT\b(?:\s+IGNORE)?\s+INTO\s+(?:roles|permissions|role_permissions)\b/i.test(sql)),
    false,
  );
  assert.ok(statements.some((sql) => /ALTER TABLE users ALTER COLUMN role SET DEFAULT 'User'/i.test(sql)));
});
