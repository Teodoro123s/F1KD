require('dotenv').config();
const { readFileSync } = require('node:fs');
const path = require('node:path');

const SCHOOL_CODE = 'COM-0001';
const GROUPS = [
  { code: 'GRP-0001', name: 'Organizer 3 Demo Group 1' },
  { code: 'O3-GRP-02', name: 'Organizer 3 Demo Group 2' },
];
const BATCHES = [
  { code: 'O3-BAT-01', name: 'Organizer 3 Demo Batch 1', groupCode: GROUPS[0].code },
  { code: 'O3-BAT-02', name: 'Organizer 3 Demo Batch 2', groupCode: GROUPS[1].code },
];
const BENEFICIARIES = [
  { code: 'O3-M-001', firstName: 'Amihan', lastName: 'Sample', groupIndex: 0 },
  { code: 'O3-M-002', firstName: 'Bituin', lastName: 'Sample', groupIndex: 0 },
  { code: 'O3-M-003', firstName: 'Dalisay', lastName: 'Sample', groupIndex: 1 },
  { code: 'O3-M-004', firstName: 'Hiraya', lastName: 'Sample', groupIndex: 1 },
  { code: 'O3-M-005', firstName: 'Ligaya', lastName: 'Sample', groupIndex: 0 },
  { code: 'O3-M-006', firstName: 'Mayumi', lastName: 'Sample', groupIndex: 0 },
  { code: 'O3-M-007', firstName: 'Tala', lastName: 'Sample', groupIndex: 0 },
  { code: 'O3-M-008', firstName: 'Banaag', lastName: 'Sample', groupIndex: 1 },
  { code: 'O3-M-009', firstName: 'Diwa', lastName: 'Sample', groupIndex: 1 },
];
const CHILDREN = [
  { code: 'O3-C-001', firstName: 'Araw', gender: 'Female', motherCode: 'O3-M-001', ageMonths: 24, birthWeight: '3.10', birthLength: '49.0', headCircumference: '34.0', chestCircumference: '32.0' },
  { code: 'O3-C-002', firstName: 'Banaag', gender: 'Male', motherCode: 'O3-M-002', ageMonths: 24, birthWeight: '3.20', birthLength: '49.5', headCircumference: '34.4', chestCircumference: '32.4' },
  { code: 'O3-C-003', firstName: 'Diwa', gender: 'Female', motherCode: 'O3-M-003', ageMonths: 24, birthWeight: '3.00', birthLength: '48.5', headCircumference: '33.8', chestCircumference: '31.8' },
  { code: 'O3-C-004', firstName: 'Giliw', gender: 'Male', motherCode: 'O3-M-004', ageMonths: 24, birthWeight: '3.30', birthLength: '50.0', headCircumference: '34.8', chestCircumference: '32.8' },
  { code: 'O3-C-005', firstName: 'Luntian', gender: 'Female', motherCode: 'O3-M-001', ageMonths: 24, birthWeight: '3.20', birthLength: '49.5', headCircumference: '34.4', chestCircumference: '32.4' },
  { code: 'O3-C-006', firstName: 'Sinag', gender: 'Male', motherCode: 'O3-M-005', ageMonths: 24, birthWeight: '3.10', birthLength: '49.0', headCircumference: '34.0', chestCircumference: '32.0' },
  { code: 'O3-C-007', firstName: 'Sinta', gender: 'Female', motherCode: 'O3-M-006', ageMonths: 24, birthWeight: '3.30', birthLength: '50.0', headCircumference: '34.8', chestCircumference: '32.8' },
  { code: 'O3-C-008', firstName: 'Ulila', gender: 'Male', motherCode: 'O3-M-003', ageMonths: 24, birthWeight: '3.00', birthLength: '48.5', headCircumference: '33.8', chestCircumference: '31.8' },
  { code: 'O3-C-009', firstName: 'Hiraya', gender: 'Female', motherCode: 'O3-M-008', ageMonths: 24, birthWeight: '3.20', birthLength: '49.5', headCircumference: '34.4', chestCircumference: '32.4' },
  { code: 'O3-C-010', firstName: 'Kidlat', gender: 'Male', motherCode: 'O3-M-009', ageMonths: 24, birthWeight: '3.10', birthLength: '49.0', headCircumference: '34.0', chestCircumference: '32.0' },
];
const CHILD_MONITORING_AGES = Array.from({ length: 24 }, (_, index) => index + 1);
const GROWTH_SCENARIOS = [
  { weightZ: 0, lengthZ: 0 },
  { weightZ: -2.5, lengthZ: -0.5 },
  { weightZ: 0.5, lengthZ: -2.5 },
  { weightZ: -2.5, lengthZ: -2.5 },
  { weightZ: 1, lengthZ: 0.5 },
  { weightZ: -3.2, lengthZ: -0.5 },
  { weightZ: 2.5, lengthZ: 2.5 },
  { weightZ: 0, lengthZ: 0 },
  { weightZ: -1.5, lengthZ: 1 },
  { weightZ: 1.5, lengthZ: -1.5 },
];

