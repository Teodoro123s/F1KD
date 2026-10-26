CREATE TABLE IF NOT EXISTS program_receipt_documentation_sets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  monitored_date DATE NOT NULL,
  uploaded_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_program_receipt_documentation_program_date (program_id, monitored_date),
  CONSTRAINT fk_program_receipt_documentation_sets_program
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS program_receipt_documentations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  documentation_set_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_program_receipt_documentations_set (documentation_set_id),
  CONSTRAINT fk_program_receipt_documentations_set
    FOREIGN KEY (documentation_set_id) REFERENCES program_receipt_documentation_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS program_receipt_documentation_logs (
  documentation_set_id BIGINT UNSIGNED NOT NULL,
  monitoring_log_id INT NOT NULL,
  PRIMARY KEY (documentation_set_id, monitoring_log_id),
  KEY idx_program_receipt_documentation_logs_log (monitoring_log_id),
  CONSTRAINT fk_program_receipt_documentation_logs_set
    FOREIGN KEY (documentation_set_id) REFERENCES program_receipt_documentation_sets(id) ON DELETE CASCADE,
  CONSTRAINT fk_program_receipt_documentation_logs_log
    FOREIGN KEY (monitoring_log_id) REFERENCES monitoring_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
