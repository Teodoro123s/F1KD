const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'reports-activity-test-secret';

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
const reportsRouter = require('../routes/reports');
const testSessions = new Map();
let nextSessionId = 0;

const sessionRows = (params = []) => {
  const session = testSessions.get(String(params[0]));
  return [session ? [{
    user_id: session.id,
    email: 'test@example.test',
    role: session.role,
    status: 'Active',
    school_id: session.school_id ?? null,
    group_id: null,
    consent_accepted_at: new Date(),
  }] : []];
};

async function startReportsServer(t) {
  await pool.ready;
  const app = express();
  app.use('/api/reports', reportsRouter);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}/api/reports/activity`;
}

async function requestActivity(baseUrl, role, schoolId, query = '') {
  const sid = `reports-activity-session-${++nextSessionId}`;
  testSessions.set(sid, { id: 7, role, school_id: schoolId });
  const token = jwt.sign({ id: 7, sid, role, school_id: schoolId }, process.env.JWT_SECRET);
  const response = await fetch(`${baseUrl}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { response, body: await response.json() };
}

async function requestSchoolPerformance(baseUrl, role, query = '') {
  const sid = `reports-performance-session-${++nextSessionId}`;
  testSessions.set(sid, { id: 7, role });
  const token = jwt.sign({ id: 7, sid, role }, process.env.JWT_SECRET);
  const response = await fetch(`${baseUrl.replace('/activity', '/school-performance')}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { response, body: await response.json() };
}

async function requestSchoolPerformanceDetails(baseUrl, role, schoolId, query = '') {
  const sid = `reports-performance-details-session-${++nextSessionId}`;
  testSessions.set(sid, { id: 7, role });
  const token = jwt.sign({ id: 7, sid, role }, process.env.JWT_SECRET);
  const url = `${baseUrl.replace('/activity', `/school-performance/${schoolId}/details`)}${query}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { response, body: await response.json() };
}

test('admins and partners can view school monitoring and project completion summaries', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const month = formatDate(monthStart).slice(0, 7);
  const childBirthDate = formatDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    queries.push(sql);
    if (sql.includes('FROM communities c')) {
      return [[{ id: 4, name: 'Sample School', organizerName: 'Assigned Organizer' }]];
    }
    if (sql.includes('FROM mothers m')) {
      return [[{
        id: 21,
        schoolId: 4,
        prenatalRegDate: formatDate(monthStart),
        gestationalAge: 0,
        trimester: '1st Trimester',
      }]];
    }
    if (sql.includes('FROM mother_checkups mc')) {
      return [[{
        motherId: 21,
        trimester: '1st Trimester',
        checkupNumber: 1,
        checkupDate: formatDate(monthStart),
        weight: 62,
        height: 160,
        bloodPressure: '120/80',
        nextCheckupDate: null,
      }]];
    }
    if (sql.includes('FROM children c')) {
      return [[{ id: 9, schoolId: 4, birthDate: childBirthDate }]];
    }
    if (sql.includes('FROM child_checkups cc')) {
      return [[{
        childId: 9,
        monthNumber: 1,
        visitDate: formatDate(monthStart),
        weight: 4,
        height: 54,
        feedingMethod: 'Exclusive breastfeeding',
      }]];
    }
    if (sql.includes('FROM program_clusters pc')) {
      return [[{
        schoolId: 4,
        projects: 2,
        totalScopes: 3,
        completedScopes: 1,
        targetRecipients: 20,
        completedRecipients: 5,
      }]];
    }
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  for (const role of ['Admin', 'Partner']) {
    const { response, body } = await requestSchoolPerformance(baseUrl, role, `?month=${month}`);
    assert.equal(response.status, 200);
    assert.equal(body.month, month);
    assert.equal(body.schools[0].organizerName, 'Assigned Organizer');
    assert.equal(body.schools[0].monitoring.mothers.expectedVisits, 1);
    assert.equal(body.schools[0].monitoring.mothers.completeForms, 1);
    assert.equal(body.schools[0].monitoring.children.expectedVisits, 1);
    assert.equal(body.schools[0].monitoring.children.completedVisits, 1);
    assert.equal(body.schools[0].monitoring.children.completeForms, 1);
    assert.equal(body.schools[0].projects.completedScopes, 1);
    assert.equal(body.schools[0].projects.targetRecipients, 20);
  }
  assert.equal(queries.length, 12);
  assert.match(queries.find((sql) => sql.includes('FROM program_clusters pc')), /p\.archived_at IS NULL/);
});

