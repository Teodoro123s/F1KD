CREATE INDEX IF NOT EXISTS idx_users_school_created_at
  ON users (school_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_school_status
  ON users (school_id, status);
