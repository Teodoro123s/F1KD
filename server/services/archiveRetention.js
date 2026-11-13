const { deleteFileFromStorage } = require('../middleware/documentUpload');

const RETENTION_MONTHS = 9;
const SCHEDULER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FILE_DELETE_BATCH_SIZE = 100;
const TEMP_TABLES = {
  communities: 'tmp_archive_retention_communities',
  groups: 'tmp_archive_retention_groups',
  batches: 'tmp_archive_retention_batches',
  mothers: 'tmp_archive_retention_mothers',
  children: 'tmp_archive_retention_children',
  programs: 'tmp_archive_retention_programs',
  users: 'tmp_archive_retention_users',
};
const TARGETS = [
  { table: 'children', type: 'child', codeColumn: 'child_code', idsTable: TEMP_TABLES.children },
  { table: 'mothers', type: 'mother', codeColumn: 'mother_code', idsTable: TEMP_TABLES.mothers },
  { table: 'groups', type: 'group', codeColumn: 'group_code', idsTable: TEMP_TABLES.groups },
  { table: 'batches', type: 'batch', codeColumn: 'batch_code', idsTable: TEMP_TABLES.batches },
  { table: 'programs', type: 'program', codeColumn: null, idsTable: TEMP_TABLES.programs },
  { table: 'communities', type: 'school', codeColumn: 'community_code', idsTable: TEMP_TABLES.communities },
];

const PENDING_FILE_QUERY = `SELECT queued_file.id, queued_file.file_path
  FROM archive_file_deletion_queue queued_file
  WHERE NOT EXISTS (
    SELECT 1 FROM mothers
    WHERE birth_certificate_document_path = queued_file.file_path
      OR consent_document_path = queued_file.file_path
    UNION ALL
    SELECT 1 FROM children WHERE birth_document_path = queued_file.file_path
    UNION ALL
    SELECT 1 FROM batch_documentations WHERE file_path = queued_file.file_path
    UNION ALL
    SELECT 1 FROM program_receipt_documentations WHERE file_path = queued_file.file_path
  )
  ORDER BY queued_file.id LIMIT ${FILE_DELETE_BATCH_SIZE}`;

async function createExpiredIdTables(connection) {
  for (const table of Object.values(TEMP_TABLES)) {
    await connection.query(`CREATE TEMPORARY TABLE ${table} (id INT PRIMARY KEY) ENGINE=InnoDB`);
  }

  const statements = [
    `INSERT INTO ${TEMP_TABLES.communities}
     SELECT id FROM communities
     WHERE archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)`,
    `INSERT INTO ${TEMP_TABLES.groups}
     SELECT g.id FROM groups g
     WHERE g.archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)
       OR g.community_id IN (SELECT id FROM ${TEMP_TABLES.communities})`,
    `INSERT INTO ${TEMP_TABLES.batches}
     SELECT b.id FROM batches b
     WHERE b.archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)
       OR b.community_id IN (SELECT id FROM ${TEMP_TABLES.communities})
       OR b.id IN (
         SELECT gb.batch_id FROM group_batch gb
         WHERE gb.group_id IN (SELECT id FROM ${TEMP_TABLES.groups})
       )
       OR b.id IN (
         SELECT m.batch_id FROM mothers m
         WHERE m.batch_id IS NOT NULL AND m.group_id IN (SELECT id FROM ${TEMP_TABLES.groups})
       )`,
    `INSERT INTO ${TEMP_TABLES.mothers}
     SELECT m.id FROM mothers m
     WHERE m.archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)
       OR m.community_id IN (SELECT id FROM ${TEMP_TABLES.communities})
       OR m.group_id IN (SELECT id FROM ${TEMP_TABLES.groups})
       OR m.batch_id IN (SELECT id FROM ${TEMP_TABLES.batches})`,
    `INSERT INTO ${TEMP_TABLES.children}
     SELECT c.id FROM children c
     WHERE c.archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)
       OR c.community_id IN (SELECT id FROM ${TEMP_TABLES.communities})
       OR c.group_id IN (SELECT id FROM ${TEMP_TABLES.groups})
       OR c.batch_id IN (SELECT id FROM ${TEMP_TABLES.batches})
       OR c.mother_id IN (SELECT id FROM ${TEMP_TABLES.mothers})`,
    `INSERT INTO ${TEMP_TABLES.programs}
     SELECT id FROM programs
     WHERE archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)`,
    `INSERT INTO ${TEMP_TABLES.users}
     SELECT id FROM users
     WHERE archived_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${RETENTION_MONTHS} MONTH)`,
  ];

  for (const statement of statements) await connection.query(statement);
}

