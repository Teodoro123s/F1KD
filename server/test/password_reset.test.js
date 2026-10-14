const test = require('node:test');
const assert = require('node:assert/strict');

const envNames = [
  'JWT_SECRET',
  'EMAILJS_SERVICE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY',
  'EMAILJS_OTP_TEMPLATE_ID',
];
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
Object.assign(process.env, {
  JWT_SECRET: 'password-reset-test-secret',
  EMAILJS_SERVICE_ID: 'service-test',
  EMAILJS_PUBLIC_KEY: 'public-test',
  EMAILJS_PRIVATE_KEY: 'private-test',
  EMAILJS_OTP_TEMPLATE_ID: 'template-otp',
});

const express = require('express');
const mysql = require('mysql2/promise');
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
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

test('password reset emails a one-time code and consumes it after password change', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const originalFetch = global.fetch;
  let resetRecord = null;
  let emailedCode = '';
  let savedPasswordHash = '';

  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM users') && sql.includes('LOWER(TRIM(email)) = ?')) {
      return [params[0] === 'worker@example.test'
        ? [{ email: 'worker@example.test', first_name: 'Test', middle_initial: null, last_name: 'Worker' }]
        : []];
    }
    if (sql.startsWith('INSERT INTO password_reset_codes')) {
      resetRecord = { code_hash: params[1], attempts: 0, is_unexpired: 1 };
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('DELETE FROM password_reset_codes')) {
      resetRecord = null;
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected test SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    query: async (sql, params = []) => {
      if (sql.includes('FROM password_reset_codes') && sql.includes('FOR UPDATE')) {
        return [resetRecord ? [{ ...resetRecord }] : []];
      }
      if (sql.startsWith('UPDATE password_reset_codes SET attempts')) {
        resetRecord.attempts += 1;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE users SET password_hash')) {
        savedPasswordHash = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('DELETE FROM password_reset_codes')) {
        resetRecord = null;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  });
  global.fetch = async (url, options) => {
    if (url === 'https://api.emailjs.com/api/v1.0/email/send') {
      emailedCode = JSON.parse(options.body).template_params.passcode;
      return new Response('OK', { status: 200 });
    }
    return originalFetch(url, options);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    global.fetch = originalFetch;
    for (const name of envNames) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (path, body) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const unknownAccount = await post('/forgot-password', { email: 'unknown@example.test' });
  assert.equal(unknownAccount.status, 200);
  assert.equal(emailedCode, '');

  const requestCode = await post('/forgot-password', { email: 'WORKER@example.test' });
  assert.equal(requestCode.status, 200);
  assert.match(emailedCode, /^\d{6}$/);
  assert.ok(resetRecord);

  const invalidCode = await post('/reset-password', {
    email: 'worker@example.test',
    passcode: '999999',
    newPassword: 'new-password-123',
    confirmPassword: 'new-password-123',
  });
  assert.equal(invalidCode.status, 400);
  assert.equal(resetRecord.attempts, 1);

  const reset = await post('/reset-password', {
    email: 'worker@example.test',
    passcode: emailedCode,
    newPassword: 'new-password-123',
    confirmPassword: 'new-password-123',
  });
  assert.equal(reset.status, 200);
  assert.equal(resetRecord, null);
  assert.equal(await require('bcrypt').compare('new-password-123', savedPasswordHash), true);
});
