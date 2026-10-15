ALTER TABLE mother_checkups
  ADD COLUMN IF NOT EXISTS recorded_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE child_checkups
  ADD COLUMN IF NOT EXISTS recorded_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE monitoring_logs
  ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_user_id INT NULL;

UPDATE mother_checkups
SET created_by_user_id = COALESCE(created_by_user_id, recorded_by_user_id),
    updated_by_user_id = COALESCE(updated_by_user_id, recorded_by_user_id)
WHERE recorded_by_user_id IS NOT NULL;

UPDATE child_checkups
SET created_by_user_id = COALESCE(created_by_user_id, recorded_by_user_id),
    updated_by_user_id = COALESCE(updated_by_user_id, recorded_by_user_id)
WHERE recorded_by_user_id IS NOT NULL;

UPDATE monitoring_logs
SET created_by_user_id = COALESCE(created_by_user_id, monitored_by),
    updated_by_user_id = COALESCE(updated_by_user_id, monitored_by)
WHERE monitored_by IS NOT NULL;
