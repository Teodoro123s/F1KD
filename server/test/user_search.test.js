const test = require('node:test');
const assert = require('node:assert/strict');

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'user-search-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const usersRouter = require('../routes/users');

test('user search tokenizes names and preserves pagination and input validation', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const listQueries = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      return [[{
        user_id: 1,
        email: 'admin@example.com',
        role: 'Super Admin',
        status: 'Active',
        consent_accepted_at: '2026-01-01 00:00:00',
      }]];
    }
    if (sql.startsWith('SELECT COUNT(*) AS total FROM users')) {
      listQueries.push({ type: 'count', sql, params });
      return [[{ total: 1 }]];
    }
    if (sql.startsWith('SELECT id, CONCAT_WS')) {
      listQueries.push({ type: 'page', sql, params });
      return [[{
        id: 2,
        first_name: 'Jamie',
        last_name: 'Santos',
        role: 'Admin',
        status: 'Active',
      }]];
    }
    throw new Error(`Unexpected user search SQL: ${sql}`);
  };

  const app = express();
  app.use('/api/users', usersRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = jwt.sign({
    id: 1,
    role: 'Super Admin',
    sid: 'user-search-session',
  }, process.env.JWT_SECRET);
  const request = (search) => fetch(
    `http://127.0.0.1:${server.address().port}/api/users?search=${encodeURIComponent(search)}&page=1&perPage=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const response = await request('Santos Jamie');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).users.map((user) => user.id), [2]);
  const pageQuery = listQueries.find((query) => query.type === 'page');
  assert.match(pageQuery.sql, /CONCAT\('USR-', LPAD\(id, 4, '0'\)\)/);
  assert.match(pageQuery.sql, /\) AND \(/);
  assert.ok(pageQuery.params.includes('%santos%'));
  assert.ok(pageQuery.params.includes('%jamie%'));
  assert.deepEqual(pageQuery.params.slice(-2), [10, 0]);

  const beforeInvalidSearch = listQueries.length;
  const invalidResponse = await request('x'.repeat(121));
  assert.equal(invalidResponse.status, 400);
  assert.equal(listQueries.length, beforeInvalidSearch);
});
