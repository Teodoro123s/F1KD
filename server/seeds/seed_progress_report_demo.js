const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1kd',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 2,
});

const profiles = [
  {
    batchName: 'October',
    motherCode: 'DEMO-MOM-COMP-01',
    childCode: 'DEMO-CHILD-PROGRESS-01',
    mother: {
      firstName: 'Leah',
      middleName: 'Marie',
      lastName: 'Santos',
      dob: '1992-04-18',
      lmpDate: '2025-12-20',
      eddDate: '2026-09-26',
      contact: '09171234567',
      highRisk: 0,
      program: 'Maternal Health Program',
      address: 'Purok 1, Demo Village',
    },
    child: {
      firstName: 'Mateo',
      middleName: 'Luis',
      lastName: 'Santos',
      birthDate: '2026-01-10',
      birthWeight: 3.2,
      birthLength: 50,
      gender: 'Male',
      feedingType: 'Breastfeeding',
      deliveryType: 'Vaginal Delivery',
      progress: 13,
    },
    childWeeks: [1, 2, 4, 6, 8, 12],
    childBaseWeight: 3.2,
    childBaseHeight: 50,
    childHeadCircumference: 35,
  },
  {
    batchName: 'October',
    motherCode: 'DEMO-MOM-COMP-02',
    childCode: 'DEMO-CHILD-PROGRESS-02',
    mother: {
      firstName: 'Nora',
      middleName: 'Isabel',
      lastName: 'Reyes',
      dob: '1988-11-03',
      lmpDate: '2025-10-14',
      eddDate: '2026-07-21',
      contact: '09179876543',
      highRisk: 1,
      program: 'High Risk Maternal Follow-up',
      address: 'Zone 4, Demo Village',
    },
    child: {
      firstName: 'Ari',
      middleName: 'Bea',
      lastName: 'Reyes',
      birthDate: '2025-11-28',
      birthWeight: 2.9,
      birthLength: 48,
      gender: 'Female',
      feedingType: 'Mixed Feeding',
      deliveryType: 'Cesarean Section',
      progress: 29,
    },
    childWeeks: [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    childBaseWeight: 2.9,
    childBaseHeight: 48,
    childHeadCircumference: 34,
  },
  {
    batchName: 'October',
    motherCode: 'DEMO-MOM-COMP-03',
    childCode: 'DEMO-CHILD-PROGRESS-03',
    mother: {
      firstName: 'Rhea',
      middleName: 'Lourdes',
      lastName: 'Dela Cruz',
      dob: '1995-02-12',
      lmpDate: '2025-09-28',
      eddDate: '2026-07-05',
      contact: '09177889900',
      highRisk: 0,
      program: 'Maternal Health Program',
      address: 'Sitio Malipayon, Demo Village',
    },
    child: {
      firstName: 'Sofia',
      middleName: 'Nina',
      lastName: 'Dela Cruz',
      birthDate: '2025-12-03',
      birthWeight: 3.1,
      birthLength: 49,
      gender: 'Female',
      feedingType: 'Exclusive Breastfeeding',
      deliveryType: 'Vaginal Delivery',
      progress: 35,
    },
    childWeeks: [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    childBaseWeight: 3.1,
    childBaseHeight: 49,
    childHeadCircumference: 35,
  },
  {
    batchName: 'October',
    motherCode: 'DEMO-MOM-COMP-04',
    childCode: 'DEMO-CHILD-PROGRESS-04',
    mother: {
      firstName: 'Marina',
      middleName: 'Rose',
      lastName: 'Ramos',
      dob: '1991-07-24',
      lmpDate: '2025-10-10',
      eddDate: '2026-07-17',
      contact: '09175554433',
      highRisk: 0,
      program: 'Maternal Health Program',
      address: 'Barangay Sampaguita, Demo Village',
    },
    child: {
      firstName: 'Noah',
      middleName: 'Ethan',
      lastName: 'Ramos',
      birthDate: '2025-11-15',
      birthWeight: 3.4,
      birthLength: 51,
      gender: 'Male',
      feedingType: 'Complementary Feeding',
      deliveryType: 'Cesarean Section',
      progress: 42,
    },
    childWeeks: [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    childBaseWeight: 3.4,
    childBaseHeight: 51,
    childHeadCircumference: 36,
  },
  {
    batchName: 'November',
    motherCode: 'DEMO-MOM-COMP-05',
    childCode: 'DEMO-CHILD-PROGRESS-05',
    mother: {
      firstName: 'Celia',
      middleName: 'May',
      lastName: 'Flores',
      dob: '1993-11-08',
      lmpDate: '2025-11-05',
      eddDate: '2026-08-12',
      contact: '09178887766',
      highRisk: 1,
      program: 'High Risk Maternal Follow-up',
      address: 'Purok 5, Demo Village',
    },
    child: {
      firstName: 'Mia',
      middleName: 'Ariana',
      lastName: 'Flores',
      birthDate: '2025-12-20',
      birthWeight: 3.0,
      birthLength: 48,
      gender: 'Female',
      feedingType: 'Expressed Breast Milk',
      deliveryType: 'Vaginal Delivery',
      progress: 31,
    },
    childWeeks: [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    childBaseWeight: 3.0,
    childBaseHeight: 48,
    childHeadCircumference: 34,
  },
  {
    batchName: 'November',
    motherCode: 'DEMO-MOM-COMP-06',
    childCode: 'DEMO-CHILD-PROGRESS-06',
    mother: {
      firstName: 'Nina',
      middleName: 'Grace',
      lastName: 'Navarro',
      dob: '1990-05-15',
      lmpDate: '2025-11-19',
      eddDate: '2026-08-26',
      contact: '09173335544',
      highRisk: 0,
      program: 'Maternal Health Program',
      address: 'Zone 3, Demo Village',
    },
    child: {
      firstName: 'Elijah',
      middleName: 'James',
      lastName: 'Navarro',
      birthDate: '2025-12-27',
      birthWeight: 3.5,
      birthLength: 52,
      gender: 'Male',
      feedingType: 'Breastfeeding',
      deliveryType: 'Vaginal Delivery',
      progress: 38,
    },
    childWeeks: [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    childBaseWeight: 3.5,
    childBaseHeight: 52,
    childHeadCircumference: 36,
  },
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
    UNIQUE KEY uq_demo_mother_checkup_step (mother_id, trimester, checkup_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await connection.query('ALTER TABLE child_checkups ADD COLUMN IF NOT EXISTS week_number TINYINT UNSIGNED NULL, ADD COLUMN IF NOT EXISTS developmental_status VARCHAR(40) NULL, ADD COLUMN IF NOT EXISTS service_provider VARCHAR(150) NULL, ADD COLUMN IF NOT EXISTS next_checkup_date DATE NULL');
}

async function getHierarchy(connection) {
  const [communityRows] = await connection.query('SELECT id FROM communities WHERE name = ? LIMIT 1', ['SWU']);
  let communityId;
  if (!communityRows.length) {
    const [result] = await connection.query(
      'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
      ['SWU', 'SWU', 'South District']
    );
    communityId = result.insertId;
  } else {
    communityId = communityRows[0].id;
  }

  const [groupRows] = await connection.query('SELECT id FROM groups WHERE community_id = ? AND name = ? LIMIT 1', [communityId, 'Sambag II']);
  let groupId;
  if (!groupRows.length) {
    const [result] = await connection.query(
      'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['SWU-SAMBAG-II', communityId, 'Sambag II', 'Nurse Dela Cruz', 24, 'Active']
    );
    groupId = result.insertId;
  } else {
    groupId = groupRows[0].id;
  }

  const batchNames = ['October', 'November'];
  const batchMap = {};

  for (const batchName of batchNames) {
    const [existingBatchRows] = await connection.query(
      'SELECT id FROM batches WHERE community_id = ? AND name = ? LIMIT 1',
      [communityId, batchName]
    );

    if (existingBatchRows.length) {
      batchMap[batchName] = existingBatchRows[0].id;
      await connection.query('INSERT IGNORE INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, existingBatchRows[0].id]);
      continue;
    }

    const batchCode = `SWU-${batchName.toUpperCase()}-${String(Date.now()).slice(-4)}`;
    const [result] = await connection.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [batchCode, communityId, batchName, 0, 0, 'Active']
    );
    batchMap[batchName] = result.insertId;
    await connection.query('INSERT IGNORE INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, result.insertId]);
  }

  return { communityId, groupId, batchMap };
}

async function upsertMother(connection, profile, hierarchy) {
  const groupId = hierarchy.groupId;
  const batchId = hierarchy.batchMap[profile.batchName || 'October'];
  const mother = profile.mother;
  await connection.query(`
    INSERT INTO mothers (
      mother_code, community_id, group_id, batch_id, first_name, middle_name, last_name,
      dob, lmp_date, edd_date, contact_number, is_high_risk, program_type, address,
      prenatal_reg_date, trimester, gestational_age, status, visits, progress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 9, 100)
    ON DUPLICATE KEY UPDATE
      community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
      first_name = VALUES(first_name), middle_name = VALUES(middle_name), last_name = VALUES(last_name),
      dob = VALUES(dob), lmp_date = VALUES(lmp_date), edd_date = VALUES(edd_date),
      contact_number = VALUES(contact_number), is_high_risk = VALUES(is_high_risk),
      program_type = VALUES(program_type), address = VALUES(address), prenatal_reg_date = VALUES(prenatal_reg_date),
      trimester = VALUES(trimester), gestational_age = VALUES(gestational_age), status = VALUES(status),
      visits = VALUES(visits), progress = VALUES(progress)`,
    [profile.motherCode, hierarchy.communityId, groupId, batchId, mother.firstName, mother.middleName, mother.lastName,
      mother.dob, mother.lmpDate, mother.eddDate, mother.contact, mother.highRisk, mother.program, mother.address,
      '2026-01-05', '3rd Trimester', 36]
  );
  const [[row]] = await connection.query('SELECT id FROM mothers WHERE mother_code = ?', [profile.motherCode]);
  return { id: row.id, groupId, batchId };
}

async function seedMotherCheckups(connection, motherId, index) {
  await connection.query('DELETE FROM mother_checkups WHERE mother_id = ?', [motherId]);
  for (let checkupNumber = 1; checkupNumber <= 9; checkupNumber += 1) {
    const trimesterIndex = Math.floor((checkupNumber - 1) / 3);
    const trimester = `${trimesterIndex + 1}${trimesterIndex === 0 ? 'st' : trimesterIndex === 1 ? 'nd' : 'rd'} Trimester`;
    const gestationalAge = 8 + (checkupNumber - 1) * 4;
    const month = String(checkupNumber).padStart(2, '0');
    const weight = (54 + index * 7 + checkupNumber * 0.7).toFixed(1);
    const height = index === 0 ? 156 : 163;
    const bmi = (Number(weight) / ((height / 100) ** 2)).toFixed(1);
    await connection.query(`
      INSERT INTO mother_checkups (
        mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
        blood_pressure, weight_kg, height_cm, bmi, nutritional_status, fundal_height_cm,
        fetal_heart_rate_bpm, service_provider, next_checkup_date, referred_to_hospital,
        lab_assistance_provided, assistance_amount, source_of_funds, facility_type, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [motherId, trimester, checkupNumber, `2026-${month}-05`, gestationalAge,
        index === 0 ? '112/72' : '124/82', weight, height, bmi, index === 0 ? 'Normal' : 'At Risk',
        12 + checkupNumber, 142 + index * 8, index === 0 ? 'Nurse Maria Santos' : 'Dr. Joel Reyes',
        checkupNumber < 9 ? `2026-${String(checkupNumber + 1).padStart(2, '0')}-05` : null,
        index === 1 && checkupNumber === 7 ? 1 : 0, checkupNumber === 4 ? 1 : 0,
        checkupNumber === 4 ? 350 : null, index === 0 ? 'Municipal Fund' : 'PhilHealth', 'RHU',
        `Complete prenatal monitoring record ${checkupNumber} for demo mother ${index + 1}.`]
    );
  }
}

async function upsertChild(connection, profile, mother, hierarchy, index) {
  const child = profile.child;
  await connection.query(`
    INSERT INTO children (
      child_code, mother_id, community_id, group_id, batch_id, first_name, middle_name, last_name,
      birth_date, birth_weight, birth_length, gender, delivery_type, health_status, feeding_type,
      progress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Healthy', ?, ?)
    ON DUPLICATE KEY UPDATE
      mother_id = VALUES(mother_id), community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
      first_name = VALUES(first_name), middle_name = VALUES(middle_name), last_name = VALUES(last_name),
      birth_date = VALUES(birth_date), birth_weight = VALUES(birth_weight), birth_length = VALUES(birth_length),
      gender = VALUES(gender), delivery_type = VALUES(delivery_type), health_status = VALUES(health_status),
      feeding_type = VALUES(feeding_type), progress = VALUES(progress)`,
    [profile.childCode, mother.id, hierarchy.communityId, mother.groupId, mother.batchId, child.firstName, child.middleName,
      child.lastName, child.birthDate, child.birthWeight, child.birthLength, child.gender, child.deliveryType, child.feedingType, child.progress]
  );
  const [[row]] = await connection.query('SELECT id FROM children WHERE child_code = ?', [profile.childCode]);
  await connection.query('DELETE FROM child_checkups WHERE child_id = ?', [row.id]);
  for (const week of profile.childWeeks) {
    const weight = (profile.childBaseWeight + week * (index === 0 ? 0.25 : 0.22)).toFixed(1);
    const height = (profile.childBaseHeight + week * (index === 0 ? 0.72 : 0.68)).toFixed(1);
    await connection.query(`
      INSERT INTO child_checkups (
        child_id, week_number, next_checkup_date, visit_date, weight, height,
        head_circumference, developmental_status, service_provider, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, week, week < 48 ? `2026-${String(Math.min(12, Math.max(1, Math.ceil(week / 4) + 1))).padStart(2, '0')}-20` : null,
        `2026-${String(Math.min(12, Math.max(1, Math.ceil(week / 4)))).padStart(2, '0')}-15`, weight, height,
        (profile.childHeadCircumference + week * 0.12).toFixed(1), week < 12 ? 'Normal' : 'Needs Follow-up',
        index === 0 ? 'Nurse Maria Santos' : 'Midwife Ana Cruz',
        `Growth check-up week ${week}; ${index === 0 ? 'steady gain and good feeding.' : 'follow-up nutrition counseling recommended.'}`]
    );
  }
  return row.id;
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensureMonitorSchema(connection);
    const hierarchy = await getHierarchy(connection);
    for (const [index, profile] of profiles.entries()) {
      const mother = await upsertMother(connection, profile, hierarchy, index);
      await seedMotherCheckups(connection, mother.id, index);
      await upsertChild(connection, profile, mother, hierarchy, index);
    }
    await connection.commit();
    console.log(`Seeded ${profiles.length} SWU Sambag II records across October and November with child growth checkups.`);
  } catch (error) {
    await connection.rollback();
    console.error('Failed to seed progress report demo data:', error.stack || error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
