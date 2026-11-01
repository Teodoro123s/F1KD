ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_communities_archived_at (archived_at);

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_groups_archived_at (archived_at);

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_batches_archived_at (archived_at);

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_programs_archived_at (archived_at);

ALTER TABLE mothers
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_mothers_archived_at (archived_at);

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(500) NULL,
  ADD INDEX IF NOT EXISTS idx_children_archived_at (archived_at);

-- Rollback (only if archive metadata has not been used):
-- ALTER TABLE children DROP INDEX idx_children_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
-- ALTER TABLE mothers DROP INDEX idx_mothers_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
-- ALTER TABLE programs DROP INDEX idx_programs_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
-- ALTER TABLE batches DROP INDEX idx_batches_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
-- ALTER TABLE groups DROP INDEX idx_groups_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
-- ALTER TABLE communities DROP INDEX idx_communities_archived_at, DROP COLUMN archive_reason, DROP COLUMN archived_by_user_id, DROP COLUMN archived_at;
