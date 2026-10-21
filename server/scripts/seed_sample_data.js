require('dotenv').config();

const SCHOOL = {
  code: 'DEMO-SCH-01',
  name: 'F1KD Demo School',
  area: 'Quezon City',
};

const GROUPS = [
  { code: 'DEMO-GRP-01', name: 'Demo Group 1' },
  { code: 'DEMO-GRP-02', name: 'Demo Group 2' },
];

const FIRST_NAMES = [
  'Amihan', 'Bayani', 'Bituin', 'Dalisay', 'Hiraya',
  'Kidlat', 'Ligaya', 'Makisig', 'Mayumi', 'Tala',
];
const CHILD_NAMES = ['Araw', 'Banaag', 'Diwa', 'Giliw', 'Luntian', 'Sinag', 'Sinta', 'Ulila'];
const MATERNAL_CHECKUP_STEPS = [
  { trimester: '1st Trimester', number: 1, week: 8 },
  { trimester: '1st Trimester', number: 2, week: 10 },
  { trimester: '1st Trimester', number: 3, week: 12 },
  { trimester: '2nd Trimester', number: 1, week: 16 },
  { trimester: '2nd Trimester', number: 2, week: 20 },
  { trimester: '2nd Trimester', number: 3, week: 24 },
  { trimester: '3rd Trimester', number: 1, week: 28 },
  { trimester: '3rd Trimester', number: 2, week: 32 },
  { trimester: '3rd Trimester', number: 3, week: 36 },
];
const MATERNAL_STARTS = [
  { trimester: '1st Trimester', week: 12, checkups: 7 },
  { trimester: '2nd Trimester', week: 20, checkups: 5 },
  { trimester: '1st Trimester', week: 10, checkups: 8 },
];
const CHILD_MONITORING_MONTHS = Array.from({ length: 24 }, (_, index) => index + 1);
const SAMPLE_USERS = [
  {
    email: 'demo.admin@f1kd.test',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'Admin',
  },
  {
    email: 'demo.organizer@f1kd.test',
    firstName: 'Demo',
    lastName: 'Organizer',
    role: 'Community Organizer',
    schoolCode: SCHOOL.code,
  },
  {
    email: 'demo.partner@f1kd.test',
    firstName: 'Demo',
    lastName: 'Partner',
    role: 'Partner',
  },
  {
    email: 'demo.healthworker1@f1kd.test',
    firstName: 'Demo',
    lastName: 'Health Worker 1',
    role: 'Health Worker',
    schoolCode: SCHOOL.code,
    groupCode: GROUPS[0].code,
  },
  {
    email: 'demo.healthworker2@f1kd.test',
    firstName: 'Demo',
    lastName: 'Health Worker 2',
    role: 'Health Worker',
    schoolCode: SCHOOL.code,
    groupCode: GROUPS[1].code,
  },
];

