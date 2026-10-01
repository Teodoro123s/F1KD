const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbName = process.env.DB_NAME || 'f1kd';
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (process.env.NODE_ENV === 'production' || !localHosts.has(dbHost) || dbName !== 'f1kd') {
  throw new Error('Notification samples are restricted to the local f1kd development database.');
}

const pool = require('../db');

async function insertNotification(connection, event) {
  await connection.query(
    `INSERT INTO notifications
      (event_type, category, title, message, entity_type, entity_id, link_to, school_id, group_id, actor_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `demo.${event.eventType}`,
      event.category,
      event.title,
      event.message,
      event.entityType,
      String(event.entityId),
      event.linkTo,
      event.schoolId || null,
      event.groupId || null,
      event.actorUserId,
    ],
  );
}

async function main() {
  await pool.ready;
  const connection = await pool.getConnection();
  const token = Date.now().toString(36).toUpperCase();
  const userPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  let ids;

  try {
    await connection.beginTransaction();
    const [[superadmin]] = await connection.query(
      `SELECT id FROM users
       WHERE LOWER(REPLACE(TRIM(role), ' ', '_')) IN ('super_admin', 'superadmin')
       ORDER BY id LIMIT 1`,
    );
    const actorUserId = superadmin?.id || null;

    const sampleSchoolName = `Notification Sample School ${token}`;
    const sampleGroupName = `Notification Sample Group ${token}`;
    const sampleBatchName = `Notification Sample Batch ${token}`;
    const sampleUserName = `Notification Sample User ${token}`;
    const [schoolResult] = await connection.query(
      'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
      [`COM-${token}`, sampleSchoolName, 'Notification Test Area'],
    );
    const schoolId = schoolResult.insertId;
    const [groupResult] = await connection.query(
      'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      [`GRP-${token}`, schoolId, sampleGroupName, 'Sample Leader', 1, 'Active'],
    );
    const groupId = groupResult.insertId;
    const [batchResult] = await connection.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [`BAT-${token}`, schoolId, sampleBatchName, 0, 0, 'Active'],
    );
    const batchId = batchResult.insertId;
    await connection.query('INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, batchId]);

    const [userResult] = await connection.query(
      `INSERT INTO users (first_name, last_name, email, role, status, password_hash, school_id, group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Notification', `Sample ${token}`, `notification.sample.${token}@example.test`, 'Partner', 'Active', userPasswordHash, schoolId, groupId],
    );
    const userId = userResult.insertId;
    const userDetailPath = `/user-management/user/${userId}`;
    const groupPath = `/community/group/${groupId}`;
    const schoolPath = `/community/school/${schoolId}`;

    await insertNotification(connection, {
      eventType: 'user.created', category: 'User Management', title: 'User created',
      message: `${sampleUserName} was created with the Partner role.`, entityType: 'user', entityId: userId,
      linkTo: userDetailPath, schoolId, groupId, actorUserId,
    });
    await insertNotification(connection, {
      eventType: 'school.created', category: 'Community', title: 'School created',
      message: `${sampleSchoolName} was added to Community.`, entityType: 'school', entityId: schoolId,
      linkTo: schoolPath, schoolId, actorUserId,
    });
    await insertNotification(connection, {
      eventType: 'group.created', category: 'Community', title: 'Group created',
      message: `${sampleGroupName} was created under ${sampleSchoolName}.`, entityType: 'group', entityId: groupId,
      linkTo: groupPath, schoolId, groupId, actorUserId,
    });
    await insertNotification(connection, {
      eventType: 'batch.created', category: 'Community', title: 'Batch created',
      message: `${sampleBatchName} was created under ${sampleGroupName}.`, entityType: 'batch', entityId: batchId,
      linkTo: groupPath, schoolId, groupId, actorUserId,
    });

    await connection.query('UPDATE communities SET area = ? WHERE id = ?', ['Updated Notification Test Area', schoolId]);
    await insertNotification(connection, {
      eventType: 'school.updated', category: 'Community', title: 'School updated',
      message: `${sampleSchoolName} was updated.`, entityType: 'school', entityId: schoolId,
      linkTo: schoolPath, schoolId, actorUserId,
    });
    await connection.query('UPDATE groups SET name = ? WHERE id = ?', [`${sampleGroupName} Updated`, groupId]);
    await insertNotification(connection, {
      eventType: 'group.updated', category: 'Community', title: 'Group updated',
      message: `${sampleGroupName} was updated.`, entityType: 'group', entityId: groupId,
      linkTo: groupPath, schoolId, groupId, actorUserId,
    });
    await connection.query('UPDATE batches SET name = ? WHERE id = ?', [`${sampleBatchName} Updated`, batchId]);
    await insertNotification(connection, {
      eventType: 'batch.updated', category: 'Community', title: 'Batch updated',
      message: `${sampleBatchName} was updated.`, entityType: 'batch', entityId: batchId,
      linkTo: groupPath, schoolId, groupId, actorUserId,
    });
    await connection.query('UPDATE users SET role = ? WHERE id = ?', ['Health worker', userId]);
    await insertNotification(connection, {
      eventType: 'user.access_updated', category: 'User Management', title: 'User access updated',
      message: `${sampleUserName} was assigned the Health worker role and a school/group.`, entityType: 'user', entityId: userId,
      linkTo: userDetailPath, schoolId, groupId, actorUserId,
    });
    await connection.query('UPDATE users SET status = ? WHERE id = ?', ['Suspended', userId]);
    await insertNotification(connection, {
      eventType: 'user.suspended', category: 'User Management', title: 'User suspended',
      message: `${sampleUserName} was suspended.`, entityType: 'user', entityId: userId,
      linkTo: userDetailPath, schoolId, groupId, actorUserId,
    });
    await connection.query('UPDATE users SET status = ? WHERE id = ?', ['Active', userId]);
    await insertNotification(connection, {
      eventType: 'user.reactivated', category: 'User Management', title: 'User reactivated',
      message: `${sampleUserName} was reactivated.`, entityType: 'user', entityId: userId,
      linkTo: userDetailPath, schoolId, groupId, actorUserId,
    });

    const [deleteBatchResult] = await connection.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [`DBT-${token}`, schoolId, `Delete Sample Batch ${token}`, 0, 0, 'Active'],
    );
    const deleteBatchId = deleteBatchResult.insertId;
    await connection.query('INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, deleteBatchId]);
    await insertNotification(connection, {
      eventType: 'batch.deleted', category: 'Community', title: 'Batch deleted',
      message: `Delete Sample Batch ${token} was removed.`, entityType: 'batch', entityId: deleteBatchId,
      linkTo: groupPath, schoolId, groupId, actorUserId,
    });
    await connection.query('DELETE FROM batches WHERE id = ?', [deleteBatchId]);

    const [deleteGroupResult] = await connection.query(
      'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      [`DGR-${token}`, schoolId, `Delete Sample Group ${token}`, 'Sample Leader', 0, 'Active'],
    );
    const deleteGroupId = deleteGroupResult.insertId;
    await insertNotification(connection, {
      eventType: 'group.deleted', category: 'Community', title: 'Group deleted',
      message: `Delete Sample Group ${token} was removed.`, entityType: 'group', entityId: deleteGroupId,
      linkTo: schoolPath, schoolId, groupId: deleteGroupId, actorUserId,
    });
    await connection.query('DELETE FROM groups WHERE id = ?', [deleteGroupId]);

    const [deleteSchoolResult] = await connection.query(
      'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
      [`DSC-${token}`, `Delete Sample School ${token}`, 'Notification Test Area'],
    );
    await insertNotification(connection, {
      eventType: 'school.deleted', category: 'Community', title: 'School deleted',
      message: `Delete Sample School ${token} was removed.`, entityType: 'school', entityId: deleteSchoolResult.insertId,
      linkTo: '/community', schoolId: deleteSchoolResult.insertId, actorUserId,
    });
    await connection.query('DELETE FROM communities WHERE id = ?', [deleteSchoolResult.insertId]);

    const [deleteUserResult] = await connection.query(
      `INSERT INTO users (first_name, last_name, email, role, status, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Delete', `Sample ${token}`, `notification.delete.${token}@example.test`, 'Partner', 'Active', userPasswordHash],
    );
    await insertNotification(connection, {
      eventType: 'user.deleted', category: 'User Management', title: 'User deleted',
      message: `Delete Sample ${token} was removed from User Management.`, entityType: 'user', entityId: deleteUserResult.insertId,
      linkTo: '/user-management', actorUserId,
    });
    await connection.query('DELETE FROM users WHERE id = ?', [deleteUserResult.insertId]);

    await connection.commit();
    ids = { schoolId, groupId, batchId, userId, sampleUserEmail: `notification.sample.${token}@example.test`, token };

    const { seedNotificationSamples } = require('../services/notificationSeed');
    const { count: seededCount } = await seedNotificationSamples(pool);
    console.log(`Successfully seeded ${seededCount} comprehensive sample notifications across Beneficiaries, Monitoring, Programs, Community, and Community Organizer user events.`);
    console.log('Notification demo data created in local f1kd database:', JSON.stringify(ids, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed notification demo data:', error.message);
  process.exitCode = 1;
});