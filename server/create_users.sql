-- Run this in your MySQL to create the database and users table
CREATE DATABASE IF NOT EXISTS f1kd CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci;
USE f1kd;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  middle_initial CHAR(1),
  contact_number VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  gender ENUM('Male','Female','Other') DEFAULT 'Male',
  dob DATE,
  location VARCHAR(120),
  role VARCHAR(120),
  status ENUM('Active','Suspended') DEFAULT 'Active',
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
