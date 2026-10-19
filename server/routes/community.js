const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  if (req.isHealthWorker && req.method !== 'GET') {
    return res.status(403).json({ error: 'Health workers have read-only access to community management' });
  }
  return next();
});
const pool = require('../db');
const { createSuperadminNotification } = require('../services/notifications');
const { normalizeRole } = require('../middleware/authorize');
const {
  assertCoordinatorAvailable,
  assertSchoolCoordinatorAvailable,
  isAssignmentConflict,
  lockSchools,
  withTransaction,
} = require('../services/coordinatorAssignments');
const { parsePositiveIntegerId } = require('../utils/userInputValidation');

function parseAssignedBatchIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function resolveBatchId(pool, batchIdentifier) {
  const id = Number(batchIdentifier);
  if (!Number.isNaN(id)) {
    return id;
  }

  const [rows] = await pool.query('SELECT id FROM batches WHERE batch_code = ? LIMIT 1', [String(batchIdentifier).trim()]);
  if (!rows.length) return null;
  return rows[0].id;
}

async function resolveCommunityId(pool, communityIdentifier) {
  const id = Number(communityIdentifier);
  if (!Number.isNaN(id)) {
    return id;
  }

  const normalized = String(communityIdentifier || '').trim();
  if (!normalized) return null;

  const [rows] = await pool.query('SELECT id FROM communities WHERE name = ? LIMIT 1', [normalized]);
  if (!rows.length) return null;
  return rows[0].id;
}

