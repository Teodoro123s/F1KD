const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const originalCreatePool = mysql.createPool;
const originalCreateConnection = mysql.createConnection;

function createTestPool(failure) {
  const query = async (sql) => {
    if (failure === 'users' && sql === 'SHOW COLUMNS FROM users') {
      throw new Error('synthetic users migration failure');
    }
    if (sql === 'SHOW COLUMNS FROM users') {
      return [[
        'first_name',
        'last_name',
        'middle_initial',
        'contact_number',
        'gender',
        'dob',
        'location',
        'school_id',
      ].map((Field) => ({ Field }))];
    }
    if (failure === 'mothers' && sql === 'SHOW COLUMNS FROM mothers') {
      throw new Error('synthetic mothers migration failure');
    }
    return [[]];
  };
  return {
    query,
    getConnection: async () => ({
      query: async (sql) => {
        if (sql === 'SHOW INDEX FROM program_clusters' || sql === 'SHOW INDEX FROM child_checkups') return [[]];
        if (sql.includes('HAVING COUNT(*) > 1')) return [[]];
        return query(sql);
      },
      release() {},
    }),
  };
}

test('database readiness rejects when users or mothers migration fails', async (t) => {
  t.after(() => {
    mysql.createPool = originalCreatePool;
    mysql.createConnection = originalCreateConnection;
    delete require.cache[require.resolve('../db')];
  });

  for (const migration of ['users', 'mothers']) {
    await t.test(`${migration} migration error is propagated`, async () => {
      delete require.cache[require.resolve('../db')];
      mysql.createPool = () => createTestPool(migration);
      mysql.createConnection = async () => ({
        query: async () => [[]],
        end: async () => {},
      });

      const pool = require('../db');
      await assert.rejects(
        pool.ready,
        new RegExp(`synthetic ${migration} migration failure`),
      );
    });
  }
});