async function enqueueExpiredRecordFiles(connection) {
  await connection.query(
    `INSERT IGNORE INTO archive_file_deletion_queue (file_path)
     SELECT DISTINCT file_path FROM (
       SELECT m.birth_certificate_document_path AS file_path
       FROM mothers m WHERE m.id IN (SELECT id FROM ${TEMP_TABLES.mothers})
       UNION ALL
       SELECT m.consent_document_path
       FROM mothers m WHERE m.id IN (SELECT id FROM ${TEMP_TABLES.mothers})
       UNION ALL
       SELECT c.birth_document_path
       FROM children c WHERE c.id IN (SELECT id FROM ${TEMP_TABLES.children})
       UNION ALL
       SELECT d.file_path
       FROM batch_documentations d WHERE d.batch_id IN (SELECT id FROM ${TEMP_TABLES.batches})
       UNION ALL
       SELECT d.file_path
       FROM program_receipt_documentations d
       JOIN program_receipt_documentation_sets s ON s.id = d.documentation_set_id
       WHERE s.program_id IN (SELECT id FROM ${TEMP_TABLES.programs})
     ) expired_files
     WHERE file_path IS NOT NULL AND TRIM(file_path) <> ''`,
  );
}

async function deleteExpiredEntityActivity(connection) {
  for (const target of TARGETS) {
    const notificationIdsSql = target.codeColumn
      ? `SELECT CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
         FROM ${target.table} WHERE id IN (SELECT id FROM ${target.idsTable})
         UNION SELECT ${target.codeColumn} COLLATE utf8mb4_unicode_ci
         FROM ${target.table} WHERE id IN (SELECT id FROM ${target.idsTable})`
      : `SELECT CAST(id AS CHAR) FROM ${target.table} WHERE id IN (SELECT id FROM ${target.idsTable})`;
    await connection.query(
      `DELETE FROM activity_logs
       WHERE entity_type = ? AND entity_id IN (SELECT id FROM ${target.idsTable})`,
      [target.type],
    );
    await connection.query(
      `DELETE FROM notifications
       WHERE entity_type = ?
         AND CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci IN (${notificationIdsSql})`,
      [target.type],
    );
  }
  await connection.query(
    `DELETE FROM activity_logs
     WHERE entity_type = 'philhealth_claim'
       AND CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci IN (
         SELECT CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci FROM philhealth_claims
         WHERE mother_id IN (SELECT id FROM ${TEMP_TABLES.mothers})
       )`,
  );
  await connection.query(
    `DELETE FROM notifications
     WHERE entity_type = 'philhealth_claim'
       AND CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci IN (
         SELECT CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci FROM philhealth_claims
         WHERE mother_id IN (SELECT id FROM ${TEMP_TABLES.mothers})
       )`,
  );
  await connection.query(
    `DELETE FROM notifications
     WHERE school_id IN (SELECT id FROM ${TEMP_TABLES.communities})
       OR group_id IN (SELECT id FROM ${TEMP_TABLES.groups})
       OR EXISTS (
         SELECT 1 FROM ${TEMP_TABLES.communities} archived_school
         WHERE FIND_IN_SET(
           CAST(archived_school.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci,
           CONVERT(notifications.school_scope_ids USING utf8mb4) COLLATE utf8mb4_unicode_ci
         ) > 0
       )`,
  );
}

