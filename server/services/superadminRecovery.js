const bcrypt = require('bcrypt');

const DEFAULT_EMAIL = 'Superadmin@gmail.com';
const DEFAULT_PASSWORD = 'Welcome123!';

async function ensureSuperadminAccount(pool, options = {}) {
  const email = String(options.email || process.env.DEFAULT_ADMIN_EMAIL || DEFAULT_EMAIL).trim();
  const password = options.password || process.env.DEFAULT_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const [rows] = await pool.query(
    'SELECT id, role, status, password_hash FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1',
    [email],
  );

  if (!rows.length) {
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      await pool.query(
        `INSERT INTO users
          (first_name, last_name, email, role, status, password_hash, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Super', 'Admin', email, 'Superadmin', 'Active', passwordHash, 'Other'],
      );
      console.info('Self-healed default superadmin account:', email);
    } catch (error) {
      // Another request may have recreated the account between SELECT and INSERT.
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
    return;
  }

  const admin = rows[0];
  const updates = [];
  const params = [];
  const normalizedRole = String(admin.role || '').trim().toLowerCase();
  if (!['superadmin', 'super admin', 'super_admin'].includes(normalizedRole)) {
    updates.push('role = ?');
    params.push('Superadmin');
  }
  if (!admin.status) {
    updates.push('status = ?');
    params.push('Active');
  }
  if (!admin.password_hash && process.env.SELF_HEAL_ADMIN_CREDENTIALS === 'true') {
    updates.push('password_hash = ?');
    params.push(await bcrypt.hash(password, 10));
  }

  if (updates.length > 0) {
    params.push(admin.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    console.info('Self-healed default superadmin attributes:', email);
  }
}

module.exports = { ensureSuperadminAccount };