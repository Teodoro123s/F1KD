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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS children (
      id INT AUTO_INCREMENT PRIMARY KEY,
      child_code VARCHAR(30) NOT NULL UNIQUE,
      mother_id INT NOT NULL,
      community_id INT NULL,
      group_id INT NULL,
      batch_id INT NULL,
      first_name VARCHAR(120) NOT NULL,
      middle_name VARCHAR(120),
      last_name VARCHAR(120) NOT NULL,
      suffix VARCHAR(30),
      birth_date DATE,
      birth_weight DECIMAL(5,2),
      birth_length DECIMAL(5,2),
      gender ENUM('Male','Female','Other') DEFAULT 'Female',
      blood_type VARCHAR(5),
      no_of_child_delivered INT,
      multiple_birth_type VARCHAR(30) DEFAULT NULL,
      exclusive_breastfeeding VARCHAR(20),
      expanded_newborn_screening TEXT,
      expanded_newborn_screening_result TEXT,
      delivery_type VARCHAR(80),
      health_status VARCHAR(120),
      birth_place VARCHAR(150),
      birth_attendant VARCHAR(150),
      apgar_score VARCHAR(10),
      feeding_type VARCHAR(80),
      nutrition_notes TEXT,
      father_name VARCHAR(150),
      relationship VARCHAR(50),
      address TEXT,
      progress INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE children
      ADD COLUMN IF NOT EXISTS group_id INT NULL,
      ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5),
      ADD COLUMN IF NOT EXISTS no_of_child_delivered INT,
      ADD COLUMN IF NOT EXISTS multiple_birth_type VARCHAR(30),
      ADD COLUMN IF NOT EXISTS exclusive_breastfeeding VARCHAR(20),
      ADD COLUMN IF NOT EXISTS expanded_newborn_screening TEXT,
      ADD COLUMN IF NOT EXISTS expanded_newborn_screening_result TEXT,
      ADD COLUMN IF NOT EXISTS birth_document_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS birth_document_path VARCHAR(500);`,

    `ALTER TABLE mothers
      ADD COLUMN IF NOT EXISTS birth_certificate_document_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS birth_certificate_document_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS consent_document_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS consent_document_path VARCHAR(500);`,

    `CREATE TABLE IF NOT EXISTS child_medical_conditions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      child_id INT NOT NULL,
      condition_name VARCHAR(80) NOT NULL,
      has_condition BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS child_vaccinations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      child_id INT NOT NULL,
      vaccine_name VARCHAR(50) NOT NULL,
      vaccine_date DATE,
      remarks TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS child_checkups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      child_id INT NOT NULL,
      visit_date DATE,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      head_circumference DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS programs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(80) NOT NULL DEFAULT 'Other',
      provider VARCHAR(150) NOT NULL,
      description TEXT,
      beneficiary_type VARCHAR(40) NOT NULL DEFAULT 'Mother and Child',
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      target INT NOT NULL DEFAULT 0,
      received INT NOT NULL DEFAULT 0,
      activities INT NOT NULL DEFAULT 0,
      latest DATE NULL,
      ended DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS program_clusters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      program_id INT NOT NULL,
      scope_type VARCHAR(20) NOT NULL,
      scope_name VARCHAR(150) NOT NULL,
      beneficiaries INT NOT NULL DEFAULT 0,
      received INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_program_cluster (program_id, scope_type, scope_name),
      CONSTRAINT fk_program_clusters_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
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

const bcrypt = require('bcrypt');

async function ensureDefaultAdmin() {
  try {
    // Detect users table columns to avoid inserting into absent columns
    const [cols] = await pool.query("SHOW COLUMNS FROM users");
    const colNames = (cols || []).map(c => c.Field);
    const hasFirstName = colNames.includes('first_name');
    const hasUsername = colNames.includes('username');

    const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
    const cnt = countRows[0].cnt || 0;

    if (cnt === 0) {
      const email = process.env.DEFAULT_ADMIN_EMAIL || 'Superadmin@gmail.com';
      const plain = process.env.DEFAULT_ADMIN_PASSWORD || 'Welcome123!';
      const hash = await bcrypt.hash(plain, 10);

      if (hasFirstName) {
        // older server schema that expects first_name / last_name
        await pool.query(
          `INSERT INTO users (first_name, last_name, email, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)`,
          ['Super', 'Admin', email, 'Superadmin', 'Active', hash]
        );
        console.info('Default admin user created (first_name schema):', email);
      } else if (hasUsername) {
        // current DB schema uses username / full_name
        const username = (process.env.DEFAULT_ADMIN_USERNAME || 'superadmin').replace(/[^A-Za-z0-9_.-]/g, '').toLowerCase();
        const fullName = 'Super Admin';
        await pool.query(
          `INSERT INTO users (username, email, full_name, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)`,
          [username, email, fullName, process.env.DEFAULT_ADMIN_ROLE || 'Superadmin', process.env.DEFAULT_ADMIN_STATUS || 'active', hash]
        );
        console.info('Default admin user created (username schema):', email);
      } else {
        console.info('Users table schema not recognized – skipping default admin creation');
      }
    }
  } catch (err) {
    console.error('Failed to ensure default admin', err);
  }
}

