const express = require('express');
const pool = require('../db');
const { normalizeRole } = require('../middleware/authorize');
const { recordActivity } = require('../services/activityLog');
const router = express.Router();

const TYPES = new Set(['school', 'group', 'batch', 'mother', 'child']);
const effectiveGroupBatchRelation = `(
  SELECT group_id, batch_id FROM group_batch
  UNION
  SELECT m.group_id, m.batch_id
  FROM mothers m
  JOIN groups g ON g.id = m.group_id
  JOIN batches b ON b.id = m.batch_id AND b.community_id = g.community_id
  WHERE m.group_id IS NOT NULL AND m.batch_id IS NOT NULL
)`;

function canManage(type, role) {
  const normalizedRole = normalizeRole(role);
  if (type === 'school') return normalizedRole === 'super_admin';
  return ['group', 'batch', 'mother', 'child'].includes(type) && normalizedRole === 'community_coordinator';
}

function scope(type, req, alias = 'r') {
  if (type === 'school' || !req.isCommunityOrganizer) return { sql: '', values: [] };
  if (['group', 'batch'].includes(type)) {
    return { sql: ` AND ${alias}.community_id = ?`, values: [req.schoolId] };
  }
  if (type === 'mother') return { sql: ` AND ${alias}.community_id = ?`, values: [req.schoolId] };
  if (type === 'child') return { sql: ' AND COALESCE(r.community_id, m.community_id) = ?', values: [req.schoolId] };
  return { sql: '', values: [] };
}

async function findRecord(connection, type, id, req, lock = false) {
  const lockSql = lock ? ' FOR UPDATE' : '';
  if (type === 'school') {
    const [rows] = await connection.query(
      `SELECT r.id, r.name, r.archived_at FROM communities r WHERE r.id = ?${lockSql}`,
      [id],
    );
    return rows[0] || null;
  }
  if (type === 'group' || type === 'batch' || type === 'mother') {
    const table = { group: 'groups', batch: 'batches', mother: 'mothers' }[type];
    const selected = type === 'mother'
      ? "r.mother_code AS code, CONCAT_WS(' ', r.first_name, r.last_name) AS name, r.group_id, r.batch_id"
      : type === 'batch'
        ? 'r.batch_code AS code, r.name'
        : 'r.name';
    const recordScope = scope(type, req);
    const identityCondition = type === 'mother'
      ? '(r.id = ? OR r.mother_code = ?)'
      : type === 'batch'
        ? '(r.id = ? OR r.batch_code = ?)'
        : 'r.id = ?';
    const identityValues = type === 'mother' || type === 'batch'
      ? [Number(id) || null, id]
      : [id];
    const [rows] = await connection.query(
      `SELECT r.id, ${selected}, r.community_id, r.archived_at
       FROM ${table} r WHERE ${identityCondition}${recordScope.sql}${lockSql}`,
      [...identityValues, ...recordScope.values],
    );
    return rows[0] || null;
  }
  const recordScope = scope(type, req);
  const [rows] = await connection.query(
    `SELECT r.id, r.child_code AS code, CONCAT_WS(' ', r.first_name, r.last_name) AS name,
        r.mother_id, COALESCE(r.community_id, m.community_id) AS community_id,
        COALESCE(r.group_id, m.group_id) AS group_id, COALESCE(r.batch_id, m.batch_id) AS batch_id,
        r.archived_at
     FROM children r LEFT JOIN mothers m ON m.id = r.mother_id
     WHERE (r.id = ? OR r.child_code = ?)${recordScope.sql}${lockSql}`,
    [Number(id) || null, id, ...recordScope.values],
  );
  return rows[0] || null;
}

