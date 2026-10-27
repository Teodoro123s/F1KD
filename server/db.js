const mysql = require('mysql2/promise');
require('dotenv').config();
const {
  motherInitialCheckupDueSql,
  motherMonitoringTotalSql,
} = require('./utils/motherMonitoring');

const databaseName = process.env.DB_NAME || 'f1kd';
if (!/^[A-Za-z0-9_$]+$/.test(databaseName)) {
  throw new Error('DB_NAME contains unsupported characters');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

console.log('DB pool configured for database:', databaseName);

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  });
  try {
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    } catch (error) {
      if (error.code !== 'ER_DBACCESS_DENIED_ERROR' && error.code !== 'ER_ACCESS_DENIED_ERROR') throw error;
      await connection.query(`USE \`${databaseName}\``);
    }
  } finally {
    await connection.end();
  }
}

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
      consent_accepted_at DATETIME NULL,
      school_id INT NULL,
      group_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS school_id INT NULL,
      ADD COLUMN IF NOT EXISTS group_id INT NULL,
      ADD COLUMN IF NOT EXISTS consent_accepted_at DATETIME NULL;`,

    `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'User';`,



    `CREATE TABLE IF NOT EXISTS communities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      community_code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      area VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE communities
      ADD COLUMN IF NOT EXISTS coordinator_id INT NULL;`,

    `ALTER TABLE communities
      ADD UNIQUE INDEX IF NOT EXISTS uq_communities_coordinator_id (coordinator_id);`,

    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS coordinator_school_id INT
        GENERATED ALWAYS AS (
          CASE
            WHEN LOWER(REPLACE(REPLACE(TRIM(role), '_', ''), ' ', ''))
              IN ('communitycoordinator', 'communityorganizer', 'coordinator', 'co', 'partner')
            THEN school_id
            ELSE NULL
          END
        ) STORED,
      ADD UNIQUE INDEX IF NOT EXISTS uq_users_coordinator_school_id (coordinator_school_id);`,

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

    `CREATE TABLE IF NOT EXISTS batch_documentation_sets (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      evidence_date DATE NOT NULL,
      uploaded_by_user_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_batch_documentations_batch_date (batch_id, evidence_date),
      CONSTRAINT fk_batch_documentation_sets_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS batch_documentations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      evidence_date DATE NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      uploaded_by_user_id INT NULL,
      documentation_set_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_batch_documentations_batch_date (batch_id, evidence_date),
      KEY idx_batch_documentations_set (documentation_set_id),
      CONSTRAINT fk_batch_documentations_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `ALTER TABLE batch_documentations
      ADD COLUMN IF NOT EXISTS documentation_set_id BIGINT UNSIGNED NULL,
      ADD INDEX IF NOT EXISTS idx_batch_documentations_set (documentation_set_id);`,

    `CREATE TABLE IF NOT EXISTS mothers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_code VARCHAR(20) NOT NULL UNIQUE,
      community_id INT NOT NULL,
      group_id INT NULL,
      batch_id INT NULL,
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      last_name VARCHAR(100) NOT NULL,
      maiden_surname VARCHAR(100),
      suffix VARCHAR(20),
      mother_id_no VARCHAR(50) UNIQUE,
      mother_external_id VARCHAR(128),
      dob DATE,
      birth_place VARCHAR(150),
      allergies TEXT,
      blood_type VARCHAR(10),
      civil_status VARCHAR(30),
      employment_status VARCHAR(40),
      educational_attainment VARCHAR(50),
      data_privacy_signed BOOLEAN NOT NULL DEFAULT FALSE,
      media_release_signed BOOLEAN NOT NULL DEFAULT FALSE,
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
      total_children INT,
      children_born_alive INT,
      miscarriages INT,
      children_died_after_birth INT,
      status VARCHAR(20) DEFAULT 'Active',
      visits INT DEFAULT 0,
      progress INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS mother_checkups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      trimester VARCHAR(30) NOT NULL,
      checkup_number TINYINT UNSIGNED NOT NULL,
      checkup_date DATE NOT NULL,
      gestational_age_weeks INT UNSIGNED NULL,
      blood_pressure VARCHAR(20) NULL,
      weight_kg DECIMAL(5,2) NULL,
      height_cm DECIMAL(5,2) NULL,
      bmi DECIMAL(5,2) NULL,
      developmental_status VARCHAR(40) NULL,
      nutritional_status VARCHAR(30) NULL,
      fundal_height_cm DECIMAL(5,2) NULL,
      fetal_heart_rate_bpm SMALLINT UNSIGNED NULL,
      service_provider VARCHAR(150) NULL,
      next_checkup_date DATE NULL,
      referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
      lab_assistance_provided BOOLEAN NOT NULL DEFAULT FALSE,
      assistance_amount DECIMAL(10,2) NULL,
      source_of_funds VARCHAR(80) NULL,
      facility_type VARCHAR(40) NULL,
      milk_subsidy_date DATE NULL,
      milk_quantity_pcs INT UNSIGNED NULL,
      milk_subsidy_provided BOOLEAN NOT NULL DEFAULT FALSE,
      lab_assistance_tests TEXT NULL,
      laboratory_requests TEXT NULL,
      treatment_services TEXT NULL,
      remarks TEXT NULL,
      recorded_by_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mother_checkups_mother
        FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
      CONSTRAINT uq_mother_checkup_step
        UNIQUE (mother_id, trimester, checkup_number),
      KEY idx_mother_checkups_date (mother_id, checkup_date)
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

    `ALTER TABLE mother_ob_history
      ADD COLUMN IF NOT EXISTS event_label VARCHAR(120),
      ADD COLUMN IF NOT EXISTS seq INT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,

    `ALTER TABLE mother_dental_records
      ADD COLUMN IF NOT EXISTS visit_date DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,

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
      head_circumference DECIMAL(5,2),
      chest_circumference DECIMAL(5,2),
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
      ADD COLUMN IF NOT EXISTS birth_document_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS head_circumference DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS chest_circumference DECIMAL(5,2);`,

    `ALTER TABLE mothers
      ADD COLUMN IF NOT EXISTS mother_external_id VARCHAR(128),
      ADD COLUMN IF NOT EXISTS philhealth_member BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS philhealth_number VARCHAR(80) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS birth_certificate_document_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS birth_certificate_document_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS consent_document_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS consent_document_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS height DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS medical_conditions JSON,
      ADD COLUMN IF NOT EXISTS other_medical_history TEXT;`,

    `ALTER TABLE mothers
      ADD COLUMN IF NOT EXISTS birth_place VARCHAR(150),
      ADD COLUMN IF NOT EXISTS allergies TEXT,
      ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10),
      ADD COLUMN IF NOT EXISTS civil_status VARCHAR(30),
      ADD COLUMN IF NOT EXISTS employment_status VARCHAR(40),
      ADD COLUMN IF NOT EXISTS educational_attainment VARCHAR(50),
      ADD COLUMN IF NOT EXISTS data_privacy_signed BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS media_release_signed BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS total_children INT,
      ADD COLUMN IF NOT EXISTS children_born_alive INT,
      ADD COLUMN IF NOT EXISTS miscarriages INT,
      ADD COLUMN IF NOT EXISTS children_died_after_birth INT;`,

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
      dose_number TINYINT UNSIGNED NOT NULL DEFAULT 1,
      vaccine_date DATE,
      remarks TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE child_vaccinations
      ADD COLUMN IF NOT EXISTS dose_number TINYINT UNSIGNED NOT NULL DEFAULT 1;`,

    `CREATE TABLE IF NOT EXISTS child_checkups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      child_id INT NOT NULL,
      week_number TINYINT UNSIGNED NULL,
      next_checkup_date DATE,
      visit_date DATE,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      head_circumference DECIMAL(5,2),
      exclusive_breastfeeding VARCHAR(40),
      laboratory_requests TEXT,
      laboratory_assistance_provided BOOLEAN NOT NULL DEFAULT FALSE,
      referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
      assistance_amount DECIMAL(10,2),
      source_of_funds VARCHAR(80),
      facility_type VARCHAR(40),
      developmental_status VARCHAR(40),
      service_provider VARCHAR(150),
      notes TEXT,
      recorded_by_user_id INT NULL,
      created_by_user_id INT NULL,
      updated_by_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE child_checkups
      ADD COLUMN IF NOT EXISTS week_number TINYINT UNSIGNED NULL,
      ADD COLUMN IF NOT EXISTS developmental_status VARCHAR(40),
      ADD COLUMN IF NOT EXISTS service_provider VARCHAR(150),
      ADD COLUMN IF NOT EXISTS next_checkup_date DATE,
      ADD COLUMN IF NOT EXISTS exclusive_breastfeeding VARCHAR(40),
      ADD COLUMN IF NOT EXISTS laboratory_requests TEXT,
      ADD COLUMN IF NOT EXISTS laboratory_assistance_provided BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS assistance_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS source_of_funds VARCHAR(80),
      ADD COLUMN IF NOT EXISTS facility_type VARCHAR(40),
      ADD INDEX IF NOT EXISTS idx_child_checkups_next_date (next_checkup_date, child_id),
      ADD COLUMN IF NOT EXISTS recorded_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;`,

    `ALTER TABLE child_checkups
      MODIFY COLUMN exclusive_breastfeeding VARCHAR(40) NULL;`,

    `ALTER TABLE mother_checkups
      ADD COLUMN IF NOT EXISTS recorded_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS developmental_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS milk_subsidy_provided BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS lab_assistance_tests TEXT NULL,
      ADD COLUMN IF NOT EXISTS laboratory_requests TEXT NULL,
      ADD COLUMN IF NOT EXISTS treatment_services TEXT NULL,
      ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;`,

    `INSERT INTO mother_checkups (
       mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
       blood_pressure, weight_kg, height_cm, fundal_height_cm, fetal_heart_rate_bpm
     )
     SELECT m.id,
       CASE
         WHEN m.trimester IN ('1st Trimester', '2nd Trimester', '3rd Trimester') THEN m.trimester
         WHEN m.gestational_age >= 28 THEN '3rd Trimester'
         WHEN m.gestational_age >= 13 THEN '2nd Trimester'
         ELSE '1st Trimester'
       END,
       1, m.prenatal_reg_date, m.gestational_age, m.prenatal_bp,
       m.prenatal_weight,
       CASE WHEN m.prenatal_height REGEXP '^[0-9]+([.][0-9]+)?$' THEN CAST(m.prenatal_height AS DECIMAL(5,2)) ELSE NULL END,
       CASE WHEN m.fundal_height REGEXP '^[0-9]+([.][0-9]+)?$' THEN CAST(m.fundal_height AS DECIMAL(5,2)) ELSE NULL END,
       CASE WHEN m.fhr REGEXP '^[0-9]+$' THEN CAST(m.fhr AS UNSIGNED) ELSE NULL END
     FROM mothers m
     WHERE m.prenatal_reg_date IS NOT NULL
       AND (m.prenatal_weight IS NOT NULL OR m.prenatal_bp IS NOT NULL
         OR m.prenatal_height IS NOT NULL OR m.fundal_height IS NOT NULL OR m.fhr IS NOT NULL)
       AND ${motherInitialCheckupDueSql('m')}
       AND NOT EXISTS (
         SELECT 1 FROM mother_checkups mc
         WHERE mc.mother_id = m.id
           AND mc.trimester = CASE
             WHEN m.trimester IN ('1st Trimester', '2nd Trimester', '3rd Trimester') THEN m.trimester
             WHEN m.gestational_age >= 28 THEN '3rd Trimester'
             WHEN m.gestational_age >= 13 THEN '2nd Trimester'
             ELSE '1st Trimester'
           END
           AND mc.checkup_number = 1
       );`,

    `UPDATE mothers m
     SET progress = LEAST(100, ROUND(
       (SELECT COUNT(*) FROM mother_checkups mc WHERE mc.mother_id = m.id) * 100 / ${motherMonitoringTotalSql('m')}
     ))
     WHERE EXISTS (SELECT 1 FROM mother_checkups mc WHERE mc.mother_id = m.id);`,

    `UPDATE mother_checkups
     SET created_by_user_id = COALESCE(created_by_user_id, recorded_by_user_id),
         updated_by_user_id = COALESCE(updated_by_user_id, recorded_by_user_id)
     WHERE recorded_by_user_id IS NOT NULL;`,

    `UPDATE child_checkups
     SET created_by_user_id = COALESCE(created_by_user_id, recorded_by_user_id),
         updated_by_user_id = COALESCE(updated_by_user_id, recorded_by_user_id)
     WHERE recorded_by_user_id IS NOT NULL;`,

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS monitoring_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      beneficiary_id VARCHAR(50) NOT NULL,
      beneficiary_type VARCHAR(20) NOT NULL,
      program_id INT NOT NULL,
      monitored BOOLEAN NOT NULL DEFAULT FALSE,
      monitored_date DATE NOT NULL,
      monitored_by INT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_monitoring_log_day (beneficiary_id, beneficiary_type, program_id, monitored_date),
      KEY idx_monitoring_beneficiary (beneficiary_id, beneficiary_type),
      KEY idx_monitoring_program_date (program_id, monitored_date),
      CONSTRAINT fk_monitoring_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `ALTER TABLE monitoring_logs
      ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
      ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL;`,

    `CREATE TABLE IF NOT EXISTS program_receipt_documentation_sets (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      program_id INT NOT NULL,
      monitored_date DATE NOT NULL,
      uploaded_by_user_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_program_receipt_documentation_program_date (program_id, monitored_date),
      CONSTRAINT fk_program_receipt_documentation_sets_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS program_receipt_documentations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      documentation_set_id BIGINT UNSIGNED NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_program_receipt_documentations_set (documentation_set_id),
      CONSTRAINT fk_program_receipt_documentations_set FOREIGN KEY (documentation_set_id) REFERENCES program_receipt_documentation_sets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS program_receipt_documentation_logs (
      documentation_set_id BIGINT UNSIGNED NOT NULL,
      monitoring_log_id INT NOT NULL,
      PRIMARY KEY (documentation_set_id, monitoring_log_id),
      KEY idx_program_receipt_documentation_logs_log (monitoring_log_id),
      CONSTRAINT fk_program_receipt_documentation_logs_set FOREIGN KEY (documentation_set_id) REFERENCES program_receipt_documentation_sets(id) ON DELETE CASCADE,
      CONSTRAINT fk_program_receipt_documentation_logs_log FOREIGN KEY (monitoring_log_id) REFERENCES monitoring_logs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `UPDATE monitoring_logs
     SET created_by_user_id = COALESCE(created_by_user_id, monitored_by),
         updated_by_user_id = COALESCE(updated_by_user_id, monitored_by)
     WHERE monitored_by IS NOT NULL;`,

    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_key VARCHAR(40) NOT NULL UNIQUE,
      role_name VARCHAR(80) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resource_key VARCHAR(80) NOT NULL,
      action_key ENUM('read', 'create', 'update', 'delete') NOT NULL,
      UNIQUE KEY uq_permission_resource_action (resource_key, action_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(80) NOT NULL,
      category VARCHAR(40) NOT NULL,
      title VARCHAR(120) NOT NULL DEFAULT 'Notification',
      message VARCHAR(500) NOT NULL,
      entity_type VARCHAR(32) DEFAULT NULL,
      entity_id VARCHAR(80) DEFAULT NULL,
      link_to VARCHAR(255) DEFAULT NULL,
      school_id INT DEFAULT NULL,
      group_id INT DEFAULT NULL,
      school_scope_ids VARCHAR(1000) DEFAULT NULL,
      recipient_user_ids VARCHAR(1000) DEFAULT NULL,
      idempotency_key VARCHAR(191) DEFAULT NULL,
      actor_user_id INT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_notifications_created_at (created_at),
      KEY idx_notifications_category (category),
      UNIQUE KEY uq_notifications_idempotency_key (idempotency_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS title VARCHAR(120) NOT NULL DEFAULT 'Notification',
      ADD COLUMN IF NOT EXISTS link_to VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS school_id INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS group_id INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS school_scope_ids VARCHAR(1000) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS recipient_user_ids VARCHAR(1000) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(191) DEFAULT NULL,
      ADD UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key (idempotency_key);`,
    `CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id BIGINT UNSIGNED NOT NULL,
      user_id INT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id, user_id),
      KEY idx_notification_reads_user (user_id),
      CONSTRAINT fk_notification_reads_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INT NOT NULL,
      category VARCHAR(40) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, category),
      KEY idx_notification_preferences_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_notification_id BIGINT UNSIGNED DEFAULT NULL,
      actor_user_id INT DEFAULT NULL,
      actor_name VARCHAR(255) NOT NULL DEFAULT 'Unknown user',
      actor_email VARCHAR(255) DEFAULT NULL,
      actor_role VARCHAR(120) DEFAULT NULL,
      category VARCHAR(60) NOT NULL,
      action VARCHAR(60) NOT NULL,
      entity_type VARCHAR(60) DEFAULT NULL,
      entity_id VARCHAR(120) DEFAULT NULL,
      description VARCHAR(500) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_activity_logs_source_notification (source_notification_id),
      KEY idx_activity_logs_created_at (created_at),
      KEY idx_activity_logs_category_created_at (category, created_at),
      KEY idx_activity_logs_actor_created_at (actor_user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `ALTER TABLE activity_logs
      ADD COLUMN IF NOT EXISTS source_notification_id BIGINT UNSIGNED DEFAULT NULL;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_logs_source_notification
      ON activity_logs (source_notification_id);`,
    `INSERT IGNORE INTO activity_logs
      (source_notification_id, actor_user_id, actor_name, actor_email, actor_role,
       category, action, entity_type, entity_id, description, created_at)
     SELECT n.id, n.actor_user_id,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name)), ''), 'Unknown user'),
       u.email, u.role, n.category,
       CASE
         WHEN n.event_type LIKE '%.created' OR RIGHT(n.event_type, 8) = '_created' THEN 'create'
         WHEN n.event_type LIKE '%.updated' OR RIGHT(n.event_type, 8) = '_updated' OR n.event_type = 'user.access_updated' THEN 'update'
         WHEN n.event_type LIKE '%.deleted' OR RIGHT(n.event_type, 8) = '_deleted' THEN 'delete'
         WHEN n.event_type LIKE '%.suspended' THEN 'suspend'
         WHEN n.event_type LIKE '%.reactivated' THEN 'reactivate'
         ELSE n.event_type
       END,
       n.entity_type,
       CAST(n.entity_id AS CHAR), n.message, n.created_at
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_user_id
     WHERE n.category = 'User Management';`,
    `INSERT IGNORE INTO activity_logs
      (source_notification_id, actor_user_id, actor_name, actor_email, actor_role,
       category, action, entity_type, entity_id, description, created_at)
     SELECT n.id, n.actor_user_id,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name)), ''), 'Unknown user'),
       u.email, u.role, n.category,
       CASE
         WHEN n.event_type LIKE '%.created' OR RIGHT(n.event_type, 8) = '_created' THEN 'create'
         WHEN n.event_type LIKE '%.updated' OR RIGHT(n.event_type, 8) = '_updated' THEN 'update'
         WHEN n.event_type LIKE '%.deleted' OR RIGHT(n.event_type, 8) = '_deleted' THEN 'delete'
         WHEN n.event_type LIKE '%.suspended' THEN 'suspend'
         WHEN n.event_type LIKE '%.reactivated' THEN 'reactivate'
         ELSE n.event_type
       END,
       n.entity_type, CAST(n.entity_id AS CHAR), n.message, n.created_at
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_user_id
     WHERE n.category <> 'User Management';`,
    `UPDATE activity_logs a
     JOIN notifications n ON n.id = a.source_notification_id
     SET a.description = n.message,
       a.action = CASE
         WHEN n.event_type LIKE '%.created' OR RIGHT(n.event_type, 8) = '_created' THEN 'create'
         WHEN n.event_type LIKE '%.updated' OR RIGHT(n.event_type, 8) = '_updated' OR n.event_type = 'user.access_updated' THEN 'update'
         WHEN n.event_type LIKE '%.deleted' OR RIGHT(n.event_type, 8) = '_deleted' THEN 'delete'
         WHEN n.event_type LIKE '%.suspended' THEN 'suspend'
         WHEN n.event_type LIKE '%.reactivated' THEN 'reactivate'
         ELSE n.event_type
       END
     WHERE a.source_notification_id IS NOT NULL;`,
    `CREATE TABLE IF NOT EXISTS password_reset_codes (
      email VARCHAR(255) PRIMARY KEY,
      code_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id CHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_auth_sessions_user (user_id, revoked_at),
      KEY idx_auth_sessions_expiry (expires_at),
      CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id CHAR(36) PRIMARY KEY,
      session_id CHAR(36) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_auth_refresh_session (session_id, revoked_at),
      KEY idx_auth_refresh_expiry (expires_at),
      CONSTRAINT fk_auth_refresh_session FOREIGN KEY (session_id) REFERENCES auth_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS philhealth_claims (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      mother_id INT NOT NULL,
      claim_reference VARCHAR(80) DEFAULT NULL,
      claim_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      created_by_user_id INT DEFAULT NULL,
      updated_by_user_id INT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_philhealth_claims_mother_date (mother_id, claim_date),
      CONSTRAINT fk_philhealth_claims_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
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

async function ensureRequiredUserColumns() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM users");
    const columns = new Set((cols || []).map((column) => column.Field));
    const requiredColumns = {
      first_name: "VARCHAR(120) NOT NULL DEFAULT ''",
      last_name: "VARCHAR(120) NOT NULL DEFAULT ''",
      middle_initial: 'CHAR(1) DEFAULT NULL',
      contact_number: 'VARCHAR(20) DEFAULT NULL',
      gender: "ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male'",
      dob: 'DATE DEFAULT NULL',
      location: 'VARCHAR(120) DEFAULT NULL',
      role: "VARCHAR(120) NOT NULL DEFAULT 'User'",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Active'",
      password_hash: 'VARCHAR(255) DEFAULT NULL',
      consent_accepted_at: 'DATETIME DEFAULT NULL',
      school_id: 'INT DEFAULT NULL',
      group_id: 'INT DEFAULT NULL',
    };
    const additions = Object.entries(requiredColumns)
      .filter(([name]) => !columns.has(name))
      .map(([name, definition]) => `ADD COLUMN ${name} ${definition}`);

    if (additions.length > 0) {
      await pool.query(`ALTER TABLE users ${additions.join(', ')}`);
      console.info('Ensured required users table columns:', additions.length);
    }

  } catch (err) {
    console.error('Failed to ensure required users table columns', err);
    throw err;
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

const ready = (async () => {
  await ensureDatabaseExists();
  await ensure();
  await migrateUsersTable();
  await migrateMothersTable();
  await ensureRequiredUserColumns();
})().catch((err) => {
  console.error('DB init error', err);
  throw err;
});

module.exports = pool;
module.exports.ready = ready;
