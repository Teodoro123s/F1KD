const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

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

router.get('/activity', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.perPage, 10) || 20));
    const search = String(req.query.search || '').trim();
    const filters = ["category = 'User Management'", "action = 'sign_in'"];
    const params = [];
    const actorUserId = req.query.actorUserId === undefined ? '' : String(req.query.actorUserId);
    const schoolId = req.query.schoolId === undefined ? '' : String(req.query.schoolId);
    const groupId = req.query.groupId === undefined ? '' : String(req.query.groupId);

    if (actorUserId) {
      if (!/^\d+$/.test(actorUserId)) {
        return res.status(400).json({ error: 'actorUserId must be a positive integer' });
      }
      filters.push('actor_user_id = ?');
      params.push(Number(actorUserId));
    }
    if (schoolId) {
      if (!/^\d+$/.test(schoolId)) {
        return res.status(400).json({ error: 'schoolId must be a positive integer' });
      }
      filters.push('EXISTS (SELECT 1 FROM users report_actor WHERE report_actor.id = activity_logs.actor_user_id AND report_actor.school_id = ?)');
      params.push(Number(schoolId));
    }
    if (groupId) {
      if (!/^\d+$/.test(groupId)) {
        return res.status(400).json({ error: 'groupId must be a positive integer' });
      }
      filters.push('EXISTS (SELECT 1 FROM users report_actor WHERE report_actor.id = activity_logs.actor_user_id AND report_actor.group_id = ?)');
      params.push(Number(groupId));
    }
    const scopeWhere = `WHERE ${filters.join(' AND ')}`;
    const scopeParams = [...params];
    if (search) {
      filters.push('(actor_name LIKE ? OR actor_email LIKE ? OR action LIKE ? OR description LIKE ? OR entity_type LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }
    if (req.query.from) {
      filters.push('created_at >= ?');
      params.push(`${req.query.from} 00:00:00`);
    }
    if (req.query.to) {
      filters.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(req.query.to);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM activity_logs ${where}`,
      params,
    );
    const [summaryRows] = await pool.query(
      `SELECT
        COUNT(*) AS sign_ins
       FROM activity_logs ${scopeWhere}`,
      scopeParams,
    );
    const total = Number(countRows[0]?.total) || 0;
    const [dailyActivity] = await pool.query(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') AS date, activity_count AS count
       FROM (
         SELECT DATE(created_at) AS activity_date, COUNT(*) AS activity_count
         FROM activity_logs ${where}
         GROUP BY DATE(created_at)
         ORDER BY activity_date DESC
         LIMIT 30
       ) recent_activity
       ORDER BY activity_date ASC`,
      params,
    );
    const [rows] = await pool.query(
      `SELECT id, actor_user_id AS actorUserId, actor_name AS actorName,
          actor_email AS actorEmail, actor_role AS actorRole, category, action,
          entity_type AS entityType, entity_id AS entityId, description,
          created_at AS createdAt
       FROM activity_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
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
