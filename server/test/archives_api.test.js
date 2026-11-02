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
const { authorizeOperational } = require('../middleware/authorize');
const archivesRouter = require('../routes/archives');

test('archive API enforces role and school scope and rejects duplicate archives', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  let archivedAt = null;
  let archivedSchoolAt = null;
  let motherArchivedAt = null;
  let childArchivedAt = null;
  let childArchivedWithMotherId = null;
  let assignedSchool = 91;
  let parentActive = true;
  let motherParentActive = true;
  let childMotherActive = true;
  let batchRemainsActive = true;
  const activityWrites = [];
  const archiveReadQueries = [];
  const archiveActivityQueries = [];

  pool.query = async (sql, params = []) => {
    if (sql.includes('INSERT INTO activity_logs')) {
      activityWrites.push({ sql, params });
      return [{ insertId: activityWrites.length }];
    }
    if (sql.includes('FROM activity_logs')) {
      archiveActivityQueries.push({ sql, params });
      if (sql.includes('COUNT(*) AS total')) return [[{ total: 1 }]];
      return [[{
        id: 1,
        action: 'archive',
        entityType: 'group',
        entityId: '8',
        actorName: 'Coordinator',
        description: 'Archived group "Group 8". Reason: Duplicate entry',
      }]];
    }
    if (sql.includes('FROM groups r') || sql.includes('FROM batches r') || sql.includes('FROM communities r')
      || sql.includes('FROM mothers r') || sql.includes('FROM children r')) {
      archiveReadQueries.push({ sql, params });
    }
    if (sql.includes('SELECT COUNT(*) AS total FROM groups r')
      || sql.includes('SELECT COUNT(*) AS total FROM batches r')
      || sql.includes('SELECT COUNT(*) AS total FROM communities r')) return [[{ total: 0 }]];
    if (sql.includes('COUNT(*) AS total FROM mothers r') || sql.includes('COUNT(*) AS total FROM children r')) return [[{ total: 0 }]];
    if (sql.includes('FROM mothers r') && !sql.includes('archived_at IS NOT NULL')) {
      return [[{
        id: 31,
        code: 'MOTHER-31',
        name: 'Synthetic Mother',
        community_id: 91,
        group_id: 8,
        batch_id: 12,
        archived_at: motherArchivedAt,
      }]];
    }
    if (sql.includes('FROM children r LEFT JOIN mothers m') && !sql.includes('archived_at IS NOT NULL')) {
      return [[{
        id: 41,
        code: 'CHILD-41',
        name: 'Synthetic Child',
        community_id: 91,
        group_id: 8,
        batch_id: 12,
        mother_id: 31,
        archived_at: childArchivedAt,
      }]];
    }
    if (sql.includes('FROM mothers r') || sql.includes('FROM children r')) return [[]];
    if (sql.includes('FROM groups r') || sql.includes('FROM batches r') || sql.includes('FROM communities r')) return [[]];
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      if (sql.includes('INSERT INTO activity_logs')) {
        activityWrites.push({ sql, params });
        return [{ insertId: activityWrites.length }];
      }
      if (sql.includes('FROM communities r') && sql.includes('FOR UPDATE')) {
        return [[{ id: 20, name: 'School 20', archived_at: archivedSchoolAt }]];
      }
      if (sql.startsWith('UPDATE communities SET archived_at = CURRENT_TIMESTAMP')) {
        archivedSchoolAt = '2026-01-02 03:04:05';
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE communities SET archived_at = NULL')) {
        archivedSchoolAt = null;
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('FROM groups r') && sql.includes('FOR UPDATE')) {
        if (Number(params[1]) !== 91) return [[]];
        return [[{ id: 8, name: 'Group 8', community_id: 91, archived_at: archivedAt }]];
      }
      if (sql.includes('FROM mothers r') && sql.includes('FOR UPDATE')) {
        if (Number(params[0]) !== 31 || Number(params[2]) !== 91) return [[]];
        return [[{
          id: 31,
          code: 'MOTHER-31',
          name: 'Synthetic Mother',
          community_id: 91,
          group_id: 8,
          batch_id: 12,
          archived_at: motherArchivedAt,
        }]];
      }
      if (sql.includes('FROM children r LEFT JOIN mothers m') && sql.includes('FOR UPDATE')) {
        if (Number(params[0]) !== 41 || Number(params[2]) !== 91) return [[]];
        return [[{
          id: 41,
          code: 'CHILD-41',
          name: 'Synthetic Child',
          community_id: 91,
          group_id: 8,
          batch_id: 12,
          mother_id: 31,
          archived_at: childArchivedAt,
        }]];
      }
      if (sql.includes('FROM children') && sql.includes('archived_with_mother_id = ?') && sql.includes('FOR UPDATE')) {
        return childArchivedWithMotherId === 31 && childArchivedAt
          ? [[{ id: 41, name: 'Synthetic Child' }]]
          : [[]];
      }
      if (sql.includes('FROM children') && sql.includes('mother_id = ?') && sql.includes('archived_at IS NULL') && sql.includes('FOR UPDATE')) {
        assert.match(sql, /archived_at IS NULL/);
        return childArchivedAt ? [[]] : [[{ id: 41, name: 'Synthetic Child' }]];
      }
      if (sql.includes('SELECT r.id FROM mothers r') && sql.includes('JOIN communities')) {
        return motherParentActive ? [[{ id: 31 }]] : [[]];
      }
      if (sql.includes('SELECT r.id FROM children r JOIN mothers')) {
        return childMotherActive ? [[{ id: 41 }]] : [[]];
      }
      if (sql.includes('SELECT r.id FROM children r') && sql.includes('JOIN communities c')) {
        return childMotherActive && motherParentActive && parentActive ? [[{ id: 41 }]] : [[]];
      }
      if (sql.startsWith('UPDATE mothers SET archived_at = CURRENT_TIMESTAMP')) {
        motherArchivedAt = '2026-01-02 03:04:05';
        childMotherActive = false;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE mothers SET archived_at = NULL')) {
        motherArchivedAt = null;
        childMotherActive = true;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE children') && sql.includes('archived_at = CURRENT_TIMESTAMP')) {
        childArchivedAt = '2026-01-02 03:04:05';
        if (sql.includes('archived_with_mother_id = ?')) childArchivedWithMotherId = Number(params[2]);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE children') && sql.includes('archived_at = NULL')) {
        childArchivedAt = null;
        if (sql.includes('archived_with_mother_id = NULL')) childArchivedWithMotherId = null;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE batches SET')) {
        batchRemainsActive = false;
        return [{ affectedRows: 1 }];
      }
      if (/COUNT\\(\\*\\) AS count FROM (children|mother_checkups|mother_vaccinations|child_checkups|child_vaccinations|child_medical_conditions)/.test(sql)) {
        return [[{ count: 0 }]];
      }
      if (sql.includes('FROM communities WHERE id = ? AND archived_at IS NULL')) {
        return parentActive ? [[{ id: 91 }]] : [[]];
      }
      if (sql.startsWith('UPDATE groups SET archived_at = CURRENT_TIMESTAMP')) {
        archivedAt = '2026-01-02 03:04:05';
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE groups SET archived_at = NULL')) {
        archivedAt = null;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
  });

  let role = 'Community Coordinator';
  const app = express();
  app.use(express.json());
  app.use('/api/archives', (req, res, next) => {
    req.user = {
      id: 7,
      role,
      school_id: assignedSchool,
      ...(role === 'Health Worker' ? { group_id: 99 } : {}),
    };
    next();
  }, authorizeOperational, archivesRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/archives/group/8`;
  const post = (path, body = {}) => fetch(`${url}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const beneficiaryPost = (type, id, action, body = {}) => fetch(
    `http://127.0.0.1:${server.address().port}/api/archives/${type}/${id}/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  role = 'Admin';
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=group`)).status, 403);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives/activity`)).status, 403);
  role = 'Community Coordinator';
  assignedSchool = null;
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=group`)).status, 403);
  assignedSchool = 91;

  role = 'Community Coordinator';
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=group`)).status, 200);
  const scopedGroupRead = archiveReadQueries.find(({ sql }) => sql.includes('FROM groups r'));
  assert.match(scopedGroupRead.sql, /r\.community_id = \?/);
  assert.equal(scopedGroupRead.params[0], 91);
  const scopedActivityResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/archives/activity`);
  assert.equal(scopedActivityResponse.status, 200);
  const scopedActivity = (await scopedActivityResponse.json()).activities[0];
  assert.equal(scopedActivity.entityId, '8');
  assert.equal(scopedActivity.reason, 'Duplicate entry');
  const coordinatorActivityRead = archiveActivityQueries.find(({ sql }) => sql.includes('SELECT id, actor_user_id'));
  assert.match(coordinatorActivityRead.sql, /archived_group\.community_id = \?/);
  assert.match(coordinatorActivityRead.sql, /entity_type = 'mother'.*archived_mother\.community_id = \?/s);
  assert.match(coordinatorActivityRead.sql, /entity_type = 'child'.*COALESCE\(archived_child\.community_id, archived_mother\.community_id\) = \?/s);
  assert.ok(coordinatorActivityRead.params.slice(0, 7).every((value) => value === 91));
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=school`)).status, 403);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=mother`)).status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=child`)).status, 200);
  const scopedMotherRead = archiveReadQueries.find(({ sql }) => sql.includes('FROM mothers r'));
  assert.match(scopedMotherRead.sql, /r\.community_id = \?/);
  assert.equal(scopedMotherRead.params[0], 91);

  assignedSchool = 92;
  assert.equal((await post('archive')).status, 404);
  assignedSchool = 91;

  const archived = await post('archive', { reason: 'No longer operational' });
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).record.archive_reason, 'No longer operational');
  assert.equal(activityWrites.length, 1);
  assert.match(activityWrites[0].params[8], /No longer operational/);

  assert.equal((await post('archive')).status, 409);

  parentActive = false;
  assert.equal((await post('restore')).status, 409);
  parentActive = true;
  const restored = await post('restore');
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).record.archived_at, null);
  assert.equal(activityWrites.length, 2);

  const motherArchive = await beneficiaryPost('mother', 31, 'archive', { reason: 'Beneficiary lifecycle test' });
  assert.equal(motherArchive.status, 200);
  assert.equal((await motherArchive.json()).childrenArchived, 1);
  assert.equal(motherArchivedAt !== null, true);
  assert.equal(childArchivedAt !== null, true);
  assert.equal(childArchivedWithMotherId, 31);
  assert.equal(batchRemainsActive, true);
  const childRestoreWhileMotherArchived = await beneficiaryPost('child', 41, 'restore');
  assert.equal(childRestoreWhileMotherArchived.status, 409);
  const motherRestore = await beneficiaryPost('mother', 31, 'restore');
  assert.equal(motherRestore.status, 200);
  assert.equal((await motherRestore.json()).childrenRestored, 1);
  assert.equal(childArchivedAt, null);
  assert.equal(childArchivedWithMotherId, null);
  const childArchive = await beneficiaryPost('child', 41, 'archive');
  assert.equal(childArchive.status, 200);
  assert.equal(batchRemainsActive, true);
  assert.equal((await beneficiaryPost('child', 41, 'restore')).status, 200);

  role = 'Super Admin';
  const superAdminSchoolArchives = await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=school`);
  assert.equal(superAdminSchoolArchives.status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=group`)).status, 403);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives/activity`)).status, 200);
  const superAdminGroupArchive = await fetch(`${url}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(superAdminGroupArchive.status, 403);
  const superAdminSchoolArchive = await fetch(`http://127.0.0.1:${server.address().port}/api/archives/school/20/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(superAdminSchoolArchive.status, 200);
  const superAdminSchoolRestore = await fetch(`http://127.0.0.1:${server.address().port}/api/archives/school/20/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(superAdminSchoolRestore.status, 200);

  for (const deniedRole of ['Admin', 'Partner', 'Health Worker']) {
    role = deniedRole;
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=group`)).status, 403, `${deniedRole} archive list`);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=mother`)).status, 403, `${deniedRole} mother archive list`);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives?type=child`)).status, 403, `${deniedRole} child archive list`);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/archives/activity`)).status, 403, `${deniedRole} archive activity`);
    assert.equal((await post('archive')).status, 403, `${deniedRole} archive mutation`);
    assert.equal((await beneficiaryPost('mother', 31, 'archive')).status, 403, `${deniedRole} mother archive`);
    assert.equal((await beneficiaryPost('child', 41, 'archive')).status, 403, `${deniedRole} child archive`);
  }
});
