CREATE TABLE IF NOT EXISTS batch_documentation_sets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  evidence_date DATE NOT NULL,
  uploaded_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_batch_documentations_batch_date (batch_id, evidence_date),
  CONSTRAINT fk_batch_documentation_sets_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batch_documentations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  evidence_date DATE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by_user_id INT NULL,
  documentation_set_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_batch_documentations_batch_date (batch_id, evidence_date),
  KEY idx_batch_documentations_set (documentation_set_id),
  CONSTRAINT fk_batch_documentations_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE batch_documentations
  ADD COLUMN IF NOT EXISTS documentation_set_id BIGINT UNSIGNED NULL,
  ADD INDEX IF NOT EXISTS idx_batch_documentations_set (documentation_set_id);