async function getRelatedCounts(connection, type, record) {
  const queries = {
    school: [
      ['Groups', 'SELECT COUNT(*) AS count FROM groups WHERE community_id = ?', [record.id]],
      ['Batches', 'SELECT COUNT(*) AS count FROM batches WHERE community_id = ?', [record.id]],
      ['Mothers', 'SELECT COUNT(*) AS count FROM mothers WHERE community_id = ?', [record.id]],
      ['Children', 'SELECT COUNT(*) AS count FROM children c LEFT JOIN mothers m ON m.id = c.mother_id WHERE COALESCE(c.community_id, m.community_id) = ?', [record.id]],
    ],
    group: [
      ['Batches', `SELECT COUNT(DISTINCT batch_id) AS count FROM ${effectiveGroupBatchRelation} WHERE group_id = ?`, [record.id]],
      ['Mothers', `SELECT COUNT(*) AS count FROM mothers WHERE group_id = ? OR batch_id IN (SELECT batch_id FROM ${effectiveGroupBatchRelation} WHERE group_id = ?)`, [record.id, record.id]],
      ['Children', `SELECT COUNT(*) AS count FROM children c LEFT JOIN mothers m ON m.id = c.mother_id
        WHERE c.group_id = ? OR c.batch_id IN (SELECT batch_id FROM ${effectiveGroupBatchRelation} WHERE group_id = ?)
        OR c.mother_id IN (SELECT id FROM mothers WHERE group_id = ? OR batch_id IN (SELECT batch_id FROM ${effectiveGroupBatchRelation} WHERE group_id = ?))`, [record.id, record.id, record.id, record.id]],
    ],
    batch: [
      ['Mothers', 'SELECT COUNT(*) AS count FROM mothers WHERE batch_id = ?', [record.id]],
      ['Children', 'SELECT COUNT(*) AS count FROM children c LEFT JOIN mothers m ON m.id = c.mother_id WHERE c.batch_id = ? OR (c.batch_id IS NULL AND m.batch_id = ?)', [record.id, record.id]],
    ],
    mother: [
      ['Children to archive', 'SELECT COUNT(*) AS count FROM children WHERE mother_id = ? AND archived_at IS NULL', [record.id]],
      ['Check-ups', 'SELECT COUNT(*) AS count FROM mother_checkups WHERE mother_id = ?', [record.id]],
      ['Vaccination records', 'SELECT COUNT(*) AS count FROM mother_vaccinations WHERE mother_id = ?', [record.id]],
    ],
    child: [
      ['Check-ups', 'SELECT COUNT(*) AS count FROM child_checkups WHERE child_id = ?', [record.id]],
      ['Vaccination records', 'SELECT COUNT(*) AS count FROM child_vaccinations WHERE child_id = ?', [record.id]],
      ['Medical records', 'SELECT COUNT(*) AS count FROM child_medical_conditions WHERE child_id = ?', [record.id]],
    ],
  };
  return Promise.all((queries[type] || []).map(async ([label, sql, values]) => {
    const [rows] = await connection.query(sql, values);
    return { label, count: Number(rows[0]?.count || 0) };
  }));
}

