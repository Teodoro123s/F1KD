ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INT NULL;

ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_school_id (school_id);

ALTER TABLE users
  ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES communities(id) ON DELETE SET NULL;
