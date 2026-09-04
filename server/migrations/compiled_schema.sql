-- F1KD compiled schema
--
-- This file is the organized fresh-install schema compiled from the runtime
-- bootstrap and migrations. It is intended for a new database only.
-- Existing databases must use the individual migrations because CREATE TABLE
-- IF NOT EXISTS does not reconcile existing columns or constraints.
CREATE DATABASE IF NOT EXISTS f1kd CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE f1kd;
-- ---------------------------------------------------------------------------
-- Core application tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  first_name VARCHAR(120) NOT NULL DEFAULT '',
  last_name VARCHAR(120) NOT NULL DEFAULT '',
  middle_initial CHAR(1) DEFAULT NULL,
  contact_number VARCHAR(20) DEFAULT NULL,
  gender ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male',
  dob DATE DEFAULT NULL,
  location VARCHAR(120) DEFAULT NULL,
  role VARCHAR(120) NOT NULL DEFAULT 'Superadmin',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  school_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role (role),
  KEY idx_users_status (status),
  KEY idx_users_school_id (school_id),
  KEY idx_users_school_created_at (school_id, created_at),
  KEY idx_users_school_status (school_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS communities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  municipality VARCHAR(150),
  province VARCHAR(150),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  community VARCHAR(150),
  records INT NOT NULL DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(150),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  community VARCHAR(150),
  leader VARCHAR(150),
  members_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS group_batch (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  batch_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_group_batch_group (group_id),
  KEY idx_group_batch_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ---------------------------------------------------------------------------
-- Beneficiary tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mothers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_code VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(120),
  middle_name VARCHAR(120),
  last_name VARCHAR(120),
  suffix VARCHAR(30),
  dob DATE,
  contact_number VARCHAR(32),
  address TEXT,
  area VARCHAR(128),
  community VARCHAR(128),
  mother_external_id VARCHAR(128),
  lmp_date DATE,
  edd_date DATE,
  gestational_age INT,
  trimester VARCHAR(32),
  prenatal_weight DECIMAL(6,2),
  prenatal_bp VARCHAR(32),
  prenatal_height DECIMAL(6,2),
  weight DECIMAL(6,2),
  height DECIMAL(6,2),
  is_high_risk BOOLEAN DEFAULT FALSE,
  program_type VARCHAR(150),
  emergency_name VARCHAR(150),
  emergency_contact VARCHAR(20),
  emergency_relationship VARCHAR(60),
  spouse_name VARCHAR(150),
  medical_conditions JSON,
  other_medical_history TEXT,
  group_id INT,
  batch_id INT,
  prenatal_reg_date DATE,
  fundal_height VARCHAR(20),
  fhr VARCHAR(20),
  gravida INT,
  para INT,
  abortion INT DEFAULT 0,
  stillbirth INT DEFAULT 0,
  birth_certificate_document_name VARCHAR(255),
  birth_certificate_document_path VARCHAR(500),
  consent_document_name VARCHAR(255),
  consent_document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_code VARCHAR(30) NOT NULL UNIQUE,
  mother_id INT NOT NULL,
  community_id INT,
  batch_id INT,
  group_id INT,
  first_name VARCHAR(120) NOT NULL,
  middle_name VARCHAR(120),
  last_name VARCHAR(120) NOT NULL,
  suffix VARCHAR(30),
  birth_date DATE,
  birth_weight DECIMAL(5,2),
  birth_length DECIMAL(5,2),
  gender ENUM('Male','Female','Other') DEFAULT 'Female',
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
  blood_type VARCHAR(5),
  no_of_child_delivered INT,
  exclusive_breastfeeding VARCHAR(20),
  expanded_newborn_screening TEXT,
  expanded_newborn_screening_result TEXT,
  multiple_birth_type VARCHAR(30),
  birth_document_name VARCHAR(255),
  birth_document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ---------------------------------------------------------------------------
-- Maternal clinical tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mother_ob_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  event_label VARCHAR(120),
  gestational_age VARCHAR(50),
  outcome TEXT,
  seq INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mother_ob_history_mother (mother_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mother_medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  condition_name VARCHAR(80) NOT NULL,
  has_condition BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mother_dental_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  visit_date DATE,
  treatment VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mother_vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  vaccine_name VARCHAR(100),
  vaccine_date DATE,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mother_checkups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  trimester VARCHAR(30) NOT NULL,
  checkup_number INT NOT NULL,
  checkup_date DATE,
  gestational_age_weeks INT UNSIGNED,
  blood_pressure VARCHAR(20),
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  bmi DECIMAL(5,2),
  nutritional_status VARCHAR(30),
  fundal_height_cm DECIMAL(5,2),
  fetal_heart_rate_bpm SMALLINT UNSIGNED,
  service_provider VARCHAR(150),
  next_checkup_date DATE,
  referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
  lab_assistance_provided BOOLEAN NOT NULL DEFAULT FALSE,
  assistance_amount DECIMAL(10,2),
  source_of_funds VARCHAR(80),
  facility_type VARCHAR(40),
  milk_subsidy_date DATE,
  milk_quantity_pcs INT UNSIGNED,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mother_checkup (mother_id, trimester, checkup_number),
  KEY idx_mother_checkups_date (mother_id, checkup_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ---------------------------------------------------------------------------
-- Child clinical tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  condition_name VARCHAR(80) NOT NULL,
  has_condition BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS child_vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  vaccine_name VARCHAR(100),
  vaccine_date DATE,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS child_checkups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  visit_date DATE,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  head_circumference DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  week_number INT UNSIGNED,
  developmental_status VARCHAR(40),
  service_provider VARCHAR(150),
  KEY idx_child_checkups_week (child_id, week_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ---------------------------------------------------------------------------
-- RBAC tables from the authorization migration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(40) NOT NULL UNIQUE,
  role_name VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_key VARCHAR(80) NOT NULL,
  action_key ENUM('read','create','update','delete') NOT NULL,
  UNIQUE KEY uq_permission_resource_action (resource_key, action_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Seed canonical roles and permissions after the tables are created.
INSERT INTO roles (role_key, role_name) VALUES
  ('super_admin', 'Super Admin'), ('admin', 'Admin'), ('partner', 'Partner')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);
INSERT INTO permissions (resource_key, action_key) VALUES
  ('user-management', 'read'), ('user-management', 'create'),
  ('user-management', 'update'), ('user-management', 'delete'),
  ('admin-resources', 'read'), ('partner-resources', 'read')
ON DUPLICATE KEY UPDATE action_key = VALUES(action_key);
