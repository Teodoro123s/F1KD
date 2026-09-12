const mysql = require('mysql2/promise');
require('dotenv').config();

function nextSequence(rows, field, prefix) {
  const numbers = rows
    .map((row) => String(row[field] || '').match(new RegExp(`^${prefix}-(\\d+)$`)))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

async function insertSchool(connection, schoolNumber, sequence) {
  const schoolCode = `SEED-SCHOOL-${String(schoolNumber).padStart(3, '0')}`;
  const schoolName = `${['Northview', 'Riverside', 'Mabini', 'Lakeside', 'San Isidro'][schoolNumber % 5]} Community School ${schoolNumber}`;
  const [schoolResult] = await connection.query(
    `INSERT INTO communities (community_code, name, area)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), area = VALUES(area)`,
    [schoolCode, schoolName, `${['Central', 'East', 'West'][schoolNumber % 3]} District`],
  );
  const schoolId = schoolResult.insertId;
  const groupIds = [];
  const batchIds = [];

  for (let groupIndex = 1; groupIndex <= 2; groupIndex += 1) {
    const groupCode = `SEED-GROUP-${String(sequence).padStart(3, '0')}${groupIndex}`;
    const [groupResult] = await connection.query(
      `INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
       VALUES (?, ?, ?, ?, ?, 'Active')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id), name = VALUES(name)`,
      [groupCode, schoolId, `${schoolName} Group ${groupIndex}`, groupIndex === 1 ? 'Maria Santos' : 'Joseph Reyes', 2],
    );
    groupIds.push(groupResult.insertId);

    for (let batchIndex = 1; batchIndex <= 2; batchIndex += 1) {
      const batchCode = `SEED-BATCH-${String(sequence).padStart(3, '0')}${groupIndex}${batchIndex}`;
      const [batchResult] = await connection.query(
        `INSERT INTO batches (batch_code, community_id, name, records, progress, status)
         VALUES (?, ?, ?, 2, 0, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id), name = VALUES(name)`,
        [batchCode, schoolId, `${schoolName} Batch ${groupIndex}-${batchIndex}`],
      );
      const batchId = batchResult.insertId;
      batchIds.push({ id: batchId, groupId: groupIds[groupIds.length - 1], groupIndex, batchIndex, code: batchCode });
      await connection.query(
        'INSERT IGNORE INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [groupIds[groupIds.length - 1], batchId],
      );
    }
  }

  const firstNames = ['Amelia', 'Beatriz', 'Carla', 'Diana', 'Elena', 'Faith', 'Grace', 'Hannah'];
  const lastNames = ['Santos', 'Reyes', 'Garcia', 'Mendoza', 'Cruz', 'Flores', 'Navarro', 'Ramos'];
  let personIndex = 0;
  for (const batch of batchIds) {
    for (let memberIndex = 1; memberIndex <= 2; memberIndex += 1) {
      personIndex += 1;
      const motherCode = `MTH-S${String(schoolNumber).padStart(3, '0')}-${batch.groupIndex}${batch.batchIndex}-${memberIndex}`;
      const [motherResult] = await connection.query(
        `INSERT INTO mothers (
          mother_code, community_id, group_id, batch_id, first_name, last_name, dob,
          lmp_date, edd_date, contact_number, status, visits, progress, prenatal_reg_date,
          trimester, gestational_age, prenatal_weight, prenatal_bp, prenatal_height,
          gravida, para
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, '2nd Trimester', ?, ?, ?, ?, 1, 0)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id)`,
        [
          motherCode,
          schoolId,
          batch.groupId,
          batch.id,
          firstNames[(personIndex - 1) % firstNames.length],
          lastNames[(schoolNumber + personIndex - 1) % lastNames.length],
          `199${(personIndex % 8) + 1}-0${(personIndex % 8) + 1}-15`,
          '2026-03-01',
          '2026-12-06',
          `0917${String(schoolNumber).padStart(2, '0')}${String(personIndex).padStart(5, '0')}`,
          personIndex % 4,
          Math.min(90, 35 + personIndex * 6),
          '2026-05-15',
          22 + personIndex,
          56 + personIndex * 0.4,
          '118/76',
          150,
        ],
      );

      const childCode = `CHD-S${String(schoolNumber).padStart(3, '0')}-${batch.groupIndex}${batch.batchIndex}-${memberIndex}`;
      await connection.query(
        `INSERT INTO children (
          child_code, mother_id, community_id, group_id, batch_id, first_name, last_name,
          birth_date, birth_weight, birth_length, gender, health_status, feeding_type, progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Healthy', 'Mixed Feeding', ?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), mother_id = VALUES(mother_id), community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id)`,
        [
          childCode,
          motherResult.insertId,
          schoolId,
          batch.groupId,
          batch.id,
          ['Liam', 'Sofia', 'Noah', 'Mia'][personIndex % 4],
          lastNames[(schoolNumber + personIndex) % lastNames.length],
          `202${(personIndex % 5) + 1}-0${(personIndex % 8) + 1}-10`,
          3.1 + (personIndex % 4) * 0.2,
          49 + (personIndex % 4),
          personIndex % 2 ? 'Female' : 'Male',
          Math.min(95, 40 + personIndex * 7),
        ],
      );
    }
  }

  return { schoolName, groups: groupIds.length, batches: batchIds.length, mothers: batchIds.length * 2, children: batchIds.length * 2 };
}

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'f1kd',
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 2,
  });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [schools] = await connection.query('SELECT community_code FROM communities WHERE community_code LIKE \'SEED-SCHOOL-%\'');
    const nextSchool = nextSequence(schools, 'community_code', 'SEED-SCHOOL');
    const results = [];
    for (let index = 0; index < 3; index += 1) {
      results.push(await insertSchool(connection, nextSchool + index, nextSchool + index));
    }
    await connection.commit();
    console.log('Seeded schools:', JSON.stringify(results, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Three-school seed failed:', error.message);
  process.exitCode = 1;
});