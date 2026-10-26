const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, normalizeRole } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { isValidIsoDate } = require('../utils/dateValidation');
const { parsePositiveIntegerId } = require('../utils/userInputValidation');

const normalizedRoleSql = (column) => (
  `LOWER(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(${column}, '')), '_', ''), ' ', ''), '-', ''))`
);
const superAdminActivityExclusion = `(
  ${normalizedRoleSql('activity_logs.actor_role')} <> 'superadmin'
  AND NOT EXISTS (
    SELECT 1
    FROM users report_superadmin
    WHERE report_superadmin.id = activity_logs.actor_user_id
      AND ${normalizedRoleSql('report_superadmin.role')} = 'superadmin'
  )
)`;
const duplicateNotificationActivityExclusion = `(
  activity_logs.source_notification_id IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM activity_logs direct_activity
    WHERE direct_activity.source_notification_id IS NULL
      AND direct_activity.actor_user_id = activity_logs.actor_user_id
      AND direct_activity.category = activity_logs.category
      AND direct_activity.action = activity_logs.action
      AND direct_activity.entity_type <=> activity_logs.entity_type
      AND direct_activity.entity_id <=> activity_logs.entity_id
      AND direct_activity.created_at BETWEEN DATE_SUB(activity_logs.created_at, INTERVAL 5 SECOND)
        AND DATE_ADD(activity_logs.created_at, INTERVAL 5 SECOND)
  )
)`;

router.get('/scopes', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const [schoolResult, groupResult] = await Promise.all([
      pool.query('SELECT id, name FROM communities ORDER BY name'),
      pool.query('SELECT id, community_id AS schoolId, name FROM groups ORDER BY name'),
    ]);
    const schools = schoolResult[0];
    const groups = groupResult[0];
    res.json({ schools, groups });
  } catch (error) {
    console.error('[Reports API] GET /scopes error:', error.message);
    res.status(500).json({ error: 'Unable to load report school and group options' });
  }
});

