const test = require('node:test');
const assert = require('node:assert/strict');

const envNames = [
  'JWT_SECRET',
  'EMAILJS_SERVICE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY',
  'EMAILJS_CREDENTIALS_TEMPLATE_ID',
  'APP_URL',
];
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
Object.assign(process.env, {
  JWT_SECRET: 'user-credentials-email-test-secret',
  EMAILJS_SERVICE_ID: 'service-test',
  EMAILJS_PUBLIC_KEY: 'public-test',
  EMAILJS_PRIVATE_KEY: 'private-test',
  EMAILJS_CREDENTIALS_TEMPLATE_ID: 'template-credentials',
  APP_URL: 'https://f1kd.example.test',
});

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

test('Super Admin user creation sends the account credential template', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalFetch = global.fetch;
  let emailRequest = null;
  let storedPasswordHash = '';

  pool.query = async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO users')) {
      storedPasswordHash = params[3];
      return [{ insertId: 71 }];
    }
    if (sql.includes('FROM users WHERE id = ?')) {
      return [[{
        id: 71,
        first_name: 'New',
        middle_initial: null,
        last_name: 'Account',
        email: 'new-account@example.test',
        role: 'Partner',
        status: 'Active',
        school_id: null,
        group_id: null,
      }]];
    }
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 1 }];
    throw new Error(`Unexpected test SQL: ${sql}`);
  };
  global.fetch = async (url, options) => {
    if (url === 'https://api.emailjs.com/api/v1.0/email/send') {
      emailRequest = JSON.parse(options.body);
      return new Response('OK', { status: 200 });
    }
    return originalFetch(url, options);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    pool.query = originalQuery;
    global.fetch = originalFetch;
    for (const name of envNames) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt.sign({ id: 1, role: 'Super Admin' }, process.env.JWT_SECRET)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'new-account@example.test',
      username: 'new-account',
      firstName: 'New',
      lastName: 'Account',
      role: 'Partner',
      password: 'temporary-password',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).emailSent, true);
  assert.equal(emailRequest.template_id, 'template-credentials');
  assert.deepEqual(emailRequest.template_params, {
    email: 'new-account@example.test',
    to_email: 'new-account@example.test',
    username: 'new-account@example.test',
    login_url: 'https://f1kd.example.test/login',
    to_name: 'New Account',
    role: 'Partner',
    password: 'temporary-password',
  });
  assert.notEqual(storedPasswordHash, 'temporary-password');
});
