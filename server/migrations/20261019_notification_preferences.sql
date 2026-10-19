CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INT NOT NULL,
  category VARCHAR(40) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, category),
  KEY idx_notification_preferences_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
