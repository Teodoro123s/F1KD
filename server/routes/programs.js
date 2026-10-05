const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createSuperadminNotification } = require('../services/notifications');

router.use((req, res, next) => {
  const isMonitoringUpdate = req.method === 'PATCH' && /\/monitoring$/.test(req.path);
  if (req.isHealthWorker && req.method !== 'GET' && !isMonitoringUpdate) {
    return res.status(403).json({ error: 'Health workers have read-only access to programs' });
  }
  return next();
});
function cleanProgram(body = {}) {
  const name = String(body.name || '').trim();
  const provider = String(body.provider || '').trim();
  if (!name || !provider) return null;
  return {
    name,
    type: String(body.type || 'Other').trim(),
    provider,
    description: String(body.description || '').trim() || null,
    beneficiary_type: String(body.beneficiaryType || body.beneficiary_type || 'Mother and Child').trim(),
  };
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

async function getProgram(id) {
  const [rows] = await pool.query('SELECT * FROM programs WHERE id = ?', [id]);
  if (!rows.length) return null;
  const [clusters] = await pool.query('SELECT id, scope_type AS type, scope_name AS name, beneficiaries, received FROM program_clusters WHERE program_id = ? ORDER BY id', [id]);
  const target = clusters.reduce((total, cluster) => total + Number(cluster.beneficiaries || 0), 0);
  const [monitoringRows] = await pool.query(
    `SELECT COUNT(DISTINCT CONCAT(LOWER(TRIM(ml.beneficiary_type)), ':', ml.beneficiary_id)) AS received
     FROM monitoring_logs ml
     WHERE ml.program_id = ?
       AND ml.monitored = 1
       AND (
         LOWER(TRIM(?)) IN ('mother and child', 'mother & child')
         OR LOWER(TRIM(ml.beneficiary_type)) = LOWER(TRIM(?))
       )`,
    [id, rows[0].beneficiary_type, rows[0].beneficiary_type],
  );
  const clusterReceived = clusters.reduce((total, cluster) => total + Number(cluster.received || 0), 0);
  const received = Math.max(clusterReceived, Number(monitoringRows[0]?.received || 0));
  const schoolCluster = clusters.find((cluster) => cluster.type === 'School');
  const batchCluster = clusters.find((cluster) => cluster.type === 'Batch');
  return {
    ...rows[0],
    beneficiaryType: rows[0].beneficiary_type,
    target,
    received,
    community: schoolCluster?.name || '',
    batch: batchCluster?.name || '',
    clusters,
  };
}

async function getProgramNotificationScope(programId, req) {
  if (req.schoolId) {
    return { schoolId: req.schoolId, groupId: req.groupId || null, schoolIds: [req.schoolId] };
  }

  const [clusters] = await pool.query(
    'SELECT scope_type, scope_name FROM program_clusters WHERE program_id = ? ORDER BY id',
    [programId],
  );
  const schoolIds = new Set();
  let groupId = null;
  for (const cluster of clusters) {
    let rows = [];
    if (cluster.scope_type === 'School') {
      [rows] = await pool.query('SELECT id FROM communities WHERE name = ?', [cluster.scope_name]);
      rows.forEach((row) => schoolIds.add(Number(row.id)));
    } else if (cluster.scope_type === 'Group') {
      [rows] = await pool.query('SELECT id, community_id FROM groups WHERE name = ? ORDER BY id', [cluster.scope_name]);
      rows.forEach((row) => schoolIds.add(Number(row.community_id)));
      if (!groupId && rows.length) groupId = rows[0].id;
    } else if (cluster.scope_type === 'Batch') {
      [rows] = await pool.query('SELECT id, community_id FROM batches WHERE name = ? ORDER BY id', [cluster.scope_name]);
      for (const row of rows) {
        schoolIds.add(Number(row.community_id));
        const [groupRows] = await pool.query('SELECT group_id FROM group_batch WHERE batch_id = ? ORDER BY group_id LIMIT 1', [row.id]);
        if (!groupId && groupRows.length) groupId = groupRows[0].group_id;
      }
    }
  }
  const scopedSchoolIds = [...schoolIds].filter((id) => id > 0);
  return { schoolId: scopedSchoolIds[0] || null, groupId, schoolIds: scopedSchoolIds };
}

async function notifyProgramChange(req, programId, event, scope) {
  const notificationScope = scope || await getProgramNotificationScope(programId, req);
  await createSuperadminNotification({
    ...event,
    category: event.category || 'Programs',
    entityType: 'program',
    entityId: programId,
    linkTo: `/program/${programId}`,
    schoolId: notificationScope.schoolId,
    groupId: notificationScope.groupId,
    schoolIds: notificationScope.schoolIds,
    actorUserId: req.user?.id,
  });
}

function programHasScopeMatch(clusters = [], { schoolId, groupId } = {}) {
  if (!schoolId && !groupId) return true;
  if (!clusters.length) return true;

  if (groupId) {
    return clusters.some((cluster) => {
      if (cluster.type === 'Group') return true;
      if (cluster.type === 'Batch') return true;
      return false;
    });
  }

  if (schoolId) {
    return clusters.some((cluster) => cluster.type === 'School' || cluster.type === 'Group' || cluster.type === 'Batch');
  }

  return true;
}

router.get('/', async (req, res) => {
  try {
    const scopeClause = req.groupId
      ? `WHERE (
          NOT EXISTS (SELECT 1 FROM program_clusters scoped_cluster WHERE scoped_cluster.program_id = p.id)
          OR EXISTS (
            SELECT 1
            FROM program_clusters scoped_cluster
            WHERE scoped_cluster.program_id = p.id
              AND (
                (scoped_cluster.scope_type = 'Group' AND EXISTS (
                  SELECT 1 FROM groups scoped_group
                  WHERE scoped_group.id = ? AND scoped_group.name = scoped_cluster.scope_name
                ))
                OR (scoped_cluster.scope_type = 'Batch' AND EXISTS (
                  SELECT 1 FROM group_batch scoped_group_batch
                  INNER JOIN batches scoped_batch ON scoped_batch.id = scoped_group_batch.batch_id
                  WHERE scoped_group_batch.group_id = ? AND scoped_batch.name = scoped_cluster.scope_name
                ))
              )
          )
        )`
      : req.schoolId
      ? `WHERE (
          NOT EXISTS (SELECT 1 FROM program_clusters scoped_cluster WHERE scoped_cluster.program_id = p.id)
          OR EXISTS (
            SELECT 1
            FROM program_clusters scoped_cluster
            WHERE scoped_cluster.program_id = p.id
              AND (
                (scoped_cluster.scope_type = 'School' AND EXISTS (
                  SELECT 1 FROM communities scoped_school
                  WHERE scoped_school.id = ? AND scoped_school.name = scoped_cluster.scope_name
                ))
                OR (scoped_cluster.scope_type = 'Group' AND EXISTS (
                  SELECT 1 FROM groups scoped_group
                  WHERE scoped_group.community_id = ? AND scoped_group.name = scoped_cluster.scope_name
                ))
                OR (scoped_cluster.scope_type = 'Batch' AND EXISTS (
                  SELECT 1 FROM batches scoped_batch
                  WHERE scoped_batch.community_id = ? AND scoped_batch.name = scoped_cluster.scope_name
                ))
              )
          )
        )`
      : '';
    const [rows] = await pool.query(`SELECT p.* FROM programs p ${scopeClause} ORDER BY p.id DESC`, req.groupId ? [req.groupId, req.groupId] : req.schoolId ? [req.schoolId, req.schoolId, req.schoolId] : []);
    const programs = await Promise.all(rows.map((row) => getProgram(row.id)));
    res.json({ programs });
  } catch (error) {
    console.error('[Programs API] list error:', error.message);
    res.status(500).json({ error: error.message || 'db error' });
  }
});

router.post('/', async (req, res) => {
  if (req.isCommunityOrganizer && !(Number(req.schoolId) > 0)) {
    return res.status(403).json({ error: 'Assign this Community Organizer to a school before creating programs' });
  }
  const program = cleanProgram(req.body);
  if (!program) return res.status(400).json({ error: 'Program name and provider are required' });
  try {
    const [result] = await pool.query('INSERT INTO programs (name, type, provider, description, beneficiary_type) VALUES (?, ?, ?, ?, ?)', Object.values(program));
    const createdProgram = await getProgram(result.insertId);
    await notifyProgramChange(req, result.insertId, {
      eventType: 'program.created',
      title: 'Program created',
      message: `Program ${createdProgram.name} was created.`,
    });
    res.status(201).json({ program: createdProgram });
  } catch (error) {
    console.error('[Programs API] create error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  const program = cleanProgram(req.body);
  if (!program) return res.status(400).json({ error: 'Program name and provider are required' });
  try {
    const [result] = await pool.query('UPDATE programs SET name = ?, type = ?, provider = ?, description = ?, beneficiary_type = ? WHERE id = ?', [...Object.values(program), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    const updatedProgram = await getProgram(req.params.id);
    await notifyProgramChange(req, req.params.id, {
      eventType: 'program.updated',
      title: 'Program updated',
      message: `Program ${updatedProgram.name} was updated.`,
    });
    res.json({ program: updatedProgram });
  } catch (error) {
    console.error('[Programs API] update error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:id/end', async (req, res) => {
  try {
    const scope = await getProgramNotificationScope(req.params.id, req);
    const [result] = await pool.query(
      "UPDATE programs SET status = 'Ended', ended = CURRENT_DATE WHERE id = ?",
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    const program = await getProgram(req.params.id);
    await notifyProgramChange(req, req.params.id, {
      eventType: 'program.ended',
      title: 'Program ended',
      message: `Program ${program.name} was ended.`,
    }, scope);
    res.json({ program });
  } catch (error) {
    console.error('[Programs API] end error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:id/restore', async (req, res) => {
  try {
    const scope = await getProgramNotificationScope(req.params.id, req);
    const [result] = await pool.query(
      "UPDATE programs SET status = 'Active', ended = NULL WHERE id = ?",
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    const program = await getProgram(req.params.id);
    await notifyProgramChange(req, req.params.id, {
      eventType: 'program.restored',
      title: 'Program restored',
      message: `Program ${program.name} was restored.`,
    }, scope);
    res.json({ program });
  } catch (error) {
    console.error('[Programs API] restore error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [programRows] = await pool.query('SELECT name FROM programs WHERE id = ? LIMIT 1', [req.params.id]);
    if (!programRows.length) return res.status(404).json({ error: 'Program not found' });
    const scope = await getProgramNotificationScope(req.params.id, req);
    const [result] = await pool.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Program not found' });
    await notifyProgramChange(req, req.params.id, {
      eventType: 'program.deleted',
      title: 'Program deleted',
      message: `Program ${programRows[0].name} was deleted.`,
    }, scope);
    res.status(204).end();
  } catch (error) {
    console.error('[Programs API] delete error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/clusters', async (req, res) => {
  const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : [];
  if (!scopes.length) return res.status(400).json({ error: 'At least one scope is required' });
  try {
    const addedScopes = [];
    for (const scope of scopes) {
      const type = String(scope.type || '').trim();
      const name = String(scope.name || '').trim();
      if (!type || !name) continue;
      if (req.isCommunityOrganizer) {
        const scopeQueries = {
          School: ['SELECT id FROM communities WHERE id = ? AND name = ? LIMIT 1', [req.schoolId, name]],
          Group: ['SELECT id FROM groups WHERE community_id = ? AND name = ? LIMIT 1', [req.schoolId, name]],
          Batch: ['SELECT id FROM batches WHERE community_id = ? AND name = ? LIMIT 1', [req.schoolId, name]],
        };
        const query = scopeQueries[type];
        if (!query) return res.status(403).json({ error: 'Community Organizers may only add scopes from their assigned school' });
        const [matchingScopes] = await pool.query(...query);
        if (!matchingScopes.length) return res.status(403).json({ error: 'Community Organizers may only add scopes from their assigned school' });
      }
      const [result] = await pool.query('INSERT IGNORE INTO program_clusters (program_id, scope_type, scope_name, beneficiaries) VALUES (?, ?, ?, ?)', [req.params.id, type, name, Number(scope.beneficiaries) || 0]);
      if (result.affectedRows) addedScopes.push({ type, name });
    }
    const program = await getProgram(req.params.id);
    if (addedScopes.length) {
      const scope = req.schoolId
        ? { schoolId: req.schoolId, groupId: req.groupId || null }
        : await getProgramNotificationScope(req.params.id, req);
      await notifyProgramChange(req, req.params.id, {
        eventType: 'program.scopes_assigned',
        title: 'Program beneficiaries assigned',
        message: `${addedScopes.length} school/group/batch scope(s) were assigned to ${program.name}.`,
      }, scope);
    }
    res.status(201).json({ program });
  } catch (error) {
    console.error('[Programs API] cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/clusters/:clusterId/complete', async (req, res) => {
  try {
    const [clusterRows] = await pool.query(
      'SELECT scope_type, scope_name FROM program_clusters WHERE id = ? AND program_id = ? LIMIT 1',
      [req.params.clusterId, req.params.programId],
    );
    if (!clusterRows.length) return res.status(404).json({ error: 'Cluster not found' });
    const scope = await getProgramNotificationScope(req.params.programId, req);
    const [result] = await pool.query(
      'UPDATE program_clusters SET received = beneficiaries WHERE id = ? AND program_id = ?',
      [req.params.clusterId, req.params.programId],
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Cluster not found' });
    const program = await getProgram(req.params.programId);
    await notifyProgramChange(req, req.params.programId, {
      eventType: 'program.cluster_completed',
      title: 'Program scope completed',
      message: `${clusterRows[0].scope_type} ${clusterRows[0].scope_name} was marked complete for ${program.name}.`,
    }, scope);
    res.json({ program });
  } catch (error) {
    console.error('[Programs API] complete cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/clusters/complete', async (req, res) => {
  const type = String(req.body?.type || '').trim();
  const name = String(req.body?.name || '').trim();
  const beneficiaries = Number(req.body?.beneficiaries || 0);
  if (!type || !name) return res.status(400).json({ error: 'Cluster type and name are required' });
  try {
    const scope = await getProgramNotificationScope(req.params.programId, req);
    const [result] = await pool.query(
      'UPDATE program_clusters SET received = beneficiaries WHERE program_id = ? AND scope_type = ? AND scope_name = ?',
      [req.params.programId, type, name],
    );
    if (!result.affectedRows) {
      await pool.query(
        'INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received) VALUES (?, ?, ?, ?, ?)',
        [req.params.programId, type, name, beneficiaries, beneficiaries],
      );
    }
    const program = await getProgram(req.params.programId);
    await notifyProgramChange(req, req.params.programId, {
      eventType: 'program.cluster_completed',
      title: 'Program scope completed',
      message: `${type} ${name} was marked complete for ${program.name}.`,
    }, scope);
    res.json({ program });
  } catch (error) {
    console.error('[Programs API] complete named cluster error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring', async (req, res) => {
  const date = validDate(req.query.date) || new Date().toISOString().slice(0, 10);
  try {
    const [logs] = await pool.query(
      `SELECT beneficiary_id, beneficiary_type, monitored, DATE_FORMAT(monitored_date, '%Y-%m-%d') AS monitored_date, notes
       FROM monitoring_logs
       WHERE program_id = ? AND monitored_date = ?
       ORDER BY id`,
      [req.params.programId, date],
    );
    res.json({ date, logs });
  } catch (error) {
    console.error('[Programs API] monitoring status error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.patch('/:programId/monitoring', async (req, res) => {
  const beneficiaryId = String(req.body?.beneficiaryId || '').trim();
  const beneficiaryType = String(req.body?.beneficiaryType || '').trim().toLowerCase();
  const date = validDate(req.body?.date) || new Date().toISOString().slice(0, 10);
  const monitored = Boolean(req.body?.monitored);
  if (!beneficiaryId || !['mother', 'child'].includes(beneficiaryType)) {
    return res.status(400).json({ error: 'Beneficiary ID and type are required' });
  }
  try {
    const [programRows] = await pool.query('SELECT beneficiary_type FROM programs WHERE id = ?', [req.params.programId]);
    if (!programRows.length) return res.status(404).json({ error: 'Program not found' });
    const configuredType = String(programRows[0].beneficiary_type || '').trim().toLowerCase();
    if (!['mother and child', 'mother & child'].includes(configuredType) && configuredType !== beneficiaryType) {
      return res.status(400).json({ error: `This program accepts ${programRows[0].beneficiary_type} beneficiaries only` });
    }

    const beneficiaryRows = beneficiaryType === 'mother'
      ? await pool.query(
        'SELECT id, mother_code AS code, first_name, last_name, community_id, group_id FROM mothers WHERE id = ? OR mother_code = ? LIMIT 1',
        [Number(beneficiaryId) || null, beneficiaryId],
      ).then(([rows]) => rows)
      : await pool.query(
        `SELECT c.id, c.child_code AS code, c.first_name, c.last_name,
            COALESCE(c.community_id, m.community_id) AS community_id,
            COALESCE(c.group_id, m.group_id) AS group_id
         FROM children c LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE c.id = ? OR c.child_code = ? LIMIT 1`,
        [Number(beneficiaryId) || null, beneficiaryId],
      ).then(([rows]) => rows);

    const [existingReceiptRows] = await pool.query(
      'SELECT id FROM monitoring_logs WHERE beneficiary_id = ? AND beneficiary_type = ? AND program_id = ? AND monitored_date = ? LIMIT 1',
      [beneficiaryId, beneficiaryType, req.params.programId, date],
    );
    const [result] = await pool.query(
      `INSERT INTO monitoring_logs
        (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_by = VALUES(monitored_by), updated_at = CURRENT_TIMESTAMP`,
      [beneficiaryId, beneficiaryType, req.params.programId, monitored, date, req.user?.id || null],
    );
    const beneficiary = beneficiaryRows[0];
    const program = await getProgram(req.params.programId);
    const receiptAction = existingReceiptRows.length ? 'updated' : 'created';
    await notifyProgramChange(req, req.params.programId, {
      eventType: `program.receipt_${receiptAction}`,
      category: 'Monitoring',
      title: `Program receipt ${receiptAction}`,
      message: `Receipt for ${[beneficiary?.first_name, beneficiary?.last_name].filter(Boolean).join(' ') || beneficiaryId} in ${program.name} was ${receiptAction} as ${monitored ? 'received' : 'not received'} on ${date}.`,
    }, {
      schoolId: req.schoolId || beneficiary?.community_id || null,
      groupId: req.groupId || beneficiary?.group_id || null,
    });
    res.json({ success: true, date, monitored, id: result.insertId || null });
  } catch (error) {
    console.error('[Programs API] monitoring update error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring/cluster-report/:clusterType/:clusterName', async (req, res) => {
  const clusterType = String(req.params.clusterType || '').toLowerCase();
  const clusterName = decodeURIComponent(String(req.params.clusterName || '')).trim();
  const clusterFilters = {
    school: 'LOWER(TRIM(COALESCE(co.name, ""))) = LOWER(TRIM(?))',
    group: 'LOWER(TRIM(COALESCE(g.name, ""))) = LOWER(TRIM(?))',
    batch: 'LOWER(TRIM(COALESCE(b.name, ""))) = LOWER(TRIM(?))',
  };
  const clusterFilter = clusterFilters[clusterType];
  if (!clusterFilter || !clusterName) return res.status(400).json({ error: 'Invalid monitoring cluster' });
  try {
    const [logs] = await pool.query(
      `SELECT DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS date, ml.monitored, ml.notes, p.name AS program_name,
        ml.beneficiary_type, ml.beneficiary_id,
        CASE
          WHEN LOWER(TRIM(ml.beneficiary_type)) = 'mother' AND m.id IS NOT NULL THEN CONCAT('mother:', m.id)
          WHEN LOWER(TRIM(ml.beneficiary_type)) = 'child' AND c.id IS NOT NULL THEN CONCAT('child:', c.id)
          ELSE CONCAT(LOWER(TRIM(ml.beneficiary_type)), ':', ml.beneficiary_id)
        END AS beneficiary_key,
        COALESCE(NULLIF(TRIM(co.name), ''), NULLIF(TRIM(parent_co.name), ''), 'Unknown school') AS school_name,
        COALESCE(NULLIF(TRIM(g.name), ''), NULLIF(TRIM(parent_g.name), ''), 'Unknown group') AS group_name,
        COALESCE(NULLIF(TRIM(b.name), ''), NULLIF(TRIM(parent_b.name), ''), 'Unknown batch') AS batch_name,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', m.first_name, m.last_name)), ''), NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), ml.beneficiary_id) AS beneficiary_name,
        NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS monitored_by_name
       FROM monitoring_logs ml
       INNER JOIN programs p ON p.id = ml.program_id
       LEFT JOIN mothers m ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'mother' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(CAST(m.mother_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
       LEFT JOIN children c ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'child' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(CAST(c.child_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
               LEFT JOIN mothers parent_m ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'child' AND parent_m.id = c.mother_id
               LEFT JOIN communities co ON co.id = COALESCE(m.community_id, c.community_id)
               LEFT JOIN \`groups\` g ON g.id = COALESCE(m.group_id, c.group_id)
               LEFT JOIN batches b ON b.id = COALESCE(m.batch_id, c.batch_id)
               LEFT JOIN communities parent_co ON parent_co.id = parent_m.community_id
               LEFT JOIN \`groups\` parent_g ON parent_g.id = parent_m.group_id
               LEFT JOIN batches parent_b ON parent_b.id = parent_m.batch_id
       LEFT JOIN users u ON u.id = ml.monitored_by
       WHERE ml.program_id = ?
         AND (
           LOWER(TRIM(p.beneficiary_type)) IN ('mother and child', 'mother & child')
           OR LOWER(TRIM(ml.beneficiary_type)) = LOWER(TRIM(p.beneficiary_type))
         )
         AND ${clusterFilter}
       ORDER BY ml.monitored_date DESC, beneficiary_name`,
      [req.params.programId, clusterName],
    );
    res.json({ report: logs });
  } catch (error) {
    console.error('[Programs API] cluster monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring/report/:beneficiaryType/:beneficiaryId', async (req, res) => {
  const beneficiaryType = String(req.params.beneficiaryType || '').toLowerCase();
  if (!['mother', 'child'].includes(beneficiaryType)) return res.status(400).json({ error: 'Invalid beneficiary type' });
  try {
    const [logs] = await pool.query(
            `SELECT DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS date, ml.monitored, ml.notes, p.name AS program_name,
              COALESCE(NULLIF(TRIM(co.name), ''), 'Unknown school') AS school_name,
              COALESCE(NULLIF(TRIM(g.name), ''), 'Unknown group') AS group_name,
              COALESCE(NULLIF(TRIM(b.name), ''), 'Unknown batch') AS batch_name,
              NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS monitored_by_name
       FROM monitoring_logs ml
       INNER JOIN programs p ON p.id = ml.program_id
       LEFT JOIN mothers m ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'mother' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(CAST(m.mother_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
       LEFT JOIN children c ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'child' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(CAST(c.child_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
       LEFT JOIN communities co ON co.id = COALESCE(m.community_id, c.community_id)
       LEFT JOIN \`groups\` g ON g.id = COALESCE(m.group_id, c.group_id)
       LEFT JOIN batches b ON b.id = COALESCE(m.batch_id, c.batch_id)
       LEFT JOIN users u ON u.id = ml.monitored_by
       WHERE ml.program_id = ? AND ml.beneficiary_id = ? AND ml.beneficiary_type = ?
       ORDER BY ml.monitored_date DESC`,
      [req.params.programId, req.params.beneficiaryId, beneficiaryType],
    );
    res.json({ report: logs });
  } catch (error) {
    console.error('[Programs API] monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;