async function nextCode(pool, table, codeColumn, prefix) {
  // Generates the next numeric suffix for codes like SCH-0001, BAT-0001, GRP-0001
  // Use SUBSTRING_INDEX to obtain the numeric portion after the last '-' to be robust.
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(${codeColumn}, '-', -1) AS UNSIGNED)), 0) + 1 AS nextNo FROM ${table}`
  );
  const nextNo = rows[0].nextNo || 1;
  return `${prefix}-${String(nextNo).padStart(4, '0')}`;
}

function getEffectiveRecordCount(item = {}) {
  const actualCount = Number(item.actual_records ?? item.live_records ?? item.mother_count ?? NaN);
  if (Number.isFinite(actualCount)) return actualCount;

  const storedCount = Number(item.records ?? item.record_count ?? item.total_records ?? 0);
  return Number.isFinite(storedCount) ? storedCount : 0;
}

function getMotherWeightedProgress(rows = []) {
  const progressByMother = new Map();

  rows.forEach((row) => {
    const motherId = String(row.motherId ?? row.mother_id ?? '');
    if (!motherId) return;

    const motherChildren = progressByMother.get(motherId) || [];
    motherChildren.push(Math.min(100, (Number(row.childCheckups ?? row.child_checkups ?? 0) / 24) * 100));
    progressByMother.set(motherId, motherChildren);
  });

  if (!progressByMother.size) return 0;

  const motherProgressTotal = [...progressByMother.values()].reduce((total, childProgress) => (
    total + childProgress.reduce((sum, progress) => sum + progress, 0) / childProgress.length
  ), 0);

  return Math.round(motherProgressTotal / progressByMother.size);
}

const effectiveGroupBatchRelation = `(
  SELECT group_id, batch_id FROM group_batch
  UNION
  SELECT m.group_id, m.batch_id
  FROM mothers m
  JOIN groups mg ON mg.id = m.group_id
  JOIN batches mb ON mb.id = m.batch_id AND mb.community_id = mg.community_id
  WHERE m.group_id IS NOT NULL AND m.batch_id IS NOT NULL
)`;

router.get('/summary', async (req, res) => {
  try {
    console.info('[Community API] Fetching community summary from database (compatible mode)...');
    const schoolScope = req.schoolId ? 'WHERE c.id = ?' : '';
    const namedSchoolScope = req.schoolId ? 'WHERE b.community_id = ?' : '';
    const groupScope = req.groupId ? 'WHERE g.id = ?' : req.schoolId ? 'WHERE g.community_id = ?' : '';
    const motherScope = req.groupId ? 'WHERE m.group_id = ?' : req.schoolId ? 'WHERE m.community_id = ?' : '';
    const healthWorkerScope = req.groupId ? 'AND group_id = ?' : req.schoolId ? 'AND school_id = ?' : '';
    const healthWorkerScopeValues = req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : [];
    const communityBatchJoin = req.groupId
      ? `LEFT JOIN batches b ON b.community_id = c.id AND EXISTS (SELECT 1 FROM ${effectiveGroupBatchRelation} scoped_batch_group WHERE scoped_batch_group.batch_id = b.id AND scoped_batch_group.group_id = ?)`
      : 'LEFT JOIN batches b ON b.community_id = c.id';
    const communityMotherJoin = req.groupId
      ? 'LEFT JOIN mothers m ON m.community_id = c.id AND m.group_id = ?'
      : 'LEFT JOIN mothers m ON m.community_id = c.id';

    const [communities] = await pool.query(`
      SELECT
        c.id AS id,
        c.name,
        COALESCE(c.area, '') AS area,
        c.coordinator_id,
        CONCAT_WS(' ', u.first_name, u.last_name) AS coordinator_name,
        COUNT(DISTINCT b.id) AS batches,
        COUNT(DISTINCT m.id) AS records
      FROM communities c
      ${communityBatchJoin}
      ${communityMotherJoin}
      LEFT JOIN users u ON u.id = c.coordinator_id
      ${schoolScope}
      GROUP BY c.id, c.name, c.area, c.coordinator_id, u.first_name, u.last_name
      ORDER BY c.id
    `, req.groupId ? [req.groupId, req.groupId, req.schoolId] : req.schoolId ? [req.schoolId] : []);

    const [batches] = await pool.query(`
      SELECT
        b.id,
        b.batch_code,
        b.name,
        '' AS description,
        c.name AS community,
        COUNT(DISTINCT m.id) AS actual_records,
        b.records AS stored_records,
        COALESCE(b.progress, 0) AS progress,
        COALESCE(b.status, 'Active') AS status,
        GROUP_CONCAT(DISTINCT gb.group_id ORDER BY gb.group_id) AS group_ids,
        GROUP_CONCAT(DISTINCT bg.name ORDER BY bg.name) AS group_names
      FROM batches b
      LEFT JOIN mothers m ON m.batch_id = b.id
      LEFT JOIN communities c ON c.id = b.community_id
      LEFT JOIN ${effectiveGroupBatchRelation} gb ON gb.batch_id = b.id
      LEFT JOIN groups bg ON bg.id = gb.group_id
      ${req.groupId ? `WHERE EXISTS (SELECT 1 FROM ${effectiveGroupBatchRelation} scoped_gb WHERE scoped_gb.batch_id = b.id AND scoped_gb.group_id = ?)` : namedSchoolScope}
      GROUP BY b.id, b.batch_code, b.name, c.name, b.records, b.progress, b.status
      ORDER BY b.id
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);

    const [groupRows] = await pool.query(`
      SELECT
        g.id,
        g.community_id AS communityId,
        g.name AS name,
        g.community_id AS community_id,
        '' AS description,
        c.name AS community,
        COALESCE(g.members_count, COUNT(DISTINCT m.id)) AS members,
        COUNT(DISTINCT gb.batch_id) AS batches,
        (SELECT COUNT(*)
         FROM users hu
         WHERE hu.group_id = g.id
           AND LOWER(REPLACE(REPLACE(TRIM(hu.role), '_', ''), ' ', '')) = 'healthworker') AS health_workers,
        COALESCE(g.leader, '') AS leader,
        COALESCE(g.status, 'Active') AS status
      FROM groups g
      LEFT JOIN mothers m ON m.group_id = g.id
      LEFT JOIN ${effectiveGroupBatchRelation} gb ON gb.group_id = g.id
      LEFT JOIN communities c ON c.id = g.community_id
      ${groupScope}
      GROUP BY g.id, g.community_id, g.name, c.name, g.members_count, g.leader, g.status
      ORDER BY g.id
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);

    const [healthWorkerCountRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE LOWER(REPLACE(REPLACE(TRIM(role), '_', ''), ' ', '')) = 'healthworker' ${healthWorkerScope}`,
      healthWorkerScopeValues,
    );

    const [motherRows] = await pool.query(`
      SELECT
        m.mother_code AS id,
        CONCAT(COALESCE(m.first_name,''), ' ', COALESCE(m.middle_name,''), ' ', COALESCE(m.last_name,'')) AS name,
        m.first_name,
        m.middle_name,
        m.last_name,
        m.dob,
        m.progress,
        m.birth_certificate_document_path,
        m.consent_document_path,
        b.id AS batchId,
        b.batch_code AS batchCode,
        g.name AS groupName,
        c.name AS community
      FROM mothers m
      LEFT JOIN batches b ON b.id = m.batch_id
      LEFT JOIN groups g ON g.id = m.group_id
      LEFT JOIN communities c ON c.id = m.community_id
      ${motherScope}
      ORDER BY m.id
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);

    const [monitoringRows] = await pool.query(`
      SELECT
        m.batch_id AS batchId,
        m.id AS motherId,
        c.id AS childId,
        COUNT(DISTINCT cc.id) AS childCheckups
      FROM mothers m
      LEFT JOIN children c ON c.mother_id = m.id
        AND (c.batch_id = m.batch_id OR c.batch_id IS NULL)
      LEFT JOIN child_checkups cc ON cc.child_id = c.id
      WHERE m.batch_id IS NOT NULL
      GROUP BY m.batch_id, c.id
    `);

    const monitoringByBatch = monitoringRows.reduce((byBatch, row) => {
      const batchRows = byBatch.get(String(row.batchId)) || [];
      batchRows.push(row);
      byBatch.set(String(row.batchId), batchRows);
      return byBatch;
    }, new Map());

    const communitiesData = communities.map((item) => ({
      id: item.id,
      name: item.name,
      area: item.area || '',
      coordinatorId: item.coordinator_id || '',
      coordinatorName: item.coordinator_name || '',
      batches: Number(item.batches || 0),
      records: Number(item.records || 0),
    }));

    const batchesData = batches.map((item) => {
      const batchId = String(item.id || '');
      const childMonitoring = monitoringByBatch.get(batchId) || [];
      const progress = getMotherWeightedProgress(childMonitoring);

      return {
        id: item.batch_code || String(item.id),
        databaseId: item.id,
        code: item.batch_code || String(item.id),
        name: item.name,
        description: item.description,
        community: item.community || '',
        records: getEffectiveRecordCount(item),
        progress,
        status: item.status || 'Active',
        groupIds: item.group_ids || '',
        groupNames: item.group_names || '',
      };
    });

    const batchCountsByGroup = new Map();
    batchesData.forEach((batch) => {
      String(batch.groupIds || '')
        .split(',')
        .map((groupId) => groupId.trim())
        .filter(Boolean)
        .forEach((groupId) => {
          batchCountsByGroup.set(groupId, (batchCountsByGroup.get(groupId) || 0) + 1);
        });
    });

    const groupsData = groupRows.map((item) => ({
      id: item.id,
      name: item.name,
      communityId: item.community_id,
      description: item.description,
      community: item.community || '',
      leader: item.leader || '',
      members: Number(item.members || 0),
      batches: batchCountsByGroup.get(String(item.id)) || 0,
      healthWorkers: Number(item.health_workers || 0),
      status: item.status || 'Active',
    }));

    const mothersData = motherRows.map((item) => ({
      id: item.id,
      name: (item.name || '').trim(),
      first_name: item.first_name || '',
      middle_name: item.middle_name || '',
      last_name: item.last_name || '',
      dob: item.dob || '',
      community: item.community || '',
      batchId: item.batchCode || null,
      group: item.groupName || null,
      status: 'Active',
      visits: 0,
      progress: Number(item.progress || 0),
      birth_certificate_document_path: item.birth_certificate_document_path || '',
      consent_document_path: item.consent_document_path || '',
    }));

    const summary = {
      communities: communitiesData,
      batches: batchesData,
      groups: groupsData,
      mothers: mothersData,
      totalHealthWorkers: Number(healthWorkerCountRows[0]?.total || 0),
    };

    console.info('[Community API] Summary loaded successfully', {
      communities: summary.communities.length,
      batches: summary.batches.length,
      groups: summary.groups.length,
      mothers: summary.mothers.length,
      totalHealthWorkers: summary.totalHealthWorkers,
    });

    res.json(summary);
  } catch (error) {
    console.error('[Community API] community summary error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/communities', async (req, res) => {
  try {
    const { name, area, coordinator } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanArea = String(area || '').trim() || 'Poblacion';

    if (!cleanName) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const created = await withTransaction(pool, async (connection) => {
      const coordinatorId = coordinator ? Number(coordinator) : null;
      if (coordinator && (!Number.isInteger(coordinatorId) || coordinatorId <= 0)) {
        const error = new Error('Select a valid Community Coordinator.');
        error.status = 400;
        throw error;
      }
      if (coordinatorId) await assertCoordinatorAvailable(connection, coordinatorId, null);

      const communityCode = await nextCode(connection, 'communities', 'community_code', 'COM');
      const [result] = await connection.query(
        'INSERT INTO communities (community_code, name, area, coordinator_id) VALUES (?, ?, ?, ?)',
        [communityCode, cleanName, cleanArea, coordinatorId],
      );
      if (coordinatorId) {
        await connection.query('UPDATE users SET school_id = ? WHERE id = ?', [result.insertId, coordinatorId]);
      }
      const [rows] = await connection.query(
        'SELECT id, community_code AS code, name, area FROM communities WHERE id = ?',
        [result.insertId],
      );
      return rows[0];
    });

    await createSuperadminNotification({
      eventType: 'school.created',
      category: 'Community',
      title: 'School created',
      message: `School created: ${created.name}.`,
      entityType: 'school',
      entityId: created.id,
      linkTo: `/community/school/${created.id}`,
      schoolId: created.id,
      actorUserId: req.user.id,
    });
    console.info('[Community API] Created community', created);
    res.status(201).json({
      community: {
        id: created.id,
        code: created.code,
        name: created.name,
        area: created.area || '',
        batches: 0,
        records: 0,
      },
    });
  } catch (error) {
    console.error('[Community API] create community error:', error.message);
    if (isAssignmentConflict(error)) {
      return res.status(409).json({
        error: error.code === 'ER_DUP_ENTRY'
          ? 'This coordinator or school already has an assignment. Refresh the page and try again.'
          : error.message,
      });
    }
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/batches', (req, res, next) => {
  if (normalizeRole(req.user?.role) === 'super_admin') {
    return res.status(403).json({ error: 'Super Admin accounts cannot create batches' });
  }
  return next();
}, async (req, res) => {
  try {
    const { name, community, groupId, records, progress, status } = req.body || {};
    const cleanName = String(name || '').trim();
    const communityId = await resolveCommunityId(pool, community);

    if (!cleanName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    if (!communityId) {
      return res.status(400).json({ error: 'Community is required' });
    }

    if (req.isCommunityOrganizer && String(req.schoolId) !== String(communityId)) {
      return res.status(403).json({ error: 'Community organizers can only create batches for their assigned school' });
    }

    const resolvedGroupId = groupId ? Number(groupId) : null;
    if (resolvedGroupId) {
      const [groupRows] = await pool.query(
        'SELECT id FROM groups WHERE id = ? AND community_id = ? LIMIT 1',
        [resolvedGroupId, communityId],
      );
      if (!groupRows.length) return res.status(400).json({ error: 'Selected group does not belong to this community' });
    }

    const created = await withTransaction(pool, async (connection) => {
      const batchCode = await nextCode(connection, 'batches', 'batch_code', 'BAT');
      const [result] = await connection.query(
        'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
        [batchCode, communityId, cleanName, Number(records) || 0, Number(progress) || 0, status || 'Active']
      );

      const [rows] = await connection.query(
        'SELECT id, batch_code AS code, name, records, progress, status, community_id FROM batches WHERE id = ?',
        [result.insertId]
      );

      if (resolvedGroupId) {
        await connection.query(
          'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
          [resolvedGroupId, result.insertId],
        );
      }
      return rows[0];
    });
    await createSuperadminNotification({
      eventType: 'batch.created',
      category: 'Community',
      title: 'Batch created',
      message: `Batch created: ${created.name}.`,
      entityType: 'batch',
      entityId: created.id,
      linkTo: resolvedGroupId ? `/community/group/${resolvedGroupId}` : `/community/school/${communityId}`,
      schoolId: communityId,
      groupId: resolvedGroupId,
      actorUserId: req.user.id,
    });
    console.info('[Community API] Created batch', created);
    res.status(201).json({ batch: { ...created, id: created.code || created.id, code: created.code || created.id, groupId: resolvedGroupId } });
  } catch (error) {
    console.error('[Community API] create batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/groups', async (req, res) => {
  try {
    const { name, community, leader, members, status } = req.body || {};
    const cleanName = String(name || '').trim();
    const communityId = await resolveCommunityId(pool, community);

    if (!cleanName) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!communityId) {
      return res.status(400).json({ error: 'Community is required' });
    }

    if (req.isCommunityOrganizer && String(req.schoolId) !== String(communityId)) {
      return res.status(403).json({ error: 'Community organizers can only create groups for their assigned school' });
    }

    const cleanLeader = String(leader || '').trim();
    const groupCode = await nextCode(pool, 'groups', 'group_code', 'GRP');

    const [result] = await pool.query(
      'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      [groupCode, communityId, cleanName, cleanLeader || null, Number(members) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT id, group_code AS code, name, leader, members_count AS members, status, community_id FROM groups WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    await createSuperadminNotification({
      eventType: 'group.created',
      category: 'Community',
      title: 'Group created',
      message: `Group created: ${created.name}.`,
      entityType: 'group',
      entityId: created.id,
      linkTo: `/community/group/${created.id}`,
      schoolId: created.community_id,
      groupId: created.id,
      actorUserId: req.user.id,
    });
    console.info('[Community API] Created group', created);
    res.status(201).json({ group: { ...created, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] create group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/community/groups - return list of groups/schools
router.get('/groups', async (req, res) => {
  try {
    const scopeClause = req.schoolId ? 'WHERE g.community_id = ?' : '';
    const [rows] = await pool.query(`
      SELECT
        g.id,
        g.community_id AS communityId,
        g.name AS name,
        '' AS description,
        c.name AS community,
        COUNT(m.id) AS members,
        '' AS leader,
        'Active' AS status
      FROM groups g
      LEFT JOIN mothers m ON m.group_id = g.id
      LEFT JOIN communities c ON c.id = g.community_id
      ${scopeClause}
      GROUP BY g.id, g.community_id, g.name, c.name
      ORDER BY g.id
    `, req.schoolId ? [req.schoolId] : []);
    const groups = rows.map((r) => ({
      id: r.id,
      communityId: r.communityId,
      name: r.name,
      description: r.description,
      community: r.community || '',
      leader: r.leader || '',
      members: Number(r.members || 0),
      status: r.status || 'Active',
      assignedBatchIds: [],
    }));
    res.json({ groups });
  } catch (error) {
    console.error('[Community API] GET /groups error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/groups/:id/delete-impact', async (req, res) => {
  try {
    const groupId = parsePositiveIntegerId(req.params.id);
    if (groupId === null) return res.status(400).json({ error: 'Group ID must be a positive integer' });

    const scopeClause = req.isCommunityOrganizer ? ' AND g.community_id = ?' : '';
    const scopeValues = req.isCommunityOrganizer ? [req.schoolId] : [];
    const [rows] = await pool.query(`
      SELECT
        g.id,
        g.name,
        c.name AS community,
        (SELECT COUNT(*) FROM group_batch gb WHERE gb.group_id = g.id) AS batches,
        (SELECT COUNT(*) FROM mothers m
         WHERE m.group_id = g.id
            OR m.batch_id IN (SELECT gb.batch_id FROM group_batch gb WHERE gb.group_id = g.id)) AS mothers,
        (SELECT COUNT(*) FROM children ch
         WHERE ch.group_id = g.id
            OR ch.batch_id IN (SELECT gb.batch_id FROM group_batch gb WHERE gb.group_id = g.id)
            OR ch.mother_id IN (
              SELECT m.id FROM mothers m
              WHERE m.group_id = g.id
                 OR m.batch_id IN (SELECT gb.batch_id FROM group_batch gb WHERE gb.group_id = g.id)
            )) AS children,
        (SELECT COUNT(*) FROM users u
         WHERE u.group_id = g.id
           AND LOWER(REPLACE(REPLACE(TRIM(u.role), '_', ''), ' ', '')) = 'healthworker') AS health_workers
      FROM groups g
      LEFT JOIN communities c ON c.id = g.community_id
      WHERE g.id = ?${scopeClause}
      LIMIT 1
    `, [groupId, ...scopeValues]);
    if (!rows.length) return res.status(404).json({ error: 'Group not found' });
    const impact = rows[0];
    res.json({
      group: {
        id: impact.id,
        name: impact.name,
        community: impact.community || '',
        batches: Number(impact.batches) || 0,
        mothers: Number(impact.mothers) || 0,
        children: Number(impact.children) || 0,
        healthWorkers: Number(impact.health_workers) || 0,
      },
    });
  } catch (error) {
    console.error('[Community API] group delete impact error:', error.message);
    res.status(500).json({ error: 'Unable to load the records affected by deleting this group.' });
  }
});

// GET /api/community/groups/:id/health-workers - workers assigned to one group
router.get('/groups/:id/health-workers', async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    const scopeClause = req.groupId
      ? 'AND g.id = ?'
      : req.schoolId
        ? 'AND g.community_id = ?'
        : '';
    const scopeValues = req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : [];
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name) AS name,
          u.email, u.contact_number, u.status, u.school_id, u.group_id, u.role
       FROM groups g
       JOIN communities c ON c.id = g.community_id
       JOIN users u ON (
         (u.group_id = g.id AND LOWER(TRIM(u.role)) = 'health worker')
         OR
         (u.school_id = c.id AND LOWER(REPLACE(TRIM(u.role), '_', ' ')) IN ('community organizer', 'communityorganizer', 'community coordinator', 'communitycoordinator', 'coordinator', 'co', 'partner'))
         OR
         (u.id = c.coordinator_id AND LOWER(REPLACE(TRIM(u.role), '_', ' ')) IN ('community organizer', 'communityorganizer', 'community coordinator', 'communitycoordinator', 'coordinator', 'co', 'partner'))
       )
       WHERE g.id = ? ${scopeClause}
       ORDER BY u.role, u.last_name, u.first_name, u.id`,
      [groupId, ...scopeValues],
    );

    res.json({
      users: rows,
      healthWorkers: rows.filter((user) => String(user.role || '').trim().toLowerCase() === 'health worker'),
      communityOrganizers: rows.filter((user) => ['community organizer', 'community_coordinator', 'community coordinator', 'communityorganizer', 'coordinator', 'co']
        .includes(String(user.role || '').trim().toLowerCase())),
    });
  } catch (error) {
    console.error('[Community API] GET /groups/:id/health-workers error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, area, coordinator } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanArea = String(area || '').trim() || 'Poblacion';

    if (!cleanName) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const communityId = Number(id);
    if (Number.isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community id' });
    }
    if (req.isCommunityOrganizer && communityId !== Number(req.schoolId)) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const updated = await withTransaction(pool, async (connection) => {
      const schoolRows = await lockSchools(connection, [communityId]);
      if (!schoolRows.length) {
        const error = new Error('Community not found');
        error.status = 404;
        throw error;
      }
      const currentCoordinatorId = schoolRows[0].coordinator_id;
      const coordinatorId = coordinator ? Number(coordinator) : null;
      if (coordinator && (!Number.isInteger(coordinatorId) || coordinatorId <= 0)) {
        const error = new Error('Select a valid Community Coordinator.');
        error.status = 400;
        throw error;
      }

      if (coordinatorId) {
        assertSchoolCoordinatorAvailable(schoolRows[0], coordinatorId);
        await assertCoordinatorAvailable(connection, coordinatorId, communityId);
      }
      if (currentCoordinatorId && String(currentCoordinatorId) !== String(coordinatorId || '')) {
        await connection.query(
          'SELECT id FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
          [currentCoordinatorId],
        );
      }

      await connection.query(
        'UPDATE communities SET name = ?, area = ?, coordinator_id = ? WHERE id = ?',
        [cleanName, cleanArea, coordinatorId, communityId],
      );
      if (coordinatorId) {
        await connection.query('UPDATE users SET school_id = ? WHERE id = ?', [communityId, coordinatorId]);
      }
      if (currentCoordinatorId && String(currentCoordinatorId) !== String(coordinatorId || '')) {
        await connection.query(
          'UPDATE users SET school_id = NULL WHERE id = ? AND school_id = ?',
          [currentCoordinatorId, communityId],
        );
      }

      const [rows] = await connection.query(
        `SELECT c.id, c.community_code AS code, c.name, c.area, c.coordinator_id,
            CONCAT_WS(' ', u.first_name, u.last_name) AS coordinator_name
         FROM communities c
         LEFT JOIN users u ON u.id = c.coordinator_id
         WHERE c.id = ?`,
        [communityId],
      );
      return rows[0];
    });
    await createSuperadminNotification({
      eventType: 'school.updated',
      category: 'Community',
      title: 'School updated',
      message: `School updated: ${updated.name}.`,
      entityType: 'school',
      entityId: updated.id,
      linkTo: `/community/school/${updated.id}`,
      schoolId: updated.id,
      actorUserId: req.user.id,
    });
    res.json({
      community: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        area: updated.area || '',
        coordinatorId: updated.coordinator_id || '',
        coordinatorName: updated.coordinator_name || '',
        batches: 0,
        records: 0,
      },
    });
  } catch (error) {
    console.error('[Community API] update community error:', error.message);
    if (error.status === 404) return res.status(404).json({ error: error.message });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (isAssignmentConflict(error)) {
      return res.status(409).json({
        error: error.code === 'ER_DUP_ENTRY'
          ? 'This coordinator or school already has an assignment. Refresh the page and try again.'
          : error.message,
      });
    }
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const communityId = Number(id);
    if (Number.isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community id' });
    }

    const [existingRows] = await pool.query('SELECT id, name FROM communities WHERE id = ? LIMIT 1', [communityId]);
    const [result] = await pool.query('DELETE FROM communities WHERE id = ?', [communityId]);
    if (result.affectedRows > 0) {
      await createSuperadminNotification({
        eventType: 'school.deleted',
        category: 'Community',
        title: 'School deleted',
        message: `School deleted: ${existingRows[0]?.name || 'School'}.`,
        entityType: 'school',
        entityId: communityId,
        linkTo: '/community',
        schoolId: communityId,
        actorUserId: req.user.id,
      });
    }
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Community API] delete community error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, community, leader, members, status } = req.body || {};
    const cleanName = String(name || '').trim();
    const communityId = await resolveCommunityId(pool, community);

    if (!cleanName) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const groupId = Number(id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    if (req.isCommunityOrganizer) {
      if (!communityId || Number(communityId) !== Number(req.schoolId)) {
        return res.status(403).json({ error: 'Community organizers can only assign groups to their assigned school' });
      }
      const [existingRows] = await pool.query(
        'SELECT id FROM groups WHERE id = ? AND community_id = ? LIMIT 1',
        [groupId, req.schoolId],
      );
      if (!existingRows.length) return res.status(404).json({ error: 'Group not found' });
    }

    const updateScopeClause = req.isCommunityOrganizer ? ' AND community_id = ?' : '';
    const updateScopeValues = req.isCommunityOrganizer ? [req.schoolId] : [];
    await pool.query(
      `UPDATE groups SET name = ?, community_id = ?, leader = ?, members_count = ?, status = ? WHERE id = ?${updateScopeClause}`,
      [cleanName, communityId || null, String(leader || '').trim() || null, Number(members) || 0, status || 'Active', groupId, ...updateScopeValues]
    );

    const [rows] = await pool.query(
      `SELECT id, group_code AS code, name, leader, members_count AS members, status, community_id FROM groups WHERE id = ?${updateScopeClause}`,
      [groupId, ...updateScopeValues]
    );

    const updated = rows[0];
    if (!updated) return res.status(404).json({ error: 'Group not found' });
    await createSuperadminNotification({
      eventType: 'group.updated',
      category: 'Community',
      title: 'Group updated',
      message: `Group updated: ${updated.name}.`,
      entityType: 'group',
      entityId: updated.id,
      linkTo: `/community/group/${updated.id}`,
      schoolId: updated.community_id,
      groupId: updated.id,
      actorUserId: req.user.id,
    });
    res.json({ group: { ...updated, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] update group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/groups/:id', async (req, res) => {
  let connection;
  let transactionStarted = false;
  try {
    const groupId = parsePositiveIntegerId(req.params.id);
    if (groupId === null) return res.status(400).json({ error: 'Group ID must be a positive integer' });

    const scopeClause = req.isCommunityOrganizer ? ' AND community_id = ?' : '';
    const scopeValues = req.isCommunityOrganizer ? [req.schoolId] : [];
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingRows] = await connection.query(
      `SELECT id, name, community_id FROM groups WHERE id = ?${scopeClause} LIMIT 1 FOR UPDATE`,
      [groupId, ...scopeValues],
    );
    if (!existingRows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ error: 'Group not found' });
    }

    const [batchRows] = await connection.query(
      'SELECT batch_id FROM group_batch WHERE group_id = ? FOR UPDATE',
      [groupId],
    );
    const batchIds = batchRows.map((batch) => Number(batch.batch_id));
    const batchFilter = batchIds.length
      ? ` OR batch_id IN (${batchIds.map(() => '?').join(', ')})`
      : '';
    const batchParams = [groupId, ...batchIds];
    const [motherRows] = await connection.query(
      `SELECT id FROM mothers WHERE group_id = ?${batchFilter} FOR UPDATE`,
      batchParams,
    );
    const motherIds = motherRows.map((mother) => Number(mother.id));
    const motherFilter = motherIds.length
      ? ` OR mother_id IN (${motherIds.map(() => '?').join(', ')})`
      : '';
    await connection.query(
      `UPDATE mothers
       SET group_id = NULL,
           batch_id = CASE WHEN batch_id IN (${batchIds.length ? batchIds.map(() => '?').join(', ') : 'NULL'})
             THEN NULL ELSE batch_id END
       WHERE group_id = ?${batchFilter}`,
      [...batchIds, groupId, ...batchIds],
    );
    await connection.query(
      `UPDATE children
       SET group_id = NULL,
           batch_id = CASE WHEN batch_id IN (${batchIds.length ? batchIds.map(() => '?').join(', ') : 'NULL'})
             THEN NULL ELSE batch_id END
       WHERE group_id = ?${batchFilter}${motherFilter}`,
      [...batchIds, groupId, ...batchIds, ...motherIds],
    );
    await connection.query('UPDATE users SET group_id = NULL WHERE group_id = ?', [groupId]);
    await connection.query('DELETE FROM group_batch WHERE group_id = ?', [groupId]);
    const [result] = await connection.query(
      `DELETE FROM groups WHERE id = ?${scopeClause}`,
      [groupId, ...scopeValues],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ error: 'Group not found' });
    }
    await connection.commit();
    transactionStarted = false;

    try {
      await createSuperadminNotification({
        eventType: 'group.deleted',
        category: 'Community',
        title: 'Group deleted',
        message: `Group deleted: ${existingRows[0].name}.`,
        entityType: 'group',
        entityId: groupId,
        linkTo: existingRows[0]?.community_id ? `/community/school/${existingRows[0].community_id}` : '/community',
        schoolId: existingRows[0]?.community_id,
        groupId,
        actorUserId: req.user.id,
      });
    } catch (notificationError) {
      console.error('[Community API] group deletion notification failed:', notificationError.message);
    }
    res.json({ success: true, deleted: true });
  } catch (error) {
    if (transactionStarted && connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[Community API] group deletion rollback failed:', rollbackError.message);
      }
    }
    console.error('[Community API] delete group error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to delete group.' });
  } finally {
    connection?.release();
  }
});

