const test = require('node:test');
const assert = require('node:assert/strict');
const originalNodeEnv = process.env.NODE_ENV;
const originalShortcutFlag = process.env.ENABLE_TEST_ROLE_SHORTCUTS;
process.env.NODE_ENV = 'development';
process.env.ENABLE_TEST_ROLE_SHORTCUTS = 'true';
process.env.JWT_SECRET = 'test-role-login-test-secret';

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
const authRouter = require('../routes/auth');

test('test-role login only signs into active existing accounts on local development', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM users') && sql.includes('LOWER(TRIM(role)) IN')) {
      const accounts = {
        super_admin: { role: 'Superadmin', school_id: null, group_id: null },
        admin: { role: 'Admin', school_id: null, group_id: null },
        partner: { role: 'Partner', school_id: null, group_id: null },
        community_coordinator: { role: 'Community Organizer', school_id: 12, group_id: null },
        health_worker: { role: 'Health worker', school_id: 12, group_id: 20 },
      };
      const canonicalRole = Object.keys(accounts).find((role) => params.includes(role));
      const account = accounts[canonicalRole];
      return [account ? [{
        id: 42,
        first_name: 'Test',
        last_name: 'Account',
        middle_initial: null,
        email: `${canonicalRole}@example.test`,
        status: 'Active',
        contact_number: null,
        location: null,
        ...account,
      }] : []];
    }
    throw new Error(`Unexpected test SQL: ${sql}`);
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
  const endpoint = `http://127.0.0.1:${server.address().port}/api/auth/test-role`;

  const roleAccounts = {
    super_admin: 'Superadmin',
    admin: 'Admin',
    partner: 'Partner',
    community_coordinator: 'Community Organizer',
    health_worker: 'Health worker',
  };
  for (const [role, expectedRole] of Object.entries(roleAccounts)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    assert.equal(response.status, 200, role);
    const result = await response.json();
    assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).email, `${role}@example.test`);
    assert.equal(result.user.role, expectedRole);
    assert.match(response.headers.get('set-cookie') || '', /refreshToken=/);
  }

  const unsupportedRole = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'unknown' }),
  });
  assert.equal(unsupportedRole.status, 400);

  process.env.NODE_ENV = 'production';
  process.env.ENABLE_TEST_ROLE_SHORTCUTS = 'false';

  const publicApp = express();
  publicApp.use(express.json());
  publicApp.use((req, _res, next) => {
    Object.defineProperty(req, 'ip', { value: '203.0.113.10', configurable: true });
    Object.defineProperty(req.socket, 'remoteAddress', { value: '203.0.113.10', configurable: true });
    req.headers.host = 'example.com';
    req.headers.origin = 'https://example.com';
    req.headers['x-forwarded-for'] = '203.0.113.10';
    next();
  });
  publicApp.use('/api/auth', authRouter);
  const publicServer = publicApp.listen(0, '0.0.0.0');
  await new Promise((resolve) => publicServer.once('listening', resolve));
  const publicEndpoint = `http://127.0.0.1:${publicServer.address().port}/api/auth/test-role`;
  const production = await fetch(publicEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(production.status, 404);
  await new Promise((resolve, reject) => publicServer.close((error) => error ? reject(error) : resolve()));

  process.env.ENABLE_TEST_ROLE_SHORTCUTS = 'true';
  const explicitlyEnabled = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'community_coordinator' }),
  });
  assert.equal(explicitlyEnabled.status, 200);
  assert.equal((await explicitlyEnabled.json()).user.role, 'Community Organizer');
});

test('test-role login creates a local fallback account when no active role match exists', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalShortcutFlag = process.env.ENABLE_TEST_ROLE_SHORTCUTS;
  process.env.NODE_ENV = 'development';
  process.env.ENABLE_TEST_ROLE_SHORTCUTS = 'true';
  process.env.JWT_SECRET = 'test-role-login-test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const originalQuery = pool.query;
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM users') && sql.includes('LOWER(TRIM(role)) IN')) {
      return [[]];
    }
    if (sql.includes('INSERT INTO users')) {
      return [{ insertId: 99 }];
    }
    if (sql.includes('WHERE LOWER(TRIM(email)) = LOWER(TRIM')) {
      return [[{ id: 99, first_name: 'Test', last_name: 'Admin', email: 'admin@local.test', role: 'Admin', status: 'Active', school_id: null, group_id: null, contact_number: null, location: null }]];
    }
    throw new Error(`Unexpected test SQL: ${sql}`);
  };

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

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).email, 'admin@local.test');
  assert.equal(result.user.role, 'Admin');
});
