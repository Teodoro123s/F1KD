async function createSuperadminNotification(event, database) {
  const title = String(event?.title || 'Notification').trim().slice(0, 120);
  const message = String(event?.message || '').trim().slice(0, 500);
  if (!message) return;

  try {
    const store = database || require('../db');
    const hasCreatedAt = Boolean(event.createdAt);
    const recipientUserIds = Array.isArray(event.recipientUserIds)
      ? [...new Set(event.recipientUserIds.map(Number).filter((userId) => Number.isInteger(userId) && userId > 0))].join(',') || null
      : null;
    const sql = `INSERT INTO notifications
        (event_type, category, title, message, entity_type, entity_id, link_to, school_id, group_id, school_scope_ids, recipient_user_ids, actor_user_id${hasCreatedAt ? ', created_at' : ''})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasCreatedAt ? ', ?' : ''})`;
    const params = [
      String(event.eventType || 'system.event').slice(0, 80),
      String(event.category || 'System').slice(0, 40),
      title,
      message,
      event.entityType ? String(event.entityType).slice(0, 32) : null,
      event.entityId === undefined || event.entityId === null ? null : String(event.entityId).slice(0, 80),
      event.linkTo && String(event.linkTo).startsWith('/') ? String(event.linkTo).slice(0, 255) : null,
      event.schoolId || null,
      event.groupId || null,
      Array.isArray(event.schoolIds)
        ? [...new Set(event.schoolIds.map(Number).filter((schoolId) => Number.isInteger(schoolId) && schoolId > 0))].join(',') || null
        : (event.schoolScopeIds ? String(event.schoolScopeIds) : null),
      recipientUserIds,
      event.actorUserId || null,
    ];
    if (hasCreatedAt) {
      params.push(new Date(event.createdAt));
    }
    await store.query(sql, params);
  } catch (error) {
    console.error('[Notifications] Unable to record event:', error.message);
  }
}

async function getBeneficiaryUpdateRecipients(database, schoolId, actorUserId) {
  const recipientIds = new Set(
    [actorUserId].map(Number).filter((userId) => Number.isInteger(userId) && userId > 0),
  );
  const assignedSchoolId = Number(schoolId);
  if (!Number.isInteger(assignedSchoolId) || assignedSchoolId <= 0) return [...recipientIds];

  try {
    const store = database || require('../db');
    const [coordinators] = await store.query(
      `SELECT id FROM users
       WHERE school_id = ?
         AND LOWER(TRIM(status)) = 'active'
         AND LOWER(TRIM(role)) IN ('community organizer', 'community coordinator', 'community_organizer', 'community_coordinator', 'communitycoordinator', 'communityorganizer', 'coordinator', 'co', 'partner')`,
      [assignedSchoolId],
    );
    coordinators.forEach(({ id }) => {
      const userId = Number(id);
      if (Number.isInteger(userId) && userId > 0) recipientIds.add(userId);
    });
  } catch (error) {
    console.error('[Notifications] Unable to resolve beneficiary update recipients:', error.message);
  }
  return [...recipientIds];
}

module.exports = { createSuperadminNotification, getBeneficiaryUpdateRecipients };