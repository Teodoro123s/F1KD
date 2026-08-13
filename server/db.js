const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1kd',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

console.log('DB pool configured for database:', process.env.DB_NAME || 'f1kd');

async function ensure() {
  const create = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    middle_initial CHAR(1),
    contact_number VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    gender ENUM('Male','Female','Other') DEFAULT 'Male',
    dob DATE,
    location VARCHAR(120),
    role VARCHAR(120),
    status ENUM('Active','Suspended') DEFAULT 'Active',
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const conn = await pool.getConnection();
  try {
    await conn.query(create);
  } finally {
    conn.release();
  }
}

ensure().catch((err) => console.error('DB init error', err));

module.exports = pool;