router.get('/users', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT users.id, CONCAT_WS(' ', users.first_name, users.middle_initial, users.last_name) AS name,
          users.email, users.role, users.school_id AS schoolId, users.group_id AS groupId,
          COUNT(activity_logs.id) AS loginCount
       FROM users
       LEFT JOIN activity_logs
         ON activity_logs.actor_user_id = users.id
         AND activity_logs.category = 'User Management'
         AND activity_logs.action = 'sign_in'
         AND ${superAdminActivityExclusion}
       WHERE ${normalizedRoleSql('users.role')} <> 'superadmin'
       GROUP BY users.id, users.first_name, users.middle_initial, users.last_name,
          users.email, users.role, users.school_id, users.group_id
       ORDER BY name`,
    );
    res.json({ users });
  } catch (error) {
    console.error('[Reports API] GET /users error:', error.message);
    res.status(500).json({ error: 'Unable to load users for activity reports' });
  }
});

router.get('/activity', verifyToken, authorize('super_admin', 'community_coordinator'), async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : parsePositiveIntegerId(req.query.page);
    const requestedPerPage = req.query.perPage === undefined ? 20 : parsePositiveIntegerId(req.query.perPage);
    if (page === null || requestedPerPage === null) {
      return res.status(400).json({ error: 'page and perPage must be positive integers' });
    }
    const perPage = Math.min(100, requestedPerPage);
    const offset = (page - 1) * perPage;
    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({ error: 'page is too large' });
    }
    const search = String(req.query.search || '').trim();
    const params = [];
    const actorUserId = req.query.actorUserId === undefined ? null : parsePositiveIntegerId(req.query.actorUserId);
    const schoolId = req.query.schoolId === undefined ? null : parsePositiveIntegerId(req.query.schoolId);
    const groupId = req.query.groupId === undefined ? null : parsePositiveIntegerId(req.query.groupId);
    const from = req.query.from === undefined ? '' : String(req.query.from);
    const to = req.query.to === undefined ? '' : String(req.query.to);
    const chartFrom = req.query.chartFrom === undefined ? '' : String(req.query.chartFrom);
    const chartTo = req.query.chartTo === undefined ? '' : String(req.query.chartTo);

    if (from && !isValidIsoDate(from)) {
      return res.status(400).json({ error: 'from must be a valid date in YYYY-MM-DD format' });
    }
    if (to && !isValidIsoDate(to)) {
      return res.status(400).json({ error: 'to must be a valid date in YYYY-MM-DD format' });
    }
    if (chartFrom && !isValidIsoDate(chartFrom)) {
      return res.status(400).json({ error: 'chartFrom must be a valid date in YYYY-MM-DD format' });
    }
    if (chartTo && !isValidIsoDate(chartTo)) {
      return res.status(400).json({ error: 'chartTo must be a valid date in YYYY-MM-DD format' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: 'from must be on or before to' });
    }
    if (chartFrom && chartTo && chartFrom > chartTo) {
      return res.status(400).json({ error: 'chartFrom must be on or before chartTo' });
    }

    if (req.query.actorUserId !== undefined && actorUserId === null) {
      return res.status(400).json({ error: 'actorUserId must be a positive integer' });
    }
    if (normalizeRole(req.user?.role) === 'community_coordinator' && actorUserId === null) {
      return res.status(403).json({ error: 'Community organizers can only view activity for a managed health worker' });
    }
    if (actorUserId !== null) {
      if (normalizeRole(req.user?.role) === 'community_coordinator') {
        const schoolIdForOrganizer = Number(req.user?.school_id);
        if (!Number.isSafeInteger(schoolIdForOrganizer) || schoolIdForOrganizer < 1) {
          return res.status(403).json({ error: 'Assign this Community Organizer to a school before viewing activity' });
        }
        const [managedUsers] = await pool.query(
          `SELECT id FROM users
           WHERE id = ? AND school_id = ?
             AND ${normalizedRoleSql('role')} = 'healthworker'
           LIMIT 1`,
          [actorUserId, schoolIdForOrganizer],
        );
        if (!managedUsers.length) {
          return res.status(404).json({ error: 'Managed health worker not found' });
        }
      }
    }

    const filters = actorUserId !== null
      ? ['activity_logs.actor_user_id = ?', superAdminActivityExclusion, duplicateNotificationActivityExclusion]
      : [
        "activity_logs.category = 'User Management'",
        "activity_logs.action = 'sign_in'",
        superAdminActivityExclusion,
      ];
    if (actorUserId !== null) {
      params.push(actorUserId);
    }
    if (req.query.schoolId !== undefined && schoolId === null) {
      return res.status(400).json({ error: 'schoolId must be a positive integer' });
    }
    if (schoolId !== null) {
      filters.push('EXISTS (SELECT 1 FROM users report_actor WHERE report_actor.id = activity_logs.actor_user_id AND report_actor.school_id = ?)');
      params.push(schoolId);
    }
    if (req.query.groupId !== undefined && groupId === null) {
      return res.status(400).json({ error: 'groupId must be a positive integer' });
    }
    if (groupId !== null) {
      filters.push('EXISTS (SELECT 1 FROM users report_actor WHERE report_actor.id = activity_logs.actor_user_id AND report_actor.group_id = ?)');
      params.push(groupId);
    }
    const scopeFilters = [...filters];
    const scopeParams = [...params];
    if (search) {
      filters.push('(actor_name LIKE ? OR actor_email LIKE ? OR action LIKE ? OR description LIKE ? OR entity_type LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }
    if (from) {
      filters.push('created_at >= ?');
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      filters.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(to);
    }

    const dailyFilters = [...filters];
    const dailyParams = [...params];
    if (chartFrom) {
      dailyFilters.push('created_at >= ?');
      dailyParams.push(`${chartFrom} 00:00:00`);
    }
    if (chartTo) {
      dailyFilters.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      dailyParams.push(chartTo);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const dailyWhere = dailyFilters.length ? `WHERE ${dailyFilters.join(' AND ')}` : '';
    const summaryFilters = actorUserId !== null
      ? [...scopeFilters, "activity_logs.category = 'User Management'", "activity_logs.action = 'sign_in'"]
      : scopeFilters;
    const summaryWhere = `WHERE ${summaryFilters.join(' AND ')}`;
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM activity_logs ${where}`,
      params,
    );
    const [summaryRows] = await pool.query(
      `SELECT
        COUNT(*) AS sign_ins
       FROM activity_logs ${summaryWhere}`,
      scopeParams,
    );
    const total = Number(countRows[0]?.total) || 0;
    const [dailyActivity] = await pool.query(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') AS date, activity_count AS count
       FROM (
         SELECT DATE(created_at) AS activity_date, COUNT(*) AS activity_count
         FROM activity_logs ${dailyWhere}
         GROUP BY DATE(created_at)
         ORDER BY activity_date DESC
         LIMIT 30
       ) recent_activity
       ORDER BY activity_date ASC`,
      dailyParams,
    );
    const [rows] = await pool.query(
      `SELECT id, actor_user_id AS actorUserId, actor_name AS actorName,
          actor_email AS actorEmail, actor_role AS actorRole, category, action,
          entity_type AS entityType, entity_id AS entityId, description,
          created_at AS createdAt
       FROM activity_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    res.json({
      total,
      counts: {
        signIns: Number(summaryRows[0]?.sign_ins) || 0,
      },
      page,
      perPage,
      activities: rows,
      dailyActivity,
    });
  } catch (error) {
    console.error('[Reports API] GET /activity error:', error.message);
    res.status(500).json({ error: 'Unable to load activity reports' });
  }
});

module.exports = router;