function buildSeedPlan() {
  const batches = [];
  const mothers = [];
  const children = [];
  const completedChildCodes = [];
  const maternalCheckups = [];
  const childCheckups = [];

  GROUPS.forEach((group, groupIndex) => {
    for (let batchIndex = 1; batchIndex <= 2; batchIndex += 1) {
      const batchNumber = groupIndex * 2 + batchIndex;
      const batch = {
        code: `DEMO-BAT-${String(batchNumber).padStart(2, '0')}`,
        name: `Demo Batch ${batchNumber}`,
        groupCode: group.code,
      };
      batches.push(batch);

      for (let motherIndex = 1; motherIndex <= 10; motherIndex += 1) {
        const recordNumber = (batchNumber - 1) * 10 + motherIndex;
        const mother = {
          code: `DEMO-M-${String(recordNumber).padStart(2, '0')}`,
          firstName: FIRST_NAMES[(recordNumber - 1) % FIRST_NAMES.length],
          lastName: `Sample${String(batchNumber).padStart(2, '0')}`,
          batchCode: batch.code,
          groupCode: group.code,
        };
        const startIndex = recordNumber % MATERNAL_STARTS.length;
        const maternalStart = MATERNAL_STARTS[startIndex];
        mother.startingTrimester = maternalStart.trimester;
        mother.startingGestationalWeek = maternalStart.week;
        mother.expectedCheckups = maternalStart.checkups;
        const lmpDate = addDays('2020-01-01', (recordNumber - 1) * 5);
        mother.lmpDate = lmpDate;
        mother.eddDate = addDays(lmpDate, 280);
        mothers.push(mother);

        MATERNAL_CHECKUP_STEPS
          .filter((step) => step.week >= maternalStart.week)
          .forEach((step, index) => {
          const gestationalAge = step.week;
          const checkupDate = addDays(lmpDate, gestationalAge * 7);
          maternalCheckups.push({
            motherCode: mother.code,
            ...step,
            date: checkupDate,
            gestationalAge,
            weight: (54 + (recordNumber % 9) + index * 1.2).toFixed(1),
            height: (150 + (recordNumber % 16)).toFixed(1),
            bloodPressure: index % 4 === 0 ? '110/70' : '112/72',
            fundalHeight: Math.round(gestationalAge * 0.9),
            fetalHeartRate: 140 + (recordNumber % 16),
            nextDate: addDays(checkupDate, 28),
          });
        });

        if (motherIndex <= 8) {
          const childNumber = (batchNumber - 1) * 8 + motherIndex;
          const birthDate = mother.eddDate;
          const child = {
            code: `DEMO-C-${String(childNumber).padStart(2, '0')}`,
            firstName: CHILD_NAMES[motherIndex - 1],
            lastName: mother.lastName,
            motherCode: mother.code,
            batchCode: batch.code,
            groupCode: group.code,
            birthDate,
          };
          children.push(child);
          CHILD_MONITORING_MONTHS.forEach((month) => {
            const visitDate = addMonths(birthDate, month);
            childCheckups.push({
              childCode: child.code,
              month,
              visitDate,
              nextDate: addMonths(visitDate, 1),
              weight: (3.1 + month * 0.42 + (childNumber % 5) * 0.12).toFixed(2),
              height: (50 + month * 1.15 + (childNumber % 4) * 0.3).toFixed(1),
              headCircumference: (34 + month * 0.42).toFixed(1),
            });
          });
          if (motherIndex <= 7) completedChildCodes.push(child.code);
        }
      }
    }
  });

  return {
    school: SCHOOL,
    groups: GROUPS,
    batches,
    mothers,
    children,
    completedChildCodes,
    maternalCheckups,
    childCheckups,
    users: SAMPLE_USERS,
  };
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDayOfMonth));
  return date.toISOString().slice(0, 10);
}

async function insertOrGetId(connection, sql, values) {
  const [result] = await connection.query(sql, values);
  return result.insertId;
}

