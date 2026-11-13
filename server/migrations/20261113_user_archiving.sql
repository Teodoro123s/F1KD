ALTER TABLE users
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_users_archived_at (archived_at);

ALTER TABLE users
  DROP INDEX IF EXISTS uq_users_coordinator_school_id,
  DROP COLUMN IF EXISTS coordinator_school_id;

ALTER TABLE users
  ADD COLUMN coordinator_school_id INT
    GENERATED ALWAYS AS (
      CASE
        WHEN archived_at IS NULL
          AND LOWER(REPLACE(REPLACE(TRIM(role), '_', ''), ' ', ''))
            IN ('communitycoordinator', 'communityorganizer', 'coordinator', 'co', 'partner')
        THEN school_id
        ELSE NULL
      END
    ) STORED,
  ADD UNIQUE INDEX uq_users_coordinator_school_id (coordinator_school_id);
