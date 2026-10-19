const test = require('node:test');
const assert = require('node:assert/strict');

const communities = new Map();
const users = new Map();
let failClearUserAssignment = false;
let failCommunityCoordinatorUpdate = false;
let lockQueries = [];
let routeMode = false;

function snapshotState() {
  return {
    communities: new Map([...communities.entries()].map(([id, row]) => [id, { ...row }])),
    users: new Map([...users.entries()].map(([id, row]) => [id, { ...row }])),
  };
}

function restoreState(snapshot) {
  communities.clear();
  users.clear();
  snapshot.communities.forEach((row, id) => communities.set(id, row));
  snapshot.users.forEach((row, id) => users.set(id, row));
}

async function queryState(sql, params = []) {
  if (sql.includes('FOR UPDATE')) lockQueries.push(sql);

  if (sql.startsWith('SELECT id, coordinator_id FROM communities WHERE id IN')) {
    return [[...communities.values()]
      .filter((row) => params.map(Number).includes(Number(row.id)))
      .sort((a, b) => a.id - b.id)
      .map(({ id, coordinator_id }) => ({ id, coordinator_id }))];
  }
  if (sql.startsWith('SELECT id, role, school_id FROM users WHERE id = ?')) {
    const user = users.get(Number(params[0]));
    return [[user ? { id: user.id, role: user.role, school_id: user.school_id } : null].filter(Boolean)];
  }
  if (sql.startsWith('SELECT id FROM communities WHERE coordinator_id = ?')) {
    const [coordinatorId, schoolId] = params;
    return [[...communities.values()]
      .filter((community) => Number(community.coordinator_id) === Number(coordinatorId)
        && (schoolId == null || Number(community.id) !== Number(schoolId)))
      .map(({ id }) => ({ id }))];
  }
  if (sql.startsWith('SELECT id FROM users WHERE id = ?')) {
    const user = users.get(Number(params[0]));
    return [[user ? { id: user.id } : null].filter(Boolean)];
  }
  if (sql.startsWith('UPDATE communities SET name = ?, area = ?, coordinator_id = ? WHERE id = ?')) {
    const [name, area, coordinatorId, id] = params;
    Object.assign(communities.get(Number(id)), { name, area, coordinator_id: coordinatorId });
    return [{ affectedRows: 1 }];
  }
  if (sql.startsWith('UPDATE users SET school_id = NULL WHERE id = ? AND school_id = ?')) {
    if (failClearUserAssignment) throw new Error('Simulated write failure');
    const [id, schoolId] = params;
    const user = users.get(Number(id));
    if (user && Number(user.school_id) === Number(schoolId)) user.school_id = null;
    return [{ affectedRows: 1 }];
  }
  if (sql.startsWith('UPDATE users SET school_id = ? WHERE id = ?')) {
    const [schoolId, id] = params;
    const user = users.get(Number(id));
    if (user) user.school_id = Number(schoolId);
    return [{ affectedRows: user ? 1 : 0 }];
  }
  if (sql.startsWith('UPDATE users SET ') && sql.includes(' WHERE id = ?')) {
    const assignmentSql = sql.slice('UPDATE users SET '.length, sql.indexOf(' WHERE id = ?'));
    const columns = assignmentSql.split(',').map((assignment) => assignment.split('=')[0].trim());
    const id = Number(params[params.length - 1]);
    const user = users.get(id);
    if (user) columns.forEach((column, index) => { user[column] = params[index]; });
    return [{ affectedRows: user ? 1 : 0 }];
  }
  if (sql.startsWith('UPDATE communities SET coordinator_id = ? WHERE id = ?')) {
    if (failCommunityCoordinatorUpdate) throw new Error('Simulated coordinator link failure');
    const [coordinatorId, schoolId] = params;
    const community = communities.get(Number(schoolId));
    if (community) community.coordinator_id = Number(coordinatorId);
    return [{ affectedRows: community ? 1 : 0 }];
  }
  if (sql.startsWith('SELECT c.id, c.community_code AS code')) {
    const community = communities.get(Number(params[0]));
    const coordinator = community?.coordinator_id ? users.get(Number(community.coordinator_id)) : null;
    return [[community ? {
      ...community,
      code: community.code,
      coordinator_name: coordinator?.name || '',
    } : null].filter(Boolean)];
  }
  throw new Error(`Unexpected test SQL: ${sql}`);
}

const testPool = {
  query: async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 1 }];
    if (sql.startsWith('INSERT INTO activity_logs')) return [{ insertId: 1 }];
    if (routeMode && sql.startsWith('SELECT id, first_name, middle_initial, last_name, role, status, school_id, group_id FROM users WHERE id = ?')) {
      const user = users.get(Number(params[0]));
      return [[user ? { ...user } : null].filter(Boolean)];
    }
    if (routeMode && sql.startsWith('SELECT id, CONCAT_WS')) {
      const user = users.get(Number(params[0]));
      return [[user ? {
        ...user,
        username: user.name,
        full_name: user.name,
        email: user.email || 'coordinator@example.com',
        first_name: user.first_name || 'Coordinator',
        last_name: user.last_name || 'Test',
        middle_initial: null,
        status: user.status || 'Active',
        group_id: user.group_id || null,
      } : null].filter(Boolean)];
    }
    return [[]];
  },
  getConnection: async () => {
    let transactionSnapshot = null;
    return {
      beginTransaction: async () => { transactionSnapshot = snapshotState(); },
      commit: async () => { transactionSnapshot = null; },
      rollback: async () => {
        if (transactionSnapshot) restoreState(transactionSnapshot);
        transactionSnapshot = null;
      },
      query: async (sql, params = []) => routeMode ? queryState(sql, params) : [[]],
      release() {},
    };
  },
};

