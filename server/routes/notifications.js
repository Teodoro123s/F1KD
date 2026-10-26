const express = require('express');
const router = express.Router();
const pool = require('../db');
const { parsePositiveIntegerId } = require('../utils/userInputValidation');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getNotificationScope } = require('../services/notificationAccess');
const { createSuperadminNotification, sanitizeNotificationLink } = require('../services/notifications');

router.use(verifyToken);

function buildNotificationFilters(user, scope, category = '', search = '') {
  const filters = ['(n.recipient_user_ids IS NULL OR FIND_IN_SET(?, n.recipient_user_ids) > 0)'];
  const params = [String(user.id)];
  if (!scope.global) {
    filters.push('(n.school_id = ? OR FIND_IN_SET(?, n.school_scope_ids) > 0)');
    params.push(scope.schoolId, scope.schoolId);
  }
  if (scope.excludeUserManagement) {
    filters.push('n.category <> ?');
    params.push('User Management');
  }
  if (scope.categories) {
    filters.push(`n.category IN (${scope.categories.map(() => '?').join(', ')})`);
    params.push(...scope.categories);
    if (category && category !== 'All' && !scope.categories.includes(category)) {
      filters.push('1 = 0');
    }
  }
  if (scope.healthWorker) {
    filters.push('(n.category = ? OR FIND_IN_SET(?, n.recipient_user_ids) > 0)');
    params.push('Monitoring', String(user.id));
    if (scope.groupId) {
      filters.push('(n.group_id = ? OR n.group_id IS NULL)');
      params.push(scope.groupId);
    }
    if (category && category !== 'All' && category !== 'Monitoring' && category !== 'Beneficiaries') {
      filters.push('1 = 0');
    }
  }
  if (category && category !== 'All') {
    filters.push('n.category = ?');
    params.push(category);
  }
  if (search) {
    filters.push('(n.title LIKE ? OR n.message LIKE ? OR n.category LIKE ? OR actor.first_name LIKE ? OR actor.last_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  filters.push(`NOT EXISTS (
    SELECT 1 FROM notification_preferences np
    WHERE np.user_id = ? AND np.category = n.category AND np.enabled = FALSE
  )`);
  params.push(String(user.id));
  return { filters, params };
}

function getAuthorizedNotificationFilters(user, scope) {
  return buildNotificationFilters(user, scope);
}

function getPreferenceCategories(scope) {
  if (scope.categories) return scope.categories;
  if (scope.healthWorker) return ['Monitoring', 'Beneficiaries'];
  return ['Beneficiaries', 'Monitoring', 'Programs', 'Downloads', 'Community'];
}

router.get('/preferences', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    const categories = getPreferenceCategories(scope);
    const [rows] = await pool.query(
      `SELECT category, enabled FROM notification_preferences
       WHERE user_id = ? AND category IN (${categories.map(() => '?').join(', ')})`,
      [req.user.id, ...categories],
    );
    const saved = new Map(rows.map((row) => [row.category, Number(row.enabled) !== 0]));
    res.json({
      preferences: categories.map((category) => ({
        category,
        enabled: saved.has(category) ? saved.get(category) : true,
      })),
    });
  } catch (error) {
    console.error('[Notifications API] GET /preferences error:', error.message);
    res.status(500).json({ error: 'Unable to load notification preferences' });
  }
});

router.put('/preferences', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const preferences = req.body?.preferences;
    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ error: 'Provide at least one notification preference' });
    }
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    const categories = getPreferenceCategories(scope);
    const seen = new Set();
    for (const preference of preferences) {
      if (
        !preference
        || !categories.includes(preference.category)
        || typeof preference.enabled !== 'boolean'
        || seen.has(preference.category)
      ) {
        return res.status(400).json({ error: 'Notification preferences contain an unsupported or invalid category' });
      }
      seen.add(preference.category);
    }
    const values = preferences.map(() => '(?, ?, ?)').join(', ');
    const params = preferences.flatMap(({ category, enabled }) => [req.user.id, category, enabled]);
    await pool.query(
      `INSERT INTO notification_preferences (user_id, category, enabled)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP`,
      params,
    );
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('[Notifications API] PUT /preferences error:', error.message);
    res.status(500).json({ error: 'Unable to save notification preferences' });
  }
});

router.get('/', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : parsePositiveIntegerId(req.query.page);
    const requestedPerPage = req.query.perPage === undefined ? 50 : parsePositiveIntegerId(req.query.perPage);
    if (page === null || requestedPerPage === null) {
      return res.status(400).json({ error: 'page and perPage must be positive integers' });
    }
    const perPage = Math.min(100, requestedPerPage);
    const offset = (page - 1) * perPage;
    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({ error: 'page is too large' });
    }
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const readStatus = String(req.query.readStatus || 'all').trim();
    if (!['all', 'read', 'unread'].includes(readStatus)) {
      return res.status(400).json({ error: 'Invalid notification read status' });
    }
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    if (!scope.global && !scope.schoolId) {
      return res.json({ total: 0, counts: { all: 0, read: 0, unread: 0 }, notifications: [] });
    }

    const { filters: authorizedFilters, params: authorizedParams } = getAuthorizedNotificationFilters(req.user, scope);
    const authorizedWhere = `WHERE ${authorizedFilters.join(' AND ')}`;
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(nr.notification_id IS NOT NULL), 0) AS readCount,
         COALESCE(SUM(nr.notification_id IS NULL), 0) AS unreadCount
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       ${authorizedWhere}`,
      [req.user.id, ...authorizedParams],
    );
    const { filters, params } = buildNotificationFilters(req.user, scope, category, search);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const statusFilter = readStatus === 'all' ? '' : readStatus === 'read'
      ? ' AND nr.notification_id IS NOT NULL'
      : ' AND nr.notification_id IS NULL';
    const [[filteredCount]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       ${where}${statusFilter}`,
      [req.user.id, ...params],
    );
    const total = Number(filteredCount?.total || 0);
    const [notifications] = await pool.query(
        `SELECT n.id, n.event_type AS eventType, n.category, n.title, n.message, n.entity_type AS entityType,
         n.entity_id AS entityId, n.link_to AS linkTo, n.school_id AS schoolId, n.group_id AS groupId,
         n.school_scope_ids AS schoolIds, n.actor_user_id AS actorUserId,
         CONCAT_WS(' ', NULLIF(actor.first_name, ''), NULLIF(actor.last_name, '')) AS actorName,
         actor.role AS actorRole, n.created_at AS createdAt,
         (nr.notification_id IS NOT NULL) AS isRead
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       ${where}${statusFilter}
       ORDER BY (nr.notification_id IS NULL) DESC, n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, ...params, perPage, offset],
    );

    const scopedNotifications = notifications.map((notification) => {
      const sanitizedLink = sanitizeNotificationLink(notification.linkTo);
      if (!scope.global && notification.entityType === 'user') {
        return {
          ...notification,
          linkTo: notification.schoolId ? `/community/school/${notification.schoolId}` : '/notifications',
        };
      }
      if (scope.superAdmin && ['/beneficiary', '/program', '/monitoring', '/progress-report'].some((path) => (
        notification.linkTo === path || String(notification.linkTo || '').startsWith(`${path}/`)
      ))) {
        return { ...notification, linkTo: '/notifications' };
      }
      return { ...notification, linkTo: sanitizedLink };
    });

    res.json({
      total,
      counts: {
        all: Number(countRow?.total || 0),
        read: Number(countRow?.readCount || 0),
        unread: Number(countRow?.unreadCount || 0),
      },
      notifications: scopedNotifications,
    });
  } catch (error) {
    console.error('[Notifications API] GET / error:', error.stack || error.message);
    if (res.headersSent) return;
    return res.status(500).json({ error: 'Unable to load notifications' });
  }
});

