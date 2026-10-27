require('dotenv').config();

const SCHOOLS = [
  { code: 'DEMO-SCH-01', name: 'F1KD Demo School 1', area: 'Quezon City' },
  { code: 'DEMO-SCH-02', name: 'F1KD Demo School 2', area: 'Caloocan City' },
];
const GROUPS_PER_SCHOOL = 2;
const BATCHES_PER_GROUP = 2;
const MOTHERS_PER_BATCH = 10;
const CHILDREN_PER_BATCH = 10;
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
  { trimester: '3rd Trimester', week: 28, checkups: 3 },
];
const CHILD_MONITORING_MONTHS = Array.from({ length: 24 }, (_, index) => index + 1);
const CHILD_COMPLETION_LEVELS = [24, 24, 18, 18, 12, 12, 6, 6, 0, 0];
const BATCH_CHECKIN_RATES = [3, 5, 7, 9];
const SCREENING_STATUSES = ['Normal', 'Needs Follow-up', 'At Risk'];
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
    schoolCode: SCHOOLS[0].code,
  },
  {
    email: 'demo.organizer2@f1kd.test',
    firstName: 'Demo',
    lastName: 'Organizer 2',
    role: 'Community Organizer',
    schoolCode: SCHOOLS[1].code,
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
    schoolCode: SCHOOLS[0].code,
    groupCode: 'DEMO-GRP-01',
  },
  {
    email: 'demo.healthworker2@f1kd.test',
    firstName: 'Demo',
    lastName: 'Health Worker 2',
    role: 'Health Worker',
    schoolCode: SCHOOLS[0].code,
    groupCode: 'DEMO-GRP-02',
  },
];
SCHOOLS.slice(1).forEach((school, index) => {
  const schoolIndex = index + 1;
  for (let groupIndex = 1; groupIndex <= GROUPS_PER_SCHOOL; groupIndex += 1) {
    const groupCode = schoolIndex === 0
      ? `DEMO-GRP-0${groupIndex}`
      : `DEMO${schoolIndex + 1}-GRP-0${groupIndex}`;
    SAMPLE_USERS.push({
      email: `demo.healthworker${schoolIndex + 1}-${groupIndex}@f1kd.test`,
      firstName: 'Demo',
      lastName: `School ${schoolIndex + 1} Health Worker ${groupIndex}`,
      role: 'Health Worker',
      schoolCode: school.code,
      groupCode,
    });
  }
});

