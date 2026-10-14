const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getNotificationScope } = require('../services/notificationAccess');
const { createSuperadminNotification } = require('../services/notifications');

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
  return { filters, params };
}

router.get('/', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.perPage, 10) || 50));
    const offset = (page - 1) * perPage;
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

    const { filters, params } = buildNotificationFilters(req.user, scope, category, search);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(nr.notification_id IS NOT NULL), 0) AS readCount,
         COALESCE(SUM(nr.notification_id IS NULL), 0) AS unreadCount
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       ${where}`,
      [req.user.id, ...params],
    );
    const statusFilter = readStatus === 'all' ? '' : readStatus === 'read'
      ? ' AND nr.notification_id IS NOT NULL'
      : ' AND nr.notification_id IS NULL';
    let total = Number(countRow?.total || 0);
    if (readStatus !== 'all') {
      const [[filteredCount]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM notifications n
         LEFT JOIN users actor ON actor.id = n.actor_user_id
         LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
         ${where}${statusFilter}`,
        [req.user.id, ...params],
      );
      total = Number(filteredCount?.total || 0);
    }
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
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, ...params, perPage, offset],
    );

    const scopedNotifications = notifications.map((notification) => {
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
      return notification;
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
    console.error('[Notifications API] GET / error:', error.message);
    res.status(500).json({ error: 'Unable to load notifications' });
  }
});

router.post('/:id/read', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    const scope = getNotificationScope(req.user);
    if (!scope) return res.status(403).json({ error: 'Forbidden' });
    if (!scope.global && !scope.schoolId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const { filters, params } = buildNotificationFilters(req.user, scope);
    filters.push('n.id = ?');
    params.push(req.params.id);
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
    await pool.query(
      'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
      [visibleNotification.id, req.user.id],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications API] POST /:id/read error:', error.message);
    res.status(500).json({ error: 'Unable to mark notification as read' });
  }
});

router.post('/download-success', authorize('admin', 'partner'), async (req, res) => {
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