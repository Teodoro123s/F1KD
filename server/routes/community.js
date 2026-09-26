const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  if (req.isHealthWorker && req.method !== 'GET') {
    return res.status(403).json({ error: 'Health workers have read-only access to community management' });
  }
  return next();
});
const pool = require('../db');

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

async function resolveCoordinatorId(pool, coordinatorIdentifier) {
  if (!coordinatorIdentifier) return null;

  const coordinatorId = Number(coordinatorIdentifier);
  if (Number.isNaN(coordinatorId)) return null;

  const [rows] = await pool.query(
    `SELECT id FROM users
    WHERE id = ? AND LOWER(TRIM(role)) IN ('community organizer', 'community_coordinator', 'communitycoordinator', 'communityorganizer', 'co', 'partner')
     LIMIT 1`,
    [coordinatorId],
  );

  return rows.length ? coordinatorId : null;
}

// Keep the school coordinator link and the organizer's operational school scope in sync.
async function syncCoordinatorAssignment(communityId, coordinatorId, previousCoordinatorId = null) {
  if (coordinatorId) {
    await pool.query(
      'UPDATE communities SET coordinator_id = NULL WHERE coordinator_id = ? AND id <> ?',
      [coordinatorId, communityId],
    );
    await pool.query('UPDATE users SET school_id = ? WHERE id = ?', [communityId, coordinatorId]);
  }

  if (previousCoordinatorId && String(previousCoordinatorId) !== String(coordinatorId || '')) {
    await pool.query(
      'UPDATE users SET school_id = NULL WHERE id = ? AND school_id = ?',
      [previousCoordinatorId, communityId],
    );
  }
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

router.get('/summary', async (req, res) => {
  try {
    console.info('[Community API] Fetching community summary from database (compatible mode)...');
    const schoolScope = req.schoolId ? 'WHERE c.id = ?' : '';
    const namedSchoolScope = req.schoolId ? 'WHERE b.community_id = ?' : '';
    const groupScope = req.groupId ? 'WHERE g.id = ?' : req.schoolId ? 'WHERE g.community_id = ?' : '';
    const motherScope = req.groupId ? 'WHERE m.group_id = ?' : req.schoolId ? 'WHERE m.community_id = ?' : '';
    const communityBatchJoin = req.groupId
      ? 'LEFT JOIN batches b ON b.community_id = c.id AND EXISTS (SELECT 1 FROM group_batch scoped_batch_group WHERE scoped_batch_group.batch_id = b.id AND scoped_batch_group.group_id = ?)'
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
        COALESCE(b.records, COUNT(DISTINCT m.id)) AS records,
        COALESCE(b.progress, 0) AS progress,
        COALESCE(b.status, 'Active') AS status,
        GROUP_CONCAT(DISTINCT gb.group_id ORDER BY gb.group_id) AS group_ids,
        GROUP_CONCAT(DISTINCT bg.name ORDER BY bg.name) AS group_names
      FROM batches b
      LEFT JOIN mothers m ON m.batch_id = b.id
      LEFT JOIN communities c ON c.id = b.community_id
      LEFT JOIN group_batch gb ON gb.batch_id = b.id
      LEFT JOIN groups bg ON bg.id = gb.group_id
      ${req.groupId ? 'WHERE EXISTS (SELECT 1 FROM group_batch scoped_gb WHERE scoped_gb.batch_id = b.id AND scoped_gb.group_id = ?)' : namedSchoolScope}
      GROUP BY b.id, b.batch_code, b.name, c.name, b.records, b.progress, b.status
      ORDER BY b.id
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);

    const [groupRows] = await pool.query(`
      SELECT
        g.id,
        g.name AS name,
        g.community_id AS community_id,
        '' AS description,
        c.name AS community,
        COALESCE(g.members_count, COUNT(m.id)) AS members,
        COUNT(DISTINCT gb.batch_id) AS batches,
        COALESCE(g.leader, '') AS leader,
        COALESCE(g.status, 'Active') AS status
      FROM groups g
      LEFT JOIN mothers m ON m.group_id = g.id
      LEFT JOIN group_batch gb ON gb.group_id = g.id
      LEFT JOIN communities c ON c.id = g.community_id
      ${groupScope}
      GROUP BY g.id, g.name, c.name, g.members_count, g.leader, g.status
      ORDER BY g.id
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);

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
        c.id AS childId,
        COUNT(DISTINCT cc.id) AS childCheckups
      FROM mothers m
      INNER JOIN children c ON c.mother_id = m.id
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
      const completedChildren = childMonitoring.filter((row) => Number(row.childCheckups) >= 24).length;
      const progress = childMonitoring.length
        ? Math.round((completedChildren / childMonitoring.length) * 100)
        : 0;

      return {
        id: item.batch_code || String(item.id),
        databaseId: item.id,
        code: item.batch_code || String(item.id),
        name: item.name,
        description: item.description,
        community: item.community || '',
        records: Number(item.records || 0),
        progress,
        status: item.status || 'Active',
        groupIds: item.group_ids || '',
        groupNames: item.group_names || '',
      };
    });

    const groupsData = groupRows.map((item) => ({
      id: item.id,
      name: item.name,
      communityId: item.community_id,
      description: item.description,
      community: item.community || '',
      leader: item.leader || '',
      members: Number(item.members || 0),
      batches: Number(item.batches || 0),
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
    };

    console.info('[Community API] Summary loaded successfully', {
      communities: summary.communities.length,
      batches: summary.batches.length,
      groups: summary.groups.length,
      mothers: summary.mothers.length,
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

    const coordinatorId = await resolveCoordinatorId(pool, coordinator);
    if (coordinator && !coordinatorId) {
      return res.status(400).json({ error: 'Selected coordinator must be a Community Organizer' });
    }

    const communityCode = await nextCode(pool, 'communities', 'community_code', 'COM');

    const [result] = await pool.query(
      'INSERT INTO communities (community_code, name, area, coordinator_id) VALUES (?, ?, ?, ?)',
      [communityCode, cleanName, cleanArea, coordinatorId]
    );

    await syncCoordinatorAssignment(result.insertId, coordinatorId);

    const [rows] = await pool.query(
      'SELECT id, community_code AS code, name, area FROM communities WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
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
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/batches', async (req, res) => {
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

    const batchCode = await nextCode(pool, 'batches', 'batch_code', 'BAT');
    const [result] = await pool.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [batchCode, communityId, cleanName, Number(records) || 0, Number(progress) || 0, status || 'Active']
    );

    const [rows] = await pool.query(
      'SELECT id, batch_code AS code, name, records, progress, status, community_id FROM batches WHERE id = ?',
      [result.insertId]
    );

    const created = rows[0];
    if (resolvedGroupId) {
      await pool.query(
        'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [resolvedGroupId, result.insertId],
      );
    }
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
      GROUP BY g.id, g.name, c.name
      ORDER BY g.id
    `, req.schoolId ? [req.schoolId] : []);
    const groups = rows.map((r) => ({
      id: r.id,
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

// GET /api/community/groups/:id/health-workers - workers assigned to one group
router.get('/groups/:id/health-workers', async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    const [rows] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, middle_initial, last_name) AS name,
          email, contact_number, status, school_id, group_id
       FROM users
       WHERE group_id = ? AND LOWER(TRIM(role)) = 'health worker'
       ORDER BY last_name, first_name, id`,
      [groupId],
    );

    res.json({ healthWorkers: rows });
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

    const [existingRows] = await pool.query(
      'SELECT coordinator_id FROM communities WHERE id = ? LIMIT 1',
      [communityId],
    );
    if (!existingRows.length) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const coordinatorId = await resolveCoordinatorId(pool, coordinator);
    if (coordinator && !coordinatorId) {
      return res.status(400).json({ error: 'Selected coordinator must be a Community Organizer' });
    }

    await pool.query(
      'UPDATE communities SET name = ?, area = ?, coordinator_id = ? WHERE id = ?',
      [cleanName, cleanArea, coordinatorId, communityId]
    );

    await syncCoordinatorAssignment(communityId, coordinatorId, existingRows[0].coordinator_id);

    const [rows] = await pool.query(
      `SELECT c.id, c.community_code AS code, c.name, c.area, c.coordinator_id,
          CONCAT_WS(' ', u.first_name, u.last_name) AS coordinator_name
       FROM communities c
       LEFT JOIN users u ON u.id = c.coordinator_id
       WHERE c.id = ?`,
      [communityId]
    );

    const updated = rows[0];
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

    const [result] = await pool.query('DELETE FROM communities WHERE id = ?', [communityId]);
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

    await pool.query(
      'UPDATE groups SET name = ?, community_id = ?, leader = ?, members_count = ?, status = ? WHERE id = ?',
      [cleanName, communityId || null, String(leader || '').trim() || null, Number(members) || 0, status || 'Active', groupId]
    );

    const [rows] = await pool.query(
      'SELECT id, group_code AS code, name, leader, members_count AS members, status, community_id FROM groups WHERE id = ?',
      [groupId]
    );

    const updated = rows[0];
    res.json({ group: { ...updated, assignedBatchIds: [] } });
  } catch (error) {
    console.error('[Community API] update group error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = Number(id);
    if (Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group id' });
    }

    const [result] = await pool.query('DELETE FROM groups WHERE id = ?', [groupId]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
  } catch (error) {
    console.error('[Community API] delete group error:', error.message);
    res.status(500).json({ error: 'db error' });
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

    await pool.query(
      'UPDATE batches SET name = ?, community_id = ?, records = ?, progress = ?, status = ? WHERE id = ?',
      [cleanName, communityId || null, Number(records) || 0, Number(progress) || 0, status || 'Active', batchId]
    );

    if (groupId !== undefined) {
      await pool.query('DELETE FROM group_batch WHERE batch_id = ?', [batchId]);
      if (groupId) {
        await pool.query('INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)', [Number(groupId), batchId]);
      }
    }

    const [rows] = await pool.query(
      'SELECT id, batch_code AS code, name, records, progress, status, community_id FROM batches WHERE id = ?',
      [batchId]
    );

    const updated = rows[0];
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

    const [result] = await pool.query('DELETE FROM batches WHERE id = ?', [batchId]);
    res.json({ success: true, deleted: result.affectedRows > 0 });
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
      records: Number(r.records || 0),
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
