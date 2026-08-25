-- Migration: alter_users_to_v2.sql
-- Purpose: migrate existing users table to the improved schema used by the app.
-- IMPORTANT: BACKUP your users table before running this script.
-- 1) Export: mysqldump -u root -p f1kd users > users_backup.sql
-- 2) Check duplicates before adding UNIQUE constraint:
--    SELECT email, COUNT(*) cnt FROM users GROUP BY email HAVING cnt > 1;
-- If any rows are returned above, resolve duplicates first.

USE f1kd;

-- Show duplicate emails (for manual check)
SELECT email, COUNT(*) AS cnt FROM users GROUP BY email HAVING cnt > 1;

-- Make email NOT NULL (only safe if no NULL emails exist)
-- Run the following after confirming there are no NULL emails:
ALTER TABLE users
  MODIFY COLUMN email VARCHAR(255) NOT NULL;

-- Add UNIQUE constraint on email (run only after resolving duplicates)
ALTER TABLE users
  ADD UNIQUE INDEX uq_users_email (email);

-- Make id unsigned (safe if values are non-negative)
ALTER TABLE users
  MODIFY COLUMN id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY;

-- Ensure role and status have NOT NULL and defaults
ALTER TABLE users
  MODIFY COLUMN role VARCHAR(120) NOT NULL DEFAULT 'Superadmin',
  MODIFY COLUMN status ENUM('Active','Suspended') NOT NULL DEFAULT 'Active';

-- (Removed dev-only temp plaintext password storage)
-- Add stored generated full name column for convenience (if MySQL supports it)
ALTER TABLE users
  ADD COLUMN name VARCHAR(255)
    GENERATED ALWAYS AS (
      CONCAT(first_name, IF(middle_initial IS NULL OR TRIM(middle_initial) = '', '', CONCAT(' ', middle_initial)), ' ', last_name)
    ) STORED;

-- Ensure timestamps have NOT NULL defaults
ALTER TABLE users
  MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add useful indexes
ALTER TABLE users
  ADD INDEX idx_users_role (role),
  ADD INDEX idx_users_status (status),
  ADD INDEX idx_users_contact (contact_number);

-- Notes:
-- - If your MySQL/MariaDB version does not support "IF NOT EXISTS" in ADD COLUMN/ADD INDEX,
--   run the statements individually after checking whether columns/indexes already exist.
-- - After running this migration, verify the structure in phpMyAdmin (Structure tab) and test the application.
-- - For production, do not store or return plaintext passwords; use secure password reset flows instead.
