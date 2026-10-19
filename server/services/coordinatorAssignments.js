const COORDINATOR_ROLES = new Set([
  'communitycoordinator',
  'communityorganizer',
  'coordinator',
  'co',
  'partner',
]);

function isCoordinatorRole(role) {
  return COORDINATOR_ROLES.has(String(role || '').trim().toLowerCase().replace(/[\s_]/g, ''));
}

function assignmentConflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = 'COORDINATOR_ASSIGNMENT_CONFLICT';
  return error;
}

async function withTransaction(pool, callback) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[Coordinator assignments] Transaction rollback failed:', rollbackError.message);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function lockSchools(connection, schoolIds) {
  const ids = [...new Set(schoolIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `SELECT id, coordinator_id FROM communities WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
    ids,
  );
  return rows;
}

async function lockCoordinator(connection, coordinatorId) {
  const [rows] = await connection.query(
    'SELECT id, role, school_id FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [coordinatorId],
  );
  return rows[0] || null;
}

async function assertCoordinatorAvailable(connection, coordinatorId, schoolId, allowRoleChange = false) {
  const coordinator = await lockCoordinator(connection, coordinatorId);
  if (!coordinator || (!allowRoleChange && !isCoordinatorRole(coordinator.role))) {
    const error = new Error('Select a valid Community Coordinator.');
    error.status = 400;
    throw error;
  }

  const assignedSchoolId = Number(coordinator.school_id) || null;
  if (assignedSchoolId && assignedSchoolId !== Number(schoolId)) {
    throw assignmentConflict('This Community Coordinator is already assigned to another school. Unassign them before assigning a different school.');
  }

  const [otherAssignments] = await connection.query(
    'SELECT id FROM communities WHERE coordinator_id = ? AND (? IS NULL OR id <> ?) LIMIT 1',
    [coordinatorId, schoolId || null, schoolId || null],
  );
  if (otherAssignments.length) {
    throw assignmentConflict('This Community Coordinator is already assigned to another school. Unassign them before assigning a different school.');
  }

  return coordinator;
}

function assertSchoolCoordinatorAvailable(school, coordinatorId) {
  if (school?.coordinator_id && String(school.coordinator_id) !== String(coordinatorId || '')) {
    throw assignmentConflict('This school already has a different Community Coordinator. Unassign the current coordinator before assigning another.');
  }
}

function isAssignmentConflict(error) {
  return error?.code === 'COORDINATOR_ASSIGNMENT_CONFLICT'
    || isAssignmentConstraintViolation(error);
}

function isAssignmentConstraintViolation(error) {
  return error?.code === 'ER_DUP_ENTRY'
    && /uq_communities_coordinator_id|uq_users_coordinator_school_id/i.test(error.message || '');
}

module.exports = {
  assertCoordinatorAvailable,
  assertSchoolCoordinatorAvailable,
  isAssignmentConflict,
  isAssignmentConstraintViolation,
  isCoordinatorRole,
  lockCoordinator,
  lockSchools,
  withTransaction,
};
