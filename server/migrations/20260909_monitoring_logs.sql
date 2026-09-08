CREATE TABLE IF NOT EXISTS monitoring_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  beneficiary_id VARCHAR(50) NOT NULL,
  beneficiary_type VARCHAR(20) NOT NULL,
  program_id INT NOT NULL,
  monitored BOOLEAN NOT NULL DEFAULT FALSE,
  monitored_date DATE NOT NULL,
  monitored_by INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_monitoring_log_day (beneficiary_id, beneficiary_type, program_id, monitored_date),
  KEY idx_monitoring_beneficiary (beneficiary_id, beneficiary_type),
  KEY idx_monitoring_program_date (program_id, monitored_date),
  CONSTRAINT fk_monitoring_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;