ALTER TABLE child_checkups
  ADD COLUMN IF NOT EXISTS next_checkup_date DATE NULL,
  ADD INDEX IF NOT EXISTS idx_child_checkups_next_date (next_checkup_date, child_id);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(191) NULL,
  ADD UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key (idempotency_key);
