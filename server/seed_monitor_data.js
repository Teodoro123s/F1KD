const mysql = require('mysql2/promise');
require('dotenv').config();
const { buildMotherCheckupSamples } = require('./checkup_seed_data');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1kd',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 2,
});

const motherCheckups = buildMotherCheckupSamples();

const childWeeks = [
  [1, 1, '2026-01-19', 3.4, 51.0, 35.0, 'Normal', 'Nurse Maria Santos', 'Good feeding and alert response.'],
  [1, 2, '2026-01-26', 3.7, 52.5, 35.8, 'Normal', 'Nurse Maria Santos', 'Umbilical cord clean and dry.'],
  [1, 4, '2026-02-09', 4.3, 55.0, 37.0, 'Normal', 'Midwife Ana Cruz', 'Weight gain appropriate for age.'],
  [1, 8, '2026-03-09', 5.2, 59.5, 39.0, 'Normal', 'Midwife Ana Cruz', 'Tracks faces and responds to sound.'],
  [1, 12, '2026-04-06', 6.0, 62.0, 40.5, 'Normal', 'Dr. Liza Reyes', 'Beginning to roll over; breastfeeding continued.'],
  [1, 16, '2026-05-04', 6.7, 65.0, 42.0, 'Normal', 'Dr. Liza Reyes', 'Sits with support and reaches for objects.'],
  [2, 1, '2026-07-20', 3.2, 50.0, 34.5, 'Normal', 'Nurse Joel Lim', 'Newborn assessment within expected range.'],
  [2, 2, '2026-07-27', 3.5, 51.5, 35.2, 'Needs Follow-up', 'Nurse Joel Lim', 'Review feeding volume at next visit.'],
];

async function ensureMonitorSchema(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS mother_checkups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mother_id INT NOT NULL,
    trimester VARCHAR(30) NOT NULL,
    checkup_number TINYINT UNSIGNED NOT NULL,
    checkup_date DATE NOT NULL,
    gestational_age_weeks INT UNSIGNED NULL,
    blood_pressure VARCHAR(20) NULL,
    weight_kg DECIMAL(5,2) NULL,
    height_cm DECIMAL(5,2) NULL,
    bmi DECIMAL(5,2) NULL,
    nutritional_status VARCHAR(30) NULL,
    fundal_height_cm DECIMAL(5,2) NULL,
    fetal_heart_rate_bpm SMALLINT UNSIGNED NULL,
    service_provider VARCHAR(150) NULL,
    next_checkup_date DATE NULL,
    referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
    lab_assistance_provided BOOLEAN NOT NULL DEFAULT FALSE,
    assistance_amount DECIMAL(10,2) NULL,
    source_of_funds VARCHAR(80) NULL,
    facility_type VARCHAR(40) NULL,
    milk_subsidy_date DATE NULL,
    milk_quantity_pcs INT UNSIGNED NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mother_checkups_mother FOREIGN KEY (mother_id) REFERENCES mothers(id) ON DELETE CASCADE,
    CONSTRAINT uq_mother_checkup_step UNIQUE (mother_id, trimester, checkup_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await connection.query('ALTER TABLE child_checkups ADD COLUMN IF NOT EXISTS week_number TINYINT UNSIGNED NULL, ADD COLUMN IF NOT EXISTS developmental_status VARCHAR(40) NULL, ADD COLUMN IF NOT EXISTS service_provider VARCHAR(150) NULL');
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensureMonitorSchema(connection);

    const [mothers] = await connection.query('SELECT id FROM mothers ORDER BY id LIMIT 2');
    const [children] = await connection.query('SELECT id FROM children ORDER BY id LIMIT 2');
    if (!mothers.length || !children.length) {
      throw new Error('At least one mother and one child must exist before seeding monitor data.');
    }

    for (const row of motherCheckups) {
      const values = [...row];
      values[0] = mothers[row[0] - 1]?.id;
      if (!values[0]) continue;
      await connection.query(`INSERT INTO mother_checkups (
        mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
        blood_pressure, weight_kg, height_cm, bmi, nutritional_status, fundal_height_cm,
        fetal_heart_rate_bpm, service_provider, next_checkup_date, referred_to_hospital,
        lab_assistance_provided, assistance_amount, source_of_funds, facility_type,
        milk_subsidy_date, milk_quantity_pcs, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE checkup_date = VALUES(checkup_date), gestational_age_weeks = VALUES(gestational_age_weeks),
        blood_pressure = VALUES(blood_pressure), weight_kg = VALUES(weight_kg), height_cm = VALUES(height_cm), bmi = VALUES(bmi),
        nutritional_status = VALUES(nutritional_status), fundal_height_cm = VALUES(fundal_height_cm), fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
        service_provider = VALUES(service_provider), next_checkup_date = VALUES(next_checkup_date), referred_to_hospital = VALUES(referred_to_hospital),
        lab_assistance_provided = VALUES(lab_assistance_provided), assistance_amount = VALUES(assistance_amount), source_of_funds = VALUES(source_of_funds),
        facility_type = VALUES(facility_type), milk_subsidy_date = VALUES(milk_subsidy_date), milk_quantity_pcs = VALUES(milk_quantity_pcs), remarks = VALUES(remarks)`, values);
    }

    for (const row of childWeeks) {
      const childId = children[row[0] - 1]?.id;
      if (!childId) continue;
      const values = [childId, row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[1]];
      const [existing] = await connection.query('SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? LIMIT 1', [childId, row[1]]);
      if (existing.length) {
        await connection.query('UPDATE child_checkups SET visit_date = ?, weight = ?, height = ?, head_circumference = ?, developmental_status = ?, service_provider = ?, notes = ? WHERE id = ?', [...values.slice(1, 8), existing[0].id]);
      } else {
        await connection.query('INSERT INTO child_checkups (child_id, visit_date, weight, height, head_circumference, developmental_status, service_provider, notes, week_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', values);
      }
    }

    const [motherProgressColumns] = await connection.query("SHOW COLUMNS FROM mothers LIKE 'progress'");
    const [childProgressColumns] = await connection.query("SHOW COLUMNS FROM children LIKE 'progress'");
    if (motherProgressColumns.length) {
      for (const mother of mothers) await connection.query('UPDATE mothers SET progress = LEAST(100, ROUND((SELECT COUNT(*) FROM mother_checkups WHERE mother_id = ?) * 100 / 9)) WHERE id = ?', [mother.id, mother.id]);
    }
    if (childProgressColumns.length) {
      for (const child of children) await connection.query('UPDATE children SET progress = LEAST(100, ROUND((SELECT COUNT(*) FROM child_checkups WHERE child_id = ?) * 100 / 48)) WHERE id = ?', [child.id, child.id]);
    }
    await connection.commit();
    console.log(`Seeded ${motherCheckups.length} prenatal and ${childWeeks.length} child monitoring records.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Failed to seed monitor data:', error.message);
  process.exitCode = 1;
});