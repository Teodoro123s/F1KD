const test = require('node:test');
const assert = require('node:assert/strict');
const { RETENTION_MONTHS, runArchiveRetentionJob } = require('../services/archiveRetention');

function createDatabase({ failOnDelete = false } = {}) {
  const statements = [];
  const database = {
    statements,
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.startsWith('SELECT queued_file.id, queued_file.file_path')) return [[]];
      return [{ affectedRows: 0 }];
    },
    getConnection: async () => ({
      beginTransaction: async () => statements.push({ sql: 'BEGIN' }),
      commit: async () => statements.push({ sql: 'COMMIT' }),
      rollback: async () => statements.push({ sql: 'ROLLBACK' }),
      release: () => statements.push({ sql: 'RELEASE' }),
      query: async (sql, params = []) => {
        statements.push({ sql, params });
        if (sql.includes('information_schema.columns')) {
          return [[{ table_name: 'child_checkups', column_name: 'created_by_user_id' }]];
        }
        if (sql.startsWith('SELECT id FROM tmp_archive_retention_users')) return [[]];
        if (failOnDelete && sql.startsWith('DELETE FROM children')) throw new Error('test failure');
        return [{ affectedRows: 0 }];
      },
    }),
  };
  return database;
}

test('archive retention removes records after nine calendar months in dependency order', async () => {
  const database = createDatabase();
  const result = await runArchiveRetentionJob(database);
  const deletes = database.statements.filter(({ sql }) => /^DELETE FROM (children|mothers|groups|batches|programs|communities)/.test(sql));

  assert.equal(RETENTION_MONTHS, 9);
  assert.deepEqual(deletes.map(({ sql }) => sql.match(/^DELETE FROM (\w+)/)[1]), [
    'children', 'mothers', 'groups', 'batches', 'programs', 'communities',
  ]);
  assert.ok(database.statements.some(({ sql }) => sql.includes('INTERVAL 9 MONTH')));
  assert.ok(database.statements.some(({ sql }) => sql.includes('INSERT INTO tmp_archive_retention_users')));
  assert.ok(database.statements.some(({ sql }) => sql.startsWith('DELETE FROM users WHERE id IN (SELECT id FROM tmp_archive_retention_users)')));
  assert.ok(database.statements.some(({ sql }) => sql.includes("actor_name = 'Archived user'")));
  assert.ok(database.statements.some(({ sql }) => sql.includes('UPDATE `child_checkups`')));
  assert.ok(database.statements.some(({ sql }) => sql.includes('INSERT IGNORE INTO archive_file_deletion_queue')));
  assert.ok(database.statements.some(({ sql }) => sql.includes('DELETE FROM activity_logs')));
  assert.ok(database.statements.some(({ sql }) => sql.includes('DELETE FROM notifications')));
  assert.ok(database.statements.some(({ sql }) => (
    sql.startsWith('DELETE FROM notifications')
    && sql.includes('UNION SELECT')
    && sql.includes('COLLATE utf8mb4_unicode_ci')
    && sql.includes('CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci')
  )));
  assert.ok(database.statements.some(({ sql }) => (
    sql.includes("entity_type = 'philhealth_claim'")
    && sql.includes('CONVERT(entity_id USING utf8mb4) COLLATE utf8mb4_unicode_ci')
  )));
  assert.ok(database.statements.some(({ sql }) => sql.includes("entity_type = 'philhealth_claim'")));
  assert.ok(database.statements.some(({ sql }) => sql === 'COMMIT'));
  assert.deepEqual(result, { purgedRecords: 0, deletedFiles: 0 });
});

test('archive retention rolls back database purges when a delete fails', async () => {
  const database = createDatabase({ failOnDelete: true });

  await assert.rejects(runArchiveRetentionJob(database), /test failure/);
  assert.ok(database.statements.some(({ sql }) => sql === 'ROLLBACK'));
  assert.ok(!database.statements.some(({ sql }) => sql === 'COMMIT'));
});

test('archive retention deletes unreferenced files and leaves shared files queued', async () => {
  const database = createDatabase();
  const deletedPaths = [];
  database.query = async (sql, params = []) => {
    database.statements.push({ sql, params });
    if (sql.startsWith('SELECT queued_file.id, queued_file.file_path')) {
      assert.match(sql, /NOT EXISTS/);
      assert.match(sql, /birth_certificate_document_path = queued_file\.file_path/);
      return [[{ id: 1, file_path: '/uploads/expired.pdf' }]];
    }
    return [{ affectedRows: 0 }];
  };
  const result = await runArchiveRetentionJob(database, {
    deleteFile: async (filePath) => deletedPaths.push(filePath),
  });

  assert.deepEqual(deletedPaths, ['/uploads/expired.pdf']);
  assert.deepEqual(result, { purgedRecords: 0, deletedFiles: 1 });
  assert.ok(database.statements.some(({ sql, params }) => sql === 'DELETE FROM archive_file_deletion_queue WHERE id = ?' && params[0] === 1));
  assert.ok(!database.statements.some(({ sql, params }) => sql === 'DELETE FROM archive_file_deletion_queue WHERE id = ?' && params[0] === 2));
});