function getMonitoringMonths(child) {
  return CHILD_MONITORING_AGES.filter((month) => month <= child.ageMonths);
}

function loadLmsReference(filename) {
  const [headerLine, ...lines] = readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8').trim().split(/\r?\n/);
  const columns = Object.fromEntries(headerLine.trim().split(/\s+/).map((name, index) => [name, index]));
  return new Map(lines.map((line) => {
    const values = line.trim().split(/\s+/);
    const key = `${values[columns.sex]}:${values[columns.age]}`;
    return [key, {
      l: Number(values[columns.l]),
      m: Number(values[columns.m]),
      s: Number(values[columns.s]),
    }];
  }));
}

const WEIGHT_FOR_AGE = loadLmsReference('who-weianthro.txt');
const LENGTH_FOR_AGE = loadLmsReference('who-lenanthro.txt');

function measurementAtZScore(reference, sex, ageInDays, zScore) {
  const lms = reference.get(`${sex === 'Male' ? 1 : 2}:${ageInDays}`);
  if (!lms) throw new Error(`Missing WHO reference for ${sex}, age ${ageInDays} days.`);
  const { l, m, s } = lms;
  return Math.abs(l) < 1e-8
    ? m * Math.exp(s * zScore)
    : m * (1 + l * s * zScore) ** (1 / l);
}

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateMonthsAgo(months) {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000);
}

async function upsertId(connection, sql, values) {
  const [result] = await connection.query(sql, values);
  return result.insertId;
}