async function seedSampleData() {
  const samplePassword = process.env.SAMPLE_USER_PASSWORD;
  const { validateAccountPassword } = require('../utils/userInputValidation');
  const passwordError = validateAccountPassword(samplePassword, 'SAMPLE_USER_PASSWORD');
  if (passwordError) {
    throw new Error(`${passwordError}. Set it to seed the demo login accounts.`);
  }
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(samplePassword, 10);

  const pool = require('../db');
  await pool.ready;
  const plan = buildSeedPlan();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const schoolId = await insertOrGetId(
      connection,
      `INSERT INTO communities (community_code, name, area)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), area = VALUES(area)`,
      [plan.school.code, plan.school.name, plan.school.area],
    );

    const groupIds = new Map();
    for (const group of plan.groups) {
      const groupId = await insertOrGetId(
        connection,
        `INSERT INTO \`groups\` (group_code, community_id, name, leader, members_count, status)
         VALUES (?, ?, ?, ?, ?, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           name = VALUES(name), members_count = VALUES(members_count), status = VALUES(status)`,
        [group.code, schoolId, group.name, 'Demo Group Leader', 20],
      );
      groupIds.set(group.code, groupId);
    }

    const batchIds = new Map();
    for (const batch of plan.batches) {
      const batchId = await insertOrGetId(
        connection,
        `INSERT INTO batches (batch_code, community_id, name, records, progress, status)
         VALUES (?, ?, ?, ?, ?, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           name = VALUES(name), records = VALUES(records), progress = VALUES(progress), status = VALUES(status)`,
        [batch.code, schoolId, batch.name, 10, 0],
      );
      batchIds.set(batch.code, batchId);
      await connection.query('DELETE FROM group_batch WHERE batch_id = ?', [batchId]);
      await connection.query(
        'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [groupIds.get(batch.groupCode), batchId],
      );
    }

    for (const user of plan.users) {
      const userId = await insertOrGetId(
        connection,
        `INSERT INTO users
          (email, role, status, password_hash, first_name, last_name, gender, school_id, group_id)
         VALUES (?, ?, 'Active', ?, ?, ?, 'Other', ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), role = VALUES(role), status = VALUES(status),
           password_hash = VALUES(password_hash), first_name = VALUES(first_name), last_name = VALUES(last_name),
           school_id = VALUES(school_id), group_id = VALUES(group_id)`,
        [
          user.email,
          user.role,
          passwordHash,
          user.firstName,
          user.lastName,
          user.schoolCode ? schoolId : null,
          user.groupCode ? groupIds.get(user.groupCode) : null,
        ],
      );
      if (user.role === 'Community Organizer') {
        await connection.query(
          'UPDATE communities SET coordinator_id = ? WHERE id = ?',
          [userId, schoolId],
        );
      }
    }

    const motherIds = new Map();
    for (const mother of plan.mothers) {
      const motherId = await insertOrGetId(
        connection,
        `INSERT INTO mothers (mother_code, community_id, group_id, batch_id, first_name, last_name,
           dob, status, data_privacy_signed, media_release_signed, lmp_date, edd_date,
           prenatal_reg_date, trimester, gestational_age, prenatal_weight, prenatal_bp,
           prenatal_height, progress)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', TRUE, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           group_id = VALUES(group_id), batch_id = VALUES(batch_id), first_name = VALUES(first_name),
           last_name = VALUES(last_name), dob = VALUES(dob), status = VALUES(status),
           lmp_date = VALUES(lmp_date), edd_date = VALUES(edd_date),
           prenatal_reg_date = VALUES(prenatal_reg_date), trimester = VALUES(trimester),
           gestational_age = VALUES(gestational_age), prenatal_weight = VALUES(prenatal_weight),
           prenatal_bp = VALUES(prenatal_bp), prenatal_height = VALUES(prenatal_height),
           progress = VALUES(progress)`,
        [
          mother.code,
          schoolId,
          groupIds.get(mother.groupCode),
          batchIds.get(mother.batchCode),
          mother.firstName,
          mother.lastName,
          `1990-01-${String((Number(mother.code.slice(-2)) % 28) + 1).padStart(2, '0')}`,
          mother.lmpDate,
          mother.eddDate,
          addDays(mother.lmpDate, mother.startingGestationalWeek * 7),
          mother.startingTrimester,
          mother.startingGestationalWeek,
          (54 + (Number(mother.code.slice(-2)) % 9)).toFixed(1),
          '112/72',
          (150 + (Number(mother.code.slice(-2)) % 16)).toFixed(1),
          0,
        ],
      );
      motherIds.set(mother.code, motherId);
    }

    if (motherIds.size) {
      await connection.query(
        `DELETE FROM mother_checkups
         WHERE mother_id IN (?)`,
        [[...motherIds.values()]],
      );
    }

    const maternalCheckupCountByMother = new Map();
    for (const checkup of plan.maternalCheckups) {
      const motherId = motherIds.get(checkup.motherCode);
      await connection.query(
        `INSERT INTO mother_checkups (
           mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
           blood_pressure, weight_kg, height_cm, bmi, nutritional_status,
           fundal_height_cm, fetal_heart_rate_bpm, service_provider, next_checkup_date,
           facility_type, remarks
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, ?, 'F1KD Demo Health Center', ?,
                   'Health Center', 'Synthetic demo checkup; not a clinical record.')
         ON DUPLICATE KEY UPDATE
           checkup_date = VALUES(checkup_date),
           gestational_age_weeks = VALUES(gestational_age_weeks),
           blood_pressure = VALUES(blood_pressure),
           weight_kg = VALUES(weight_kg),
           height_cm = VALUES(height_cm),
           bmi = VALUES(bmi),
           nutritional_status = VALUES(nutritional_status),
           fundal_height_cm = VALUES(fundal_height_cm),
           fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
           service_provider = VALUES(service_provider),
           next_checkup_date = VALUES(next_checkup_date),
           facility_type = VALUES(facility_type),
           remarks = VALUES(remarks)`,
        [
          motherId,
          checkup.trimester,
          checkup.number,
          checkup.date,
          checkup.gestationalAge,
          checkup.bloodPressure,
          checkup.weight,
          checkup.height,
          (Number(checkup.weight) / ((Number(checkup.height) / 100) ** 2)).toFixed(1),
          checkup.fundalHeight,
          checkup.fetalHeartRate,
          checkup.nextDate,
        ],
      );
      maternalCheckupCountByMother.set(
        checkup.motherCode,
        (maternalCheckupCountByMother.get(checkup.motherCode) || 0) + 1,
      );
    }
    for (const [motherCode, count] of maternalCheckupCountByMother) {
      await connection.query(
        'UPDATE mothers SET progress = ? WHERE id = ?',
        [Math.round((count / plan.mothers.find((mother) => mother.code === motherCode).expectedCheckups) * 100),
          motherIds.get(motherCode)],
      );
    }

    const childIds = new Map();
    for (const child of plan.children) {
      const childId = await insertOrGetId(
        connection,
        `INSERT INTO children (child_code, mother_id, community_id, group_id, batch_id,
           first_name, last_name, birth_date, gender, health_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), mother_id = VALUES(mother_id),
           community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
           first_name = VALUES(first_name), last_name = VALUES(last_name), birth_date = VALUES(birth_date),
           gender = VALUES(gender), health_status = VALUES(health_status)`,
        [
          child.code,
          motherIds.get(child.motherCode),
          schoolId,
          groupIds.get(child.groupCode),
          batchIds.get(child.batchCode),
          child.firstName,
          child.lastName,
          child.birthDate,
          Number(child.code.slice(-2)) % 2 === 0 ? 'Male' : 'Female',
          'Healthy',
        ],
      );
      childIds.set(child.code, childId);
    }

    for (const checkup of plan.childCheckups) {
      const childId = childIds.get(checkup.childCode);
      const [existingRows] = await connection.query(
        'SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? ORDER BY id LIMIT 1',
        [childId, checkup.month],
      );
      const values = [
        checkup.nextDate,
        checkup.visitDate,
        checkup.weight,
        checkup.height,
        checkup.headCircumference,
        'Yes',
        'Normal',
        'F1KD Demo Health Center',
        'Synthetic demo checkup; not a clinical record.',
      ];
      if (existingRows.length) {
        await connection.query(
          `UPDATE child_checkups SET next_checkup_date = ?, visit_date = ?, weight = ?, height = ?,
             head_circumference = ?, exclusive_breastfeeding = ?, developmental_status = ?,
             facility_type = 'Health Center', service_provider = ?, notes = ?
           WHERE id = ?`,
          [...values.slice(0, 6), values[6], values[7], values[8], existingRows[0].id],
        );
      } else {
        await connection.query(
          `INSERT INTO child_checkups (
             child_id, week_number, next_checkup_date, visit_date, weight, height,
             head_circumference, exclusive_breastfeeding, developmental_status,
             facility_type, service_provider, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Health Center', ?, ?)`,
          [childId, checkup.month, ...values],
        );
      }
    }

    const programName = 'DEMO: Child Growth Support Program';
    const [existingPrograms] = await connection.query(
      'SELECT id FROM programs WHERE name = ? AND provider = ? ORDER BY id LIMIT 1 FOR UPDATE',
      [programName, 'F1KD Sample Data'],
    );
    let programId;
    if (existingPrograms.length) {
      programId = existingPrograms[0].id;
      await connection.query(
        `UPDATE programs SET type = 'Child Health', description = ?, beneficiary_type = 'Child',
           status = 'Active', ended = NULL WHERE id = ?`,
        ['Synthetic demo data for development and testing.', programId],
      );
    } else {
      programId = await insertOrGetId(
        connection,
        `INSERT INTO programs (name, type, provider, description, beneficiary_type, status)
         VALUES (?, 'Child Health', 'F1KD Sample Data', ?, 'Child', 'Active')`,
        [programName, 'Synthetic demo data for development and testing.'],
      );
    }

    for (const batch of plan.batches) {
      await connection.query(
        `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
         VALUES (?, 'Batch', ?, 8, 7)
         ON DUPLICATE KEY UPDATE beneficiaries = VALUES(beneficiaries), received = VALUES(received)`,
        [programId, batch.name],
      );
    }

    for (const childCode of plan.completedChildCodes) {
      await connection.query(
        `INSERT INTO monitoring_logs
          (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, notes)
         VALUES (?, 'child', ?, TRUE, CURRENT_DATE, 'Sample program completion')
         ON DUPLICATE KEY UPDATE monitored = TRUE, notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP`,
        [childCode, programId],
      );
    }

    await connection.commit();
    console.log(
      `Seeded ${plan.mothers.length} mothers, ${plan.children.length} children, and `
      + `${plan.childCheckups.length} monthly child checkups through Month 24, `
      + `${plan.completedChildCodes.length} completed child program receipts at ${plan.school.name}, `
      + `plus ${plan.users.length} demo login accounts.`,
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
  seedSampleData().catch((error) => {
    console.error('Sample data seeding failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { buildSeedPlan };
