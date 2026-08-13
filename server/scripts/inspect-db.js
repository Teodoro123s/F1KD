const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    });

    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('Databases:', dbs.map(d => d.Database).join(', '));

    const check = async (name) => {
      try {
        const [tables] = await conn.query(`SHOW TABLES FROM \`${name}\``);
        console.log(`\nTables in ${name}:`, tables.map(t => Object.values(t)[0]).join(', '));
        // check users table count if exists
        const hasUsers = tables.some(t => Object.values(t)[0] === 'users');
        if (hasUsers) {
          const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${name}\`.users`);
          console.log(`Count in ${name}.users =`, rows[0].cnt);
        } else {
          console.log(`No users table in ${name}`);
        }
      } catch (e) {
        console.error(`Error checking ${name}:`, e.message);
      }
    };

    await check(process.env.DB_NAME || 'f1kd');
    await check('react_app');

    await conn.end();
  } catch (e) {
    console.error('Inspect failed:', e.message);
    process.exit(1);
  }
})();