-- Migration: add children tables and related clinical tables
-- Run by developers or included for manual migrations

CREATE TABLE IF NOT EXISTS children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_code VARCHAR(30) NOT NULL UNIQUE,
  mother_id INT NOT NULL,
  community_id INT NULL,
  batch_id INT NULL,
  first_name VARCHAR(120) NOT NULL,
  middle_name VARCHAR(120),
  last_name VARCHAR(120) NOT NULL,
  suffix VARCHAR(30),
  birth_date DATE,
  birth_weight DECIMAL(5,2),
  birth_length DECIMAL(5,2),
  gender ENUM('Male','Female','Other') DEFAULT 'Female',
  delivery_type VARCHAR(80),
  health_status VARCHAR(120),
  birth_place VARCHAR(150),
  birth_attendant VARCHAR(150),
  apgar_score VARCHAR(10),
  feeding_type VARCHAR(80),
  nutrition_notes TEXT,
  father_name VARCHAR(150),
  relationship VARCHAR(50),
  address TEXT,
  progress INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_medical_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  condition_name VARCHAR(80) NOT NULL,
  has_condition BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  vaccine_name VARCHAR(50) NOT NULL,
  vaccine_date DATE,
  remarks TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS child_checkups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  visit_date DATE,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  head_circumference DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
