DELETE FROM users
WHERE LOWER(TRIM(email)) IN (
  'super_admin@local.test',
  'admin@local.test',
  'partner@local.test',
  'community_coordinator@local.test',
  'health_worker@local.test'
);
