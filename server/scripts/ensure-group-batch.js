const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

(async function ensure() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'f1kd',
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  });

  const create = `CREATE TABLE IF NOT EXISTS group_batch (
    group_id INT NOT NULL,
    batch_id INT NOT NULL,
    PRIMARY KEY (group_id, batch_id),
    CONSTRAINT fk_gb_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_gb_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const conn = await pool.getConnection();
  try {
    await conn.query(create);
    console.log('group_batch table ensured');
  } catch (err) {
    console.error('Error ensuring group_batch table', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
})();
