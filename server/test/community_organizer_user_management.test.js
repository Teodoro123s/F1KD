const test = require('node:test');
const assert = require('node:assert/strict');
const originalFetch = global.fetch;
const originalEmailEnv = {
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
  EMAILJS_CREDENTIALS_TEMPLATE_ID: process.env.EMAILJS_CREDENTIALS_TEMPLATE_ID,
};
process.env.JWT_SECRET = 'community-organizer-user-management-test-secret';
Object.assign(process.env, {
  EMAILJS_SERVICE_ID: 'service-test',
  EMAILJS_PUBLIC_KEY: 'public-test',
  EMAILJS_PRIVATE_KEY: 'private-test',
  EMAILJS_CREDENTIALS_TEMPLATE_ID: 'template-credentials',
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

const userForSchool = (id, schoolId, role = 'Health worker') => ({
  id,
  first_name: `Worker${id}`,
  last_name: 'Test',
  middle_initial: null,
  contact_number: '09171234567',
  email: `worker${id}@example.com`,
  gender: 'Female',
  dob: '1990-01-01',
  location: 'Poblacion',
  role,
  status: 'Active',
  school_id: schoolId,
  group_id: 20,
});

test('Community Organizer can manage only Health workers in their assigned school', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const allUsers = [
    userForSchool(5, 12),
    userForSchool(6, 13),
    userForSchool(7, 12, 'Partner'),
  ];
  let insertedUserValues = null;
  let createdUser = null;
  let credentialEmail = null;
  const updateQueries = [];
  const activityEvents = [];

  pool.query = async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO activity_logs')) {
      activityEvents.push(params);
      return [{ insertId: activityEvents.length }];
    }
    if (sql.includes('FROM groups WHERE id = ? AND community_id = ?')) {
      return [Number(params[0]) === 20 && Number(params[1]) === 12 ? [{ id: 20 }] : []];
    }
    if (sql.startsWith('INSERT INTO users')) {
      insertedUserValues = params;
      createdUser = userForSchool(99, 12);
      createdUser.email = params[0];
      createdUser.first_name = params[2];
      createdUser.last_name = params[3];
      createdUser.group_id = params[10];
      return [{ insertId: 99 }];
    }
    if (sql.startsWith('UPDATE users')) {
      updateQueries.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM users') && sql.includes('WHERE school_id = ?')) {
      assert.match(sql, /LOWER\(TRIM\(role\)\) IN \('health worker', 'health_worker', 'healthworker'\)/);
      return [allUsers.filter((user) => user.school_id === Number(params[0]) && user.role === 'Health worker')];
    }
    if (sql.includes('FROM users') && sql.includes('WHERE id = ? AND school_id = ?')) {
      const found = [...allUsers, ...(createdUser ? [createdUser] : [])]
        .find((user) => user.id === Number(params[0]) && user.school_id === Number(params[1]));
      if (found && sql.includes('SELECT id, first_name, middle_initial, last_name, status, group_id')) return [[found]];
      if (found && sql.includes('SELECT id, CONCAT_WS')) return [[found]];
      return [found ? [found] : []];
    }
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 1 }];
    throw new Error(`Unexpected test SQL: ${sql}`);
  };
  global.fetch = async (url, options) => {
    if (url === 'https://api.emailjs.com/api/v1.0/email/send') {
      credentialEmail = JSON.parse(options.body);
      return new Response('OK', { status: 200 });
    }
    return originalFetch(url, options);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEmailEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/users`;
  const tokenFor = (user) => jwt.sign(user, process.env.JWT_SECRET);
  const request = (path, user, options = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokenFor(user)}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const organizer = { id: 1, role: 'Community Organizer', school_id: 12 };

  const listResponse = await request('/health-workers', organizer);
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.equal(list.total, 1);
  assert.deepEqual(list.users.map((user) => user.id), [5]);

  const managedWorkerResponse = await request('/health-workers/5', organizer);
  assert.equal(managedWorkerResponse.status, 200);
  assert.equal((await managedWorkerResponse.json()).id, 5);

  const otherSchoolWorkerResponse = await request('/health-workers/6', organizer);
  assert.equal(otherSchoolWorkerResponse.status, 404);

  const otherRoleResponse = await request('/health-workers', { id: 2, role: 'Admin', school_id: 12 });
  assert.equal(otherRoleResponse.status, 403);

  const missingAssignmentResponse = await request('/health-workers', {
    id: 3,
    role: 'Community Organizer',
    school_id: null,
  });
  assert.equal(missingAssignmentResponse.status, 403);

  const invalidGroupResponse = await request('/health-workers', organizer, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'New',
      lastName: 'Worker',
      email: 'new-worker@example.com',
      password: 'long-enough-password',
      role: 'Admin',
      schoolId: 13,
      groupId: 99,
    }),
  });
  assert.equal(invalidGroupResponse.status, 400);
  assert.equal(insertedUserValues, null);

  const createResponse = await request('/health-workers', organizer, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'New',
      lastName: 'Worker',
      email: 'new-worker@example.com',
      password: 'long-enough-password',
      role: 'Admin',
      schoolId: 13,
      groupId: 20,
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal((await createResponse.clone().json()).emailSent, true);
  assert.equal(credentialEmail.template_id, 'template-credentials');
  assert.deepEqual(credentialEmail.template_params, {
    email: 'new-worker@example.com',
    to_email: 'new-worker@example.com',
    to_name: 'New Worker',
    role: 'Health worker',
    password: 'long-enough-password',
  });
  assert.equal(insertedUserValues[0], 'new-worker@example.com');
  assert.equal(insertedUserValues[1] !== 'long-enough-password', true);
  assert.equal(insertedUserValues[2], 'New');
  assert.equal(insertedUserValues[9], 12);
  assert.equal(insertedUserValues[10], 20);
  assert.equal(activityEvents.length, 1);
  assert.equal(activityEvents[0][4], 'User Management');
  assert.equal(activityEvents[0][5], 'create');

  const crossSchoolEditResponse = await request('/health-workers/6', organizer, {
    method: 'PUT',
    body: JSON.stringify({
      firstName: 'Changed',
      lastName: 'Worker',
      email: 'changed@example.com',
      groupId: 20,
    }),
  });
  assert.equal(crossSchoolEditResponse.status, 404);
  assert.equal(updateQueries.length, 0);

  const statusResponse = await request('/health-workers/5/status', organizer, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'Suspended' }),
  });
  assert.equal(statusResponse.status, 200);
  assert.equal((await statusResponse.json()).status, 'Suspended');
  assert.equal(updateQueries.length, 1);
  assert.equal(activityEvents.length, 2);
  assert.equal(activityEvents[1][5], 'suspend');

  const deleteResponse = await request('/5', organizer, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 403);
});