const mysql = require('mysql2/promise');
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});
const pool = require('../db');
const communityRouter = require('../routes/community');
process.env.JWT_SECRET = 'coordinator-assignment-test-secret';
const jwt = require('jsonwebtoken');
const usersRouter = require('../routes/users');

test('coordinator assignments are validated and changed atomically', async (t) => {
  await pool.ready;
  routeMode = true;
  const originalPoolQuery = pool.query;
  pool.query = testPool.query;

  const app = require('express')();
  app.use(require('express').json());
  app.use((req, res, next) => {
    req.user = { id: 1, role: 'super_admin' };
    next();
  });
  app.use('/api/community', communityRouter);
  app.use('/api/users', usersRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalPoolQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/community/communities`;

  const setState = (schoolTwoCoordinator = null) => {
    communities.clear();
    communities.set(1, { id: 1, name: 'School One', area: 'North', code: 'SCH-1', coordinator_id: 10 });
    communities.set(2, { id: 2, name: 'School Two', area: 'South', code: 'SCH-2', coordinator_id: schoolTwoCoordinator });
    users.clear();
    users.set(10, {
      id: 10,
      role: 'Community Coordinator',
      school_id: 1,
      name: 'Coordinator One',
      first_name: 'Coordinator',
      last_name: 'One',
      email: 'coordinator-one@example.com',
      contact_number: '09171234567',
      status: 'Active',
    });
    users.set(11, {
      id: 11,
      role: 'Community Coordinator',
      school_id: null,
      name: 'Coordinator Two',
      first_name: 'Coordinator',
      last_name: 'Two',
      email: 'coordinator-two@example.com',
      contact_number: '09171234568',
      status: 'Active',
    });
    users.set(12, { id: 12, role: 'Community Coordinator', school_id: 2, name: 'Coordinator Three' });
    failClearUserAssignment = false;
    failCommunityCoordinatorUpdate = false;
    lockQueries = [];
  };
  const updateSchool = (id, coordinator) => fetch(`${baseUrl}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `School ${id}`, area: 'Poblacion', coordinator }),
  });

  setState();
  const assignmentResponse = await updateSchool(2, 11);
  assert.equal(assignmentResponse.status, 200, JSON.stringify(await assignmentResponse.json()));
  assert.equal(communities.get(2).coordinator_id, 11);
  assert.equal(Number(users.get(11).school_id), 2);
  assert.ok(lockQueries.some((sql) => sql.includes('FOR UPDATE')));

  setState();
  const alreadyAssignedCoordinatorResponse = await updateSchool(2, 10);
  assert.equal(alreadyAssignedCoordinatorResponse.status, 409);
  assert.match((await alreadyAssignedCoordinatorResponse.json()).error, /already assigned to another school/i);
  assert.equal(communities.get(1).coordinator_id, 10);
  assert.equal(users.get(10).school_id, 1);
  assert.equal(communities.get(2).coordinator_id, null);

  setState(12);
  const occupiedSchoolResponse = await updateSchool(2, 11);
  assert.equal(occupiedSchoolResponse.status, 409);
  assert.match((await occupiedSchoolResponse.json()).error, /already has a different Community Coordinator/i);
  assert.equal(communities.get(2).coordinator_id, 12);
  assert.equal(users.get(12).school_id, 2);
  assert.equal(users.get(11).school_id, null);

  const userUpdateUrl = `http://127.0.0.1:${server.address().port}/api/users`;
  const adminToken = jwt.sign({ id: 1, role: 'super_admin' }, process.env.JWT_SECRET);
  const updateUser = (id, schoolId) => fetch(`${userUpdateUrl}/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'Community Coordinator',
      schoolId: String(schoolId),
      contactNumber: '09171234567',
    }),
  });

  setState();
  users.get(11).role = 'Health worker';
  const directAssignmentResponse = await updateUser(11, 2);
  assert.equal(directAssignmentResponse.status, 200);
  assert.equal(communities.get(2).coordinator_id, 11);
  assert.equal(Number(users.get(11).school_id), 2);

  setState();
  const directTransferResponse = await updateUser(10, 2);
  assert.equal(directTransferResponse.status, 409);
  assert.equal(communities.get(1).coordinator_id, 10);
  assert.equal(users.get(10).school_id, 1);
  assert.equal(communities.get(2).coordinator_id, null);

  setState();
  users.get(11).role = 'Health worker';
  failCommunityCoordinatorUpdate = true;
  const directAssignmentFailure = await updateUser(11, 2);
  assert.equal(directAssignmentFailure.status, 500);
  assert.equal(communities.get(2).coordinator_id, null);
  assert.equal(users.get(11).school_id, null);
  assert.equal(users.get(11).role, 'Health worker');

  setState(12);
  failClearUserAssignment = true;
  const failedWriteResponse = await updateSchool(2, '');
  assert.equal(failedWriteResponse.status, 500);
  assert.equal(communities.get(2).coordinator_id, 12);
  assert.equal(users.get(12).school_id, 2);
});