async function parentIsActive(connection, type, record) {
  let sql;
  let values;
  if (type === 'group') {
    sql = 'SELECT id FROM communities WHERE id = ? AND archived_at IS NULL';
    values = [record.community_id];
  } else if (type === 'batch') {
    sql = `SELECT b.id FROM batches b
      JOIN communities c ON c.id = b.community_id AND c.archived_at IS NULL
      WHERE b.id = ? AND NOT EXISTS (
        SELECT 1 FROM ${effectiveGroupBatchRelation} rel
        JOIN groups g ON g.id = rel.group_id AND g.archived_at IS NOT NULL
        WHERE rel.batch_id = b.id
      )`;
    values = [record.id];
  } else if (type === 'mother') {
    sql = `SELECT r.id FROM mothers r
      JOIN communities c ON c.id = r.community_id AND c.archived_at IS NULL
      LEFT JOIN groups g ON g.id = r.group_id
      LEFT JOIN batches b ON b.id = r.batch_id
      WHERE r.id = ? AND (r.group_id IS NULL OR g.archived_at IS NULL)
        AND (r.batch_id IS NULL OR b.archived_at IS NULL)`;
    values = [record.id];
  } else if (type === 'child') {
    sql = `SELECT r.id FROM children r
      JOIN mothers m ON m.id = r.mother_id AND m.archived_at IS NULL
      JOIN communities c ON c.id = COALESCE(r.community_id, m.community_id) AND c.archived_at IS NULL
      LEFT JOIN groups g ON g.id = COALESCE(r.group_id, m.group_id)
      LEFT JOIN batches b ON b.id = COALESCE(r.batch_id, m.batch_id)
      WHERE r.id = ? AND (COALESCE(r.group_id, m.group_id) IS NULL OR g.archived_at IS NULL)
        AND (COALESCE(r.batch_id, m.batch_id) IS NULL OR b.archived_at IS NULL)`;
    values = [record.id];
  } else {
    return true;
  }
  const [rows] = await connection.query(sql, values);
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  const role = normalizeRole(req.user?.role);
  const type = String(req.query.type || '');
  if (!TYPES.has(type)) return res.status(400).json({ error: 'A supported archive type is required' });
  if (!canManage(type, role)) {
    return res.status(403).json({ error: 'You do not have permission to view this archive' });
  }
  if (role === 'community_coordinator' && !(Number(req.schoolId) > 0)) {
    return res.status(403).json({ error: 'Assign this Community Organizer to a school before viewing archived records' });
  }
  const table = { school: 'communities', group: 'groups', batch: 'batches', mother: 'mothers', child: 'children' }[type];
  const scopeFilter = scope(type, req);
  const search = String(req.query.search || '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  const childJoin = type === 'child' ? 'LEFT JOIN mothers m ON m.id = r.mother_id' : '';
  const name = type === 'mother'
    ? "CONCAT_WS(' ', r.first_name, r.last_name)"
    : type === 'child'
      ? "CONCAT_WS(' ', r.first_name, r.last_name)"
      : 'r.name';
  const searchCondition = search ? ` AND ${name} LIKE ?` : '';
  const values = [...scopeFilter.values, ...(search ? [`%${search}%`] : [])];
  try {
    const [rows] = await pool.query(
      `SELECT r.id, ${type === 'mother' ? 'r.mother_code' : type === 'child' ? 'r.child_code' : 'NULL'} AS code,
          ${name} AS name, r.archived_at, r.archived_by_user_id, r.archive_reason,
          CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name) AS archived_by
       FROM ${table} r ${childJoin}
       LEFT JOIN users u ON u.id = r.archived_by_user_id
       WHERE r.archived_at IS NOT NULL${scopeFilter.sql}${searchCondition}
       ORDER BY r.archived_at DESC, r.id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${table} r ${childJoin}
       WHERE r.archived_at IS NOT NULL${scopeFilter.sql}${searchCondition}`,
      values,
    );
    return res.json({ records: rows, page, limit, total: Number(countRow.total) });
  } catch (error) {
    console.error('[Archives API] list error:', error.message);
    return res.status(500).json({ error: 'Unable to load archived records' });
  }
});

