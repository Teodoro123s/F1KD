const mysql = require('mysql2/promise');
require('dotenv').config();

const SCHOOL_NAME = 'Monitor Demo School';
const SCHOOL_AREA = 'Demo District';
const SCHOOL_CODE = 'SCH-MONITOR-DEMO';

const batches = [
  { code: 'BAT-MONITOR-A1', name: 'Demo Batch A1', group: 0, records: 2 },
  { code: 'BAT-MONITOR-A2', name: 'Demo Batch A2', group: 0, records: 2 },
  { code: 'BAT-MONITOR-B1', name: 'Demo Batch B1', group: 1, records: 2 },
  { code: 'BAT-MONITOR-B2', name: 'Demo Batch B2', group: 1, records: 2 },
];

const mothers = [
  { code: 'MTH-DEMO-A1-01', first: 'Leah', middle: 'Marie', last: 'Santos', maiden: 'Dela Cruz', suffix: 'Jr.', batch: 0, checkups: 3 },
  { code: 'MTH-DEMO-A1-02', first: 'Rina', middle: 'Grace', last: 'Garcia', maiden: 'Flores', batch: 0, checkups: 1 },
  { code: 'MTH-DEMO-A2-01', first: 'Maya', middle: 'Anne', last: 'Cruz', maiden: 'Villanueva', batch: 1, checkups: 2 },
  { code: 'MTH-DEMO-A2-02', first: 'Ana', middle: 'Beatriz', last: 'Reyes', maiden: 'Torres', batch: 1, checkups: 4 },
  { code: 'MTH-DEMO-B1-01', first: 'Nina', middle: 'Joy', last: 'Lopez', maiden: 'Aquino', batch: 2, checkups: 5 },
  { code: 'MTH-DEMO-B1-02', first: 'Joy', middle: 'Mae', last: 'Ramos', maiden: 'Mendoza', batch: 2, checkups: 2 },
  { code: 'MTH-DEMO-B2-01', first: 'Ella', middle: 'Rose', last: 'Navarro', maiden: 'Bautista', batch: 3, checkups: 1 },
  { code: 'MTH-DEMO-B2-02', first: 'Lara', middle: 'Faith', last: 'Mendoza', maiden: 'Castillo', batch: 3, checkups: 3 },
];

const prenatalValues = [
  ['2026-01-08', 8, '110/70', 52.4, 150, 23.3, 'Normal', 8, 148, 'Nurse Maria Santos'],
  ['2026-02-12', 12, '112/72', 53.1, 150, 23.6, 'Normal', 12, 152, 'Midwife Ana Cruz'],
  ['2026-03-19', 16, '114/74', 54.0, 150, 24.0, 'Normal', 16, 150, 'Dr. Liza Reyes'],
  ['2026-04-16', 20, '116/76', 55.2, 150, 24.5, 'Normal', 20, 148, 'Nurse Joel Lim'],
  ['2026-05-14', 24, '118/78', 56.0, 150, 24.9, 'Normal', 24, 146, 'Midwife Ana Cruz'],
  ['2026-06-11', 28, '120/80', 57.1, 150, 25.4, 'Overweight', 28, 144, 'Dr. Liza Reyes'],
  ['2026-07-09', 32, '122/80', 58.0, 150, 25.8, 'Overweight', 32, 142, 'Nurse Maria Santos'],
  ['2026-08-06', 36, '124/82', 59.2, 150, 26.3, 'Overweight', 36, 140, 'Dr. Liza Reyes'],
  ['2026-08-20', 38, '126/84', 60.0, 150, 26.7, 'At Risk', 38, 138, 'Dr. Liza Reyes'],
];

const childCompletedWeekCounts = [2, 8, 20, 48];

async function getOrCreate(connection, query, values, createQuery, createValues) {
  const [rows] = await connection.query(query, values);
  if (rows.length) return rows[0].id;
  const [result] = await connection.query(createQuery, createValues);
  return result.insertId;
}

