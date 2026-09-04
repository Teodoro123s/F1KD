CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(40) NOT NULL UNIQUE,
  role_name VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_key VARCHAR(80) NOT NULL,
  action_key ENUM('read', 'create', 'update', 'delete') NOT NULL,
  UNIQUE KEY uq_permission_resource_action (resource_key, action_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (role_key, role_name) VALUES
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('partner', 'Partner')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

INSERT INTO permissions (resource_key, action_key) VALUES
  ('user-management', 'read'), ('user-management', 'create'), ('user-management', 'update'), ('user-management', 'delete'),
  ('admin-resources', 'read'), ('admin-resources', 'create'), ('admin-resources', 'update'), ('admin-resources', 'delete'),
  ('partner-resources', 'read'), ('partner-resources', 'create'), ('partner-resources', 'update'), ('partner-resources', 'delete')
ON DUPLICATE KEY UPDATE action_key = VALUES(action_key);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.role_key = 'super_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.resource_key = 'admin-resources' AND p.action_key = 'read'
WHERE r.role_key = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.resource_key = 'partner-resources' AND p.action_key = 'read'
WHERE r.role_key = 'partner';

UPDATE users SET role = 'super_admin' WHERE LOWER(TRIM(role)) IN ('superadmin', 'super admin');
UPDATE users SET role = 'admin' WHERE LOWER(TRIM(role)) IN ('administrator');
UPDATE users SET role = 'partner' WHERE LOWER(TRIM(role)) IN ('community organizer');