router.get('/activity', async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['super_admin', 'community_coordinator'].includes(role)) {
    return res.status(403).json({ error: 'You do not have permission to view archive activity' });
  }
  if (role === 'community_coordinator' && !(Number(req.schoolId) > 0)) {
    return res.status(403).json({ error: 'Assign this Community Organizer to a school before viewing archive activity' });
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  const filters = ["category = 'Archive'", "action IN ('archive', 'restore')"];
  const values = [];
  if (role === 'community_coordinator') {
    filters.push(`(
      (entity_type = 'group' AND EXISTS (
        SELECT 1 FROM groups archived_group
        WHERE archived_group.id = CAST(activity_logs.entity_id AS UNSIGNED)
          AND archived_group.community_id = ?
      ))
      OR (entity_type = 'batch' AND EXISTS (
        SELECT 1 FROM batches archived_batch
        WHERE archived_batch.id = CAST(activity_logs.entity_id AS UNSIGNED)
          AND archived_batch.community_id = ?
      ))
      OR (entity_type = 'program' AND EXISTS (
        SELECT 1 FROM program_clusters pc
        WHERE pc.program_id = CAST(activity_logs.entity_id AS UNSIGNED)
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
      ))
      OR (entity_type = 'mother' AND EXISTS (
        SELECT 1 FROM mothers archived_mother
        WHERE archived_mother.id = CAST(activity_logs.entity_id AS UNSIGNED)
          AND archived_mother.community_id = ?
      ))
      OR (entity_type = 'child' AND EXISTS (
        SELECT 1 FROM children archived_child
        LEFT JOIN mothers archived_mother ON archived_mother.id = archived_child.mother_id
        WHERE archived_child.id = CAST(activity_logs.entity_id AS UNSIGNED)
          AND COALESCE(archived_child.community_id, archived_mother.community_id) = ?
      ))
    )`);
    values.push(
      req.schoolId,
      req.schoolId,
      req.schoolId,
      req.schoolId,
      req.schoolId,
      req.schoolId,
      req.schoolId,
    );
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM activity_logs ${where}`,
      values,
    );
    const [activities] = await pool.query(
      `SELECT id, actor_user_id AS actorUserId, actor_name AS actorName,
          actor_role AS actorRole, action, entity_type AS entityType,
          entity_id AS entityId, description, created_at AS createdAt
       FROM activity_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    const activityRecords = activities.map((activity) => {
      const reasonMatch = activity.action === 'archive'
        ? String(activity.description || '').match(/(?:^|\.\s)Reason:\s([\s\S]*)$/)
        : null;
      return { ...activity, reason: reasonMatch?.[1]?.trim() || null };
    });
    return res.json({ activities: activityRecords, page, limit, total: Number(countRow.total || 0) });
  } catch (error) {
    console.error('[Archives API] activity list error:', error.message);
    return res.status(500).json({ error: 'Unable to load archive activity' });
  }
});

router.get('/:type/:id/impact', async (req, res) => {
  const { type } = req.params;
  if (!TYPES.has(type)) return res.status(400).json({ error: 'Unsupported archive type' });
  if (!canManage(type, req.user?.role)) return res.status(403).json({ error: 'You do not have permission to archive this record' });
  try {
    const record = await findRecord(pool, type, req.params.id, req);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    const related = await getRelatedCounts(pool, type, record);
    return res.json({ record, related });
  } catch (error) {
    console.error('[Archives API] impact error:', error.message);
    return res.status(500).json({ error: 'Unable to retrieve related record counts' });
  }
});

router.post('/:type/:id/archive', async (req, res) => {
  const { type } = req.params;
  if (!TYPES.has(type)) return res.status(400).json({ error: 'Unsupported archive type' });
  if (!canManage(type, req.user?.role)) return res.status(403).json({ error: 'You do not have permission to archive this record' });
  const reason = String(req.body?.reason || '').trim();
  if (reason.length > 500) return res.status(400).json({ error: 'Archive reason must be 500 characters or fewer' });
  const table = { school: 'communities', group: 'groups', batch: 'batches', mother: 'mothers', child: 'children' }[type];
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const record = await findRecord(connection, type, req.params.id, req, true);
    if (!record) {
      await connection.rollback();
      return res.status(404).json({ error: 'Record not found' });
    }
    if (record.archived_at) {
      await connection.rollback();
      return res.status(409).json({ error: 'Record is already archived' });
    }
    let childrenToArchive = [];
    if (type === 'mother') {
      const [children] = await connection.query(
        `SELECT id, CONCAT_WS(' ', first_name, last_name) AS name
         FROM children
         WHERE mother_id = ? AND archived_at IS NULL
         FOR UPDATE`,
        [record.id],
      );
      childrenToArchive = children;
    }
    const archiveSql = type === 'child'
      ? 'UPDATE children SET archived_at = CURRENT_TIMESTAMP, archived_by_user_id = ?, archive_reason = ?, archived_with_mother_id = NULL WHERE id = ? AND archived_at IS NULL'
      : `UPDATE ${table} SET archived_at = CURRENT_TIMESTAMP, archived_by_user_id = ?, archive_reason = ? WHERE id = ? AND archived_at IS NULL`;
    await connection.query(archiveSql, [req.user.id, reason || null, record.id]);
    if (childrenToArchive.length) {
      await connection.query(
        `UPDATE children
         SET archived_at = CURRENT_TIMESTAMP, archived_by_user_id = ?, archive_reason = ?,
             archived_with_mother_id = ?
         WHERE mother_id = ? AND archived_at IS NULL`,
        [req.user.id, reason || null, record.id, record.id],
      );
    }
    await recordActivity({
      actor: req.user,
      category: 'Archive',
      action: 'archive',
      entityType: type,
      entityId: record.id,
      description: `Archived ${type} "${record.name || record.code || record.id}".${reason ? ` Reason: ${reason}` : ''}`,
    }, connection, { throwOnError: true });
    for (const child of childrenToArchive) {
      await recordActivity({
        actor: req.user,
        category: 'Archive',
        action: 'archive',
        entityType: 'child',
        entityId: child.id,
        description: `Archived child "${child.name || child.id}" with mother "${record.name || record.code || record.id}" as part of mother archive.${reason ? ` Reason: ${reason}` : ''}`,
      }, connection, { throwOnError: true });
    }
    await connection.commit();
    return res.json({
      success: true,
      record: { ...record, archived_at: new Date().toISOString(), archive_reason: reason || null },
      childrenArchived: childrenToArchive.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Archives API] archive error:', error.message);
    return res.status(500).json({ error: 'Unable to archive record' });
  } finally {
    connection?.release();
  }
});

