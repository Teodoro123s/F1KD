-- Run this in your MySQL to create the database and users table
-- Updated: uses email as username, stores bcrypt password_hash only,
-- and includes an optional temporary generated password field (nullable).

CREATE DATABASE IF NOT EXISTS f1kd CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci;
USE f1kd;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- UI fields
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  middle_initial CHAR(1) DEFAULT NULL,

  contact_number VARCHAR(20) DEFAULT NULL,

  -- email is the username in the system
  email VARCHAR(255) NOT NULL,

  gender ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male',
  dob DATE DEFAULT NULL,
  location VARCHAR(120) DEFAULT NULL,
  role VARCHAR(120) NOT NULL DEFAULT 'Superadmin',
  status ENUM('Active','Suspended') NOT NULL DEFAULT 'Active',

  -- Store only hashed password (bcrypt) here
  password_hash VARCHAR(255) DEFAULT NULL,

  -- OPTIONAL: store a one-time generated plaintext password temporarily (development only).
  -- This is NOT recommended for production. If used, clear this field immediately after showing the password.
  temp_plain_password VARCHAR(255) DEFAULT NULL,
  temp_password_expires_at DATETIME DEFAULT NULL,

  -- Convenience: stored full name for easier querying (composed from parts)
  name VARCHAR(255) AS (
    CONCAT(first_name,
           IF(middle_initial IS NULL OR TRIM(middle_initial) = '', '', CONCAT(' ', middle_initial)),
           ' ', last_name)
  ) STORED,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes & constraints
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_contact (contact_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
