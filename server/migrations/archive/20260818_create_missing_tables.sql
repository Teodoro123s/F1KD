-- Migration: 20260818_create_missing_tables.sql
-- Create missing clinical tables for mothers/children when FK mismatch issues are possible.
-- This migration creates the tables without foreign-key constraints first, then provides ALTER statements
-- to add the foreign-keys after you confirm the parent column types (to avoid errno:150 FK errors).

-- IMPORTANT: Inspect parent table column types before running the ALTERs.
-- Use: SHOW CREATE TABLE mothers\G  and SHOW CREATE TABLE children\G

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Mother vaccines table (safe create without FK)
CREATE TABLE IF NOT EXISTS mother_vaccines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mother_id BIGINT DEFAULT NULL,
  vaccine_code VARCHAR(64) DEFAULT NULL,
  date_given DATE DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mother_vaccine (mother_id, vaccine_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Child vaccines table (safe create without FK)
CREATE TABLE IF NOT EXISTS child_vaccines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT DEFAULT NULL,
  vaccine_code VARCHAR(64) DEFAULT NULL,
  date_given DATE DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_child_vaccine (child_id, vaccine_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Optional: if you prefer INT for compatibility with existing schema, there are alternate create statements below (commented):
-- CREATE TABLE IF NOT EXISTS mother_vaccinations (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   mother_id INT DEFAULT NULL,
--   vaccine_code VARCHAR(64) DEFAULT NULL,
--   date_given DATE DEFAULT NULL,
--   remarks TEXT DEFAULT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   INDEX idx_mother_vaccine_int (mother_id, vaccine_code)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CREATE TABLE IF NOT EXISTS child_vaccinations (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   child_id INT DEFAULT NULL,
--   vaccine_code VARCHAR(64) DEFAULT NULL,
--   date_given DATE DEFAULT NULL,
--   remarks TEXT DEFAULT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   INDEX idx_child_vaccine_int (child_id, vaccine_code)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------
-- AFTER running the CREATE statements above, inspect the parent tables.
-- Example:
-- SHOW CREATE TABLE mothers\G
-- SHOW CREATE TABLE children\G
-- Check the exact column type and whether it's UNSIGNED (e.g., `id` BIGINT UNSIGNED NOT NULL).

-- If mothers.id is BIGINT UNSIGNED and children.id is BIGINT UNSIGNED, add the FK like this:
-- ALTER TABLE mother_vaccines
--   ADD CONSTRAINT fk_mother_vaccine_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE;

-- If children.id is the parent, add FK:
-- ALTER TABLE child_vaccines
--   ADD CONSTRAINT fk_child_vaccine_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

-- If the parent uses INT (signed), use these alternate ALTERs (after creating INT-based tables):
-- ALTER TABLE mother_vaccinations
--   ADD CONSTRAINT fk_mother_vaccinations_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE;
-- ALTER TABLE child_vaccinations
--   ADD CONSTRAINT fk_child_vaccinations_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

-- If you encounter errno:150 when adding the FK, verify that both tables have the same ENGINE (InnoDB),
-- the referenced column has the same exact type and attributes (UNSIGNED or not), and the parent column is indexed (PRIMARY/UNIQUE).

-- QUICK FIX (unsafe for strict migrations): if parent id is INT and you created BIGINT columns, you can ALTER the child columns to match:
-- ALTER TABLE mother_vaccines MODIFY mother_id INT UNSIGNED NULL;
-- ALTER TABLE child_vaccines MODIFY child_id INT UNSIGNED NULL;

-- After verifying and adding FK constraints, you may also want to create a few helpful indexes (if not created above):
-- CREATE INDEX idx_mother_vaccine_mother_id ON mother_vaccines (mother_id);
-- CREATE INDEX idx_child_vaccine_child_id ON child_vaccines (child_id);

-- End of migration
