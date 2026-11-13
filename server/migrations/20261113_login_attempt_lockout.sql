-- Runtime bootstrap creates the same table for existing databases.
CREATE TABLE IF NOT EXISTS login_attempts (
  email_key CHAR(64) NOT NULL PRIMARY KEY,
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_login_attempts_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
