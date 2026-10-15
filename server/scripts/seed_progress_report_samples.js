const bcrypt = require('bcrypt');
const pool = require('../db');

const DEMO_PASSWORD = 'F1KD-Demo-2026!';

const schools = [
  { code: 'DEMO-SCH-001', name: 'DEMO - Mabini Community School', area: 'Cebu City, Cebu' },
  { code: 'DEMO-SCH-002', name: 'DEMO - San Isidro Learning Center', area: 'Mandaue City, Cebu' },
  { code: 'DEMO-SCH-003', name: 'DEMO - Riverside Elementary School', area: 'Lapu-Lapu City, Cebu' },
];

const groups = schools.flatMap((school, schoolIndex) => [1, 2].map((groupNumber) => ({
  code: `DEMO-GRP-${String(schoolIndex * 2 + groupNumber).padStart(3, '0')}`,
  name: `${school.name.replace('DEMO - ', '')} - Group ${String.fromCharCode(64 + groupNumber)}`,
  schoolCode: school.code,
  leader: ['Maria Sample', 'Jose Sample'][groupNumber - 1],
})));

const batches = groups.flatMap((group, groupIndex) => [1, 2].map((batchNumber) => ({
  code: `DEMO-BAT-${String(groupIndex * 2 + batchNumber).padStart(3, '0')}`,
  name: `${group.name.replace(' - Group ', ' - Batch ')}${batchNumber === 2 ? ' (PM)' : ''}`,
  groupCode: group.code,
  schoolCode: group.schoolCode,
})));