async function ensureDemoClinicalSchema(connection) {
  await connection.query('ALTER TABLE child_checkups ADD COLUMN IF NOT EXISTS next_checkup_date DATE');
  await connection.query(`ALTER TABLE mothers
    ADD COLUMN IF NOT EXISTS maiden_surname VARCHAR(100),
    ADD COLUMN IF NOT EXISTS suffix VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mother_id_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS fundal_height VARCHAR(20),
    ADD COLUMN IF NOT EXISTS fhr VARCHAR(20),
    ADD COLUMN IF NOT EXISTS abortion INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stillbirth INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS height DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS medical_conditions JSON,
    ADD COLUMN IF NOT EXISTS other_medical_history TEXT`);
  await connection.query(`ALTER TABLE mother_ob_history
    ADD COLUMN IF NOT EXISTS event_label VARCHAR(120),
    ADD COLUMN IF NOT EXISTS event_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS seq INT`);
  await connection.query(`ALTER TABLE mother_dental_records
    ADD COLUMN IF NOT EXISTS visit_date DATE,
    ADD COLUMN IF NOT EXISTS dental_facility VARCHAR(150),
    ADD COLUMN IF NOT EXISTS dentist_in_charge VARCHAR(150),
    ADD COLUMN IF NOT EXISTS community_dentist VARCHAR(150),
    ADD COLUMN IF NOT EXISTS dentist_license VARCHAR(80),
    ADD COLUMN IF NOT EXISTS dentist_contact VARCHAR(20),
    ADD COLUMN IF NOT EXISTS teeth_count INT,
    ADD COLUMN IF NOT EXISTS dental_findings TEXT,
    ADD COLUMN IF NOT EXISTS dental_remarks TEXT,
    ADD COLUMN IF NOT EXISTS tartar_removal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS filling BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cleaning BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extraction BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS root_canal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS other_procedure BOOLEAN DEFAULT FALSE`);
}

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'f1kd',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 2,
  });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureDemoClinicalSchema(connection);
    const schoolId = await getOrCreate(
      connection,
      'SELECT id FROM communities WHERE name = ? LIMIT 1',
      [SCHOOL_NAME],
      'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
      [SCHOOL_CODE, SCHOOL_NAME, SCHOOL_AREA]
    );

    const groupIds = [];
    for (let index = 0; index < 2; index += 1) {
      groupIds.push(await getOrCreate(
        connection,
        'SELECT id FROM groups WHERE group_code = ? LIMIT 1',
        [`GRP-MONITOR-${index + 1}`],
        'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
        [`GRP-MONITOR-${index + 1}`, schoolId, `Monitor Demo Group ${index + 1}`, index === 0 ? 'Maria Santos' : 'Joel Lim', 4, 'Active']
      ));
    }

    const batchIds = [];
    for (const batch of batches) {
      batchIds.push(await getOrCreate(
        connection,
        'SELECT id FROM batches WHERE batch_code = ? LIMIT 1',
        [batch.code],
        'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
        [batch.code, schoolId, batch.name, batch.records, 0, 'Active']
      ));
    }

    const motherIds = [];
    for (const mother of mothers) {
      const batchId = batchIds[mother.batch];
      const groupId = groupIds[batches[mother.batch].group];
      const motherId = await getOrCreate(
        connection,
        'SELECT id FROM mothers WHERE mother_code = ? LIMIT 1',
        [mother.code],
        `INSERT INTO mothers (
          mother_code, community_id, group_id, batch_id, first_name, middle_name, last_name, maiden_surname, suffix,
          dob, lmp_date, edd_date, contact_number, trimester, gestational_age,
          prenatal_weight, prenatal_bp, prenatal_height, fundal_height, fhr, gravida, para, abortion, stillbirth, prenatal_reg_date,
          is_high_risk, program_type, emergency_name, emergency_contact, emergency_relationship, spouse_name, address, other_medical_history
          ) VALUES (${Array(33).fill('?').join(', ')})` ,
        [mother.code, schoolId, groupId, batchId, mother.first, mother.middle, mother.last, mother.maiden, mother.suffix || null,
          '1995-04-12', '2025-12-01', '2026-09-07', '09171234567', '1st Trimester', 12,
          55.0, '118/76', 150, 18, 148, 2, 1, 0, 0, '2026-01-08',
          mother.code.endsWith('02') ? 1 : 0, 'Maternal Health Program', 'Juan Santos', '09181234567', 'Spouse', 'Juan Santos', `${SCHOOL_AREA}, Demo Province`, 'No known allergies']
      );
      motherIds.push(motherId);
      await connection.query(
        `UPDATE mothers SET
          middle_name = ?, maiden_surname = ?, suffix = ?, dob = ?, lmp_date = ?, edd_date = ?,
          contact_number = ?, trimester = ?, gestational_age = ?, prenatal_weight = ?, prenatal_bp = ?,
          prenatal_height = ?, fundal_height = ?, fhr = ?, weight = ?, height = ?, gravida = ?, para = ?, abortion = ?, stillbirth = ?,
          prenatal_reg_date = ?, is_high_risk = ?, program_type = ?, emergency_name = ?, emergency_contact = ?,
          emergency_relationship = ?, spouse_name = ?, address = ?, other_medical_history = ?
         WHERE id = ?`,
        [mother.middle, mother.maiden, mother.suffix || null, '1995-04-12', '2025-12-01', '2026-09-07',
          '09171234567', '1st Trimester', 12, 55.0, '118/76', 150, 18, 148, 56.4, 150, 2, 1, 0, 0, '2026-01-08',
          mother.code.endsWith('02') ? 1 : 0, 'Maternal Health Program', 'Juan Santos', '09181234567', 'Spouse',
          'Juan Santos', `${SCHOOL_AREA}, Demo Province`, 'No known allergies', motherId]
      );

      await connection.query('DELETE FROM mother_ob_history WHERE mother_id = ?', [motherId]);
      await connection.query(
        'INSERT INTO mother_ob_history (mother_id, event_label, event_code, gestational_age, outcome, seq) VALUES (?, ?, ?, ?, ?, ?)',
        [motherId, 'G1', 'G1', '39 weeks', mother.checkups > 2 ? 'Live birth' : 'Current pregnancy', 1]
      );
      await connection.query('DELETE FROM mother_medical_conditions WHERE mother_id = ?', [motherId]);
      await connection.query(
        'INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition) VALUES (?, ?, ?)',
        [motherId, mother.code.endsWith('02') ? 'hypertension' : 'diabetes', mother.code.endsWith('02')]
      );
      await connection.query('DELETE FROM mother_dental_records WHERE mother_id = ?', [motherId]);
      await connection.query(
        `INSERT INTO mother_dental_records (
          mother_id, visit_date, dental_facility, dentist_in_charge, community_dentist,
          dentist_license, dentist_contact, teeth_count, dental_findings, dental_remarks,
          tartar_removal, filling, cleaning, extraction, root_canal, other_procedure
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [motherId, '2026-02-18', 'Demo RHU Dental Clinic', 'Dr. Carla Lim', 'Nurse Maria Santos',
          'DENT-2026-001', '09190001111', 28, 'Mild gingivitis; one cavity assessed.', 'Return after six months.',
          1, 1, 1, 0, 0, 0]
      );
      await connection.query('DELETE FROM mother_vaccinations WHERE mother_id = ?', [motherId]);
      await connection.query(
        `INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks) VALUES
          (?, 'TT1', '2026-01-15', 'First dose administered.'),
          (?, 'TT2', '2026-02-15', 'Second dose administered.')`,
        [motherId, motherId]
      );
    }

    for (let index = 0; index < mothers.length; index += 1) {
      const mother = mothers[index];
      for (let checkupIndex = 0; checkupIndex < mother.checkups; checkupIndex += 1) {
        const value = prenatalValues[(index + checkupIndex) % prenatalValues.length];
        const nextDate = index === 0 ? '2026-09-01'
          : index === 1 ? '2026-09-20'
          : index === 2 ? '2026-10-01'
          : '2026-09-25';
        await connection.query(`INSERT INTO mother_checkups (
          mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
          blood_pressure, weight_kg, height_cm, bmi, nutritional_status, fundal_height_cm,
          fetal_heart_rate_bpm, service_provider, next_checkup_date, referred_to_hospital,
          lab_assistance_provided, assistance_amount, source_of_funds, facility_type, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE checkup_date = VALUES(checkup_date), gestational_age_weeks = VALUES(gestational_age_weeks),
          blood_pressure = VALUES(blood_pressure), weight_kg = VALUES(weight_kg), height_cm = VALUES(height_cm), bmi = VALUES(bmi),
          nutritional_status = VALUES(nutritional_status), fundal_height_cm = VALUES(fundal_height_cm), fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
          service_provider = VALUES(service_provider), next_checkup_date = VALUES(next_checkup_date), remarks = VALUES(remarks)`,
          [motherIds[index], checkupIndex < 3 ? '1st Trimester' : checkupIndex < 6 ? '2nd Trimester' : '3rd Trimester',
            (checkupIndex % 3) + 1, value[0], value[1], value[2], value[3], value[4], value[5], value[6], value[7], value[8], value[9],
            nextDate, 0, checkupIndex % 2, checkupIndex % 2 ? 250 : null, 'Municipal Fund', checkupIndex % 2 ? 'District Hospital' : 'RHU',
            `Demo prenatal visit ${checkupIndex + 1} for ${mother.first} ${mother.last}.`]);
      }
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const motherWithChild = motherIds[batchIndex * 2];
      const childCode = `CHD-DEMO-${batchIndex + 1}`;
      const childId = await getOrCreate(
        connection,
        'SELECT id FROM children WHERE child_code = ? LIMIT 1',
        [childCode],
        `INSERT INTO children (
          child_code, mother_id, first_name, last_name, birth_date, birth_weight,
          birth_length, gender, health_status, birth_place, feeding_type, address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [childCode, motherWithChild, ['Noah', 'Mia', 'Eli', 'Sofia'][batchIndex], 'DemoChild',
          `2026-0${batchIndex + 1}-15`, 3.1 + batchIndex * 0.2, 49 + batchIndex, batchIndex % 2 ? 'Female' : 'Male',
          'Healthy', SCHOOL_NAME, 'Exclusive Breastfeeding', SCHOOL_AREA]
      );
      const weeks = Array.from({ length: childCompletedWeekCounts[batchIndex] }, (_, weekIndex) => weekIndex + 1);
      await connection.query('DELETE FROM child_checkups WHERE child_id = ?', [childId]);
      for (const week of weeks) {
        const values = [`2026-0${Math.min(9, batchIndex + 2)}-${String(Math.min(28, 5 + week)).padStart(2, '0')}`, week,
          3.2 + week * 0.22 + batchIndex * 0.1, 50 + week * 0.55, 35 + week * 0.12,
          week === 3 ? 'Needs Follow-up' : 'Normal', 'Nurse Maria Santos', `Demo growth visit at week ${week}.`];
        const nextCheckupDate = batchIndex === 0 ? '2026-09-01' : batchIndex === 1 ? '2026-09-20' : '2026-10-01';
        const [existing] = await connection.query('SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? LIMIT 1', [childId, week]);
        if (existing.length) {
          await connection.query(`UPDATE child_checkups SET next_checkup_date = ?, visit_date = ?, weight = ?, height = ?, head_circumference = ?,
            developmental_status = ?, service_provider = ?, notes = ? WHERE id = ?`, [nextCheckupDate, ...values.filter((_, index) => index !== 1), existing[0].id]);
        } else {
          await connection.query(`INSERT INTO child_checkups (
            child_id, next_checkup_date, visit_date, week_number, weight, height, head_circumference,
            developmental_status, service_provider, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [childId, nextCheckupDate, values[0], values[1], ...values.slice(2)]);
        }
      }
      await connection.query('DELETE FROM child_medical_conditions WHERE child_id = ?', [childId]);
      await connection.query(
        'INSERT INTO child_medical_conditions (child_id, condition_name, has_condition) VALUES (?, ?, ?)',
        [childId, 'jaundice', batchIndex === 1]
      );
      await connection.query('DELETE FROM child_vaccinations WHERE child_id = ?', [childId]);
      await connection.query(
        `INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks) VALUES
          (?, 'BCG', '2026-01-20', 'Administered at birth facility.'),
          (?, 'HepB', '2026-01-20', 'Birth dose recorded.'),
          (?, 'OPV', '2026-02-20', 'No adverse reaction.')`,
        [childId, childId, childId]
      );
      await connection.query(
        `UPDATE children SET community_id = ?, group_id = ?, batch_id = ?, delivery_type = ?, health_status = ?, birth_attendant = ?, apgar_score = ?,
          feeding_type = ?, nutrition_notes = ?, father_name = ?, relationship = ?, address = ? WHERE id = ?`,
        [schoolId, groupIds[batches[batchIndex].group], batchIds[batchIndex], 'Vaginal Delivery', 'Healthy',
          'Midwife Ana Cruz', '9/10', 'Exclusive Breastfeeding', 'Growth monitoring within expected range.',
          'Juan Santos', 'Father', SCHOOL_AREA, childId]
      );
    }

    await connection.commit();
    console.log(`Seeded ${SCHOOL_NAME}: 2 groups, 4 batches, 8 mothers, and 4 children.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Failed to seed school hierarchy:', error.message);
  process.exitCode = 1;
});
