const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mysql = require('mysql2/promise');

const fakePool = {
  query: async () => [[]],
  getConnection: async () => ({ query: async () => [[]], release() {} }),
};
mysql.createPool = () => fakePool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const archivesRouter = require('../routes/archives');

test('user archives are school-scoped, revoke sessions, and can be restored', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const user = {
    id: 5,
    name: 'Health Worker',
    email: 'worker@example.com',
    role: 'Health Worker',
    status: 'Active',
    school_id: 91,
    archived_at: null,
    archive_reason: null,
  };
  const queryCalls = [];
  let actorRole = 'Community Organizer';
  let actorSchoolId = 91;
  let archiveActivityCount = 0;
  let coordinatorConflict = false;

  const findScopedUser = (params, sql) => {
    if (Number(params[0]) !== user.id) return [];
    if (sql.includes('school_id = ?') && Number(params[1]) !== user.school_id) return [];
    if (sql.includes("= 'healthworker'") && !/health\s*worker/i.test(user.role)) return [];
    if (sql.includes("<> 'superadmin'") && /super\s*admin|superadmin/i.test(user.role)) return [];
    return [{ ...user }];
  };

  pool.query = async (sql, params = []) => {
    queryCalls.push({ sql, params });
    if (sql.includes('INSERT INTO activity_logs')) return [{ insertId: ++archiveActivityCount }];
    if (sql.startsWith('SELECT COUNT(*) AS total FROM users r')) return [[{ total: user.archived_at ? 1 : 0 }]];
    if (sql.includes('FROM users r') && sql.includes('archived_at IS NOT NULL')) {
      return user.archived_at ? [[{ ...user, purge_at: '2027-08-01T00:00:00.000Z' }]] : [[]];
    }
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      if (sql.includes('INSERT INTO activity_logs')) return [{ insertId: ++archiveActivityCount }];
      if (sql.includes('FROM users r') && sql.includes('FOR UPDATE')) {
        return [findScopedUser(params, sql)];
      }
      if (sql.startsWith('UPDATE users SET archived_at = CURRENT_TIMESTAMP')) {
        user.archived_at = '2026-11-13 12:00:00';
        user.archive_reason = params[1];
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE users SET archived_at = NULL')) {
        user.archived_at = null;
        user.archive_reason = null;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE auth_refresh_tokens')) return [{ affectedRows: 1 }];
      if (sql.startsWith('UPDATE auth_sessions')) return [{ affectedRows: 1 }];
      if (sql.startsWith('UPDATE communities SET coordinator_id = NULL')) return [{ affectedRows: 1 }];
      if (sql.startsWith('SELECT id, coordinator_id FROM communities')) return [[{ id: 91, coordinator_id: null }]];
      if (sql.startsWith('SELECT id FROM users WHERE coordinator_school_id')) {
        return [coordinatorConflict ? [{ id: 8 }] : []];
      }
      if (sql.startsWith('UPDATE communities SET coordinator_id = ?')) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected connection SQL: ${sql}`);
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/archives', (req, res, next) => {
    req.user = { id: 7, role: actorRole, school_id: actorSchoolId };
    req.schoolId = actorSchoolId;
    req.isCommunityOrganizer = actorRole === 'Community Organizer';
    next();
  }, archivesRouter);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/archives`;
  const send = (path, method = 'GET', body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const list = await send('?type=user');
  assert.equal(list.status, 200);
  const listQuery = queryCalls.find(({ sql }) => sql.includes('FROM users r') && sql.includes('archived_at IS NOT NULL'));
  assert.match(listQuery.sql, /r\.school_id = \?/);
  assert.match(listQuery.sql, /healthworker/);
  assert.equal(listQuery.params[0], 91);

  actorSchoolId = 92;
  assert.equal((await send('/user/5/archive', 'POST')).status, 404);
  assert.equal(user.archived_at, null);
  actorSchoolId = 91;

  assert.equal((await send('/user/5/archive', 'POST', { reason: 'Account no longer needed' })).status, 200);
  assert.equal(user.archived_at, '2026-11-13 12:00:00');
  assert.ok(queryCalls.some(({ sql }) => sql.startsWith('UPDATE auth_refresh_tokens')));
  assert.ok(queryCalls.some(({ sql }) => sql.startsWith('UPDATE auth_sessions')));
  assert.equal((await send('/user/5/archive', 'POST')).status, 409);

  assert.equal((await send('/user/5/restore', 'POST', {})).status, 200);
  assert.equal(user.archived_at, null);

  actorRole = 'Super Admin';
  user.role = 'Super Admin';
  assert.equal((await send('?type=user')).status, 200);
  assert.equal((await send('/user/5/archive', 'POST')).status, 404);

  actorRole = 'Admin';
  assert.equal((await send('?type=user')).status, 403);
  assert.equal((await send('/user/5/archive', 'POST')).status, 403);

  actorRole = 'Super Admin';
  user.role = 'Community Organizer';
  assert.equal((await send('/user/5/archive', 'POST')).status, 200);
  assert.ok(queryCalls.some(({ sql }) => sql.startsWith('UPDATE communities SET coordinator_id = NULL')));
  coordinatorConflict = true;
  assert.equal((await send('/user/5/restore', 'POST', {})).status, 409);
  assert.ok(user.archived_at);
  coordinatorConflict = false;
  assert.equal((await send('/user/5/restore', 'POST', {})).status, 200);
  assert.ok(queryCalls.some(({ sql }) => sql.startsWith('UPDATE communities SET coordinator_id = ? WHERE id = ? AND coordinator_id IS NULL')));
});