const families = [
  { mother: ['Jane', 'A.', 'Doe'], child: ['John', 'Doe'], gender: 'Male', dob: '2026-01-12', motherDob: '1995-04-18', birthWeight: 3.25, birthLength: 50, checkups: 2, highRisk: false, trimester: '1st Trimester', gestationalAge: 10, trimesterVisits: [2, 0, 0] },
  { mother: ['Maria', 'L.', 'Santos'], child: ['Sofia', 'Santos'], gender: 'Female', dob: '2026-01-26', motherDob: '1992-08-03', birthWeight: 3.10, birthLength: 49, checkups: 4, highRisk: false, trimester: '1st Trimester', gestationalAge: 12, trimesterVisits: [3, 0, 0] },
  { mother: ['Liza', 'M.', 'Reyes'], child: ['Gabriel', 'Reyes'], gender: 'Male', dob: '2026-02-09', motherDob: '1998-02-22', birthWeight: 3.45, birthLength: 51, checkups: 6, highRisk: true, trimester: '2nd Trimester', gestationalAge: 22, trimesterVisits: [3, 2, 0] },
  { mother: ['Ana', 'C.', 'Cruz'], child: ['Mateo', 'Cruz'], gender: 'Male', dob: '2026-02-23', motherDob: '1990-11-06', birthWeight: 2.95, birthLength: 48, checkups: 8, highRisk: false, trimester: '3rd Trimester', gestationalAge: 34, trimesterVisits: [3, 3, 2] },
  { mother: ['Carla', 'R.', 'Dela Cruz'], child: ['Elena', 'Dela Cruz'], gender: 'Female', dob: '2026-03-09', motherDob: '1996-06-15', birthWeight: 3.30, birthLength: 50, checkups: 10, highRisk: false, trimester: '2nd Trimester', gestationalAge: 18, trimesterVisits: [3, 1, 0] },
  { mother: ['Rosa', 'P.', 'Garcia'], child: ['Noah', 'Garcia'], gender: 'Male', dob: '2026-03-23', motherDob: '1993-01-30', birthWeight: 3.55, birthLength: 51, checkups: 12, highRisk: true, trimester: '3rd Trimester', gestationalAge: 32, trimesterVisits: [3, 3, 1] },
  { mother: ['Lea', 'T.', 'Bautista'], child: ['Lucas', 'Bautista'], gender: 'Male', dob: '2026-04-06', motherDob: '2000-03-11', birthWeight: 3.05, birthLength: 49, checkups: 3, highRisk: false, trimester: '2nd Trimester', gestationalAge: 20, trimesterVisits: [2, 1, 0] },
  { mother: ['Nina', 'F.', 'Ramos'], child: ['Maya', 'Ramos'], gender: 'Female', dob: '2026-04-20', motherDob: '1994-09-24', birthWeight: 3.20, birthLength: 50, checkups: 5, highRisk: false, trimester: '2nd Trimester', gestationalAge: 24, trimesterVisits: [3, 2, 0] },
  { mother: ['Teresa', 'G.', 'Flores'], child: ['Ethan', 'Flores'], gender: 'Male', dob: '2026-05-04', motherDob: '1991-12-02', birthWeight: 3.40, birthLength: 51, checkups: 7, highRisk: true, trimester: '1st Trimester', gestationalAge: 9, trimesterVisits: [1, 0, 0] },
  { mother: ['Grace', 'N.', 'Navarro'], child: ['Olivia', 'Navarro'], gender: 'Female', dob: '2026-05-18', motherDob: '1997-07-19', birthWeight: 3.15, birthLength: 49, checkups: 9, highRisk: false, trimester: '3rd Trimester', gestationalAge: 36, trimesterVisits: [3, 3, 3] },
  { mother: ['Alma', 'V.', 'Mendoza'], child: ['Diego', 'Mendoza'], gender: 'Male', dob: '2026-06-01', motherDob: '1989-05-27', birthWeight: 3.60, birthLength: 52, checkups: 11, highRisk: false, trimester: '3rd Trimester', gestationalAge: 30, trimesterVisits: [3, 2, 1] },
  { mother: ['Ella', 'B.', 'Villanueva'], child: ['Amara', 'Villanueva'], gender: 'Female', dob: '2026-06-15', motherDob: '1999-10-09', birthWeight: 2.85, birthLength: 47, checkups: 1, highRisk: true, trimester: '1st Trimester', gestationalAge: 11, trimesterVisits: [2, 0, 0] },
  { mother: ['Lilia', 'M.', 'Sison'], child: ['Aira', 'Sison'], gender: 'Female', dob: '2025-10-07', motherDob: '1993-03-14', birthWeight: 2.55, birthLength: 47, checkups: 16, highRisk: true, trimester: '3rd Trimester', gestationalAge: 35, trimesterVisits: [3, 3, 2], weightGainPerWeek: 0.11, lengthGainPerWeek: 0.50 },
  { mother: ['Perla', 'D.', 'Dizon'], child: ['Marco', 'Dizon'], gender: 'Male', dob: '2025-10-21', motherDob: '1990-12-28', birthWeight: 3.90, birthLength: 52, checkups: 18, highRisk: false, trimester: '3rd Trimester', gestationalAge: 33, trimesterVisits: [3, 3, 3], weightGainPerWeek: 0.18, lengthGainPerWeek: 0.62 },
  { mother: ['Mylene', 'A.', 'Soriano'], child: ['Kiara', 'Soriano'], gender: 'Female', dob: '2025-11-04', motherDob: '1997-05-08', birthWeight: 3.05, birthLength: 49, checkups: 14, highRisk: false, trimester: '2nd Trimester', gestationalAge: 25, trimesterVisits: [3, 2, 0], weightGainPerWeek: 0.14, lengthGainPerWeek: 0.56 },
  { mother: ['Rosalie', 'C.', 'Lim'], child: ['Enzo', 'Lim'], gender: 'Male', dob: '2025-11-18', motherDob: '1988-07-21', birthWeight: 2.70, birthLength: 48, checkups: 20, highRisk: true, trimester: '3rd Trimester', gestationalAge: 31, trimesterVisits: [3, 3, 1], weightGainPerWeek: 0.16, lengthGainPerWeek: 0.59 },
  { mother: ['Diana', 'P.', 'Valdez'], child: ['Nico', 'Valdez'], gender: 'Male', dob: '2025-12-02', motherDob: '1994-02-16', birthWeight: 3.45, birthLength: 51, checkups: 12, highRisk: false, trimester: '2nd Trimester', gestationalAge: 23, trimesterVisits: [3, 2, 0], weightGainPerWeek: 0.15, lengthGainPerWeek: 0.57 },
  { mother: ['Cecilia', 'R.', 'Tan'], child: ['Isabel', 'Tan'], gender: 'Female', dob: '2025-12-16', motherDob: '1991-09-05', birthWeight: 3.15, birthLength: 50, checkups: 22, highRisk: false, trimester: '3rd Trimester', gestationalAge: 36, trimesterVisits: [3, 3, 3], weightGainPerWeek: 0.17, lengthGainPerWeek: 0.60 },
  { mother: ['Joanne', 'E.', 'Mercado'], child: ['Rafael', 'Mercado'], gender: 'Male', dob: '2025-12-30', motherDob: '1998-11-11', birthWeight: 2.80, birthLength: 48, checkups: 8, highRisk: true, trimester: '1st Trimester', gestationalAge: 13, trimesterVisits: [3, 0, 0], weightGainPerWeek: 0.12, lengthGainPerWeek: 0.52 },
  { mother: ['Maribel', 'S.', 'Aquino'], child: ['Thea', 'Aquino'], gender: 'Female', dob: '2026-01-13', motherDob: '1995-01-19', birthWeight: 3.65, birthLength: 51, checkups: 10, highRisk: false, trimester: '2nd Trimester', gestationalAge: 21, trimesterVisits: [3, 1, 0], weightGainPerWeek: 0.19, lengthGainPerWeek: 0.63 },
  { mother: ['Patricia', 'L.', 'Manalo'], child: ['Caleb', 'Manalo'], gender: 'Male', dob: '2026-01-27', motherDob: '1992-04-30', birthWeight: 3.00, birthLength: 49, checkups: 24, highRisk: false, trimester: '3rd Trimester', gestationalAge: 34, trimesterVisits: [3, 3, 2], weightGainPerWeek: 0.15, lengthGainPerWeek: 0.58 },
  { mother: ['Nerissa', 'T.', 'Pineda'], child: ['Mika', 'Pineda'], gender: 'Female', dob: '2026-02-10', motherDob: '1996-10-23', birthWeight: 2.45, birthLength: 46, checkups: 6, highRisk: true, trimester: '2nd Trimester', gestationalAge: 19, trimesterVisits: [3, 1, 0], weightGainPerWeek: 0.13, lengthGainPerWeek: 0.53 },
  { mother: ['Angela', 'F.', 'Castillo'], child: ['Luis', 'Castillo'], gender: 'Male', dob: '2026-02-24', motherDob: '1987-06-12', birthWeight: 3.80, birthLength: 52, checkups: 15, highRisk: false, trimester: '3rd Trimester', gestationalAge: 32, trimesterVisits: [3, 3, 1], weightGainPerWeek: 0.18, lengthGainPerWeek: 0.61 },
  { mother: ['Sheila', 'J.', 'Estrada'], child: ['Amir', 'Estrada'], gender: 'Male', dob: '2026-03-10', motherDob: '1999-08-02', birthWeight: 3.20, birthLength: 50, checkups: 4, highRisk: false, trimester: '1st Trimester', gestationalAge: 10, trimesterVisits: [2, 0, 0], weightGainPerWeek: 0.14, lengthGainPerWeek: 0.55 },
  { mother: ['Virginia', 'B.', 'Lopez'], child: ['Yana', 'Lopez'], gender: 'Female', dob: '2026-03-24', motherDob: '1990-03-25', birthWeight: 2.90, birthLength: 48, checkups: 19, highRisk: true, trimester: '3rd Trimester', gestationalAge: 30, trimesterVisits: [3, 2, 1], weightGainPerWeek: 0.16, lengthGainPerWeek: 0.59 },
];

