const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createSuperadminNotification } = require('../services/notifications');
const { canViewAuditSignatures, normalizeRole } = require('../middleware/authorize');
const {
  batchEvidenceUpload,
  deleteFileFromStorage,
  uploadFileToStorage,
} = require('../middleware/documentUpload');
const { programScopesBelongToSchool } = require('../utils/programScope');
const { getProgramVisibilityFilter } = require('../utils/programAccess');
const { isValidIsoDate } = require('../utils/dateValidation');
const { parsePositiveIntegerId } = require('../utils/userInputValidation');

for (const parameterName of ['id', 'programId', 'clusterId']) {
  router.param(parameterName, (req, res, next, value) => {
    const parsedId = parsePositiveIntegerId(value);
    if (parsedId === null) {
      return res.status(400).json({ error: `${parameterName} must be a positive integer` });
    }
    req.params[parameterName] = String(parsedId);
    return next();
  });
}

router.use((req, res, next) => {
  if (normalizeRole(req.user?.role) === 'super_admin') {
    return res.status(403).json({ error: 'Superadmins do not have access to the Program module' });
  }
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
  const date = String(value || '');
  return isValidIsoDate(date) ? date : null;
}

function parseProgramReceiptEvidenceUpload(req, res, next) {
  batchEvidenceUpload.array('images', 10)(req, res, async (error) => {
    if (error) {
      try {
        await discardProgramReceiptUploads(req.files);
      } catch (cleanupError) {
        console.error('[Programs API] unable to clean up rejected check-in photos:', cleanupError.message);
      }
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each photo must be 5 MB or smaller'
        : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Attach no more than 10 photos'
          : error.message || 'Unable to upload images';
      return res.status(400).json({ error: message });
    }
    return next();
  });
}

async function discardProgramReceiptUploads(files = []) {
  await Promise.all(files.map(async (file) => {
    const filePath = file.filename ? `/uploads/${file.filename}` : file.path;
    if (filePath) await deleteFileFromStorage(filePath);
  }));
}

async function attachReceiptEvidence(logs) {
  if (!logs.length) return logs;
  const receiptIds = logs.map((row) => row.receipt_id).filter(Boolean);
  if (!receiptIds.length) return logs;
  const placeholders = receiptIds.map(() => '?').join(', ');
  const [images] = await pool.query(
    `SELECT link.monitoring_log_id AS receipt_id, image.id, image.file_name, image.file_path,
        image.documentation_set_id AS set_id
     FROM program_receipt_documentation_logs link
     INNER JOIN program_receipt_documentations image ON image.documentation_set_id = link.documentation_set_id
     WHERE link.monitoring_log_id IN (${placeholders})
     ORDER BY image.id`,
    receiptIds,
  );
  const imagesByReceipt = new Map();
  images.forEach((image) => {
    const receiptId = String(image.receipt_id);
    const receiptImages = imagesByReceipt.get(receiptId) || [];
    receiptImages.push({
      id: image.id,
      set_id: image.set_id,
      file_name: image.file_name,
      file_path: image.file_path,
    });
    imagesByReceipt.set(receiptId, receiptImages);
  });
  return logs.map((row) => ({
    ...row,
    evidence_images: imagesByReceipt.get(String(row.receipt_id)) || [],
  }));
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

async function authorizeCoordinatorProgramScope(req, res, programId, { allowUnscoped = false } = {}) {
  if (!req.isCommunityOrganizer) return true;

  const [rows] = await pool.query(
    `SELECT pc.scope_type, pc.scope_name,
       CASE
         WHEN pc.scope_type = 'School' THEN EXISTS (
           SELECT 1 FROM communities scoped_school
           WHERE scoped_school.id = ? AND scoped_school.name = pc.scope_name
         )
         WHEN pc.scope_type = 'Group' THEN EXISTS (
           SELECT 1 FROM \`groups\` scoped_group
           WHERE scoped_group.community_id = ? AND scoped_group.name = pc.scope_name
         )
         WHEN pc.scope_type = 'Batch' THEN EXISTS (
           SELECT 1 FROM batches scoped_batch
           WHERE scoped_batch.community_id = ? AND scoped_batch.name = pc.scope_name
         )
         ELSE 0
       END AS owned_by_school
     FROM programs p
     LEFT JOIN program_clusters pc ON pc.program_id = p.id
     WHERE p.id = ?`,
    [req.schoolId, req.schoolId, req.schoolId, programId],
  );

  if (!rows.length) {
    res.status(404).json({ error: 'Program not found' });
    return false;
  }
  if (!programScopesBelongToSchool(rows.filter((row) => row.scope_type), { allowUnscoped })) {
    res.status(403).json({ error: 'Community Organizers may only manage programs scoped to their assigned school' });
    return false;
  }
  return true;
}

async function coordinatorScopeExistsInSchool(type, name, schoolId) {
  const scopeQueries = {
    School: ['SELECT id FROM communities WHERE id = ? AND name = ? LIMIT 1', [schoolId, name]],
    Group: ['SELECT id FROM groups WHERE community_id = ? AND name = ? LIMIT 1', [schoolId, name]],
    Batch: ['SELECT id FROM batches WHERE community_id = ? AND name = ? LIMIT 1', [schoolId, name]],
  };
  const query = scopeQueries[type];
  if (!query) return false;
  const [rows] = await pool.query(...query);
  return rows.length > 0;
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
  if (req.isHealthWorker && !req.groupId) {
    return res.status(403).json({ error: 'Health workers must be assigned to a group to view programs' });
  }
  try {
    const visibility = getProgramVisibilityFilter(req);
    const [rows] = await pool.query(`SELECT p.* FROM programs p ${visibility.sql} ORDER BY p.id DESC`, visibility.values);
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.id))) return;
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.id))) return;
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.id))) return;
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.id))) return;
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.id, { allowUnscoped: true }))) return;
    const addedScopes = [];
    for (const scope of scopes) {
      const type = String(scope.type || '').trim();
      const name = String(scope.name || '').trim();
      if (!type || !name) continue;
      if (req.isCommunityOrganizer) {
        if (!(await coordinatorScopeExistsInSchool(type, name, req.schoolId))) {
          return res.status(403).json({ error: 'Community Organizers may only add scopes from their assigned school' });
        }
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.programId))) return;
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
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.programId))) return;
    if (req.isCommunityOrganizer && !(await coordinatorScopeExistsInSchool(type, name, req.schoolId))) {
      return res.status(403).json({ error: 'Community Organizers may only complete scopes from their assigned school' });
    }
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
  const date = req.query.date === undefined ? new Date().toISOString().slice(0, 10) : validDate(req.query.date);
  if (!date) return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format' });
  try {
    const groupPredicate = req.isHealthWorker
      ? `AND (
           (LOWER(ml.beneficiary_type) = 'mother' AND EXISTS (
             SELECT 1 FROM mothers scoped_mother
             WHERE (CAST(ml.beneficiary_id AS CHAR) = CAST(scoped_mother.id AS CHAR)
               OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(scoped_mother.mother_code AS CHAR))))
               AND scoped_mother.group_id = ?
           ))
           OR (LOWER(ml.beneficiary_type) = 'child' AND EXISTS (
             SELECT 1 FROM children scoped_child
             LEFT JOIN mothers scoped_parent ON scoped_parent.id = scoped_child.mother_id
             WHERE (CAST(ml.beneficiary_id AS CHAR) = CAST(scoped_child.id AS CHAR)
               OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(scoped_child.child_code AS CHAR))))
               AND COALESCE(scoped_child.group_id, scoped_parent.group_id) = ?
           ))
         )`
      : '';
    const [logs] = await pool.query(
      `SELECT ml.beneficiary_id, ml.beneficiary_type, ml.monitored, DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS monitored_date, ml.notes
       FROM monitoring_logs ml
       WHERE ml.program_id = ? AND ml.monitored_date = ?
       ${groupPredicate}
       ORDER BY ml.id`,
      req.isHealthWorker ? [req.params.programId, date, req.groupId, req.groupId] : [req.params.programId, date],
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
  const date = req.body?.date === undefined ? new Date().toISOString().slice(0, 10) : validDate(req.body.date);
  const monitored = req.body?.monitored;
  if (!beneficiaryId || !['mother', 'child'].includes(beneficiaryType)) {
    return res.status(400).json({ error: 'Beneficiary ID and type are required' });
  }
  if (!date) return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format' });
  if (typeof monitored !== 'boolean') {
    return res.status(400).json({ error: 'Monitored must be true or false' });
  }
  try {
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.programId))) return;
    const [programRows] = await pool.query('SELECT beneficiary_type FROM programs WHERE id = ?', [req.params.programId]);
    if (!programRows.length) return res.status(404).json({ error: 'Program not found' });
    const configuredType = String(programRows[0].beneficiary_type || '').trim().toLowerCase();
    if (!['mother and child', 'mother & child'].includes(configuredType) && configuredType !== beneficiaryType) {
      return res.status(400).json({ error: `This program accepts ${programRows[0].beneficiary_type} beneficiaries only` });
    }

    const beneficiaryRows = beneficiaryType === 'mother'
      ? await pool.query(
        'SELECT id, mother_code AS code, first_name, last_name, community_id, group_id, batch_id FROM mothers WHERE id = ? OR mother_code = ? LIMIT 1',
        [Number(beneficiaryId) || null, beneficiaryId],
      ).then(([rows]) => rows)
      : await pool.query(
        `SELECT c.id, c.child_code AS code, c.first_name, c.last_name,
            COALESCE(c.community_id, m.community_id) AS community_id,
            COALESCE(c.group_id, m.group_id) AS group_id,
            COALESCE(c.batch_id, m.batch_id) AS batch_id
         FROM children c LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE c.id = ? OR c.child_code = ? LIMIT 1`,
        [Number(beneficiaryId) || null, beneficiaryId],
      ).then(([rows]) => rows);

    if (req.isCommunityOrganizer
      && (!beneficiaryRows.length || Number(beneficiaryRows[0].community_id) !== Number(req.schoolId))) {
      return res.status(403).json({ error: 'Community Organizers may only record receipts for beneficiaries in their assigned school' });
    }

    if (req.isHealthWorker) {
      if (!req.groupId || !beneficiaryRows.length || Number(beneficiaryRows[0].group_id) !== Number(req.groupId)) {
        return res.status(403).json({ error: 'Health workers may only record receipts for beneficiaries in their assigned group' });
      }

      const [matchingPrograms] = await pool.query(
        `SELECT p.id
         FROM programs p
         INNER JOIN \`groups\` assigned_group ON assigned_group.id = ?
         WHERE p.id = ?
           AND EXISTS (
             SELECT 1 FROM program_clusters scoped_cluster
             WHERE scoped_cluster.program_id = p.id
               AND (
                 (scoped_cluster.scope_type = 'Group' AND scoped_cluster.scope_name = assigned_group.name)
                 OR (scoped_cluster.scope_type = 'School' AND EXISTS (
                   SELECT 1 FROM communities assigned_school
                   WHERE assigned_school.id = assigned_group.community_id
                     AND assigned_school.name = scoped_cluster.scope_name
                 ))
                 OR (scoped_cluster.scope_type = 'Batch' AND EXISTS (
                   SELECT 1 FROM batches assigned_batch
                   INNER JOIN group_batch assigned_batch_link ON assigned_batch_link.batch_id = assigned_batch.id
                   WHERE assigned_batch.id = ?
                     AND assigned_batch_link.group_id = assigned_group.id
                     AND assigned_batch.name = scoped_cluster.scope_name
                 ))
               )
           )
         LIMIT 1`,
        [req.groupId, req.params.programId, beneficiaryRows[0].batch_id],
      );
      if (!matchingPrograms.length) {
        return res.status(403).json({ error: 'Health workers may only record receipts for programs assigned to their group' });
      }
    }

    const [existingReceiptRows] = await pool.query(
      'SELECT id FROM monitoring_logs WHERE beneficiary_id = ? AND beneficiary_type = ? AND program_id = ? AND monitored_date = ? LIMIT 1',
      [beneficiaryId, beneficiaryType, req.params.programId, date],
    );
    const [result] = await pool.query(
      `INSERT INTO monitoring_logs
        (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by,
         created_by_user_id, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_by = VALUES(monitored_by),
         updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP`,
      [beneficiaryId, beneficiaryType, req.params.programId, monitored, date, req.user?.id || null,
        req.user?.id || null, req.user?.id || null],
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

router.post('/:programId/monitoring/evidence', parseProgramReceiptEvidenceUpload, async (req, res) => {
  let storedFiles = [];
  try {
    if (!req.isCommunityOrganizer) {
      await discardProgramReceiptUploads(req.files);
      return res.status(403).json({ error: 'Only Community Organizers can add program check-in photos' });
    }
    const date = validDate(req.body?.date);
    if (!date) {
      await discardProgramReceiptUploads(req.files);
      return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format' });
    }
    let checkins;
    try {
      checkins = JSON.parse(req.body?.checkins || '[]');
    } catch {
      await discardProgramReceiptUploads(req.files);
      return res.status(400).json({ error: 'Check-in beneficiaries must be valid JSON' });
    }
    if (!Array.isArray(checkins) || checkins.length === 0 || checkins.length > 200) {
      await discardProgramReceiptUploads(req.files);
      return res.status(400).json({ error: 'Select between 1 and 200 beneficiaries for this check-in evidence' });
    }
    const targets = checkins.map((checkin) => ({
      id: String(checkin?.id || '').trim(),
      type: String(checkin?.type || '').trim().toLowerCase(),
    }));
    if (targets.some((target) => !target.id || !['mother', 'child'].includes(target.type))) {
      await discardProgramReceiptUploads(req.files);
      return res.status(400).json({ error: 'Each check-in beneficiary needs a valid ID and type' });
    }
    const targetKeys = targets.map((target) => `${target.type}:${target.id.toLowerCase()}`);
    if (new Set(targetKeys).size !== targetKeys.length) {
      await discardProgramReceiptUploads(req.files);
      return res.status(400).json({ error: 'Each beneficiary can only be included once' });
    }

    const files = req.files || [];
    if (files.length < 3) {
      await discardProgramReceiptUploads(files);
      return res.status(400).json({ error: 'Attach at least 3 photos for program check-in documentation' });
    }
    if (files.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
      await discardProgramReceiptUploads(files);
      return res.status(400).json({ error: 'The combined photo size must not exceed 25 MB' });
    }
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.programId))) {
      await discardProgramReceiptUploads(files);
      return;
    }

    const predicates = targets.map(() => '(ml.beneficiary_id = ? AND LOWER(TRIM(ml.beneficiary_type)) = ?)').join(' OR ');
    const targetParams = targets.flatMap((target) => [target.id, target.type]);
    const [receiptRows] = await pool.query(
      `SELECT ml.id, ml.beneficiary_id, LOWER(TRIM(ml.beneficiary_type)) AS beneficiary_type
       FROM monitoring_logs ml
       LEFT JOIN mothers m
         ON LOWER(TRIM(ml.beneficiary_type)) = 'mother'
        AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR)
          OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(m.mother_code AS CHAR))))
       LEFT JOIN children c
         ON LOWER(TRIM(ml.beneficiary_type)) = 'child'
        AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR)
          OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(c.child_code AS CHAR))))
       LEFT JOIN mothers parent_m ON parent_m.id = c.mother_id
       WHERE ml.program_id = ? AND ml.monitored_date = ?
         AND (${predicates})
         AND COALESCE(m.community_id, c.community_id, parent_m.community_id) = ?`,
      [req.params.programId, date, ...targetParams, req.schoolId],
    );
    if (receiptRows.length !== targets.length) {
      await discardProgramReceiptUploads(files);
      return res.status(400).json({ error: 'Check-ins must be saved for beneficiaries in your assigned school before adding photos' });
    }

    for (const file of files) {
      storedFiles.push(await uploadFileToStorage(file, 'program-receipt-evidence'));
    }
    const connection = await pool.getConnection();
    let documentationSetId;
    try {
      await connection.beginTransaction();
      const [setResult] = await connection.query(
        'INSERT INTO program_receipt_documentation_sets (program_id, monitored_date, uploaded_by_user_id) VALUES (?, ?, ?)',
        [req.params.programId, date, req.user?.id || null],
      );
      documentationSetId = setResult.insertId;
      const imageIds = [];
      for (const file of storedFiles) {
        const [imageResult] = await connection.query(
          'INSERT INTO program_receipt_documentations (documentation_set_id, file_name, file_path) VALUES (?, ?, ?)',
          [documentationSetId, file.name, file.path],
        );
        imageIds.push(imageResult.insertId);
      }
      for (const receipt of receiptRows) {
        await connection.query(
          'INSERT INTO program_receipt_documentation_logs (documentation_set_id, monitoring_log_id) VALUES (?, ?)',
          [documentationSetId, receipt.id],
        );
      }
      await connection.commit();
      res.status(201).json({
        documentation: {
          id: documentationSetId,
          date,
          receipt_ids: receiptRows.map((receipt) => receipt.id),
          images: storedFiles.map((file, index) => ({
            id: imageIds[index],
            set_id: documentationSetId,
            file_name: file.name,
            file_path: file.path,
          })),
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    await Promise.all(storedFiles.map(async (file) => {
      try {
        await deleteFileFromStorage(file.path);
      } catch (cleanupError) {
        console.error('[Programs API] unable to clean up program check-in evidence:', cleanupError.message);
      }
    }));
    console.error('[Programs API] add program check-in evidence error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Unable to save program check-in evidence' });
  }
});

router.delete('/:programId/monitoring/evidence/:setId/images/:imageId', async (req, res) => {
  try {
    if (!req.isCommunityOrganizer) {
      return res.status(403).json({ error: 'Only Community Organizers can remove program check-in photos' });
    }
    if (!(await authorizeCoordinatorProgramScope(req, res, req.params.programId))) return;
    const connection = await pool.getConnection();
    let filePath;
    let documentationDeleted = false;
    try {
      await connection.beginTransaction();
      const [sets] = await connection.query(
        'SELECT id FROM program_receipt_documentation_sets WHERE id = ? AND program_id = ? LIMIT 1 FOR UPDATE',
        [req.params.setId, req.params.programId],
      );
      if (!sets.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Program check-in photo not found' });
      }
      const [images] = await connection.query(
        'SELECT id, file_path FROM program_receipt_documentations WHERE id = ? AND documentation_set_id = ? LIMIT 1 FOR UPDATE',
        [req.params.imageId, req.params.setId],
      );
      if (!images.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Program check-in photo not found' });
      }
      filePath = images[0].file_path;
      await connection.query(
        'DELETE FROM program_receipt_documentations WHERE id = ? AND documentation_set_id = ?',
        [req.params.imageId, req.params.setId],
      );
      const [remaining] = await connection.query(
        'SELECT COUNT(*) AS image_count FROM program_receipt_documentations WHERE documentation_set_id = ?',
        [req.params.setId],
      );
      if (Number(remaining[0]?.image_count) === 0) {
        await connection.query(
          'DELETE FROM program_receipt_documentation_sets WHERE id = ? AND program_id = ?',
          [req.params.setId, req.params.programId],
        );
        documentationDeleted = true;
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    await deleteFileFromStorage(filePath);
    res.json({ success: true, deleted: true, documentationDeleted });
  } catch (error) {
    console.error('[Programs API] delete program check-in evidence error:', error.message);
    res.status(500).json({ error: 'Unable to remove program check-in photo' });
  }
});

router.get('/:programId/monitoring/cluster-report/:clusterType/:clusterName', async (req, res) => {
  const clusterType = String(req.params.clusterType || '').toLowerCase();
  const clusterName = decodeURIComponent(String(req.params.clusterName || '')).trim();
  const clusterFilters = {
    school: 'LOWER(TRIM(COALESCE(co.name, parent_co.name, ""))) = LOWER(TRIM(?))',
    group: 'LOWER(TRIM(COALESCE(g.name, ""))) = LOWER(TRIM(?))',
    batch: 'LOWER(TRIM(COALESCE(b.name, ""))) = LOWER(TRIM(?))',
  };
  const clusterFilter = clusterFilters[clusterType];
  if (!clusterFilter || !clusterName) return res.status(400).json({ error: 'Invalid monitoring cluster' });
  try {
    const includeAuditDetails = canViewAuditSignatures(req.user?.role);
    const auditSelect = includeAuditDetails
      ? `,
        NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.middle_initial, creator.last_name)), '') AS created_by_name,
        creator.role AS created_by_role,
        ml.created_at AS recorded_at,
        NULLIF(TRIM(CONCAT_WS(' ', updater.first_name, updater.middle_initial, updater.last_name)), '') AS updated_by_name,
        updater.role AS updated_by_role,
        ml.updated_at AS updated_at`
      : '';
    const auditJoins = includeAuditDetails
      ? `LEFT JOIN users creator ON creator.id = COALESCE(ml.created_by_user_id, ml.monitored_by)
         LEFT JOIN users updater ON updater.id = COALESCE(ml.updated_by_user_id, ml.monitored_by)`
      : '';
    const [logs] = await pool.query(
      `SELECT ml.id AS receipt_id, DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS date, ml.monitored, ml.notes, p.name AS program_name,
        ml.beneficiary_type, ml.beneficiary_id,
        CASE
          WHEN LOWER(TRIM(ml.beneficiary_type)) = 'mother' AND m.id IS NOT NULL THEN CONCAT('mother:', m.id)
          WHEN LOWER(TRIM(ml.beneficiary_type)) = 'child' AND c.id IS NOT NULL THEN CONCAT('child:', c.id)
          ELSE CONCAT(LOWER(TRIM(ml.beneficiary_type)), ':', ml.beneficiary_id)
        END AS beneficiary_key,
        COALESCE(NULLIF(TRIM(co.name), ''), NULLIF(TRIM(parent_co.name), ''), 'Unknown school') AS school_name,
        COALESCE(NULLIF(TRIM(g.name), ''), NULLIF(TRIM(parent_g.name), ''), 'Unknown group') AS group_name,
        COALESCE(NULLIF(TRIM(b.name), ''), NULLIF(TRIM(parent_b.name), ''), 'Unknown batch') AS batch_name,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', m.first_name, m.last_name)), ''), NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), ml.beneficiary_id) AS beneficiary_name${auditSelect}
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
       ${auditJoins}
       WHERE ml.program_id = ?
         AND (
           LOWER(TRIM(p.beneficiary_type)) IN ('mother and child', 'mother & child')
           OR LOWER(TRIM(ml.beneficiary_type)) = LOWER(TRIM(p.beneficiary_type))
         )
         AND ${clusterFilter}
         ${req.isHealthWorker ? 'AND COALESCE(g.id, parent_g.id) = ?' : ''}
       ORDER BY ml.monitored_date DESC, beneficiary_name`,
      req.isHealthWorker ? [req.params.programId, clusterName, req.groupId] : [req.params.programId, clusterName],
    );
    res.json({ report: await attachReceiptEvidence(logs) });
  } catch (error) {
    console.error('[Programs API] cluster monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:programId/monitoring/report/:beneficiaryType/:beneficiaryId', async (req, res) => {
  const beneficiaryType = String(req.params.beneficiaryType || '').toLowerCase();
  if (!['mother', 'child'].includes(beneficiaryType)) return res.status(400).json({ error: 'Invalid beneficiary type' });
  try {
    const includeAuditDetails = canViewAuditSignatures(req.user?.role);
    const auditSelect = includeAuditDetails
      ? `,
        NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.middle_initial, creator.last_name)), '') AS created_by_name,
        creator.role AS created_by_role,
        ml.created_at AS recorded_at,
        NULLIF(TRIM(CONCAT_WS(' ', updater.first_name, updater.middle_initial, updater.last_name)), '') AS updated_by_name,
        updater.role AS updated_by_role,
        ml.updated_at AS updated_at`
      : '';
    const auditJoins = includeAuditDetails
      ? `LEFT JOIN users creator ON creator.id = COALESCE(ml.created_by_user_id, ml.monitored_by)
         LEFT JOIN users updater ON updater.id = COALESCE(ml.updated_by_user_id, ml.monitored_by)`
      : '';
    const [logs] = await pool.query(
            `SELECT ml.id AS receipt_id, DATE_FORMAT(ml.monitored_date, '%Y-%m-%d') AS date, ml.monitored, ml.notes, p.name AS program_name,
              COALESCE(NULLIF(TRIM(co.name), ''), 'Unknown school') AS school_name,
              COALESCE(NULLIF(TRIM(g.name), ''), 'Unknown group') AS group_name,
              COALESCE(NULLIF(TRIM(b.name), ''), 'Unknown batch') AS batch_name${auditSelect}
       FROM monitoring_logs ml
       INNER JOIN programs p ON p.id = ml.program_id
       LEFT JOIN mothers m ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'mother' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(CAST(m.mother_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
       LEFT JOIN children c ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'child' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(CAST(c.child_code AS CHAR))) = LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))))
       LEFT JOIN mothers parent_m ON LOWER(CAST(ml.beneficiary_type AS CHAR)) = 'child' AND parent_m.id = c.mother_id
       LEFT JOIN communities co ON co.id = COALESCE(m.community_id, c.community_id)
       LEFT JOIN \`groups\` g ON g.id = COALESCE(m.group_id, c.group_id)
       LEFT JOIN batches b ON b.id = COALESCE(m.batch_id, c.batch_id)
       ${auditJoins}
       WHERE ml.program_id = ? AND ml.beneficiary_id = ? AND ml.beneficiary_type = ?
         ${req.isHealthWorker ? 'AND (m.group_id = ? OR COALESCE(c.group_id, parent_m.group_id) = ?)' : ''}
       ORDER BY ml.monitored_date DESC`,
      req.isHealthWorker
        ? [req.params.programId, req.params.beneficiaryId, beneficiaryType, req.groupId, req.groupId]
        : [req.params.programId, req.params.beneficiaryId, beneficiaryType],
    );
    res.json({ report: await attachReceiptEvidence(logs) });
  } catch (error) {
    console.error('[Programs API] monitoring report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;