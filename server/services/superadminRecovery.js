const bcrypt = require('bcrypt');
const {
  isValidEmail,
  normalizeEmail,
  validateAccountPassword,
} = require('../utils/userInputValidation');

const SUPERADMIN_ROLES = new Set(['superadmin', 'super admin', 'super_admin']);

async function ensureSuperadminAccount(pool, options = {}) {
  const configuredEmail = options.email ?? process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  const password = options.password ?? process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
  const email = normalizeEmail(configuredEmail);

  if (!email && !password) return { status: 'disabled' };
  if (!email || typeof password !== 'string' || !password) {
    throw new Error('Set both BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD to enable Superadmin recovery');
  }
  if (!isValidEmail(email)) {
    throw new Error('BOOTSTRAP_SUPERADMIN_EMAIL must be a valid email address');
  }
  const passwordError = validateAccountPassword(password, 'Bootstrap Superadmin password');
  if (passwordError) throw new Error(passwordError);

  const [rows] = await pool.query(
    'SELECT id, role, password_hash FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1',
    [email],
  );

  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      await pool.query(
        `INSERT INTO users
          (first_name, last_name, email, role, status, password_hash, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Super', 'Admin', email, 'Superadmin', 'Active', passwordHash, 'Other'],
      );
      console.info('Created configured Superadmin bootstrap account.');
      return { status: 'created' };
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      return { status: 'already_exists' };
    }
  }

  const account = rows[0];
  const role = String(account.role || '').trim().toLowerCase();
  if (!SUPERADMIN_ROLES.has(role)) {
    throw new Error('Configured bootstrap email belongs to a non-Superadmin account; refusing to change its role');
  }

  if (!account.password_hash && process.env.SELF_HEAL_ADMIN_CREDENTIALS === 'true') {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash IS NULL', [
      passwordHash,
      account.id,
    ]);
    console.info('Restored missing credentials for configured Superadmin account.');
    return { status: 'credentials_restored' };
  }

  return { status: 'already_exists' };
}

module.exports = { ensureSuperadminAccount };