const roundTo = (value, places = 1) => Number(value.toFixed(places));
const datePlusDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const dateMinusDays = (date, days) => datePlusDays(date, -days);

async function getId(connection, table, column, value) {
  const [rows] = await connection.query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [value]);
  if (!rows.length) throw new Error(`Unable to resolve seeded ${table} record: ${value}`);
  return Number(rows[0].id);
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const school of schools) {
      await connection.query(
        'INSERT IGNORE INTO communities (community_code, name, area) VALUES (?, ?, ?)',
        [school.code, school.name, school.area],
      );
    }

    const schoolIds = new Map();
    for (const school of schools) schoolIds.set(school.code, await getId(connection, 'communities', 'community_code', school.code));

    for (const group of groups) {
      await connection.query(
        'INSERT IGNORE INTO `groups` (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, 0, ?)',
        [group.code, schoolIds.get(group.schoolCode), group.name, group.leader, 'Active'],
      );
    }

    const groupIds = new Map();
    for (const group of groups) groupIds.set(group.code, await getId(connection, 'groups', 'group_code', group.code));

    for (const batch of batches) {
      await connection.query(
        'INSERT IGNORE INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, 0, 0, ?)',
        [batch.code, schoolIds.get(batch.schoolCode), batch.name, 'Active'],
      );
    }

    const batchIds = new Map();
    for (const batch of batches) {
      const batchId = await getId(connection, 'batches', 'batch_code', batch.code);
      batchIds.set(batch.code, batchId);
      await connection.query(
        'INSERT IGNORE INTO group_batch (group_id, batch_id) VALUES (?, ?)',
        [groupIds.get(batch.groupCode), batchId],
      );
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const sampleUsers = [];
    schools.forEach((school, index) => {
      const schoolGroups = groups.filter((group) => group.schoolCode === school.code);
      sampleUsers.push({
        email: `demo.coordinator.${index + 1}@example.com`,
        firstName: ['Mila', 'Ramon', 'Celia'][index],
        lastName: 'Demo Coordinator',
        role: 'Community Organizer',
        schoolId: schoolIds.get(school.code),
        groupId: null,
      });
      sampleUsers.push({
        email: `demo.healthworker.${index + 1}@example.com`,
        firstName: ['Lani', 'Paolo', 'Rhea'][index],
        lastName: 'Demo Healthworker',
        role: 'Health worker',
        schoolId: schoolIds.get(school.code),
        groupId: groupIds.get(schoolGroups[0].code),
      });
    });
    for (const user of sampleUsers) {
      await connection.query(
        `INSERT IGNORE INTO users
          (first_name, last_name, email, gender, dob, location, role, status, password_hash, school_id, group_id, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, 0)`,
        [user.firstName, user.lastName, user.email, 'Other', '1990-01-01', 'DEMO - Cebu, Philippines', user.role, passwordHash, user.schoolId, user.groupId],
      );
    }
    const [healthWorkerRows] = await connection.query(
      "SELECT id FROM users WHERE email = 'demo.healthworker.1@example.com' LIMIT 1",
    );
    const healthWorkerId = Number(healthWorkerRows[0].id);

    const motherIds = [];
    const childIds = [];
    for (let index = 0; index < families.length; index += 1) {
      const family = families[index];
      const motherCode = `DEMO-MTH-${String(index + 1).padStart(3, '0')}`;
      const childCode = `DEMO-CHD-${String(index + 1).padStart(3, '0')}`;
      const batch = batches[index % batches.length];
      const schoolId = schoolIds.get(batch.schoolCode);
      const groupId = groupIds.get(batch.groupCode);
      const batchId = batchIds.get(batch.code);
      const [firstName, middleName, lastName] = family.mother;

      await connection.query(
        `INSERT IGNORE INTO mothers
          (mother_code, community_id, group_id, batch_id, first_name, middle_name, last_name, dob,
           lmp_date, edd_date, contact_number, is_high_risk, program_type, address, prenatal_reg_date,
           trimester, gestational_age, prenatal_weight, prenatal_bp, prenatal_height, gravida, para,
           status, visits, progress, weight, height, civil_status, educational_attainment, data_privacy_signed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, 1)`,
        [
          motherCode, schoolId, groupId, batchId, firstName, middleName, lastName, family.motherDob,
          dateMinusDays(family.dob, 280), family.dob, null, family.highRisk, 'DEMO - Maternal Wellness Support 2026',
          'DEMO - Cebu, Philippines', dateMinusDays(family.dob, 280 - (family.gestationalAge * 7)), family.trimester, family.gestationalAge,
          58 + (index % 8), '110/70', 155 + (index % 12), 2 + (index % 3), 1,
          3, Math.round((3 / 9) * 100), 58 + (index % 8), 155 + (index % 12), 'Married', 'High School Graduate',
        ],
      );
      const motherId = await getId(connection, 'mothers', 'mother_code', motherCode);
      motherIds.push(motherId);
      await connection.query(
        'UPDATE mothers SET trimester = ?, gestational_age = ? WHERE id = ?',
        [family.trimester, family.gestationalAge, motherId],
      );

      const childProgress = Math.round((family.checkups / 24) * 100);
      await connection.query(
        `INSERT IGNORE INTO children
          (child_code, mother_id, community_id, group_id, batch_id, first_name, last_name, birth_date,
           birth_weight, birth_length, gender, delivery_type, health_status, birth_place, birth_attendant,
           apgar_score, feeding_type, nutrition_notes, father_name, relationship, address, progress, blood_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Vaginal', 'Under routine monitoring', 'DEMO - Cebu City',
           'DEMO - Licensed midwife', '8/9', 'Breast milk and age-appropriate feeds', 'DEMO - Growth monitoring sample',
           'Sample Parent', 'Mother', 'DEMO - Cebu, Philippines', ?, ?)`,
        [
          childCode, motherId, schoolId, groupId, batchId, family.child[0], family.child[1], family.dob,
          family.birthWeight, family.birthLength, family.gender, childProgress, ['O+', 'A+', 'B+', 'O-', 'AB+'][index % 5],
        ],
      );
      const childId = await getId(connection, 'children', 'child_code', childCode);
      childIds.push(childId);

      const visitWeeks = Array.from({ length: family.checkups }, (_, visitIndex) => (
        Math.round(((visitIndex + 1) * 24) / family.checkups)
      ));
      for (const [visitIndex, week] of visitWeeks.entries()) {
        const visitDate = datePlusDays(family.dob, week * 7);
        const weight = roundTo(family.birthWeight + (week * (family.weightGainPerWeek || 0.15)) + ((index % 3) * 0.05), 2);
        const height = roundTo(family.birthLength + (week * (family.lengthGainPerWeek || 0.58)), 1);
        await connection.query(
          `INSERT INTO child_checkups
            (child_id, week_number, visit_date, weight, height, head_circumference, developmental_status, service_provider, notes)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM child_checkups WHERE child_id = ? AND week_number = ?
           )`,
          [
            childId, week, visitDate, weight, height, roundTo(34 + (week * 0.25), 1),
            week < 12 ? 'On track' : family.highRisk && visitIndex === family.checkups - 1 ? 'Follow-up advised' : 'On track',
            'DEMO - Community Health Worker', 'DEMO - Routine growth monitoring visit', childId, week,
          ],
        );
      }

    }

    await connection.query(
      `DELETE mc FROM mother_checkups mc
       INNER JOIN mothers m ON m.id = mc.mother_id
       WHERE m.mother_code LIKE 'DEMO-MTH-%'`,
    );
    const trimesterLabels = ['1st Trimester', '2nd Trimester', '3rd Trimester'];
    const trimesterWeeks = [[8, 10, 12], [16, 20, 24], [28, 32, 36]];
    for (let index = 0; index < families.length; index += 1) {
      const family = families[index];
      const motherId = motherIds[index];
      for (const [trimesterIndex, trimester] of trimesterLabels.entries()) {
        for (let visitIndex = 0; visitIndex < family.trimesterVisits[trimesterIndex]; visitIndex += 1) {
          const gestationalWeeks = trimesterWeeks[trimesterIndex][visitIndex];
          const checkupDate = datePlusDays(dateMinusDays(family.dob, 280), gestationalWeeks * 7);
          await connection.query(
            `INSERT INTO mother_checkups
              (mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks, blood_pressure,
               weight_kg, height_cm, bmi, nutritional_status, fundal_height_cm, fetal_heart_rate_bpm,
               service_provider, next_checkup_date, referred_to_hospital, lab_assistance_provided, facility_type, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              motherId, trimester, visitIndex + 1, checkupDate, gestationalWeeks,
              ['110/70', '112/72', '114/74'][(trimesterIndex + visitIndex) % 3],
              56 + (index % 8) + trimesterIndex * 2 + visitIndex * 0.5, 155 + (index % 12), 23 + (index % 4),
              'Within routine range', [15, 24, 33][trimesterIndex] + visitIndex,
              140 + ((index + visitIndex) % 21), 'DEMO - Prenatal Care Provider',
              datePlusDays(checkupDate, 28), index % 4 === 0 && visitIndex === 0 ? 1 : 0,
              index % 3 === 0 && visitIndex > 0 ? 1 : 0, 'Community clinic',
              `DEMO - Prenatal checkup ${visitIndex + 1} sample`,
            ],
          );
        }
      }
    }

    const programDefinitions = [
      { name: 'DEMO - Community Nutrition Support 2026', type: 'Feeding', beneficiaryType: 'Child', description: 'Fictional sample program for progress-report testing.' },
      { name: 'DEMO - Maternal Wellness Support 2026', type: 'Nutrition Support', beneficiaryType: 'Mother', description: 'Fictional sample program for maternal report testing.' },
    ];
    const programIds = [];
    for (const program of programDefinitions) {
      const [existing] = await connection.query('SELECT id FROM programs WHERE name = ? LIMIT 1', [program.name]);
      let programId = Number(existing[0]?.id || 0);
      if (!programId) {
        const [inserted] = await connection.query(
          `INSERT INTO programs (name, type, provider, description, beneficiary_type, status, starts_on)
           VALUES (?, ?, 'DEMO - F1KD Training Dataset', ?, ?, 'Active', '2026-01-01')`,
          [program.name, program.type, program.description, program.beneficiaryType],
        );
        programId = Number(inserted.insertId);
      }
      programIds.push(programId);

      for (const school of schools) {
        await connection.query(
          `INSERT IGNORE INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
           VALUES (?, 'School', ?, ?, 0)`,
          [programId, school.name, families.filter((family, index) => batches[index % batches.length].schoolCode === school.code).length],
        );
      }
    }

    for (const programId of programIds) {
      for (const school of schools) {
        await connection.query(
          `UPDATE program_clusters
           SET beneficiaries = ?
           WHERE program_id = ? AND scope_type = 'School' AND scope_name = ?`,
          [families.filter((family, index) => batches[index % batches.length].schoolCode === school.code).length, programId, school.name],
        );
      }
    }

    const checkInDates = ['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15'];
    for (let index = 0; index < families.length; index += 1) {
      for (let checkInIndex = 0; checkInIndex < checkInDates.length; checkInIndex += 1) {
        const childReceived = (index + checkInIndex) % 4 !== 0;
        const motherReceived = (index + checkInIndex) % 3 !== 0;
        await connection.query(
          `INSERT IGNORE INTO monitoring_logs
            (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by, notes)
           VALUES (?, 'child', ?, ?, ?, ?, ?)`,
          [
            String(childIds[index]), programIds[0], childReceived ? 1 : 0, checkInDates[checkInIndex],
            healthWorkerId, childReceived ? 'DEMO - Nutrition support check-in completed' : 'DEMO - Scheduled check-in not attended',
          ],
        );
        await connection.query(
          `INSERT IGNORE INTO monitoring_logs
            (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by, notes)
           VALUES (?, 'mother', ?, ?, ?, ?, ?)`,
          [
            String(motherIds[index]), programIds[1], motherReceived ? 1 : 0, checkInDates[checkInIndex],
            healthWorkerId, motherReceived ? 'DEMO - Maternal wellness check-in completed' : 'DEMO - Scheduled check-in not attended',
          ],
        );
      }
    }

    for (const school of schools) {
      const coordinator = sampleUsers.find((user) => user.schoolId === schoolIds.get(school.code) && user.role === 'Community Organizer');
      const [coordinatorRows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [coordinator.email]);
      await connection.query('UPDATE communities SET coordinator_id = ? WHERE id = ?', [coordinatorRows[0].id, schoolIds.get(school.code)]);
    }

    await connection.query(
      `UPDATE batches b
       SET b.records = (SELECT COUNT(*) FROM mothers m WHERE m.batch_id = b.id),
           b.progress = COALESCE((
             SELECT ROUND(AVG(c.progress))
             FROM children c
             WHERE c.batch_id = b.id
           ), 0)
       WHERE b.batch_code LIKE 'DEMO-BAT-%'`,
    );
    await connection.query(
      `UPDATE \`groups\` g
       SET g.members_count = (SELECT COUNT(*) FROM mothers m WHERE m.group_id = g.id)
       WHERE g.group_code LIKE 'DEMO-GRP-%'`,
    );

    await connection.commit();
    console.log(JSON.stringify({
      result: 'DEMO sample records refreshed; existing non-DEMO records were not modified or removed.',
      schools: schools.length,
      groups: groups.length,
      batches: batches.length,
      sampleUsers: sampleUsers.map(({ email, role }) => ({ email, role, password: DEMO_PASSWORD })),
      mothers: motherIds.length,
      children: childIds.length,
      childCheckups: families.reduce((total, family) => total + family.checkups, 0),
      maternalCheckups: families.reduce((total, family) => total + family.trimesterVisits.reduce((sum, count) => sum + count, 0), 0),
      programs: programDefinitions.map((program) => program.name),
      programCheckIns: families.length * checkInDates.length * 2,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

seed().then(() => pool.end()).catch(async (error) => {
  console.error('Unable to add progress-report sample data:', error.message);
  await pool.end();
  process.exitCode = 1;
});