async function updateNotificationReadState(req, res, isRead) {
  try {
    const notificationId = parsePositiveIntegerId(req.params.id);
    if (notificationId === null) return res.status(400).json({ error: 'Notification ID must be a positive integer' });
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    if (!scope.global && !scope.schoolId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const { filters, params } = buildNotificationFilters(req.user, scope);
    filters.push('n.id = ?');
    params.push(notificationId);
    const [[visibleNotification]] = await pool.query(
      `SELECT n.id
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       WHERE ${filters.join(' AND ')}
       LIMIT 1`,
      params,
    );
    if (!visibleNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const [result] = isRead
      ? await pool.query(
        'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
        [visibleNotification.id, req.user.id],
      )
      : await pool.query(
        'DELETE FROM notification_reads WHERE notification_id = ? AND user_id = ?',
        [visibleNotification.id, req.user.id],
      );
    res.json({ success: true, isRead, changed: Number(result?.affectedRows) || 0 });
  } catch (error) {
    console.error('[Notifications API] Unable to update notification read state:', error.message);
    res.status(500).json({ error: 'Unable to update notification read state' });
  }
}

router.post('/read-all', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    if (!scope.global && !scope.schoolId) {
      return res.json({ success: true, changed: 0 });
    }
    const { filters, params } = getAuthorizedNotificationFilters(req.user, scope);
    const [result] = await pool.query(
      `INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
       SELECT n.id, ?, CURRENT_TIMESTAMP
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       WHERE ${filters.join(' AND ')} AND nr.notification_id IS NULL`,
      [req.user.id, req.user.id, ...params],
    );
    res.json({ success: true, changed: Number(result?.affectedRows) || 0 });
  } catch (error) {
    console.error('[Notifications API] POST /read-all error:', error.message);
    res.status(500).json({ error: 'Unable to mark notifications as read' });
  }
});

