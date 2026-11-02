const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');

const enabled = process.env.F1KD_RUN_ARCHIVE_DB_TESTS === '1';

test('archive metadata persists and historical report results remain equivalent', { skip: !enabled }, async (t) => {
  assert.match(process.env.DB_HOST || '', /^(127\.0\.0\.1|localhost)$/);
  assert.match(process.env.DB_NAME || '', /^f1kd_test/);

  const fs = require('node:fs/promises');
  const path = require('node:path');
  const pool = require('../db');
  const { authorizeOperational, authorizeProgressReport } = require('../middleware/authorize');
  const archivesRouter = require('../routes/archives');
  const mothersRouter = require('../routes/mothers');
  const childrenRouter = require('../routes/children');
  const progressReportRouter = require('../routes/progressReport');
  const programsRouter = require('../routes/programs');
  await pool.ready;

  let userId;
  let schoolId;
  let programId;
  let server;
  t.after(async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
    if (userId && schoolId) {
      await pool.query(
        `DELETE FROM activity_logs
         WHERE actor_user_id = ? AND category = 'Archive'`,
        [userId],
      );
    }
    if (programId) await pool.query('DELETE FROM programs WHERE id = ?', [programId]);
    if (schoolId) await pool.query('DELETE FROM communities WHERE id = ?', [schoolId]);
    if (userId) await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    await pool.end();
  });

  const migration = await fs.readFile(
    path.join(__dirname, '..', 'migrations', '20261101_record_archiving.sql'),
    'utf8',
  );
  const migrationStatements = migration
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  const tables = ['communities', 'groups', 'batches', 'programs', 'mothers', 'children'];

  for (const table of [...tables, 'users', 'activity_logs']) {
    const [[row]] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
    assert.equal(Number(row.total), 0, `Dedicated archive test table ${table} must be empty`);
  }

  for (const table of tables) {
    await pool.query(
      `ALTER TABLE ${table}
       DROP INDEX idx_${table}_archived_at,
       DROP COLUMN archive_reason,
       DROP COLUMN archived_by_user_id,
       DROP COLUMN archived_at`,
    );
  }
  for (let replay = 0; replay < 2; replay += 1) {
    for (const statement of migrationStatements) await pool.query(statement);
  }

  const [metadataColumns] = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name IN (?, ?, ?, ?, ?, ?)
       AND column_name IN ('archived_at', 'archived_by_user_id', 'archive_reason')`,
    tables,
  );
  assert.equal(metadataColumns.length, tables.length * 3);

  const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const [userResult] = await pool.query(
    `INSERT INTO users (first_name, last_name, email, role, status)
     VALUES (?, ?, ?, ?, 'Active')`,
    ['Synthetic', 'Archive Tester', `archive-test-${suffix}@example.invalid`, 'Community Organizer'],
  );
  userId = userResult.insertId;
  const [schoolResult] = await pool.query(
    'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
    [`QA${suffix}`, `Synthetic School ${suffix}`, 'Test Area'],
  );
  schoolId = schoolResult.insertId;
  const [groupResult] = await pool.query(
    'INSERT INTO groups (group_code, community_id, name, status) VALUES (?, ?, ?, ?)',
    [`G${suffix}`, schoolId, `Synthetic Group ${suffix}`, 'Active'],
  );
  const groupId = groupResult.insertId;
  const [batchResult] = await pool.query(
    'INSERT INTO batches (batch_code, community_id, name, status) VALUES (?, ?, ?, ?)',
    [`B${suffix}`, schoolId, `Synthetic Batch ${suffix}`, 'Active'],
  );
  const batchId = batchResult.insertId;
  await pool.query('INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, batchId]);
  const [motherResult] = await pool.query(
    `INSERT INTO mothers (mother_code, community_id, group_id, batch_id, first_name, last_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [`M${suffix}`, schoolId, groupId, batchId, 'Synthetic', 'Mother'],
  );
  const motherId = motherResult.insertId;
  const [childResult] = await pool.query(
    `INSERT INTO children
       (child_code, mother_id, community_id, group_id, batch_id, first_name, last_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [`C${suffix}`, motherId, schoolId, groupId, batchId, 'Synthetic', 'Child'],
  );
  const childId = childResult.insertId;
  await pool.query(
    `INSERT INTO mother_checkups
       (mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks, weight_kg, height_cm, bmi)
     VALUES (?, 'First', 1, '2026-01-14', 12, 55, 155, 22.9)`,
    [motherId],
  );
  await pool.query(
    `INSERT INTO child_checkups
       (child_id, week_number, visit_date, weight, height, exclusive_breastfeeding)
     VALUES (?, 1, '2026-01-15', 3.2, 50, 'Yes')`,
    [childId],
  );
  await pool.query(
    `INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date)
     VALUES (?, 'TT1', '2026-01-14')`,
    [motherId],
  );
  await pool.query(
    `INSERT INTO child_vaccinations (child_id, vaccine_name, dose_number, vaccine_date)
     VALUES (?, 'BCG', 1, '2026-01-15')`,
    [childId],
  );
  const programName = `Synthetic Distribution ${suffix}`;
  const [programResult] = await pool.query(
    `INSERT INTO programs (name, type, provider, beneficiary_type, status, target, received)
     VALUES (?, 'Nutrition', 'Synthetic Provider', 'Mother and Child', 'Ended', 2, 2)`,
    [programName],
  );
  programId = programResult.insertId;
  const [[school]] = await pool.query('SELECT name FROM communities WHERE id = ?', [schoolId]);
  await pool.query(
    `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
     VALUES (?, 'School', ?, 2, 2)`,
    [programId, school.name],
  );
  const [motherLog] = await pool.query(
    `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by)
     VALUES (?, 'mother', ?, 1, '2026-03-15', ?)`,
    [String(motherId), programId, userId],
  );
  const [childLog] = await pool.query(
    `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by)
     VALUES (?, 'child', ?, 1, '2026-03-15', ?)`,
    [String(childId), programId, userId],
  );
  const [receiptSet] = await pool.query(
    `INSERT INTO program_receipt_documentation_sets (program_id, monitored_date, uploaded_by_user_id)
     VALUES (?, '2026-03-15', ?)`,
    [programId, userId],
  );
  await pool.query(
    `INSERT INTO program_receipt_documentations (documentation_set_id, file_name, file_path)
     VALUES (?, 'synthetic-receipt.pdf', 'synthetic/test/receipt.pdf')`,
    [receiptSet.insertId],
  );
  await pool.query(
    `INSERT INTO program_receipt_documentation_logs (documentation_set_id, monitoring_log_id)
     VALUES (?, ?), (?, ?)`,
    [receiptSet.insertId, motherLog.insertId, receiptSet.insertId, childLog.insertId],
  );

  let role = 'Community Organizer';
  let assignedSchool = schoolId;
  let assignedGroup = groupId;
  const app = express();
  app.use(express.json());
  app.use('/api/archives', (req, res, next) => {
    req.user = {
      id: userId,
      name: 'Synthetic Archive Tester',
      role,
      school_id: assignedSchool,
      group_id: assignedGroup,
    };
    return authorizeOperational(req, res, next);
  }, archivesRouter);
  app.use('/api/mothers', (req, res, next) => {
    req.user = {
      id: userId,
      name: 'Synthetic Archive Tester',
      role,
      school_id: assignedSchool,
      group_id: assignedGroup,
    };
    return authorizeOperational(req, res, next);
  }, mothersRouter);
  app.use('/api/children', (req, res, next) => {
    req.user = {
      id: userId,
      name: 'Synthetic Archive Tester',
      role,
      school_id: assignedSchool,
      group_id: assignedGroup,
    };
    return authorizeOperational(req, res, next);
  }, childrenRouter);
  app.use('/api/progress-report', (req, res, next) => {
    req.user = {
      id: userId,
      name: 'Synthetic Archive Tester',
      role,
      school_id: assignedSchool,
      group_id: assignedGroup,
    };
    return authorizeOperational(req, res, () => authorizeProgressReport(req, res, next));
  }, progressReportRouter);
  app.use('/api/programs', (req, res, next) => {
    req.user = {
      id: userId,
      name: 'Synthetic Archive Tester',
      role,
      school_id: assignedSchool,
      group_id: assignedGroup,
    };
    return authorizeOperational(req, res, next);
  }, programsRouter);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}/api/archives`;
  const apiOrigin = `http://127.0.0.1:${server.address().port}/api`;
  const post = (type, id, action, body = {}) => fetch(`${origin}/${type}/${id}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const apiRequest = (roleValue, path, options = {}) => {
    role = roleValue;
    return fetch(`${apiOrigin}${path}`, options);
  };
  const activeRecordsFor = async (roleValue, path, key) => {
    const response = await apiRequest(roleValue, path);
    assert.equal(response.status, 200, `${roleValue} must retain active-list access`);
    return (await response.json())[key];
  };
  const reportQuery = (granularity) => new URLSearchParams({
    schoolId: String(schoolId),
    groupId: String(groupId),
    batchId: String(batchId),
    granularity,
    programName,
    programBeneficiaryType: 'Mother and Child',
    benefitPeriod: 'month',
    benefitMonth: '2026-03',
    export: '1',
  }).toString();
  const reportFor = async (roleValue, granularity) => {
    const response = await apiRequest(roleValue, `/progress-report?${reportQuery(granularity)}`);
    assert.equal(response.status, 200, `${roleValue} must retain authorized historical report access`);
    return response.json();
  };
  const programHistoryFor = async (roleValue, beneficiaryType, beneficiaryId) => {
    const response = await apiRequest(
      roleValue,
      `/programs/${programId}/monitoring/report/${beneficiaryType}/${beneficiaryId}`,
    );
    assert.equal(response.status, 200, `${roleValue} must retain historical distribution access`);
    return response.json();
  };
  const programDayFor = async (roleValue) => {
    const response = await apiRequest(roleValue, `/programs/${programId}/monitoring?date=2026-03-15`);
    assert.equal(response.status, 200, `${roleValue} must retain historical distribution list access`);
    return response.json();
  };
  const roles = ['Super Admin', 'Admin', 'Partner', 'Community Organizer', 'Health Worker'];
  const { buildProgressReportCsv } = await import('../../src/pages/ProgressReport/utils/csvIdentity.mjs');
  const csvFields = [
    ['school', 'School'],
    ['group', 'Group'],
    ['batch', 'Batch'],
    ['activitiesCompleted', 'Activities completed'],
    ['totalActivities', 'Total activities'],
    ['progress', 'Progress (%)'],
    ['receivedBenefitTotal', 'Program distributions'],
    ['programDocumentation', 'Receipt documented'],
    ['lastActivityDate', 'Last activity'],
  ];
  const snapshotFor = async (roleValue) => {
    const childReport = await reportFor(roleValue, 'child');
    const motherReport = await reportFor(roleValue, 'mother');
    const snapshot = {
      childReport,
      motherReport,
      childCsv: buildProgressReportCsv(childReport.rows, csvFields, 'child'),
      motherCsv: buildProgressReportCsv(motherReport.rows, csvFields, 'mother'),
    };
    if (roleValue !== 'Super Admin') {
      snapshot.childHistory = await programHistoryFor(roleValue, 'child', childId);
      snapshot.motherHistory = await programHistoryFor(roleValue, 'mother', motherId);
      snapshot.distributionDay = await programDayFor(roleValue);
    }
    return snapshot;
  };
  const assertHistoricalReportsUnchanged = async (baseline, stage) => {
    for (const roleValue of roles) {
      assert.deepEqual(
        await snapshotFor(roleValue),
        baseline.get(roleValue),
        `${roleValue} historical report, CSV, or distribution history changed ${stage}`,
      );
    }
  };

  assignedSchool = schoolId + 1;
  assert.equal((await post('group', groupId, 'archive')).status, 404);
  assignedSchool = schoolId;

  const rollbackTrigger = `qa_archive_failure_${suffix.toLowerCase()}`;
  await pool.query(
    `CREATE TRIGGER ${rollbackTrigger}
     BEFORE INSERT ON activity_logs FOR EACH ROW
     BEGIN
       IF NEW.category = 'Archive' AND NEW.entity_type = 'group' AND NEW.action = 'archive' THEN
         SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic activity failure';
       END IF;
     END`,
  );
  try {
    assert.equal((await post('group', groupId, 'archive')).status, 500);
    const [[unchangedGroup]] = await pool.query(
      'SELECT archived_at FROM groups WHERE id = ?',
      [groupId],
    );
    assert.equal(unchangedGroup.archived_at, null);
  } finally {
    await pool.query(`DROP TRIGGER IF EXISTS ${rollbackTrigger}`);
  }

  const archiveResponse = await post('group', groupId, 'archive', { reason: 'Synthetic persistence check' });
  assert.equal(archiveResponse.status, 200);
  const [archivedGroupRows] = await pool.query(
    'SELECT archived_at, archived_by_user_id, archive_reason FROM groups WHERE id = ?',
    [groupId],
  );
  assert.ok(archivedGroupRows[0].archived_at);
  assert.equal(archivedGroupRows[0].archived_by_user_id, userId);
  assert.equal(archivedGroupRows[0].archive_reason, 'Synthetic persistence check');
  assert.equal((await post('group', groupId, 'archive')).status, 409);

  const archiveList = await fetch(`${origin}?type=group&search=${encodeURIComponent(`Synthetic Group ${suffix}`)}`);
  assert.equal(archiveList.status, 200);
  assert.equal((await archiveList.json()).records[0].archive_reason, 'Synthetic persistence check');
  const [[history]] = await pool.query(
    `SELECT COUNT(*) AS checkups, COUNT(DISTINCT c.id) AS children
     FROM child_checkups cc JOIN children c ON c.id = cc.child_id
     WHERE c.id = ?`,
    [childId],
  );
  assert.equal(Number(history.checkups), 1);
  assert.equal(Number(history.children), 1);
  assert.equal((await post('group', groupId, 'restore')).status, 200);

  const historyBaseline = new Map();
  for (const roleValue of roles) {
    historyBaseline.set(roleValue, await snapshotFor(roleValue));
  }
  const activeMothers = await activeRecordsFor('Community Organizer', '/mothers?page=1&perPage=100', 'mothers');
  assert.ok(activeMothers.some((mother) => mother.motherId === `M${suffix}`), JSON.stringify(activeMothers));
  const activeChildren = await activeRecordsFor('Community Organizer', '/children?page=1&perPage=100', 'children');
  assert.ok(activeChildren.some((child) => child.child_code === `C${suffix}`), JSON.stringify(activeChildren));
  assert.equal(historyBaseline.get('Admin').childReport.summary.total, 1);
  assert.equal(historyBaseline.get('Partner').motherReport.summary.total, 1);
  assert.equal(historyBaseline.get('Community Organizer').childReport.rows[0].receivedBenefitTotal, 1);
  assert.equal(historyBaseline.get('Health Worker').motherReport.rows[0].receivedBenefitTotal, 1);
  assert.equal((await apiRequest('Super Admin', `/programs/${programId}/monitoring?date=2026-03-15`)).status, 403);

  for (const roleValue of ['Admin', 'Partner']) {
    const archiveListResponse = await apiRequest(roleValue, '/archives?type=group');
    assert.equal(archiveListResponse.status, 403, `${roleValue} must not view archive management`);
    const archiveMutationResponse = await apiRequest(roleValue, `/archives/group/${groupId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Must be denied' }),
    });
    assert.equal(archiveMutationResponse.status, 403, `${roleValue} must not archive records`);
  }
  await assertHistoricalReportsUnchanged(historyBaseline, 'during denied Admin/Partner archive requests');

  role = 'Community Organizer';
  assert.equal((await post('group', groupId, 'archive')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after group archive');
  role = 'Community Organizer';
  assert.equal((await post('group', groupId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after group restore');

  role = 'Community Organizer';
  assert.equal((await post('batch', batchId, 'archive')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after batch archive');
  role = 'Community Organizer';
  assert.equal((await post('batch', batchId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after batch restore');

  role = 'Community Organizer';
  assert.equal((await post('group', groupId, 'archive')).status, 200);
  role = 'Super Admin';
  assert.equal((await post('school', schoolId, 'archive')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after school archive');
  role = 'Community Organizer';
  assert.equal((await post('group', groupId, 'restore')).status, 409);
  role = 'Super Admin';
  assert.equal((await post('school', schoolId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after school restore');
  const [[groupAfterSchoolRestore]] = await pool.query(
    'SELECT archived_at FROM groups WHERE id = ?',
    [groupId],
  );
  assert.ok(groupAfterSchoolRestore.archived_at, 'Restoring a school must not restore its archived group');
  role = 'Community Organizer';
  assert.equal((await post('group', groupId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after group restore');

  role = 'Community Organizer';
  const motherArchive = await post('mother', motherId, 'archive', { reason: 'Synthetic mother archive check' });
  assert.equal(motherArchive.status, 200);
  const [[archivedMother]] = await pool.query(
    'SELECT archived_at, archived_by_user_id, archive_reason FROM mothers WHERE id = ?',
    [motherId],
  );
  assert.ok(archivedMother.archived_at);
  assert.equal(archivedMother.archived_by_user_id, userId);
  assert.equal(archivedMother.archive_reason, 'Synthetic mother archive check');
  assert.equal((await activeRecordsFor('Community Organizer', '/mothers?page=1&perPage=100', 'mothers'))
    .some((mother) => mother.motherId === `M${suffix}`), false);
  assert.equal((await activeRecordsFor('Community Organizer', '/children?page=1&perPage=100', 'children'))
    .some((child) => child.child_code === `C${suffix}`), false);
  const [[childAfterMotherArchive]] = await pool.query(
    'SELECT archived_at FROM children WHERE id = ?',
    [childId],
  );
  assert.equal(childAfterMotherArchive.archived_at, null, 'Archiving a mother must not archive the child record');
  assert.equal((await post('child', childId, 'restore')).status, 409);
  const motherArchiveList = await fetch(`${origin}?type=mother&search=${encodeURIComponent(`Synthetic Mother`)}`);
  assert.equal(motherArchiveList.status, 200);
  assert.equal((await motherArchiveList.json()).records[0].archive_reason, 'Synthetic mother archive check');
  role = 'Community Organizer';
  assert.equal((await post('mother', motherId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after mother archive and restore');

  role = 'Community Organizer';
  const childArchive = await post('child', childId, 'archive', { reason: 'Synthetic child archive check' });
  assert.equal(childArchive.status, 200);
  const [[archivedChild]] = await pool.query(
    'SELECT archived_at, archived_by_user_id, archive_reason FROM children WHERE id = ?',
    [childId],
  );
  assert.ok(archivedChild.archived_at);
  assert.equal(archivedChild.archived_by_user_id, userId);
  assert.equal(archivedChild.archive_reason, 'Synthetic child archive check');
  assert.equal((await activeRecordsFor('Community Organizer', '/children?page=1&perPage=100', 'children'))
    .some((child) => child.child_code === `C${suffix}`), false);
  const childArchiveList = await fetch(`${origin}?type=child&search=${encodeURIComponent(`Synthetic Child`)}`);
  assert.equal(childArchiveList.status, 200);
  assert.equal((await childArchiveList.json()).records[0].archive_reason, 'Synthetic child archive check');
  role = 'Community Organizer';
  assert.equal((await post('child', childId, 'restore')).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after child archive and restore');

  const [[restoredGroup]] = await pool.query(
    'SELECT archived_at, archived_by_user_id, archive_reason FROM groups WHERE id = ?',
    [groupId],
  );
  assert.equal(restoredGroup.archived_at, null);
  assert.equal(restoredGroup.archived_by_user_id, null);
  assert.equal(restoredGroup.archive_reason, null);
  const [[activity]] = await pool.query(
    `SELECT COUNT(*) AS total FROM activity_logs
     WHERE category = 'Archive' AND entity_type = 'group' AND entity_id = ?
       AND action IN ('archive', 'restore')`,
    [String(groupId)],
  );
  assert.equal(Number(activity.total), 6);
  const [[beneficiaryActivity]] = await pool.query(
    `SELECT COUNT(*) AS total FROM activity_logs
     WHERE category = 'Archive' AND entity_type IN ('mother', 'child')
       AND entity_id IN (?, ?) AND action IN ('archive', 'restore')`,
    [String(motherId), String(childId)],
  );
  assert.equal(Number(beneficiaryActivity.total), 4);

  role = 'Community Organizer';
  assert.equal((await apiRequest('Community Organizer', `/programs/${programId}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Synthetic report equivalence test' }),
  })).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after eligible program archive');
  assert.equal((await apiRequest('Community Organizer', `/programs/${programId}/archive/restore`, {
    method: 'POST',
  })).status, 200);
  await assertHistoricalReportsUnchanged(historyBaseline, 'after program restore');

  const [[retainedHistory]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM mother_checkups WHERE mother_id = ?) AS mother_checkups,
       (SELECT COUNT(*) FROM child_checkups WHERE child_id = ?) AS child_checkups,
       (SELECT COUNT(*) FROM mother_vaccinations WHERE mother_id = ?) AS mother_vaccinations,
       (SELECT COUNT(*) FROM child_vaccinations WHERE child_id = ?) AS child_vaccinations,
       (SELECT COUNT(*) FROM monitoring_logs WHERE program_id = ?) AS distributions`,
    [motherId, childId, motherId, childId, programId],
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(retainedHistory).map(([key, value]) => [key, Number(value)])),
    {
      mother_checkups: 1,
      child_checkups: 1,
      mother_vaccinations: 1,
      child_vaccinations: 1,
      distributions: 2,
    },
  );
});