async function migrateUsersTable() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM users");
    const colNames = (cols || []).map(c => c.Field);

    const alterStatements = [];
    if (!colNames.includes('first_name')) {
      alterStatements.push("ADD COLUMN first_name VARCHAR(120) NOT NULL DEFAULT ''");
    }
    if (!colNames.includes('last_name')) {
      alterStatements.push("ADD COLUMN last_name VARCHAR(120) NOT NULL DEFAULT ''");
    }
    if (!colNames.includes('middle_initial')) {
      alterStatements.push("ADD COLUMN middle_initial CHAR(1) DEFAULT NULL");
    }
    if (!colNames.includes('contact_number')) {
      alterStatements.push("ADD COLUMN contact_number VARCHAR(20) DEFAULT NULL");
    }
    if (!colNames.includes('gender')) {
      alterStatements.push("ADD COLUMN gender ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male'");
    }
    if (!colNames.includes('dob')) {
      alterStatements.push("ADD COLUMN dob DATE DEFAULT NULL");
    }
    if (!colNames.includes('location')) {
      alterStatements.push("ADD COLUMN location VARCHAR(120) DEFAULT NULL");
    }
    if (!colNames.includes('school_id')) {
      alterStatements.push('ADD COLUMN school_id INT DEFAULT NULL');
    }

    if (alterStatements.length > 0) {
      console.log('Migrating users table, adding missing columns...');
      await pool.query(`ALTER TABLE users ${alterStatements.join(', ')}`);

      // Split existing full_name into first_name and last_name for existing users
      const [users] = await pool.query("SELECT id, full_name FROM users WHERE first_name = '' AND last_name = ''");
      for (const u of users) {
        if (u.full_name) {
          const parts = u.full_name.trim().split(/\s+/);
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ') || '';
          await pool.query("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?", [firstName, lastName, u.id]);
        }
      }
      console.log('Users table migrated successfully.');
    }
  } catch (err) {
    console.error('Failed to migrate users table', err);
  }
}

async function migrateMothersTable() {
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM mothers');
    const existing = new Set((cols || []).map((column) => column.Field));
    const definitions = {
      lmp_date: 'DATE DEFAULT NULL',
      edd_date: 'DATE DEFAULT NULL',
      prenatal_reg_date: 'DATE DEFAULT NULL',
      trimester: 'VARCHAR(30) DEFAULT NULL',
      gestational_age: 'INT DEFAULT NULL',
      prenatal_weight: 'DECIMAL(5,2) DEFAULT NULL',
      prenatal_bp: 'VARCHAR(20) DEFAULT NULL',
      prenatal_height: 'VARCHAR(20) DEFAULT NULL',
      fundal_height: 'VARCHAR(20) DEFAULT NULL',
      fhr: 'VARCHAR(20) DEFAULT NULL',
      gravida: 'INT DEFAULT NULL',
      para: 'INT DEFAULT NULL',
      abortion: 'INT DEFAULT 0',
      stillbirth: 'INT DEFAULT 0',
      weight: 'VARCHAR(20) DEFAULT NULL',
      height: 'VARCHAR(20) DEFAULT NULL',
      is_high_risk: 'BOOLEAN DEFAULT FALSE',
      program_type: 'VARCHAR(150) DEFAULT NULL',
      emergency_name: 'VARCHAR(150) DEFAULT NULL',
      emergency_contact: 'VARCHAR(20) DEFAULT NULL',
      emergency_relationship: 'VARCHAR(60) DEFAULT NULL',
      spouse_name: 'VARCHAR(150) DEFAULT NULL',
      medical_conditions: 'JSON DEFAULT NULL',
      other_medical_history: 'TEXT DEFAULT NULL',
    };
    const additions = Object.entries(definitions)
      .filter(([name]) => !existing.has(name))
      .map(([name, definition]) => `ADD COLUMN ${name} ${definition}`);
    if (additions.length > 0) {
      await pool.query(`ALTER TABLE mothers ${additions.join(', ')}`);
      console.info('Mothers table migrated successfully.');
    }
  } catch (error) {
    console.error('Failed to migrate mothers table', error);
  }
}

ensure().catch((err) => console.error('DB init error', err)).finally(async () => {
  await migrateUsersTable();
  await migrateMothersTable();
  ensureDefaultAdmin();
});

module.exports = pool;

