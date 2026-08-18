-- Migration: 20260818_create_mothers_children.sql
-- Create normalized mothers/children schema with supporting tables.
-- Run this against your MySQL server (test on staging/dev first). Requires InnoDB and utf8mb4.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS mothers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mother_code VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(128),
  middle_name VARCHAR(128),
  last_name VARCHAR(128),
  suffix VARCHAR(32),
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
  is_high_risk TINYINT(1) DEFAULT 0,
  program_type VARCHAR(128),
  emergency_name VARCHAR(128),
  emergency_contact VARCHAR(32),
  emergency_relationship VARCHAR(64),
  spouse_name VARCHAR(128),
  medical_conditions JSON DEFAULT NULL,
  other_medical_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_mother_name (last_name, first_name),
  INDEX idx_community (community),
  INDEX idx_mother_code (mother_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mother_ob_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mother_id BIGINT UNSIGNED NOT NULL,
  event_label VARCHAR(64) NOT NULL,
  gestational_age VARCHAR(64),
  outcome VARCHAR(128),
  seq INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ob_history_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mother_vaccines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mother_id BIGINT UNSIGNED NOT NULL,
  vaccine_code VARCHAR(64),
  date_given DATE,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mother_vaccine_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
  INDEX idx_mother_vaccine (mother_id, vaccine_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_code VARCHAR(64) UNIQUE,
  mother_id BIGINT UNSIGNED DEFAULT NULL,
  first_name VARCHAR(128),
  middle_name VARCHAR(128),
  last_name VARCHAR(128),
  suffix VARCHAR(32),
  birth_date DATE,
  birth_weight DECIMAL(6,2),
  birth_length DECIMAL(6,2),
  gender VARCHAR(16),
  delivery_type VARCHAR(64),
  health_status VARCHAR(128),
  community VARCHAR(128),
  batch_id BIGINT UNSIGNED DEFAULT NULL,
  progress INT DEFAULT 0,
  medical_conditions JSON DEFAULT NULL,
  other_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_children_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE SET NULL,
  INDEX idx_children_mother (mother_id),
  INDEX idx_children_code (child_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS child_vaccines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  vaccine_code VARCHAR(64),
  date_given DATE,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_child_vaccine_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  INDEX idx_child_vaccine (child_id, vaccine_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Example UPSERT: upsert mother by mother_code
-- Adjust columns to your payload shape
INSERT INTO mothers (mother_code, first_name, last_name, lmp_date, edd_date, community, updated_at)
VALUES ('SCH-0003','Ana','Cruz','2025-01-01','2025-10-08','Poblacion', NOW())
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name  = VALUES(last_name),
  lmp_date   = VALUES(lmp_date),
  edd_date   = VALUES(edd_date),
  community  = VALUES(community),
  updated_at = NOW();

-- Example UPSERT child by child_code
INSERT INTO children (child_code, mother_id, first_name, last_name, birth_date, birth_weight)
VALUES ('C-0001', 1, 'Juan', 'Cruz', '2026-01-01', 3.2)
ON DUPLICATE KEY UPDATE
  mother_id = VALUES(mother_id),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  birth_date = VALUES(birth_date),
  birth_weight = VALUES(birth_weight),
  updated_at = NOW();

-- Transaction example: create child and update mother in one transaction
-- START TRANSACTION;
-- INSERT INTO children (child_code, mother_id, first_name, last_name, birth_date, birth_weight)
-- VALUES ('C-0002', 1, 'Maria', 'Cruz', '2026-02-02', 3.4);
-- UPDATE mothers SET updated_at = NOW() WHERE id = 1;
-- COMMIT;

-- Helpful selects
-- Mother with children
SELECT m.*, c.id AS child_id, c.first_name AS child_first_name, c.last_name AS child_last_name, c.birth_date
FROM mothers m
LEFT JOIN children c ON c.mother_id = m.id
WHERE m.mother_code = 'SCH-0003'
ORDER BY c.birth_date DESC;

-- Mother + OB history + vaccines
SELECT m.*, h.event_label, h.gestational_age, v.vaccine_code, v.date_given
FROM mothers m
LEFT JOIN mother_ob_history h ON h.mother_id = m.id
LEFT JOIN mother_vaccines v ON v.mother_id = m.id
WHERE m.id = 1
ORDER BY h.seq, v.date_given;

-- Notes:
-- 1) medical_conditions JSON columns are convenient for flexible flags. If you need to query those flags often, consider normalizing them to boolean columns.
-- 2) Use transactions for multi-step operations (create child + update mother aggregates) to maintain consistency.
-- 3) Test migrations on a copy of production data before applying to production.
