ALTER TABLE program_clusters
  ADD COLUMN IF NOT EXISTS scope_id INT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_cluster_scope_id
  ON program_clusters (program_id, scope_type, scope_id);

ALTER TABLE program_clusters
  DROP INDEX IF EXISTS uq_program_cluster;

CREATE INDEX IF NOT EXISTS idx_program_clusters_scope_identity
  ON program_clusters (scope_type, scope_id);
