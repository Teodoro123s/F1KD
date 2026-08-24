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
  { code: 'MTH-DEMO-A1-01', first: 'Leah', last: 'Santos', batch: 0, checkups: 3 },
  { code: 'MTH-DEMO-A1-02', first: 'Rina', last: 'Garcia', batch: 0, checkups: 1 },
  { code: 'MTH-DEMO-A2-01', first: 'Maya', last: 'Cruz', batch: 1, checkups: 2 },
  { code: 'MTH-DEMO-A2-02', first: 'Ana', last: 'Reyes', batch: 1, checkups: 4 },
  { code: 'MTH-DEMO-B1-01', first: 'Nina', last: 'Lopez', batch: 2, checkups: 5 },
  { code: 'MTH-DEMO-B1-02', first: 'Joy', last: 'Ramos', batch: 2, checkups: 2 },
  { code: 'MTH-DEMO-B2-01', first: 'Ella', last: 'Navarro', batch: 3, checkups: 1 },
  { code: 'MTH-DEMO-B2-02', first: 'Lara', last: 'Mendoza', batch: 3, checkups: 3 },
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

async function getOrCreate(connection, query, values, createQuery, createValues) {
  const [rows] = await connection.query(query, values);
  if (rows.length) return rows[0].id;
  const [result] = await connection.query(createQuery, createValues);
  return result.insertId;
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
    const schoolId = await getOrCreate(
      connection,
      'SELECT id FROM communities WHERE name = ? LIMIT 1',
      [SCHOOL_NAME],
      'INSERT INTO communities (name, municipality, province, address) VALUES (?, ?, ?, ?)',
      [SCHOOL_NAME, SCHOOL_AREA, 'Demo Province', 'Monitor demonstration school']
    );

    const groupIds = [];
    for (let index = 0; index < 2; index += 1) {
      groupIds.push(await getOrCreate(
        connection,
        'SELECT id FROM groups WHERE group_name = ? LIMIT 1',
        [`Monitor Demo Group ${index + 1}`],
        'INSERT INTO groups (group_name, description, community, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
        [`Monitor Demo Group ${index + 1}`, `Monitoring group ${index + 1}`, SCHOOL_NAME, index === 0 ? 'Maria Santos' : 'Joel Lim', 4, 'Active']
      ));
    }

    const batchIds = [];
    for (const batch of batches) {
      batchIds.push(await getOrCreate(
        connection,
        'SELECT id FROM batches WHERE batch_code = ? LIMIT 1',
        [batch.code],
        'INSERT INTO batches (batch_code, name, description, community, records, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [batch.code, batch.name, `Two-mother sample batch for ${SCHOOL_NAME}`, SCHOOL_NAME, batch.records, 0, 'Active']
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
          mother_code, group_id, batch_id, first_name, last_name, community, area,
          dob, lmp_date, edd_date, contact_number, trimester, gestational_age,
          prenatal_weight, prenatal_bp, prenatal_height, gravida, para, prenatal_reg_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [mother.code, groupId, batchId, mother.first, mother.last, SCHOOL_NAME, SCHOOL_AREA,
          '1995-04-12', '2025-12-01', '2026-09-07', '09171234567', '1st Trimester', 12,
          55.0, '118/76', 150, 1, 0, '2026-01-08']
      );
      motherIds.push(motherId);
    }

    for (let index = 0; index < mothers.length; index += 1) {
      const mother = mothers[index];
      for (let checkupIndex = 0; checkupIndex < mother.checkups; checkupIndex += 1) {
        const value = prenatalValues[(index + checkupIndex) % prenatalValues.length];
        const nextDate = `2026-${String(Math.min(12, Number(value[0].slice(5, 7)) + 1)).padStart(2, '0')}-${value[0].slice(8)}`;
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
      const weeks = [[1, 2, 4], [1, 3], [1, 2, 8, 12], [1, 4, 16, 24]][batchIndex];
      for (const week of weeks) {
        const values = [`2026-0${Math.min(9, batchIndex + 2)}-${String(Math.min(28, 5 + week)).padStart(2, '0')}`, week,
          3.2 + week * 0.22 + batchIndex * 0.1, 50 + week * 0.55, 35 + week * 0.12,
          week === 3 ? 'Needs Follow-up' : 'Normal', 'Nurse Maria Santos', `Demo growth visit at week ${week}.`];
        const [existing] = await connection.query('SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? LIMIT 1', [childId, week]);
        if (existing.length) {
          await connection.query(`UPDATE child_checkups SET visit_date = ?, weight = ?, height = ?, head_circumference = ?,
            developmental_status = ?, service_provider = ?, notes = ? WHERE id = ?`, [...values.filter((_, index) => index !== 1), existing[0].id]);
        } else {
          await connection.query(`INSERT INTO child_checkups (
            child_id, visit_date, week_number, weight, height, head_circumference,
            developmental_status, service_provider, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [childId, ...values]);
        }
      }
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