router.post('/bulk-read', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const ids = req.body?.ids;
    const isRead = req.body?.isRead;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || typeof isRead !== 'boolean') {
      return res.status(400).json({ error: 'Provide 1 to 100 notification IDs and a boolean isRead value' });
    }
    const notificationIds = [...new Set(ids.map(parsePositiveIntegerId))];
    if (notificationIds.some((id) => id === null)) {
      return res.status(400).json({ error: 'Notification IDs must be positive integers' });
    }
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    if (!scope.global && !scope.schoolId) {
      return res.json({ success: true, isRead, changed: 0 });
    }
    const { filters, params } = getAuthorizedNotificationFilters(req.user, scope);
    const idFilter = `n.id IN (${notificationIds.map(() => '?').join(', ')})`;
    const [result] = isRead
      ? await pool.query(
        `INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
         SELECT n.id, ?, CURRENT_TIMESTAMP
         FROM notifications n
         LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
         WHERE ${filters.join(' AND ')} AND ${idFilter} AND nr.notification_id IS NULL`,
        [req.user.id, req.user.id, ...params, ...notificationIds],
      )
      : await pool.query(
        `DELETE nr FROM notification_reads nr
         INNER JOIN notifications n ON n.id = nr.notification_id
         WHERE nr.user_id = ? AND ${filters.join(' AND ')} AND ${idFilter}`,
        [req.user.id, ...params, ...notificationIds],
      );
    res.json({ success: true, isRead, changed: Number(result?.affectedRows) || 0 });
  } catch (error) {
    console.error('[Notifications API] POST /bulk-read error:', error.message);
    res.status(500).json({ error: 'Unable to update notification read states' });
  }
});

router.post('/:id/read', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), (req, res) => (
  updateNotificationReadState(req, res, true)
));

router.patch('/:id/read', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), (req, res) => {
  if (typeof req.body?.isRead !== 'boolean') {
    return res.status(400).json({ error: 'isRead must be a boolean' });
  }
  return updateNotificationReadState(req, res, req.body.isRead);
});

router.post('/download-success', authorize('admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  const scope = getNotificationScope(req.user);
  if (!scope || (!scope.global && !scope.schoolId)) {
    return res.status(403).json({ error: 'Assign this account to a school before recording downloads' });
  }

  await createSuperadminNotification({
    eventType: 'download.progress_report.csv',
    category: 'Downloads',
    title: 'Progress report download started',
    message: 'A CSV progress report was generated and its download was started.',
    entityType: 'download',
    linkTo: '/progress-report',
    schoolId: scope.global ? null : scope.schoolId,
    schoolIds: scope.global ? undefined : [scope.schoolId],
    actorUserId: req.user?.id,
  });
  res.status(201).json({ success: true });
});

module.exports = router;
module.exports.buildNotificationFilters = buildNotificationFilters;
