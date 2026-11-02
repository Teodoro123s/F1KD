CREATE TABLE IF NOT EXISTS help_guidance_preferences (
  user_id INT NOT NULL PRIMARY KEY,
  guided_tours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  contextual_tooltips_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  page_explanations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  workflow_guide_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  tour_role VARCHAR(40) DEFAULT NULL,
  tour_status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  tour_step SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_help_guidance_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