async function anonymizeExpiredUserData(connection) {
  const [userColumns] = await connection.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND is_nullable = 'YES'
       AND data_type IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint')
       AND (column_name LIKE '%user_id' OR column_name = 'monitored_by')
       AND table_name NOT IN ('users', 'activity_logs', 'notifications')`,
  );
  for (const { table_name: tableName, column_name: columnName } of userColumns) {
    await connection.query(
      `UPDATE \`${tableName}\`
       SET \`${columnName}\` = NULL
       WHERE \`${columnName}\` IN (SELECT id FROM ${TEMP_TABLES.users})`,
    );
  }

  await connection.query(
    `UPDATE users
     SET archived_by_user_id = NULL
     WHERE archived_by_user_id IN (SELECT id FROM ${TEMP_TABLES.users})`,
  );
  await connection.query(
    `UPDATE activity_logs
     SET actor_user_id = NULL,
         actor_name = 'Archived user',
         actor_email = NULL,
         description = 'Activity details retained; archived account identity removed.'
     WHERE actor_user_id IN (SELECT id FROM ${TEMP_TABLES.users})`,
  );
  await connection.query(
    `UPDATE activity_logs
     SET description = 'Activity details retained; archived account identity removed.'
     WHERE entity_type = 'user'
       AND CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci IN (
         SELECT CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
         FROM ${TEMP_TABLES.users}
       )`,
  );
  await connection.query(
    `UPDATE notifications
     SET actor_user_id = NULL,
         title = 'Archived account activity',
         message = 'Details removed after the archived account retention period.'
     WHERE actor_user_id IN (SELECT id FROM ${TEMP_TABLES.users})
        OR (entity_type = 'user'
            AND CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci IN (
              SELECT CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
              FROM ${TEMP_TABLES.users}
            ))`,
  );
  const [expiredUsers] = await connection.query(`SELECT id FROM ${TEMP_TABLES.users}`);
  for (const { id } of expiredUsers) {
    await connection.query(
      `UPDATE notifications
       SET recipient_user_ids = NULLIF(
         TRIM(BOTH ',' FROM REPLACE(
           CONCAT(',', recipient_user_ids, ','),
           CONCAT(',', CAST(? AS CHAR), ','),
           ','
         )),
         ''
       )
       WHERE FIND_IN_SET(CAST(? AS CHAR), recipient_user_ids) > 0`,
      [id, id],
    );
  }
  await connection.query(
    `DELETE FROM notification_reads
     WHERE user_id IN (SELECT id FROM ${TEMP_TABLES.users})`,
  );
  await connection.query(
    `DELETE FROM notification_preferences
     WHERE user_id IN (SELECT id FROM ${TEMP_TABLES.users})`,
  );
  await connection.query(
    `DELETE FROM password_reset_codes
     WHERE LOWER(TRIM(email)) IN (
       SELECT LOWER(TRIM(email)) FROM users
       WHERE id IN (SELECT id FROM ${TEMP_TABLES.users})
     )`,
  );
  await connection.query(
    `UPDATE communities
     SET coordinator_id = NULL
     WHERE coordinator_id IN (SELECT id FROM ${TEMP_TABLES.users})`,
  );
}

async function processPendingFileDeletions(database, deleteFile) {
  const [files] = await database.query(PENDING_FILE_QUERY);
  let deleted = 0;
  for (const file of files) {
    try {
      await deleteFile(file.file_path);
      await database.query('DELETE FROM archive_file_deletion_queue WHERE id = ?', [file.id]);
      deleted += 1;
    } catch (error) {
      await database.query(
        `UPDATE archive_file_deletion_queue
         SET attempts = attempts + 1, last_error = ?
         WHERE id = ?`,
        [String(error.message || error).slice(0, 1000), file.id],
      );
      console.error(`[Archive Retention] Unable to delete stored file ${file.file_path}:`, error.message || error);
    }
  }
  return deleted;
}

async function runArchiveRetentionJob(database, { deleteFile = deleteFileFromStorage } = {}) {
  const connection = await database.getConnection();
  let purgedRecords = 0;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await createExpiredIdTables(connection);
    await enqueueExpiredRecordFiles(connection);
    await deleteExpiredEntityActivity(connection);
    await anonymizeExpiredUserData(connection);

    for (const target of TARGETS) {
      const [result] = await connection.query(
        `DELETE FROM ${target.table} WHERE id IN (SELECT id FROM ${target.idsTable})`,
      );
      purgedRecords += Number(result.affectedRows) || 0;
    }
    const [purgedUsers] = await connection.query(
      `DELETE FROM users WHERE id IN (SELECT id FROM ${TEMP_TABLES.users})`,
    );
    purgedRecords += Number(purgedUsers.affectedRows) || 0;

    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    try {
      for (const table of Object.values(TEMP_TABLES)) {
        await connection.query(`DROP TEMPORARY TABLE IF EXISTS ${table}`);
      }
    } finally {
      connection.release();
    }
  }

  const deletedFiles = await processPendingFileDeletions(database, deleteFile);
  return { purgedRecords, deletedFiles };
}

function startArchiveRetentionScheduler(database, {
  intervalMs = SCHEDULER_INTERVAL_MS,
  deleteFile = deleteFileFromStorage,
} = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runArchiveRetentionJob(database, { deleteFile });
      if (result.purgedRecords || result.deletedFiles) {
        console.info(
          `[Archive Retention] Purged ${result.purgedRecords} records and removed ${result.deletedFiles} files older than ${RETENTION_MONTHS} months.`,
        );
      }
    } catch (error) {
      console.error('[Archive Retention] Scheduled purge failed:', error.stack || error.message);
    } finally {
      running = false;
    }
  };

  const interval = setInterval(() => { void tick(); }, intervalMs);
  void tick();
  return () => clearInterval(interval);
}

module.exports = {
  RETENTION_MONTHS,
  runArchiveRetentionJob,
  startArchiveRetentionScheduler,
};
