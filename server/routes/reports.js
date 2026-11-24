const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, normalizeRole } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { isValidIsoDate } = require('../utils/dateValidation');
const { parsePositiveIntegerId } = require('../utils/userInputValidation');
const { buildMonthlySchoolMonitoring } = require('../utils/monthlySchoolMonitoring');

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

router.get('/school-performance', verifyToken, authorize('admin', 'partner'), async (req, res) => {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }
  if (month > currentMonth) {
    return res.status(400).json({ error: 'month cannot be in the future' });
  }

  try {
    const [schoolRows, motherRows, motherCheckupRows, childRows, childCheckupRows, projectRows] = await Promise.all([
      pool.query(
        `SELECT c.id, c.name,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name)), ''), '') AS organizerName
         FROM communities c
         LEFT JOIN users u ON u.id = c.coordinator_id
         WHERE c.archived_at IS NULL
         ORDER BY c.name, c.id`,
      ),
      pool.query(
        `SELECT m.id, m.community_id AS schoolId, m.lmp_date AS lmpDate,
            m.prenatal_reg_date AS prenatalRegDate, m.gestational_age AS gestationalAge,
            m.trimester
         FROM mothers m
         WHERE m.archived_at IS NULL AND m.community_id IS NOT NULL`,
      ),
      pool.query(
        `SELECT mc.mother_id AS motherId, mc.trimester, mc.checkup_number AS checkupNumber,
            mc.checkup_date AS checkupDate, mc.weight_kg AS weight, mc.height_cm AS height,
            mc.blood_pressure AS bloodPressure, mc.next_checkup_date AS nextCheckupDate
         FROM mother_checkups mc
         INNER JOIN mothers m ON m.id = mc.mother_id AND m.archived_at IS NULL
         WHERE m.community_id IS NOT NULL`,
      ),
      pool.query(
        `SELECT c.id, COALESCE(c.community_id, m.community_id) AS schoolId,
            c.birth_date AS birthDate
         FROM children c
         LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE c.archived_at IS NULL
           AND (m.archived_at IS NULL OR m.id IS NULL)
           AND COALESCE(c.community_id, m.community_id) IS NOT NULL`,
      ),
      pool.query(
        `SELECT cc.child_id AS childId, cc.week_number AS monthNumber,
            cc.visit_date AS visitDate, cc.next_checkup_date AS nextCheckupDate, cc.weight, cc.height,
            cc.exclusive_breastfeeding AS feedingMethod
         FROM child_checkups cc
         INNER JOIN children c ON c.id = cc.child_id AND c.archived_at IS NULL
         LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE (m.archived_at IS NULL OR m.id IS NULL)
           AND COALESCE(c.community_id, m.community_id) IS NOT NULL
           AND cc.week_number BETWEEN 1 AND 24`,
      ),
      pool.query(
        `SELECT school.id AS schoolId,
            COUNT(DISTINCT pc.program_id) AS projects,
            COUNT(*) AS totalScopes,
            SUM(CASE
              WHEN pc.beneficiaries > 0 AND pc.received >= pc.beneficiaries THEN 1
              ELSE 0
            END) AS completedScopes,
            SUM(GREATEST(COALESCE(pc.beneficiaries, 0), 0)) AS targetRecipients,
            SUM(LEAST(
              GREATEST(COALESCE(pc.received, 0), 0),
              GREATEST(COALESCE(pc.beneficiaries, 0), 0)
            )) AS completedRecipients
         FROM program_clusters pc
         INNER JOIN programs p ON p.id = pc.program_id AND p.archived_at IS NULL
         LEFT JOIN communities direct_school
           ON LOWER(pc.scope_type) = 'school' AND direct_school.id = pc.scope_id
         LEFT JOIN groups scoped_group
           ON LOWER(pc.scope_type) = 'group' AND scoped_group.id = pc.scope_id
         LEFT JOIN batches scoped_batch
           ON LOWER(pc.scope_type) = 'batch' AND scoped_batch.id = pc.scope_id
         INNER JOIN communities school
           ON school.id = CASE LOWER(pc.scope_type)
             WHEN 'school' THEN direct_school.id
             WHEN 'group' THEN scoped_group.community_id
             WHEN 'batch' THEN scoped_batch.community_id
           END
           AND school.archived_at IS NULL
         GROUP BY school.id`,
      ),
    ]);

    const numberOrZero = (value) => Math.max(0, Number(value) || 0);
    const asOfDate = new Date().toISOString().slice(0, 10);
    const monthlyMonitoring = buildMonthlySchoolMonitoring({
      month,
      asOfDate,
      schools: schoolRows[0],
      mothers: motherRows[0],
      motherCheckups: motherCheckupRows[0],
      children: childRows[0],
      childCheckups: childCheckupRows[0],
    });
    const statsBySchool = new Map();
    for (const row of projectRows[0]) {
      statsBySchool.set(String(row.schoolId), row);
    }

    res.json({
      month,
      asOfDate,
      schools: schoolRows[0].map((school) => {
        const monthlyStats = monthlyMonitoring.get(String(school.id));
        const projectStats = statsBySchool.get(String(school.id)) || {};
        const toMonitoringSummary = (counter) => ({
          beneficiaries: numberOrZero(counter?.beneficiaries),
          beneficiariesDue: numberOrZero(counter?.beneficiariesDue),
          unscheduledBeneficiaries: numberOrZero(counter?.unscheduledBeneficiaries),
          expectedVisits: numberOrZero(counter?.expectedVisits),
          completedVisits: numberOrZero(counter?.completedVisits),
          recordedVisits: numberOrZero(counter?.recordedVisits),
          completeForms: numberOrZero(counter?.completeForms),
        });
        return {
          id: school.id,
          name: school.name,
          organizerName: school.organizerName || '',
          monitoring: {
            mothers: toMonitoringSummary(monthlyStats?.mothers),
            children: toMonitoringSummary(monthlyStats?.children),
          },
          projects: {
            projects: numberOrZero(projectStats.projects),
            totalScopes: numberOrZero(projectStats.totalScopes),
            completedScopes: numberOrZero(projectStats.completedScopes),
            targetRecipients: numberOrZero(projectStats.targetRecipients),
            completedRecipients: numberOrZero(projectStats.completedRecipients),
          },
        };
      }),
    });
  } catch (error) {
    console.error('[Reports API] GET /school-performance error:', error.message);
    res.status(500).json({ error: 'Unable to load school performance report' });
  }
});

