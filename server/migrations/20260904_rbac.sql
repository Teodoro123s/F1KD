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

UPDATE users SET role = 'super_admin' WHERE LOWER(TRIM(role)) IN ('superadmin', 'super admin');
UPDATE users SET role = 'admin' WHERE LOWER(TRIM(role)) IN ('administrator');
UPDATE users SET role = 'partner' WHERE LOWER(TRIM(role)) IN ('community organizer');