async function seedOrganizer3Data() {
  const pool = require('../db');
  await pool.ready;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let [schools] = await connection.query(
      `SELECT c.id, c.name, c.coordinator_id
       FROM communities c
       WHERE c.community_code = ?`,
      [SCHOOL_CODE],
    );
    if (!schools.length) {
      const schoolId = await upsertId(
        connection,
        `INSERT INTO communities (community_code, name, area)
         VALUES (?, 'Organizer 3 Demo School', 'Demo Area')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), area = VALUES(area)`,
        [SCHOOL_CODE],
      );
      schools = [{ id: schoolId, name: 'Organizer 3 Demo School', coordinator_id: null }];
    }
    const school = schools[0];
    const [organizers] = await connection.query(
      `SELECT id FROM users
       WHERE id = ? AND school_id = ? AND role = 'Community Organizer' AND status = 'Active'`,
      [school.coordinator_id, school.id],
    );
    const organizerId = organizers[0]?.id ?? null;

    const groupIds = new Map();
    for (const group of GROUPS) {
      const groupId = await upsertId(
        connection,
        `INSERT INTO \`groups\` (group_code, community_id, name, leader, members_count, status)
         VALUES (?, ?, ?, ?, ?, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           name = VALUES(name), members_count = VALUES(members_count), status = VALUES(status)`,
        [
          group.code,
          school.id,
          group.name,
          'Demo Group Leader',
          BENEFICIARIES.filter((mother) => mother.groupIndex === GROUPS.indexOf(group)).length,
        ],
      );
      groupIds.set(group.code, groupId);
    }

    const batchIds = new Map();
    for (const batch of BATCHES) {
      const groupIndex = GROUPS.findIndex((group) => group.code === batch.groupCode);
      const mothersInBatch = BENEFICIARIES.filter((mother) => mother.groupIndex === groupIndex).length;
      const batchId = await upsertId(
        connection,
        `INSERT INTO batches (batch_code, community_id, name, records, progress, status)
         VALUES (?, ?, ?, ?, 0, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           name = VALUES(name), records = VALUES(records), progress = VALUES(progress), status = VALUES(status)`,
        [batch.code, school.id, batch.name, mothersInBatch],
      );
      batchIds.set(batch.code, batchId);
      await connection.query('DELETE FROM group_batch WHERE batch_id = ?', [batchId]);
      await connection.query(
        'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [groupIds.get(batch.groupCode), batchId],
      );
    }

    const motherIds = new Map();
    for (const mother of BENEFICIARIES) {
      const group = GROUPS[mother.groupIndex];
      const batch = BATCHES[mother.groupIndex];
      const lmpDate = dateOffset(-147);
      const motherId = await upsertId(
        connection,
        `INSERT INTO mothers (
           mother_code, community_id, group_id, batch_id, first_name, last_name, dob,
           lmp_date, edd_date, prenatal_reg_date, trimester, gestational_age, prenatal_weight,
           prenatal_bp, prenatal_height, status, progress, data_privacy_signed, media_release_signed
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2nd Trimester', 21, 60.0, '112/72', 158.0,
                   'Active', 0, FALSE, FALSE)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           group_id = VALUES(group_id), batch_id = VALUES(batch_id), first_name = VALUES(first_name),
           last_name = VALUES(last_name), dob = VALUES(dob), lmp_date = VALUES(lmp_date),
           edd_date = VALUES(edd_date), prenatal_reg_date = VALUES(prenatal_reg_date),
           trimester = VALUES(trimester), gestational_age = VALUES(gestational_age),
           prenatal_weight = VALUES(prenatal_weight), prenatal_bp = VALUES(prenatal_bp),
           prenatal_height = VALUES(prenatal_height), status = VALUES(status),
           progress = VALUES(progress), data_privacy_signed = FALSE, media_release_signed = FALSE`,
        [
          mother.code,
          school.id,
          groupIds.get(group.code),
          batchIds.get(batch.code),
          mother.firstName,
          mother.lastName,
          dateOffset(-30 * 25 * 12),
          lmpDate,
          dateOffset(133),
          dateOffset(-35),
        ],
      );
      motherIds.set(mother.code, motherId);
    }

    for (const [index, mother] of BENEFICIARIES.entries()) {
      const motherId = motherIds.get(mother.code);
      for (const checkup of [
        { number: 1, week: 16, daysAgo: 35 },
        { number: 2, week: 20, daysAgo: 7 },
      ]) {
        const weight = 59 + index;
        const height = 158 + (index % 3);
        await connection.query(
          `INSERT INTO mother_checkups (
             mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
             blood_pressure, weight_kg, height_cm, bmi, nutritional_status, fundal_height_cm,
             fetal_heart_rate_bpm, service_provider, next_checkup_date, facility_type, remarks,
             recorded_by_user_id, created_by_user_id, updated_by_user_id
           ) VALUES (?, '2nd Trimester', ?, ?, ?, '112/72', ?, ?, ?, 'Normal', ?, 140,
                     'F1KD Demo Health Center', ?, 'Health Center',
                     'Synthetic demonstration record; not a clinical record.', ?, ?, ?)
           ON DUPLICATE KEY UPDATE checkup_date = VALUES(checkup_date),
             gestational_age_weeks = VALUES(gestational_age_weeks), blood_pressure = VALUES(blood_pressure),
             weight_kg = VALUES(weight_kg), height_cm = VALUES(height_cm), bmi = VALUES(bmi),
             nutritional_status = VALUES(nutritional_status), fundal_height_cm = VALUES(fundal_height_cm),
             fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm), service_provider = VALUES(service_provider),
             next_checkup_date = VALUES(next_checkup_date), facility_type = VALUES(facility_type),
             remarks = VALUES(remarks), recorded_by_user_id = VALUES(recorded_by_user_id),
             created_by_user_id = VALUES(created_by_user_id), updated_by_user_id = VALUES(updated_by_user_id)`,
          [
            motherId,
            checkup.number,
            dateOffset(-checkup.daysAgo),
            checkup.week,
            weight,
            height,
            (weight / ((height / 100) ** 2)).toFixed(1),
            checkup.week,
            dateOffset(21),
            organizerId,
            organizerId,
            organizerId,
          ],
        );
      }
      await connection.query('UPDATE mothers SET progress = 40 WHERE id = ?', [motherId]);
    }

    const childIds = new Map();
    for (const [index, child] of CHILDREN.entries()) {
      const mother = BENEFICIARIES.find((row) => row.code === child.motherCode);
      const group = GROUPS[mother.groupIndex];
      const batch = BATCHES[mother.groupIndex];
      const childId = await upsertId(
        connection,
        `INSERT INTO children (
           child_code, mother_id, community_id, group_id, batch_id, first_name, last_name,
           birth_date, birth_weight, birth_length, head_circumference, chest_circumference,
           gender, health_status, progress
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Healthy', 0)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), mother_id = VALUES(mother_id),
           community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
           first_name = VALUES(first_name), last_name = VALUES(last_name), birth_date = VALUES(birth_date),
           birth_weight = VALUES(birth_weight), birth_length = VALUES(birth_length),
           head_circumference = VALUES(head_circumference), chest_circumference = VALUES(chest_circumference),
           gender = VALUES(gender), health_status = VALUES(health_status)`,
        [
          child.code,
          motherIds.get(mother.code),
          school.id,
          groupIds.get(group.code),
          batchIds.get(batch.code),
          child.firstName,
          mother.lastName,
          dateMonthsAgo(child.ageMonths),
          child.birthWeight,
          child.birthLength,
          child.headCircumference,
          child.chestCircumference,
          child.gender,
        ],
      );
      childIds.set(child.code, childId);

      const birthDate = dateMonthsAgo(child.ageMonths);
      const scenario = GROWTH_SCENARIOS[index];
      const childCheckupMonths = getMonitoringMonths(child);
      for (const checkupMonth of childCheckupMonths) {
        const visitDate = dateMonthsAgo(child.ageMonths - checkupMonth);
        const ageInDays = daysBetween(birthDate, visitDate);
        const weight = measurementAtZScore(WEIGHT_FOR_AGE, child.gender, ageInDays, scenario.weightZ).toFixed(2);
        const height = measurementAtZScore(LENGTH_FOR_AGE, child.gender, ageInDays, scenario.lengthZ).toFixed(1);
        const nextCheckupDate = checkupMonth === child.ageMonths
          ? dateOffset(30)
          : dateMonthsAgo(child.ageMonths - checkupMonth - 1);
        const [existingCheckups] = await connection.query(
          'SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? ORDER BY id LIMIT 1',
          [childId, checkupMonth],
        );
        const checkupValues = [
          nextCheckupDate,
          visitDate,
          weight,
          height,
          (34 + checkupMonth * 0.4).toFixed(1),
          checkupMonth <= 6 ? 'Yes' : 'No',
          'Normal',
          'F1KD Demo Health Center',
          'Health Center',
          `Synthetic WHO-LMS example: target weight-for-age z ${scenario.weightZ.toFixed(1)}, length-for-age z ${scenario.lengthZ.toFixed(1)}; not a clinical record.`,
          organizerId,
          organizerId,
          organizerId,
        ];
        if (existingCheckups.length) {
          await connection.query(
            `UPDATE child_checkups SET next_checkup_date = ?, visit_date = ?, weight = ?, height = ?,
               head_circumference = ?, exclusive_breastfeeding = ?, developmental_status = ?,
               service_provider = ?, facility_type = ?, laboratory_assistance_provided = FALSE,
               referred_to_hospital = FALSE, notes = ?,
               recorded_by_user_id = ?, created_by_user_id = ?, updated_by_user_id = ?
             WHERE id = ?`,
            [...checkupValues, existingCheckups[0].id],
          );
        } else {
          await connection.query(
            `INSERT INTO child_checkups (
               child_id, week_number, next_checkup_date, visit_date, weight, height,
               head_circumference, exclusive_breastfeeding, developmental_status, service_provider,
               facility_type, laboratory_assistance_provided, referred_to_hospital, notes,
               recorded_by_user_id, created_by_user_id, updated_by_user_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, ?, ?, ?, ?)`,
            [childId, checkupMonth, ...checkupValues],
          );
        }
      }
      await connection.query('UPDATE children SET progress = 100 WHERE id = ?', [childId]);
    }

    const programs = [
      { name: 'Organizer 3 Demo - Maternal Wellness', type: 'Maternal Health', beneficiaryType: 'Mother' },
      { name: 'Organizer 3 Demo - Child Growth Support', type: 'Child Health', beneficiaryType: 'Child' },
    ];
    for (const program of programs) {
      const [existingPrograms] = await connection.query(
        'SELECT id FROM programs WHERE name = ? AND provider = ? ORDER BY id LIMIT 1 FOR UPDATE',
        [program.name, 'F1KD Demo Data'],
      );
      const programId = existingPrograms.length
        ? existingPrograms[0].id
        : await upsertId(
          connection,
          `INSERT INTO programs (
             name, type, provider, description, beneficiary_type, status, owner_school_id, starts_on
           ) VALUES (?, ?, 'F1KD Demo Data', 'Synthetic demo data for Organizer 3; not a service record.',
                     ?, 'Active', ?, CURRENT_DATE)`,
          [program.name, program.type, program.beneficiaryType, school.id],
        );
      if (existingPrograms.length) {
        await connection.query(
          `UPDATE programs SET type = ?, description = ?,
             beneficiary_type = ?, status = 'Active', owner_school_id = ?, ended = NULL
           WHERE id = ?`,
          [
            program.type,
            'Synthetic demo data for Organizer 3; not a service record.',
            program.beneficiaryType,
            school.id,
            programId,
          ],
        );
      }

      for (const batch of BATCHES) {
        const [clusters] = await connection.query(
          `SELECT id FROM program_clusters
           WHERE program_id = ? AND scope_type = 'Batch' AND scope_name = ? ORDER BY id LIMIT 1`,
          [programId, batch.name],
        );
        const batchBeneficiaries = program.beneficiaryType === 'Mother'
          ? BENEFICIARIES.filter((mother) => mother.groupIndex === GROUPS.findIndex((group) => group.code === batch.groupCode))
          : CHILDREN.filter((child) => {
            const mother = BENEFICIARIES.find((row) => row.code === child.motherCode);
            return mother && GROUPS[mother.groupIndex].code === batch.groupCode;
          });
        const receivedCount = Math.ceil(batchBeneficiaries.length / 2);
        if (clusters.length) {
          await connection.query(
            'UPDATE program_clusters SET beneficiaries = ?, received = ? WHERE id = ?',
            [batchBeneficiaries.length, receivedCount, clusters[0].id],
          );
        } else {
          await connection.query(
            `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
             VALUES (?, 'Batch', ?, ?, ?)`,
            [programId, batch.name, batchBeneficiaries.length, receivedCount],
          );
        }
      }

      const beneficiaryRows = program.beneficiaryType === 'Mother' ? BENEFICIARIES : CHILDREN;
      const ids = program.beneficiaryType === 'Mother' ? motherIds : childIds;
      for (const [index, beneficiary] of beneficiaryRows.entries()) {
        await connection.query(
          `INSERT INTO monitoring_logs (
             beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by,
             notes, created_by_user_id, updated_by_user_id
           ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), notes = VALUES(notes),
             monitored_by = VALUES(monitored_by), created_by_user_id = VALUES(created_by_user_id),
             updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP`,
          [
            String(ids.get(beneficiary.code)),
            program.beneficiaryType.toLowerCase(),
            programId,
            index % 2 === 0,
            organizerId,
            `Synthetic demo program check-in for ${beneficiary.code}.`,
            organizerId,
            organizerId,
          ],
        );
      }
    }

    await connection.commit();
    console.log(
      `Seeded ${SCHOOL_CODE}: ${GROUPS.length} groups, ${BATCHES.length} batches, `
      + `${BENEFICIARIES.length} mothers, ${CHILDREN.length} children, `
      + `${BENEFICIARIES.length * 2} maternal checkups, `
      + `${CHILDREN.reduce((total, child) => total + getMonitoringMonths(child).length, 0)} child checkups, and `
      + `${programs.length} scoped demo programs.`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedOrganizer3Data().catch((error) => {
    console.error('Organizer 3 data seeding failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { seedOrganizer3Data };