router.put('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, community, groupId, records, progress, status } = req.body || {};
    const cleanName = String(name || '').trim();
    const communityId = await resolveCommunityId(pool, community);

    if (!cleanName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    const batchId = await resolveBatchId(pool, id);
    if (!batchId) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (req.isCommunityOrganizer) {
      if (!communityId || Number(communityId) !== Number(req.schoolId)) {
        return res.status(403).json({ error: 'Community organizers can only assign batches to their assigned school' });
      }
      const [existingRows] = await pool.query(
        'SELECT id FROM batches WHERE id = ? AND community_id = ? LIMIT 1',
        [batchId, req.schoolId],
      );
      if (!existingRows.length) return res.status(404).json({ error: 'Batch not found' });
      if (groupId) {
        const [groupRows] = await pool.query(
          'SELECT id FROM groups WHERE id = ? AND community_id = ? LIMIT 1',
          [Number(groupId), req.schoolId],
        );
        if (!groupRows.length) {
          return res.status(403).json({ error: 'Community organizers can only assign groups from their assigned school' });
        }
      }
    }

    const updateScopeClause = req.isCommunityOrganizer ? ' AND community_id = ?' : '';
    const updateScopeValues = req.isCommunityOrganizer ? [req.schoolId] : [];
    const updated = await withTransaction(pool, async (connection) => {
      await connection.query(
        `UPDATE batches SET name = ?, community_id = ?, records = ?, progress = ?, status = ? WHERE id = ?${updateScopeClause}`,
        [cleanName, communityId || null, Number(records) || 0, Number(progress) || 0, status || 'Active', batchId, ...updateScopeValues]
      );

      if (groupId !== undefined) {
        await connection.query('DELETE FROM group_batch WHERE batch_id = ?', [batchId]);
        if (groupId) {
          await connection.query('INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)', [Number(groupId), batchId]);
        }
      }

      const [rows] = await connection.query(
        `SELECT b.id, b.batch_code AS code, b.name, b.records, b.progress, b.status, b.community_id,
            (SELECT group_id FROM group_batch WHERE batch_id = b.id ORDER BY group_id LIMIT 1) AS group_id
         FROM batches b WHERE b.id = ?${req.isCommunityOrganizer ? ' AND b.community_id = ?' : ''}`,
        [batchId, ...updateScopeValues]
      );
      return rows[0];
    });
    if (!updated) return res.status(404).json({ error: 'Batch not found' });
    await createSuperadminNotification({
      eventType: 'batch.updated',
      category: 'Community',
      title: 'Batch updated',
      message: `Batch updated: ${updated.name}.`,
      entityType: 'batch',
      entityId: updated.id,
      linkTo: updated.group_id ? `/community/group/${updated.group_id}` : `/community/school/${updated.community_id}`,
      schoolId: updated.community_id,
      groupId: updated.group_id,
      actorUserId: req.user.id,
    });
    res.json({ batch: { ...updated, id: updated.code || updated.id, code: updated.code || updated.id } });
  } catch (error) {
    console.error('[Community API] update batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const batchId = await resolveBatchId(pool, id);
    if (!batchId) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const scopeClause = req.isCommunityOrganizer ? ' AND b.community_id = ?' : '';
    const deleteScopeClause = req.isCommunityOrganizer ? ' AND community_id = ?' : '';
    const scopeValues = req.isCommunityOrganizer ? [req.schoolId] : [];
    const deletedBatch = await withTransaction(pool, async (connection) => {
      const [existingRows] = await connection.query(
        `SELECT b.id, b.name, b.community_id,
           (SELECT gb.group_id FROM group_batch gb WHERE gb.batch_id = b.id ORDER BY gb.group_id LIMIT 1) AS group_id
         FROM batches b
         WHERE b.id = ?${scopeClause}
         LIMIT 1 FOR UPDATE`,
        [batchId, ...scopeValues],
      );
      if (!existingRows.length) return null;

      const batch = existingRows[0];
      const [motherRows] = await connection.query(
        'SELECT id FROM mothers WHERE batch_id = ? FOR UPDATE',
        [batchId],
      );
      const motherIds = motherRows.map((mother) => Number(mother.id));
      const motherIdClause = motherIds.length
        ? ` OR c.mother_id IN (${motherIds.map(() => '?').join(', ')})`
        : '';
      const [childRows] = await connection.query(
        `SELECT c.id FROM children c
         WHERE c.batch_id = ?${motherIdClause}
         FOR UPDATE`,
        [batchId, ...motherIds],
      );

      if (motherIds.length) {
        await connection.query(
          `DELETE FROM mothers WHERE batch_id = ? AND id IN (${motherIds.map(() => '?').join(', ')})`,
          [batchId, ...motherIds],
        );
      }
      await connection.query('DELETE FROM children WHERE batch_id = ?', [batchId]);

      const [result] = await connection.query(
        `DELETE FROM batches WHERE id = ?${deleteScopeClause}`,
        [batchId, ...scopeValues],
      );
      if (Number(result?.affectedRows) !== 1) {
        throw new Error('Batch was not deleted after its beneficiaries were removed');
      }
      return {
        ...batch,
        deletedMothers: motherIds.length,
        deletedChildren: childRows.length,
      };
    });

    if (!deletedBatch) return res.status(404).json({ error: 'Batch not found' });

    await createSuperadminNotification({
      eventType: 'batch.deleted',
      category: 'Community',
      title: 'Batch deleted',
      message: `Batch deleted: ${deletedBatch.name}. ${deletedBatch.deletedMothers} mothers and ${deletedBatch.deletedChildren} children with their health records were permanently deleted.`,
      entityType: 'batch',
      entityId: batchId,
      linkTo: deletedBatch.group_id
        ? `/community/group/${deletedBatch.group_id}`
        : deletedBatch.community_id ? `/community/school/${deletedBatch.community_id}` : '/community',
      schoolId: deletedBatch.community_id,
      groupId: deletedBatch.group_id,
      actorUserId: req.user.id,
    });
    res.json({
      success: true,
      deleted: true,
      deletedMothers: deletedBatch.deletedMothers,
      deletedChildren: deletedBatch.deletedChildren,
    });
  } catch (error) {
    console.error('[Community API] delete batch error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/community/batches - return list of batches
router.get('/batches', async (req, res) => {
  try {
    const scopeClause = req.schoolId ? 'WHERE b.community_id = ?' : '';
    const [rows] = await pool.query(`
      SELECT
        b.id,
        b.batch_code AS code,
        b.name,
        '' AS description,
        c.name AS community,
        COALESCE(b.records, COUNT(m.id)) AS records,
        COALESCE(b.progress, 0) AS progress,
        COALESCE(b.status, 'Active') AS status
      FROM batches b
      LEFT JOIN mothers m ON m.batch_id = b.id
      LEFT JOIN communities c ON c.id = b.community_id
      ${scopeClause}
      GROUP BY b.id, b.batch_code, b.name, c.name, b.records, b.progress, b.status
      ORDER BY b.id
    `, req.schoolId ? [req.schoolId] : []);
    const batches = rows.map((r) => ({
      id: r.code || String(r.id),
      code: r.code || String(r.id),
      name: r.name,
      description: r.description,
      community: r.community || '',
      records: getEffectiveRecordCount(r),
      progress: 0,
      status: r.status || 'Active',
    }));
    res.json({ batches });
  } catch (error) {
    console.error('[Community API] GET /batches error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
module.exports.getEffectiveRecordCount = getEffectiveRecordCount;
module.exports.getMotherWeightedProgress = getMotherWeightedProgress;