function buildSeedPlan({ now = new Date() } = {}) {
  const today = now.toISOString().slice(0, 10);
  const groups = SCHOOLS.flatMap((school, schoolIndex) => (
    Array.from({ length: GROUPS_PER_SCHOOL }, (_, index) => {
      const groupNumber = index + 1;
      return {
        code: schoolIndex === 0
          ? `DEMO-GRP-0${groupNumber}`
          : `DEMO${schoolIndex + 1}-GRP-0${groupNumber}`,
        name: `Demo School ${schoolIndex + 1} Group ${groupNumber}`,
        schoolCode: school.code,
      };
    })
  ));
  const batches = [];
  const mothers = [];
  const children = [];
  const completedChildCodes = [];
  const completedMotherCodes = [];
  const maternalCheckups = [];
  const childCheckups = [];

  let batchNumber = 0;
  for (const group of groups) {
    for (let batchIndex = 1; batchIndex <= BATCHES_PER_GROUP; batchIndex += 1) {
      batchNumber += 1;
      const batch = {
        code: `DEMO-BAT-${String(batchNumber).padStart(2, '0')}`,
        name: `Demo School ${SCHOOLS.findIndex((school) => school.code === group.schoolCode) + 1} Batch ${batchNumber}`,
        groupCode: group.code,
        schoolCode: group.schoolCode,
        received: BATCH_CHECKIN_RATES[(batchNumber - 1) % BATCH_CHECKIN_RATES.length],
      };
      batches.push(batch);

      for (let motherIndex = 1; motherIndex <= MOTHERS_PER_BATCH; motherIndex += 1) {
        const recordNumber = (batchNumber - 1) * MOTHERS_PER_BATCH + motherIndex;
        const mother = {
          code: `DEMO-M-${String(recordNumber).padStart(2, '0')}`,
          firstName: FIRST_NAMES[(recordNumber - 1) % FIRST_NAMES.length],
          lastName: `Sample${String(batchNumber).padStart(2, '0')}`,
          batchCode: batch.code,
          groupCode: group.code,
          schoolCode: group.schoolCode,
        };
        const startIndex = (recordNumber - 1) % MATERNAL_STARTS.length;
        const maternalStart = MATERNAL_STARTS[startIndex];
        mother.startingTrimester = maternalStart.trimester;
        mother.startingGestationalWeek = maternalStart.week;
        mother.expectedCheckups = maternalStart.checkups;
        const screeningStatus = recordNumber % 10 === 0
          ? SCREENING_STATUSES[2]
          : recordNumber % 5 === 0 ? SCREENING_STATUSES[1] : SCREENING_STATUSES[0];
        const childAgeMonths = CHILD_COMPLETION_LEVELS[(motherIndex - 1) % CHILD_COMPLETION_LEVELS.length];
        const birthDate = addDays(addMonths(today, -childAgeMonths), -(recordNumber % 25));
        const lmpDate = addDays(birthDate, -280);
        mother.lmpDate = lmpDate;
        mother.eddDate = birthDate;
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
              developmentalStatus: screeningStatus,
              referredToHospital: screeningStatus === 'At Risk',
              fundalHeight: Math.round(gestationalAge * 0.9),
              fetalHeartRate: 140 + (recordNumber % 16),
              nextDate: addDays(checkupDate, 28),
            });
          });

        if (motherIndex <= CHILDREN_PER_BATCH) {
          const childNumber = (batchNumber - 1) * CHILDREN_PER_BATCH + motherIndex;
          const child = {
            code: `DEMO-C-${String(childNumber).padStart(2, '0')}`,
            firstName: CHILD_NAMES[(childNumber - 1) % CHILD_NAMES.length],
            lastName: mother.lastName,
            motherCode: mother.code,
            batchCode: batch.code,
            groupCode: group.code,
            schoolCode: group.schoolCode,
            birthDate,
            completedMonths: CHILD_COMPLETION_LEVELS[(motherIndex - 1) % CHILD_COMPLETION_LEVELS.length],
            developmentalStatus: childNumber % 7 === 0
              ? SCREENING_STATUSES[2]
              : childNumber % 5 === 0 ? SCREENING_STATUSES[1] : SCREENING_STATUSES[0],
            birthWeight: (3 + (childNumber % 5) * 0.1).toFixed(2),
            birthLength: (48 + (childNumber % 4) * 0.5).toFixed(1),
            headCircumference: (33.5 + (childNumber % 4) * 0.4).toFixed(1),
            chestCircumference: (31.5 + (childNumber % 4) * 0.4).toFixed(1),
          };
          children.push(child);
          CHILD_MONITORING_MONTHS.filter((month) => month <= child.completedMonths).forEach((month) => {
            const visitDate = addMonths(birthDate, month);
            childCheckups.push({
              childCode: child.code,
              month,
              visitDate,
              nextDate: addMonths(visitDate, 1),
              weight: (3.1 + month * 0.42 + (childNumber % 5) * 0.12).toFixed(2),
              height: (50 + month * 1.15 + (childNumber % 4) * 0.3).toFixed(1),
              headCircumference: (34 + month * 0.42).toFixed(1),
              developmentalStatus: child.developmentalStatus,
            });
          });
          if (motherIndex <= batch.received) completedChildCodes.push(child.code);
        }
        if (motherIndex <= batch.received) completedMotherCodes.push(mother.code);
      }
    }
  }

  return {
    schools: SCHOOLS,
    groups,
    batches,
    mothers,
    children,
    completedChildCodes,
    completedMotherCodes,
    programs: SCHOOLS.flatMap((school, schoolIndex) => [
      {
        name: `DEMO: Maternal Wellness Program - School ${schoolIndex + 1}`,
        type: 'Maternal Health',
        beneficiaryType: 'Mother',
        schoolCode: school.code,
        status: schoolIndex === 1 ? 'Ended' : 'Active',
      },
      {
        name: `DEMO: Child Growth Support Program - School ${schoolIndex + 1}`,
        type: 'Child Health',
        beneficiaryType: 'Child',
        schoolCode: school.code,
        status: 'Active',
      },
    ]),
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

    const schoolIds = new Map();
    for (const school of plan.schools) {
      const schoolId = await insertOrGetId(
        connection,
        `INSERT INTO communities (community_code, name, area)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), area = VALUES(area)`,
        [school.code, school.name, school.area],
      );
      schoolIds.set(school.code, schoolId);
    }

    const groupIds = new Map();
    for (const group of plan.groups) {
      const groupId = await insertOrGetId(
        connection,
        `INSERT INTO \`groups\` (group_code, community_id, name, leader, members_count, status)
         VALUES (?, ?, ?, ?, ?, 'Active')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), community_id = VALUES(community_id),
           name = VALUES(name), members_count = VALUES(members_count), status = VALUES(status)`,
        [group.code, schoolIds.get(group.schoolCode), group.name, 'Demo Group Leader', 20],
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
        [batch.code, schoolIds.get(batch.schoolCode), batch.name, MOTHERS_PER_BATCH, 0],
      );
      batchIds.set(batch.code, batchId);
      await connection.query('DELETE FROM group_batch WHERE batch_id = ?', [batchId]);
      await connection.query(
        'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [groupIds.get(batch.groupCode), batchId],
      );
    }

    const userIds = new Map();
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
          user.schoolCode ? schoolIds.get(user.schoolCode) : null,
          user.groupCode ? groupIds.get(user.groupCode) : null,
        ],
      );
      userIds.set(user.email, userId);
      if (user.role === 'Community Organizer') {
        await connection.query(
          'UPDATE communities SET coordinator_id = ? WHERE id = ?',
          [userId, schoolIds.get(user.schoolCode)],
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
          schoolIds.get(mother.schoolCode),
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
           blood_pressure, weight_kg, height_cm, bmi, developmental_status, nutritional_status,
           fundal_height_cm, fetal_heart_rate_bpm, service_provider, next_checkup_date,
           referred_to_hospital, facility_type, remarks
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, ?, 'F1KD Demo Health Center', ?, ?,
                   'Health Center', 'Synthetic demo checkup; not a clinical record.')
         ON DUPLICATE KEY UPDATE
           checkup_date = VALUES(checkup_date),
           gestational_age_weeks = VALUES(gestational_age_weeks),
           blood_pressure = VALUES(blood_pressure),
           weight_kg = VALUES(weight_kg),
           height_cm = VALUES(height_cm),
           bmi = VALUES(bmi),
           developmental_status = VALUES(developmental_status),
           nutritional_status = VALUES(nutritional_status),
           fundal_height_cm = VALUES(fundal_height_cm),
           fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
           service_provider = VALUES(service_provider),
           next_checkup_date = VALUES(next_checkup_date),
           referred_to_hospital = VALUES(referred_to_hospital),
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
          checkup.developmentalStatus,
          checkup.fundalHeight,
          checkup.fetalHeartRate,
          checkup.nextDate,
          checkup.referredToHospital,
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
           first_name, last_name, birth_date, birth_weight, birth_length,
           head_circumference, chest_circumference, gender, health_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), mother_id = VALUES(mother_id),
           community_id = VALUES(community_id), group_id = VALUES(group_id), batch_id = VALUES(batch_id),
           first_name = VALUES(first_name), last_name = VALUES(last_name), birth_date = VALUES(birth_date),
           birth_weight = VALUES(birth_weight), birth_length = VALUES(birth_length),
           head_circumference = VALUES(head_circumference), chest_circumference = VALUES(chest_circumference),
           gender = VALUES(gender), health_status = VALUES(health_status)`,
        [
          child.code,
          motherIds.get(child.motherCode),
          schoolIds.get(child.schoolCode),
          groupIds.get(child.groupCode),
          batchIds.get(child.batchCode),
          child.firstName,
          child.lastName,
          child.birthDate,
          child.birthWeight,
          child.birthLength,
          child.headCircumference,
          child.chestCircumference,
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
        checkup.developmentalStatus,
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

    for (const program of plan.programs) {
      let [existingPrograms] = await connection.query(
        'SELECT id FROM programs WHERE name = ? AND provider = ? ORDER BY id LIMIT 1 FOR UPDATE',
        [program.name, 'F1KD Sample Data'],
      );
      const isFirstSchoolChildProgram = program.name === 'DEMO: Child Growth Support Program - School 1';
      if (!existingPrograms.length && isFirstSchoolChildProgram) {
        [existingPrograms] = await connection.query(
          `SELECT id FROM programs
           WHERE name = 'DEMO: Child Growth Support Program' AND provider = 'F1KD Sample Data'
           ORDER BY id LIMIT 1 FOR UPDATE`,
        );
        if (existingPrograms.length) {
          await connection.query(
            'UPDATE programs SET name = ? WHERE id = ?',
            [program.name, existingPrograms[0].id],
          );
        }
      }
      const programId = existingPrograms.length
        ? existingPrograms[0].id
        : await insertOrGetId(
          connection,
          `INSERT INTO programs (name, type, provider, description, beneficiary_type, status, ended)
           VALUES (?, ?, 'F1KD Sample Data', ?, ?, ?, ?)`,
          [
            program.name,
            program.type,
            'Synthetic demo data for development and testing.',
            program.beneficiaryType,
            program.status,
            program.status === 'Ended' ? addDays(new Date().toISOString().slice(0, 10), -30) : null,
          ],
        );
      if (existingPrograms.length) {
        await connection.query(
          `UPDATE programs SET type = ?, description = ?, beneficiary_type = ?,
             status = ?, ended = ? WHERE id = ?`,
          [
            program.type,
            'Synthetic demo data for development and testing.',
            program.beneficiaryType,
            program.status,
            program.status === 'Ended' ? addDays(new Date().toISOString().slice(0, 10), -30) : null,
            programId,
          ],
        );
      }

      const schoolBatches = plan.batches.filter((batch) => batch.schoolCode === program.schoolCode);
      const beneficiaryCodes = program.beneficiaryType === 'Mother'
        ? plan.mothers.filter((mother) => mother.schoolCode === program.schoolCode).map((mother) => mother.code)
        : plan.children.filter((child) => child.schoolCode === program.schoolCode).map((child) => child.code);
      const beneficiaryIds = program.beneficiaryType === 'Mother'
        ? plan.mothers.filter((mother) => mother.schoolCode === program.schoolCode).map((mother) => motherIds.get(mother.code))
        : plan.children.filter((child) => child.schoolCode === program.schoolCode).map((child) => childIds.get(child.code));

      await connection.query('DELETE FROM program_clusters WHERE program_id = ?', [programId]);
      await connection.query(
        `DELETE FROM monitoring_logs
         WHERE program_id = ? AND beneficiary_type = ?
           AND (
             beneficiary_id LIKE ?
             OR beneficiary_id IN (?)
             OR beneficiary_id IN (?)
           )`,
        [
          programId,
          program.beneficiaryType.toLowerCase(),
          `${program.beneficiaryType === 'Mother' ? 'DEMO-M' : 'DEMO-C'}-%`,
          beneficiaryCodes,
          beneficiaryIds.map(String),
        ],
      );
      for (const batch of schoolBatches) {
        const beneficiariesPerBatch = program.beneficiaryType === 'Mother'
          ? MOTHERS_PER_BATCH
          : CHILDREN_PER_BATCH;
        await connection.query(
          `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
           VALUES (?, 'Batch', ?, ?, ?)`,
          [programId, batch.name, beneficiariesPerBatch, batch.received],
        );
      }

      const beneficiaryRows = program.beneficiaryType === 'Mother' ? plan.mothers : plan.children;
      const completedCodes = program.beneficiaryType === 'Mother'
        ? plan.completedMotherCodes
        : plan.completedChildCodes;
      for (const beneficiary of beneficiaryRows.filter((row) => row.schoolCode === program.schoolCode)) {
        const beneficiaryId = program.beneficiaryType === 'Mother'
          ? motherIds.get(beneficiary.code)
          : childIds.get(beneficiary.code);
        const recorder = program.beneficiaryType === 'Mother'
          ? plan.users.find((user) => user.role === 'Community Organizer' && user.schoolCode === program.schoolCode)
          : plan.users.find((user) => user.role === 'Health Worker' && user.groupCode === beneficiary.groupCode);
        const recorderId = recorder ? userIds.get(recorder.email) : null;
        if (!recorderId) {
          throw new Error(`Unable to assign a sample recorder for ${beneficiary.code}.`);
        }
        const monitored = completedCodes.includes(beneficiary.code);
        await connection.query(
          `INSERT INTO monitoring_logs
            (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, notes, monitored_by,
             created_by_user_id, updated_by_user_id)
           VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), notes = VALUES(notes),
             monitored_by = VALUES(monitored_by), created_by_user_id = VALUES(created_by_user_id),
             updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP`,
          [
            String(beneficiaryId),
            program.beneficiaryType.toLowerCase(),
            programId,
            monitored,
            monitored ? 'Synthetic sample program check-in: received.' : 'Synthetic sample program check-in: not received.',
            recorderId,
            recorderId,
            recorderId,
          ],
        );
      }
    }

    await connection.commit();
    console.log(
      `Seeded ${plan.schools.length} schools, ${plan.groups.length} groups, ${plan.batches.length} batches, `
      + `${plan.mothers.length} mothers, ${plan.children.length} children, and `
      + `${plan.childCheckups.length} child checkups across varied monitoring completion levels, `
      + `${plan.programs.length} scoped demo programs with program check-ins for mothers and children, `
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
