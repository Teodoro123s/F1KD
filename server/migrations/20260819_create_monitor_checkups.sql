-- Monitor module preparation migration
-- Run this against the f1kd database before enabling Monitor persistence.

-- One row represents one prenatal check-up for one mother.
CREATE TABLE IF NOT EXISTS mother_checkups (
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
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mother_checkups_mother
    FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
  CONSTRAINT uq_mother_checkup_step
    UNIQUE (mother_id, trimester, checkup_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_mother_checkups_date ON mother_checkups (mother_id, checkup_date);

-- Extend the existing child_checkups table for 48-week monitoring.
ALTER TABLE child_checkups
  ADD COLUMN IF NOT EXISTS week_number TINYINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS developmental_status VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS service_provider VARCHAR(150) NULL;

CREATE INDEX idx_child_checkups_week ON child_checkups (child_id, week_number);

-- Optional: prevent duplicate saved records for the same child and week.
-- Enable this only after cleaning any existing duplicate child_checkups rows.
-- ALTER TABLE child_checkups
--   ADD CONSTRAINT uq_child_checkup_week UNIQUE (child_id, week_number);

-- Example mother insert. Replace the values before running.
-- INSERT INTO mother_checkups (
--   mother_id, trimester, checkup_number, checkup_date,
--   gestational_age_weeks, blood_pressure, weight_kg, height_cm,
--   bmi, nutritional_status, fundal_height_cm, fetal_heart_rate_bpm,
--   service_provider, next_checkup_date, referred_to_hospital,
--   lab_assistance_provided, assistance_amount, source_of_funds,
--   facility_type, milk_subsidy_date, milk_quantity_pcs, remarks
-- ) VALUES (
--   5, '1st Trimester', 1, '2026-08-19',
--   12, '120/80', 55.00, 150.00,
--   24.44, 'Normal', 12.00, 140,
--   'Health worker', '2026-09-19', FALSE,
--   FALSE, NULL, 'Municipal Fund',
--   'Govt', NULL, NULL, NULL
-- );

-- Example child insert. Replace the values before running.
-- The existing child_checkups table uses visit_date for the check-up date.
-- INSERT INTO child_checkups (
--   child_id, visit_date, week_number, weight, height,
--   head_circumference, developmental_status, service_provider, notes
-- ) VALUES (
--   8, '2026-08-19', 1, 5.80, 62.00,
--   40.00, 'Normal', 'Health worker', 'Growth and development notes'
-- );