test('school monitoring details return per-beneficiary form statuses to admins and partners only', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const month = monthStart.toISOString().slice(0, 7);
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const childBirthDate = formatDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    queries.push({ sql, params });
    if (sql.includes('FROM communities WHERE id')) return [[{ id: 4 }]];
    if (sql.includes('FROM mothers m')) {
      return [[{
        id: 21,
        code: 'M-21',
        name: 'Sample Mother',
        schoolId: 4,
        prenatalRegDate: formatDate(monthStart),
        gestationalAge: 0,
        trimester: '1st Trimester',
      }]];
    }
    if (sql.includes('FROM mother_checkups mc')) {
      return [[{
        motherId: 21,
        trimester: '1st Trimester',
        checkupNumber: 1,
        checkupDate: formatDate(monthStart),
        weight: 62,
        height: 160,
        bloodPressure: '',
      }]];
    }
    if (sql.includes('FROM children c')) {
      return [[{ id: 9, code: 'C-9', name: 'Sample Child', schoolId: 4, birthDate: childBirthDate }]];
    }
    if (sql.includes('FROM child_checkups cc')) {
      return [[{
        childId: 9,
        monthNumber: 1,
        visitDate: formatDate(monthStart),
        weight: 4,
        height: 54,
        feedingMethod: '',
      }]];
    }
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  for (const role of ['Admin', 'Partner']) {
    const { response, body } = await requestSchoolPerformanceDetails(baseUrl, role, 4, `?month=${month}`);
    assert.equal(response.status, 200);
    assert.equal(body.mothers.due[0].beneficiaryName, 'Sample Mother');
    assert.equal(body.mothers.due[0].status, 'incomplete');
    assert.equal(body.children.due[0].beneficiaryName, 'Sample Child');
    assert.equal(body.children.due[0].status, 'incomplete');
    assert.equal(Object.prototype.hasOwnProperty.call(body.mothers.due[0], 'missingFields'), false);
  }

  const queryCountBeforeForbiddenRequest = queries.length;
  const forbidden = await requestSchoolPerformanceDetails(baseUrl, 'Community Organizer', 4, `?month=${month}`);
  assert.equal(forbidden.response.status, 403);
  assert.equal(queries.length, queryCountBeforeForbiddenRequest);
  assert.ok(queries.every((query) => query.params.includes(4)));
});

test('school performance summaries are restricted to admins and partners', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    queries.push(sql);
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  for (const role of ['Community Organizer', 'Super Admin']) {
    const { response } = await requestSchoolPerformance(baseUrl, role);
    assert.equal(response.status, 403);
  }
  assert.equal(queries.length, 0);
});

test('school performance validates the requested month', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (sql, params = []) => (
    sql.includes('FROM auth_sessions s') ? sessionRows(params) : [[]]
  );
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const invalidMonth = await requestSchoolPerformance(baseUrl, 'Admin', '?month=2026-13');
  assert.equal(invalidMonth.response.status, 400);
  const futureMonth = await requestSchoolPerformance(
    baseUrl,
    'Admin',
    `?month=${new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1)).toISOString().slice(0, 7)}`,
  );
  assert.equal(futureMonth.response.status, 400);
});

test('organizers can view activity for a health worker in their assigned school', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    calls.push({ sql, params });
    if (sql.includes('SELECT id FROM users')) return [[{ id: 21 }]];
    if (sql.includes('COUNT(*) AS total')) return [[{ total: 1 }]];
    if (sql.includes('AS sign_ins')) return [[{ sign_ins: 1 }]];
    if (sql.includes('DATE_FORMAT(activity_date')) return [[{ date: '2026-10-19', count: 1 }]];
    if (sql.includes('SELECT id, actor_user_id AS actorUserId')) {
      return [[{
        id: 33,
        actorUserId: 21,
        actorName: 'Case Worker',
        actorRole: 'Health Worker',
        category: 'Monitoring',
        action: 'update',
        entityType: 'child',
        entityId: '55',
        description: 'Child check-up was updated.',
        createdAt: '2026-10-19 00:00:00',
      }]];
    }
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const { response, body } = await requestActivity(baseUrl, 'Community Organizer', 4, '?actorUserId=21&page=1&perPage=20');
  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
  assert.equal(body.activities[0].actorName, 'Case Worker');
  assert.equal(body.activities[0].action, 'update');
  assert.deepEqual(calls[0].params, [21, 4]);
  assert.match(calls.find((call) => call.sql.includes('COUNT(*) AS total')).sql, /actor_user_id = \?/);
  assert.doesNotMatch(calls.find((call) => call.sql.includes('COUNT(*) AS total')).sql, /action = 'sign_in'/);
});

test('organizers cannot request global or out-of-school activity', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    calls.push({ sql, params });
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const globalRequest = await requestActivity(baseUrl, 'Community Organizer', 4);
  assert.equal(globalRequest.response.status, 403);
  assert.equal(calls.length, 0);

  const otherSchoolRequest = await requestActivity(baseUrl, 'Community Organizer', 4, '?actorUserId=21');
  assert.equal(otherSchoolRequest.response.status, 404);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [21, 4]);
});

test('superadmin global activity report continues to show sign-ins only', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) return sessionRows(params);
    calls.push(sql);
    if (sql.includes('COUNT(*) AS total')) return [[{ total: 0 }]];
    if (sql.includes('AS sign_ins')) return [[{ sign_ins: 0 }]];
    return [[]];
  };
  t.after(() => { pool.query = originalQuery; });

  const baseUrl = await startReportsServer(t);
  const { response } = await requestActivity(baseUrl, 'Super Admin', 0);
  assert.equal(response.status, 200);
  const totalQuery = calls.find((sql) => sql.includes('COUNT(*) AS total'));
  assert.match(totalQuery, /category = 'User Management'/);
  assert.match(totalQuery, /action = 'sign_in'/);
});
