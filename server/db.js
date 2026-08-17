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
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS communities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      community_code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      area VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_code VARCHAR(20) NOT NULL UNIQUE,
      community_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      records INT NOT NULL DEFAULT 0,
      progress INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_code VARCHAR(20) NOT NULL UNIQUE,
      community_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      leader VARCHAR(150),
      members_count INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS group_batch (
      group_id INT NOT NULL,
      batch_id INT NOT NULL,
      PRIMARY KEY (group_id, batch_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mothers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_code VARCHAR(20) NOT NULL UNIQUE,
      community_id INT NOT NULL,
      group_id INT NULL,
      batch_id INT NULL,
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      last_name VARCHAR(100) NOT NULL,
      suffix VARCHAR(20),
      mother_id_no VARCHAR(50) UNIQUE,
      dob DATE,
      lmp_date DATE,
      edd_date DATE,
      contact_number VARCHAR(20),
      is_high_risk BOOLEAN DEFAULT FALSE,
      program_type VARCHAR(150),
      emergency_name VARCHAR(150),
      emergency_contact VARCHAR(20),
      emergency_relationship VARCHAR(60),
      spouse_name VARCHAR(150),
      address TEXT,
      prenatal_reg_date DATE,
      trimester VARCHAR(30),
      gestational_age INT,
      prenatal_weight DECIMAL(5,2),
      prenatal_bp VARCHAR(20),
      prenatal_height VARCHAR(20),
      fundal_height VARCHAR(20),
      fhr VARCHAR(20),
      gravida INT,
      para INT,
      abortion INT DEFAULT 0,
      stillbirth INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'Active',
      visits INT DEFAULT 0,
      progress INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mother_ob_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      event_code VARCHAR(20) NOT NULL,
      gestational_age VARCHAR(50),
      outcome TEXT,
      FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mother_medical_conditions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      condition_name VARCHAR(80) NOT NULL,
      has_condition BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mother_dental_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      dental_facility VARCHAR(150),
      dentist_in_charge VARCHAR(150),
      community_dentist VARCHAR(150),
      dentist_license VARCHAR(80),
      dentist_contact VARCHAR(20),
      teeth_count INT,
      dental_findings TEXT,
      dental_remarks TEXT,
      tartar_removal BOOLEAN DEFAULT FALSE,
      filling BOOLEAN DEFAULT FALSE,
      cleaning BOOLEAN DEFAULT FALSE,
      extraction BOOLEAN DEFAULT FALSE,
      root_canal BOOLEAN DEFAULT FALSE,
      other_procedure BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mother_vaccinations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      vaccine_name VARCHAR(20) NOT NULL,
      vaccine_date DATE,
      remarks TEXT,
      FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  const conn = await pool.getConnection();
  try {
    for (const create of statements) {
      await conn.query(create);
    }
  } finally {
    conn.release();
  }
}

ensure().catch((err) => console.error('DB init error', err));

module.exports = pool;
