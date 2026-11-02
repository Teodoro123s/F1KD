ALTER TABLE children
  ADD COLUMN IF NOT EXISTS archived_with_mother_id INT NULL,
  ADD INDEX IF NOT EXISTS idx_children_archived_with_mother_id (archived_with_mother_id);
