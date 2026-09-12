CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(80) NOT NULL DEFAULT 'Other',
  provider VARCHAR(150) NOT NULL,
  description TEXT,
  beneficiary_type VARCHAR(40) NOT NULL DEFAULT 'Mother and Child',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  target INT NOT NULL DEFAULT 0,
  received INT NOT NULL DEFAULT 0,
  activities INT NOT NULL DEFAULT 0,
  latest DATE NULL,
  ended DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS program_clusters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  scope_type VARCHAR(20) NOT NULL,
  scope_name VARCHAR(150) NOT NULL,
  beneficiaries INT NOT NULL DEFAULT 0,
  received INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_program_cluster (program_id, scope_type, scope_name),
  CONSTRAINT fk_program_clusters_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;