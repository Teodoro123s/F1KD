const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  LOGIN_RATE_LIMIT_MAX: process.env.LOGIN_RATE_LIMIT_MAX,
  LOGIN_LOCKOUT_SECONDS: process.env.LOGIN_LOCKOUT_SECONDS,
};

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'auth-login-attempts-test-secret';
process.env.LOGIN_RATE_LIMIT_MAX = '5';
process.env.LOGIN_LOCKOUT_SECONDS = '1';

const express = require('express');
const mysql = require('mysql2/promise');
const attempts = new Map();
const users = new Map();

function copyAttempts() {
  return new Map(Array.from(attempts, ([key, value]) => [key, { ...value }]));
}

function rowsForAttempt(emailKey) {
  const row = attempts.get(emailKey);
  if (!row) return [[], []];
  const retryAfterSeconds = row.lockedUntil
    ? Math.max(0, Math.ceil((row.lockedUntil - Date.now()) / 1000))
    : 0;
  return [[{
    failed_attempts: row.failedAttempts,
    locked_until: row.lockedUntil ? new Date(row.lockedUntil) : null,
    locked_until_ms: row.lockedUntil || null,
    retry_after_seconds: retryAfterSeconds,
  }], []];
}

async function executeQuery(sql, params = []) {
  const normalizedSql = String(sql).replace(/\s+/g, ' ').trim();
  if (normalizedSql.startsWith('INSERT IGNORE INTO login_attempts')) {
    if (!attempts.has(params[0])) attempts.set(params[0], { failedAttempts: 0, lockedUntil: null });
    return [{ affectedRows: 1 }, []];
  }
  if (normalizedSql.includes('FROM login_attempts')) {
    return rowsForAttempt(params[0]);
  }
  if (normalizedSql.includes('FROM users')) {
    const user = users.get(params[0]);
    return [user ? [{ ...user }] : [], []];
  }
  if (normalizedSql.startsWith('UPDATE login_attempts')) {
    if (normalizedSql.includes('failed_attempts = 0')) {
      const row = attempts.get(params[0]);
      if (row) {
        row.failedAttempts = 0;
        row.lockedUntil = null;
      }
      return [{ affectedRows: row ? 1 : 0 }, []];
    }

    const [failedAttempts, secondOrKey, maybeKey] = params;
    const emailKey = maybeKey || secondOrKey;
    const row = attempts.get(emailKey);
    if (row && normalizedSql.includes('DATE_ADD')) {
      row.failedAttempts = failedAttempts;
      row.lockedUntil = Date.now() + Number(secondOrKey) * 1000;
    } else if (row) {
      row.failedAttempts = failedAttempts;
      row.lockedUntil = null;
    }
    return [{ affectedRows: row ? 1 : 0 }, []];
  }
  return [[], []];
}

const poolStub = {
  query: executeQuery,
  getConnection: async () => {
    let snapshot = null;
    return {
      beginTransaction: async () => { snapshot = copyAttempts(); },
      commit: async () => { snapshot = null; },
      rollback: async () => {
        attempts.clear();
        for (const [key, value] of snapshot || []) attempts.set(key, value);
        snapshot = null;
      },
      query: executeQuery,
      release() {},
    };
  },
};

mysql.createPool = () => poolStub;
mysql.createConnection = async () => ({
  query: async () => [[], []],
  end: async () => {},
});

const pool = require('../db');
const authRouter = require('../routes/auth');

test('login failures return remaining attempts, enforce a server lockout, and reset after success', async (t) => {
  await pool.ready;
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');

  t.after(async () => {
    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalEnv.JWT_SECRET;
    if (originalEnv.LOGIN_RATE_LIMIT_MAX === undefined) delete process.env.LOGIN_RATE_LIMIT_MAX;
    else process.env.LOGIN_RATE_LIMIT_MAX = originalEnv.LOGIN_RATE_LIMIT_MAX;
    if (originalEnv.LOGIN_LOCKOUT_SECONDS === undefined) delete process.env.LOGIN_LOCKOUT_SECONDS;
    else process.env.LOGIN_LOCKOUT_SECONDS = originalEnv.LOGIN_LOCKOUT_SECONDS;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
  const submitLogin = async (email, password) => fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const getStatus = async (email) => {
    const response = await fetch(`${baseUrl}/login-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  };

  const wrongPassword = await submitLogin('missing@example.com', 'wrong-password');
  const wrongBody = await wrongPassword.json();
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongBody.remainingAttempts, 4);
  assert.equal(wrongBody.code, 'INVALID_CREDENTIALS');

  const validPassword = 'correct-password';
  users.set('active@example.com', {
    id: 8,
    first_name: 'Active',
    last_name: 'User',
    middle_initial: null,
    email: 'active@example.com',
    role: 'Health Worker',
    status: 'Active',
    school_id: 1,
    group_id: null,
    contact_number: null,
    password_hash: await bcrypt.hash(validPassword, 4),
    consent_accepted_at: new Date(),
  });
  const activeFailure = await submitLogin('active@example.com', 'wrong-password');
  const activeFailureBody = await activeFailure.json();
  assert.equal(activeFailureBody.remainingAttempts, wrongBody.remainingAttempts);
  assert.equal(activeFailureBody.message, wrongBody.message);

  const successfulLogin = await submitLogin('active@example.com', validPassword);
  assert.equal(successfulLogin.status, 200);
  const resetStatus = await getStatus('active@example.com');
  assert.equal(resetStatus.remainingAttempts, 5);
  assert.equal(resetStatus.retryAfterSeconds, 0);

  users.set('archived@example.com', {
    id: 9,
    first_name: 'Archived',
    last_name: 'User',
    middle_initial: null,
    email: 'archived@example.com',
    role: 'Health Worker',
    status: 'Active',
    archived_at: new Date(),
    school_id: 1,
    group_id: null,
    contact_number: null,
    password_hash: await bcrypt.hash(validPassword, 4),
    consent_accepted_at: new Date(),
  });
  const archivedLogin = await submitLogin('archived@example.com', validPassword);
  const archivedLoginBody = await archivedLogin.json();
  assert.equal(archivedLogin.status, 401);
  assert.equal(archivedLoginBody.code, 'INVALID_CREDENTIALS');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await submitLogin('missing@example.com', 'wrong-password');
  }
  const finalWarning = await submitLogin('missing@example.com', 'wrong-password');
  const finalWarningBody = await finalWarning.json();
  assert.equal(finalWarning.status, 401);
  assert.equal(finalWarningBody.remainingAttempts, 1);
  assert.match(finalWarningBody.message, /Only 1 login attempt remaining/);

  const lockout = await submitLogin('missing@example.com', 'wrong-password');
  const lockoutBody = await lockout.json();
  assert.equal(lockout.status, 429);
  assert.equal(lockoutBody.code, 'LOGIN_LOCKED');
  assert.equal(lockoutBody.remainingAttempts, 0);
  assert.ok(lockoutBody.retryAfterSeconds > 0);

  const lockedStatus = await getStatus('missing@example.com');
  assert.equal(lockedStatus.remainingAttempts, 0);
  assert.ok(lockedStatus.retryAfterSeconds > 0);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  const availableStatus = await getStatus('missing@example.com');
  assert.equal(availableStatus.remainingAttempts, 5);
  assert.equal(availableStatus.retryAfterSeconds, 0);
});
