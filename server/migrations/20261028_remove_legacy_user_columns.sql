-- Remove unused legacy fields from users.
-- Notification read state is stored in notification_reads.
ALTER TABLE users
  DROP COLUMN IF EXISTS auth_version,
  DROP COLUMN IF EXISTS pending_credential_email,
  DROP COLUMN IF EXISTS last_notifications_read_at,
  DROP COLUMN IF EXISTS last_notifications_read_id,
  DROP COLUMN IF EXISTS must_change_password;
