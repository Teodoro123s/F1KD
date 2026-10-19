ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS coordinator_id INT NULL;

ALTER TABLE communities
  ADD UNIQUE INDEX IF NOT EXISTS uq_communities_coordinator_id (coordinator_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS coordinator_school_id INT
    GENERATED ALWAYS AS (
      CASE
        WHEN LOWER(REPLACE(REPLACE(TRIM(role), '_', ''), ' ', ''))
          IN ('communitycoordinator', 'communityorganizer', 'coordinator', 'co', 'partner')
        THEN school_id
        ELSE NULL
      END
    ) STORED,
  ADD UNIQUE INDEX IF NOT EXISTS uq_users_coordinator_school_id (coordinator_school_id);
