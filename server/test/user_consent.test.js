const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'user-consent-test-secret';

const express = require('express');
const cookieParser = require('cookie-parser');
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
const authRouter = require('../routes/auth');
const { verifyToken } = require('../middleware/auth');

test('refresh without a cookie returns an anonymous response without an authorization error', async (t) => {
  const app = express();
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/refresh`, {
    method: 'POST',
  });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
});

test('users must accept consent before accessing protected routes', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let consentAcceptedAt = null;
  pool.query = async (sql) => {
    if (sql.includes('FROM auth_sessions s')) {
      return [[{
        user_id: 7,
        email: 'user@example.test',
        role: 'Health Worker',
        status: 'Active',
        consent_accepted_at: consentAcceptedAt,
      }]];
    }
    if (sql.startsWith('UPDATE users SET consent_accepted_at')) {
      consentAcceptedAt = new Date();
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected consent test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/protected', verifyToken, (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const token = jwt.sign({ id: 7, sid: 'session-7', role: 'Health Worker' }, process.env.JWT_SECRET);
  const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const blocked = await request('/protected');
  assert.equal(blocked.status, 403);

  const consent = await request('/api/auth/consent', {
    method: 'POST',
    body: JSON.stringify({ accepted: true }),
  });
  assert.equal(consent.status, 200);
  assert.deepEqual(await consent.json(), { has_accepted_terms: true });

  const allowed = await request('/protected');
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { ok: true });
});
