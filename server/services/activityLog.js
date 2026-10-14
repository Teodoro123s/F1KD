const pool = require('../db');

async function recordActivity({
  actor,
  category,
  action,
  entityType = null,
  entityId = null,
  description,
}, database = pool) {
  const actorName = String(actor?.name || actor?.full_name || actor?.email || 'Unknown user').trim();

  try {
    await database.query(
      `INSERT INTO activity_logs
        (actor_user_id, actor_name, actor_email, actor_role, category, action, entity_type, entity_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor?.id || null,
        actorName || 'Unknown user',
        actor?.email || null,
        actor?.role || null,
        category,
        action,
        entityType,
        entityId === null || entityId === undefined ? null : String(entityId),
        description,
      ],
    );
  } catch (error) {
    console.error('[Activity Log] Unable to record activity:', error.message);
  }
}

module.exports = { recordActivity };
