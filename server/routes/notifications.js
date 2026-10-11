const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getNotificationScope, getNotificationFilters } = require('../services/notificationAccess');
const { createSuperadminNotification } = require('../services/notifications');

router.use(verifyToken);

router.get('/unread-count', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const notificationFilters = getNotificationFilters(req.user);
    if (!notificationFilters) return res.status(403).json({ error: 'Forbidden' });
    if (notificationFilters.where === '1 = 0') return res.json({ unreadCount: 0 });

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS unreadCount
       FROM notifications n
       JOIN users read_state ON read_state.id = ?
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       WHERE ${notificationFilters.where}
         AND n.id > read_state.last_notifications_read_id`,
      [req.user.id, ...notificationFilters.params],
    );
    res.json({ unreadCount: Number(rows[0]?.unreadCount || 0) });
  } catch (error) {
    console.error('[Notifications API] GET /unread-count error:', error.message);
    res.status(500).json({ error: 'Unable to load unread notification count' });
  }
});

router.post('/mark-read', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const notificationFilters = getNotificationFilters(req.user);
    if (!notificationFilters) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      `SELECT COALESCE(MAX(n.id), 0) AS latestNotificationId
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       WHERE ${notificationFilters.where}`,
      notificationFilters.params,
    );
    await pool.query(
      'UPDATE users SET last_notifications_read_id = GREATEST(last_notifications_read_id, ?) WHERE id = ?',
      [rows[0]?.latestNotificationId || 0, req.user.id],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications API] POST /mark-read error:', error.message);
    res.status(500).json({ error: 'Unable to mark notifications as read' });
  }
});

router.get('/', authorize('super_admin', 'admin', 'community_coordinator', 'partner', 'health_worker'), async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.perPage, 10) || 50));
    const offset = (page - 1) * perPage;
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const notificationFilters = getNotificationFilters(req.user, { category, search });
    if (!notificationFilters) return res.status(403).json({ error: 'Forbidden' });
    const { scope } = notificationFilters;
    if (notificationFilters.where === '1 = 0') {
      return res.json({ total: 0, notifications: [] });
    }

    const where = `WHERE ${notificationFilters.where}`;
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notifications n LEFT JOIN users actor ON actor.id = n.actor_user_id ${where}`,
      notificationFilters.params,
    );
    const [notifications] = await pool.query(
        `SELECT n.id, n.event_type AS eventType, n.category, n.title, n.message, n.entity_type AS entityType,
         n.entity_id AS entityId, n.link_to AS linkTo, n.school_id AS schoolId, n.group_id AS groupId,
         n.school_scope_ids AS schoolIds, n.actor_user_id AS actorUserId,
         CONCAT_WS(' ', NULLIF(actor.first_name, ''), NULLIF(actor.last_name, '')) AS actorName,
         actor.role AS actorRole, n.created_at AS createdAt
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       ${where}
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [...notificationFilters.params, perPage, offset],
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

    res.json({ total: Number(countRow?.total || 0), notifications: scopedNotifications });
  } catch (error) {
    console.error('[Notifications API] GET / error:', error.message);
    res.status(500).json({ error: 'Unable to load notifications' });
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