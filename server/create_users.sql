-- Unified database bootstrap for F1KD
-- Use this script to create a fresh copy of the application database on a new machine.
-- To fully recreate the database from scratch, uncomment the DROP DATABASE line before running.
-- mysql -u root -p < create_users.sql

-- DROP DATABASE IF EXISTS f1kd;
CREATE DATABASE IF NOT EXISTS f1kd CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE f1kd;

-- Core application users
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  middle_initial CHAR(1) DEFAULT NULL,
  contact_number VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  gender ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male',
  dob DATE DEFAULT NULL,
  location VARCHAR(120) DEFAULT NULL,
  role VARCHAR(120) NOT NULL DEFAULT 'Superadmin',
  status ENUM('Active','Suspended') NOT NULL DEFAULT 'Active',
  password_hash VARCHAR(255) DEFAULT NULL,
  name VARCHAR(255) GENERATED ALWAYS AS (
    CONCAT(
      first_name,
      IF(middle_initial IS NULL OR TRIM(middle_initial) = '', '', CONCAT(' ', middle_initial)),
      ' ', last_name
    )
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status),
  KEY idx_users_contact (contact_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Community and hierarchy tables
CREATE TABLE IF NOT EXISTS communities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  community_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  area VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(20) NOT NULL UNIQUE,
  community_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  records INT NOT NULL DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_batches_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_code VARCHAR(20) NOT NULL UNIQUE,
  community_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  leader VARCHAR(150),
  members_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_groups_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_batch (
  group_id INT NOT NULL,
  batch_id INT NOT NULL,
  PRIMARY KEY (group_id, batch_id),
  CONSTRAINT fk_group_batch_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_batch_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mothers and maternal clinical records
CREATE TABLE IF NOT EXISTS mothers (
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
  CONSTRAINT fk_mothers_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CONSTRAINT fk_mothers_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_mothers_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mother_ob_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  event_code VARCHAR(20) NOT NULL,
  gestational_age VARCHAR(50),
  outcome TEXT,
  FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mother_medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  condition_name VARCHAR(80) NOT NULL,
  has_condition BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mother_dental_records (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mother_vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  vaccine_name VARCHAR(20) NOT NULL,
  vaccine_date DATE,
  remarks TEXT,
  FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mother_checkups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mother_id INT NOT NULL,
  trimester VARCHAR(30) NOT NULL,
  checkup_number INT NOT NULL,
  checkup_date DATE,
  gestational_age_weeks INT,
  blood_pressure VARCHAR(30),
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  bmi DECIMAL(5,2),
  nutritional_status VARCHAR(80),
  fundal_height_cm DECIMAL(5,2),
  fetal_heart_rate_bpm VARCHAR(20),
  service_provider VARCHAR(150),
  next_checkup_date DATE,
  referred_to_hospital BOOLEAN DEFAULT FALSE,
  lab_assistance_provided BOOLEAN DEFAULT FALSE,
  assistance_amount DECIMAL(10,2),
  source_of_funds VARCHAR(80),
  facility_type VARCHAR(80),
  milk_subsidy_date DATE,
  milk_quantity_pcs INT,
  remarks TEXT,
  UNIQUE KEY uq_mother_checkup (mother_id, trimester, checkup_number),
  CONSTRAINT fk_mother_checkup_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Child tracking tables
CREATE TABLE IF NOT EXISTS children (
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
  CONSTRAINT fk_children_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
  CONSTRAINT fk_children_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL,
  CONSTRAINT fk_children_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_children_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  condition_name VARCHAR(80) NOT NULL,
  has_condition BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  vaccine_name VARCHAR(50) NOT NULL,
  vaccine_date DATE,
  remarks TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_checkups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  week_number TINYINT UNSIGNED NULL,
  visit_date DATE,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  head_circumference DECIMAL(5,2),
  developmental_status VARCHAR(40),
  service_provider VARCHAR(150),
  notes TEXT,
  UNIQUE KEY uq_child_checkup (child_id, week_number),
  CONSTRAINT fk_child_checkup_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional baseline seed data for a clean local copy.
-- Uncomment the blocks below if you want the fresh database to start with demo data.

-- INSERT INTO communities (community_code, name, area) VALUES
--   ('COMM-01', 'Monitor Demo School', 'Demo Area'),
--   ('COMM-02', 'Poblacion', 'Poblacion Area'),
--   ('COMM-03', 'Upang', 'Upang Area'),
--   ('COMM-04', 'San Roque', 'San Roque Area');
--
-- INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
-- SELECT 'GRP-01', id, 'Monitor Demo Group 1', 'Demo Leader', 0, 'Active' FROM communities WHERE name = 'Monitor Demo School';
-- INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
-- SELECT 'GRP-02', id, 'Monitor Demo Group 2', 'Demo Leader', 0, 'Active' FROM communities WHERE name = 'Monitor Demo School';
--
-- INSERT INTO batches (batch_code, community_id, name, records, progress, status)
-- SELECT 'BATCH-A1', id, 'Demo Batch A1', 0, 0, 'Active' FROM communities WHERE name = 'Monitor Demo School';
-- INSERT INTO batches (batch_code, community_id, name, records, progress, status)
-- SELECT 'BATCH-A2', id, 'Demo Batch A2', 0, 0, 'Active' FROM communities WHERE name = 'Monitor Demo School';

-- Recommended final step for a cloned install:
-- 1. Create the database using this script.
-- 2. Start the app backend.
-- 3. Run the project seed scripts if you want demo content loaded.

