
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SHARED_PASSWORD = 'Welcome123!';
const ROLE_ACCOUNTS = [
  { email: 'Superadmin@gmail.com', firstName: 'Super', lastName: 'Admin', role: 'Superadmin' },
  { email: 'Admin@gmail.com', username: 'Admin', firstName: 'Admin', lastName: 'Account', role: 'Admin' },
  { email: 'Partner@gmail.com', username: 'Partner', firstName: 'Partner', lastName: 'Account', role: 'Partner' },
  { email: 'Controller@gmail.com', username: 'Controller', firstName: 'Controller', lastName: 'Account', role: 'Controller' },
  { email: 'CommunityOrganizer@gmail.com', username: 'CommunityOrganizer', firstName: 'Community', lastName: 'Organizer', role: 'Community Organizer' },
  { email: 'Healthworker@gmail.com', username: 'Healthworker', firstName: 'Health', lastName: 'Worker', role: 'Health worker' },
];

const SCHOOL_ROLES = new Set(['Community Organizer', 'Health worker']);

async function seedRoleAccounts() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'f1kd',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  });

  try {
    const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);
    const [communityRows] = await pool.query('SELECT id FROM communities ORDER BY id LIMIT 1');
    const defaultSchoolId = communityRows[0]?.id || null;

    if (!defaultSchoolId) {
      console.warn('No school/community found; school-bound role accounts will have no school assignment.');
    }

    for (const account of ROLE_ACCOUNTS) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [account.email],
      );
      if (existing.length) {
        console.log(`Skipped existing account: ${account.email}`);
        continue;
      }

      await pool.query(
        `INSERT INTO users
          (email, role, status, password_hash, first_name, last_name, gender, school_id)
         VALUES (?, ?, 'Active', ?, ?, ?, 'Other', ?)`,
        [
          account.email,
          account.role,
          passwordHash,
          account.firstName,
          account.lastName,
          SCHOOL_ROLES.has(account.role) ? defaultSchoolId : null,
        ],
      );
      console.log(`Created ${account.role}: ${account.email}`);
    }
  } finally {
    await pool.end();
  }
}

seedRoleAccounts().catch((error) => {
  console.error('Failed to seed role accounts:', error.message);
  process.exitCode = 1;
});