router.post('/:type/:id/restore', async (req, res) => {
  const { type } = req.params;
  if (!TYPES.has(type)) return res.status(400).json({ error: 'Unsupported archive type' });
  if (!canManage(type, req.user?.role)) return res.status(403).json({ error: 'You do not have permission to restore this record' });
  const table = { school: 'communities', group: 'groups', batch: 'batches', mother: 'mothers', child: 'children' }[type];
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const record = await findRecord(connection, type, req.params.id, req, true);
    if (!record) {
      await connection.rollback();
      return res.status(404).json({ error: 'Record not found' });
    }
    if (!record.archived_at) {
      await connection.rollback();
      return res.status(409).json({ error: 'Record is not archived' });
    }
    if (!(await parentIsActive(connection, type, record))) {
      await connection.rollback();
      return res.status(409).json({ error: 'Restore the record’s parent hierarchy before restoring this record' });
    }
    let childrenToRestore = [];
    if (type === 'mother') {
      const [children] = await connection.query(
        `SELECT id, CONCAT_WS(' ', first_name, last_name) AS name
         FROM children
         WHERE archived_with_mother_id = ? AND archived_at IS NOT NULL
         FOR UPDATE`,
        [record.id],
      );
      childrenToRestore = children;
    }
    const restoreSql = type === 'child'
      ? 'UPDATE children SET archived_at = NULL, archived_by_user_id = NULL, archive_reason = NULL, archived_with_mother_id = NULL WHERE id = ? AND archived_at IS NOT NULL'
      : `UPDATE ${table} SET archived_at = NULL, archived_by_user_id = NULL, archive_reason = NULL WHERE id = ? AND archived_at IS NOT NULL`;
    await connection.query(restoreSql, [record.id]);
    if (childrenToRestore.length) {
      await connection.query(
        `UPDATE children
         SET archived_at = NULL, archived_by_user_id = NULL, archive_reason = NULL,
             archived_with_mother_id = NULL
         WHERE archived_with_mother_id = ? AND archived_at IS NOT NULL`,
        [record.id],
      );
    }
    await recordActivity({
      actor: req.user,
      category: 'Archive',
      action: 'restore',
      entityType: type,
      entityId: record.id,
      description: `Restored ${type} "${record.name || record.code || record.id}" from archive.`,
    }, connection, { throwOnError: true });
    for (const child of childrenToRestore) {
      await recordActivity({
        actor: req.user,
        category: 'Archive',
        action: 'restore',
        entityType: 'child',
        entityId: child.id,
        description: `Restored child "${child.name || child.id}" with mother "${record.name || record.code || record.id}" from archive.`,
      }, connection, { throwOnError: true });
    }
    await connection.commit();
    return res.json({
      success: true,
      record: { ...record, archived_at: null, archive_reason: null },
      childrenRestored: childrenToRestore.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Archives API] restore error:', error.message);
    return res.status(500).json({ error: 'Unable to restore record' });
  } finally {
    connection?.release();
  }
});

module.exports = router;
