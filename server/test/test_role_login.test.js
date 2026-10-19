const test = require('node:test');
const assert = require('node:assert/strict');
const originalNodeEnv = process.env.NODE_ENV;
const originalShortcutFlag = process.env.ENABLE_TEST_ROLE_SHORTCUTS;
process.env.NODE_ENV = 'development';
process.env.ENABLE_TEST_ROLE_SHORTCUTS = 'true';
process.env.JWT_SECRET = 'test-role-login-test-secret';

const express = require('express');
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
const authRouter = require('../routes/auth');

test('test-role sign-in is unavailable and does not access or seed user records', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let queryCount = 0;
  pool.query = async () => {
    queryCount += 1;
    throw new Error('The removed test-role endpoint must not query users');
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    pool.query = originalQuery;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalShortcutFlag === undefined) delete process.env.ENABLE_TEST_ROLE_SHORTCUTS;
    else process.env.ENABLE_TEST_ROLE_SHORTCUTS = originalShortcutFlag;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/test-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' }),
  });

  assert.equal(response.status, 404);
  assert.equal(queryCount, 0);
});
