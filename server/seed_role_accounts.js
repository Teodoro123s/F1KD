require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SHARED_PASSWORD = 'Welcome123!';
const ROLE_ACCOUNTS = [
  { email: 'Admin@gmail.com', username: 'Admin', firstName: 'Admin', lastName: 'Account', role: 'Admin' },
  { email: 'Partner@gmail.com', username: 'Partner', firstName: 'Partner', lastName: 'Account', role: 'Partner' },
  { email: 'Controller@gmail.com', username: 'Controller', firstName: 'Controller', lastName: 'Account', role: 'Controller' },
  { email: 'CommunityOrganizer@gmail.com', username: 'CommunityOrganizer', firstName: 'Community', lastName: 'Organizer', role: 'Community Organizer' },
  { email: 'Healthworker@gmail.com', username: 'Healthworker', firstName: 'Health', lastName: 'Worker', role: 'Health worker' },
];

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
    for (const account of ROLE_ACCOUNTS) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
        [account.email, account.username],
      );
      if (existing.length) {
        console.log(`Skipped existing account: ${account.email}`);
        continue;
      }

      await pool.query(
        `INSERT INTO users
          (username, email, full_name, role, status, password_hash, first_name, last_name, gender)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 'Other')`,
        [
          account.username,
          account.email,
          `${account.firstName} ${account.lastName}`,
          account.role,
          passwordHash,
          account.firstName,
          account.lastName,
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
