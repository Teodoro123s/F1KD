const crypto = require('node:crypto');

function normalizeFullName(parts) {
  return parts
    .map((part) => String(part ?? '').normalize('NFKC').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
}

function normalizeEmail(email) {
  return String(email ?? '').normalize('NFKC').trim().toLowerCase();
}

async function withUniquenessLocks(pool, keys, action) {
  const lockNames = [...new Set(keys.filter(Boolean).map((key) => (
    `f1kd:unique:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 48)}`
  )))].sort();
  if (!lockNames.length) return action();

  const connection = await pool.getConnection();
  const acquiredLocks = [];
  try {
    for (const lockName of lockNames) {
      const [rows] = await connection.query('SELECT GET_LOCK(?, 15) AS acquired', [lockName]);
      if (Number(rows[0]?.acquired) !== 1) {
        const error = new Error('Timed out while checking for a duplicate record. Please try again.');
        error.code = 'UNIQUENESS_LOCK_TIMEOUT';
        throw error;
      }
      acquiredLocks.push(lockName);
    }
    return await action();
  } finally {
    for (const lockName of acquiredLocks.reverse()) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch (error) {
        console.error('[Uniqueness] Failed to release a duplicate-check lock:', error.message);
      }
    }
    connection.release();
  }
}

async function findDuplicateUser(pool, { email, fullName, excludeId = null }) {
  if (email) {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND (? IS NULL OR id <> ?) LIMIT 1',
      [normalizeEmail(email), excludeId, excludeId],
    );
    if (rows.length) return 'email';
  }

  if (fullName) {
    const [rows] = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(REGEXP_REPLACE(
         TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(middle_initial), ''), NULLIF(TRIM(last_name), ''))),
         '[[:space:]]+',
         ' '
       )) = ?
         AND (? IS NULL OR id <> ?)
       LIMIT 1`,
      [normalizeFullName(fullName.split(/\s+/)), excludeId, excludeId],
    );
    if (rows.length) return 'full name';
  }

  return null;
}

async function findDuplicateBeneficiary(pool, { fullName, excludeType = null, excludeId = null }) {
  const normalizedName = normalizeFullName(fullName.split(/\s+/));
  if (!normalizedName) return null;

  const [rows] = await pool.query(
    `SELECT record_type, id
     FROM (
       SELECT 'mother' AS record_type, id,
         LOWER(REGEXP_REPLACE(
           TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(middle_name), ''), NULLIF(TRIM(last_name), ''), NULLIF(TRIM(maiden_surname), ''), NULLIF(TRIM(suffix), ''))),
           '[[:space:]]+',
           ' '
         )) AS normalized_name
       FROM mothers
       UNION ALL
       SELECT 'child' AS record_type, id,
         LOWER(REGEXP_REPLACE(
           TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(middle_name), ''), NULLIF(TRIM(last_name), ''), NULLIF(TRIM(suffix), ''))),
           '[[:space:]]+',
           ' '
         )) AS normalized_name
       FROM children
     ) AS beneficiaries
     WHERE normalized_name = ?
       AND NOT (record_type = ? AND id = ?)
     LIMIT 1`,
    [normalizedName, excludeType || '', excludeId || 0],
  );
  return rows.length ? 'full name' : null;
}

module.exports = {
  findDuplicateBeneficiary,
  findDuplicateUser,
  normalizeEmail,
  normalizeFullName,
  withUniquenessLocks,
};
