-- Run after 20260904_rbac.sql.
-- super_admin: all actions on all resources.
-- admin: read only on admin-resources.
-- partner: read only on partner-resources.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.role_key = 'super_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.resource_key = 'admin-resources' AND p.action_key = 'read'
WHERE r.role_key = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.resource_key = 'partner-resources' AND p.action_key = 'read'
WHERE r.role_key = 'partner';
