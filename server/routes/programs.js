const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createSuperadminNotification } = require('../services/notifications');

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

async function getProgram(id, req) {
  const [rows] = await pool.query('SELECT * FROM programs WHERE id = ?', [id]);
  if (!rows.length) return null;
  const [clusters] = req?.schoolId
    ? await pool.query(
      `SELECT pc.id, pc.scope_type AS type, pc.scope_name AS name, pc.beneficiaries, pc.received
       FROM program_clusters pc
       INNER JOIN programs p ON p.id = pc.program_id
       WHERE pc.program_id = ? AND ${getProgramSchoolScopeSql('p')}
       ORDER BY pc.id`,
      [id, req.schoolId, req.schoolId, req.schoolId],
    )
    : await pool.query(
      'SELECT id, scope_type AS type, scope_name AS name, beneficiaries, received FROM program_clusters WHERE program_id = ? ORDER BY id',
      [id],
    );
  const target = clusters.reduce((total, cluster) => total + Number(cluster.beneficiaries || 0), 0);
  let monitoringReceived = 0;
  if (!req?.schoolId) {
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
    monitoringReceived = Number(monitoringRows[0]?.received || 0);
  }
  const clusterReceived = clusters.reduce((total, cluster) => total + Number(cluster.received || 0), 0);
  const received = req?.schoolId ? clusterReceived : Math.max(clusterReceived, monitoringReceived);
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

function getProgramSchoolScopeSql(programAlias = 'p') {
  return `EXISTS (
    SELECT 1 FROM program_clusters scoped_cluster
    WHERE scoped_cluster.program_id = ${programAlias}.id
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
  )`;
}

function getBeneficiarySchoolScopeSql() {
  return `(
    EXISTS (
      SELECT 1 FROM mothers scoped_mother
      WHERE LOWER(TRIM(CAST(ml.beneficiary_type AS CHAR))) = 'mother'
        AND (
          CAST(ml.beneficiary_id AS CHAR) = CAST(scoped_mother.id AS CHAR)
          OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(scoped_mother.mother_code AS CHAR)))
        )
        AND scoped_mother.community_id = ?
    )
    OR EXISTS (
      SELECT 1 FROM children scoped_child
      LEFT JOIN mothers scoped_parent ON scoped_parent.id = scoped_child.mother_id
      WHERE LOWER(TRIM(CAST(ml.beneficiary_type AS CHAR))) = 'child'
        AND (
          CAST(ml.beneficiary_id AS CHAR) = CAST(scoped_child.id AS CHAR)
          OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(scoped_child.child_code AS CHAR)))
        )
        AND COALESCE(scoped_child.community_id, scoped_parent.community_id) = ?
    )
  )`;
}

async function clusterBelongsToSchool(programId, clusterType, clusterName, schoolId) {
  const typeNames = { school: 'School', group: 'Group', batch: 'Batch' };
  const typeName = typeNames[clusterType];
  if (!typeName) return false;
  const [rows] = await pool.query(
    `SELECT 1 FROM program_clusters pc
     WHERE pc.program_id = ?
       AND LOWER(TRIM(pc.scope_type)) = LOWER(?)
       AND LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(?))
       AND (
         (pc.scope_type = 'School' AND EXISTS (
           SELECT 1 FROM communities scoped_school
           WHERE scoped_school.id = ? AND scoped_school.name = pc.scope_name
         ))
         OR (pc.scope_type = 'Group' AND EXISTS (
           SELECT 1 FROM groups scoped_group
           WHERE scoped_group.community_id = ? AND scoped_group.name = pc.scope_name
         ))
         OR (pc.scope_type = 'Batch' AND EXISTS (
           SELECT 1 FROM batches scoped_batch
           WHERE scoped_batch.community_id = ? AND scoped_batch.name = pc.scope_name
         ))
       )
     LIMIT 1`,
    [programId, typeName, clusterName, schoolId, schoolId, schoolId],
  );
  return rows.length > 0;
}

router.use('/:id', async (req, res, next) => {
  if (!req.schoolId) return next();
  try {
    const [rows] = await pool.query(
      `SELECT p.id FROM programs p WHERE p.id = ? AND ${getProgramSchoolScopeSql('p')} LIMIT 1`,
      [req.params.id, req.schoolId, req.schoolId, req.schoolId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Program not found' });
    return next();
  } catch (error) {
    console.error('[Programs API] scope check error:', error.message);
    return res.status(500).json({ error: 'db error' });
  }
});

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

router.get('/', async (req, res) => {
  try {
    const scopeClause = req.schoolId ? `WHERE ${getProgramSchoolScopeSql('p')}` : '';
    const scopeValues = req.schoolId ? [req.schoolId, req.schoolId, req.schoolId] : [];
    const [rows] = await pool.query(`SELECT p.* FROM programs p ${scopeClause} ORDER BY p.id DESC`, scopeValues);
    const programs = await Promise.all(rows.map((row) => getProgram(row.id, req)));
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
    const [duplicatePrograms] = await pool.query(
      `SELECT id FROM programs
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(type)) = LOWER(TRIM(?))
       LIMIT 1`,
      [program.name, program.type],
    );
    if (duplicatePrograms.length) {
      return res.status(409).json({ error: 'A program with this name and type already exists.' });
    }

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
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A program with this name and type already exists.' });
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id', async (req, res) => {
  const program = cleanProgram(req.body);
  if (!program) return res.status(400).json({ error: 'Program name and provider are required' });
  try {
    const [duplicatePrograms] = await pool.query(
      `SELECT id FROM programs
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(type)) = LOWER(TRIM(?))
         AND id <> ?
       LIMIT 1`,
      [program.name, program.type, req.params.id],
    );
    if (duplicatePrograms.length) {
      return res.status(409).json({ error: 'A program with this name and type already exists.' });
    }
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
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A program with this name and type already exists.' });
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
    const schoolScopeClause = req.schoolId ? `AND ${getBeneficiarySchoolScopeSql()}` : '';
    const [logs] = await pool.query(
      `SELECT ml.beneficiary_id, ml.beneficiary_type, ml.monitored,
          DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS monitored_date, ml.notes
       FROM monitoring_logs ml
       WHERE ml.program_id = ? AND ml.monitored_date = ?
         ${schoolScopeClause}
       ORDER BY ml.id`,
      req.schoolId
        ? [req.params.programId, date, req.schoolId, req.schoolId]
        : [req.params.programId, date],
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
    if (req.schoolId && !(await clusterBelongsToSchool(
      req.params.programId,
      clusterType,
      clusterName,
      req.schoolId,
    ))) {
      return res.status(404).json({ error: 'Monitoring cluster not found' });
    }
    const schoolScopeClause = req.schoolId ? `AND ${getBeneficiarySchoolScopeSql()}` : '';
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
         ${schoolScopeClause}
       ORDER BY ml.monitored_date DESC, beneficiary_name`,
      req.schoolId
        ? [req.params.programId, clusterName, req.schoolId, req.schoolId]
        : [req.params.programId, clusterName],
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
    const schoolScopeClause = req.schoolId ? `AND ${getBeneficiarySchoolScopeSql()}` : '';
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
         ${schoolScopeClause}
       ORDER BY ml.monitored_date DESC`,
      req.schoolId
        ? [req.params.programId, req.params.beneficiaryId, beneficiaryType, req.schoolId, req.schoolId]
        : [req.params.programId, req.params.beneficiaryId, beneficiaryType],
    );
    res.json({ report: logs });
  } catch (error) {
    console.error('[Programs API] monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;