router.get('/school-performance/:schoolId/details', verifyToken, authorize('admin', 'partner'), async (req, res) => {
  const schoolId = parsePositiveIntegerId(req.params.schoolId);
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!schoolId) return res.status(400).json({ error: 'schoolId must be a positive integer' });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }
  if (month > currentMonth) {
    return res.status(400).json({ error: 'month cannot be in the future' });
  }

  try {
    const [schoolRows] = await pool.query(
      'SELECT id FROM communities WHERE id = ? AND archived_at IS NULL LIMIT 1',
      [schoolId],
    );
    if (!schoolRows.length) return res.status(404).json({ error: 'School not found' });

    const [[motherRows], [motherCheckupRows], [childRows], [childCheckupRows]] = await Promise.all([
      pool.query(
        `SELECT m.id, TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix)) AS name,
            m.community_id AS schoolId, m.lmp_date AS lmpDate,
            m.prenatal_reg_date AS prenatalRegDate, m.gestational_age AS gestationalAge,
            m.trimester
         FROM mothers m
         WHERE m.archived_at IS NULL AND m.community_id = ?
         ORDER BY m.last_name, m.first_name, m.id`,
        [schoolId],
      ),
      pool.query(
        `SELECT mc.mother_id AS motherId, mc.trimester, mc.checkup_number AS checkupNumber,
            mc.checkup_date AS checkupDate, mc.weight_kg AS weight, mc.height_cm AS height,
            mc.blood_pressure AS bloodPressure, mc.next_checkup_date AS nextCheckupDate
         FROM mother_checkups mc
         INNER JOIN mothers m ON m.id = mc.mother_id AND m.archived_at IS NULL
         WHERE m.community_id = ?`,
        [schoolId],
      ),
      pool.query(
        `SELECT c.id, TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix)) AS name,
            COALESCE(c.community_id, m.community_id) AS schoolId,
            c.birth_date AS birthDate
         FROM children c
         LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE c.archived_at IS NULL
           AND (m.archived_at IS NULL OR m.id IS NULL)
           AND COALESCE(c.community_id, m.community_id) = ?
         ORDER BY c.last_name, c.first_name, c.id`,
        [schoolId],
      ),
      pool.query(
        `SELECT cc.child_id AS childId, cc.week_number AS monthNumber,
            cc.visit_date AS visitDate, cc.next_checkup_date AS nextCheckupDate, cc.weight, cc.height,
            cc.exclusive_breastfeeding AS feedingMethod
         FROM child_checkups cc
         INNER JOIN children c ON c.id = cc.child_id AND c.archived_at IS NULL
         LEFT JOIN mothers m ON m.id = c.mother_id
         WHERE (m.archived_at IS NULL OR m.id IS NULL)
           AND COALESCE(c.community_id, m.community_id) = ?
           AND cc.week_number BETWEEN 1 AND 24`,
        [schoolId],
      ),
    ]);

    const detailsBySchool = new Map();
    buildMonthlySchoolMonitoring({
      month,
      asOfDate: new Date().toISOString().slice(0, 10),
      schools: schoolRows,
      mothers: motherRows,
      motherCheckups: motherCheckupRows,
      children: childRows,
      childCheckups: childCheckupRows,
      detailsBySchool,
    });
    const details = detailsBySchool.get(String(schoolId));
    res.json({
      month,
      schoolId,
      mothers: {
        due: details.mothers,
        unscheduled: details.mothersUnscheduled,
      },
      children: {
        due: details.children,
        unscheduled: details.childrenUnscheduled,
      },
    });
  } catch (error) {
    console.error('[Reports API] GET /school-performance/:schoolId/details error:', error.message);
    res.status(500).json({ error: 'Unable to load school monitoring details' });
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
