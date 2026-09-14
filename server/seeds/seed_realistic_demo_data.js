const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1kd',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

const SHARED_PASSWORD = 'Welcome123!';

const SCHOOL_DATA = [
  { code: 'SCH-001', name: 'Northview Community School', area: 'North District' },
  { code: 'SCH-002', name: 'Riverside Community School', area: 'East District' },
  { code: 'SCH-003', name: 'Mabini Learning Center', area: 'South District' },
  { code: 'SCH-004', name: 'Lakeside Community School', area: 'West District' },
  { code: 'SCH-005', name: 'San Isidro School', area: 'Central District' },
];

const GROUP_NAMES = ['Alpha', 'Bravo', 'Cedar', 'Delta', 'Emerald', 'Foxtrot'];
const BATCH_SUFFIX = ['A', 'B', 'C', 'D'];

const FIRST_NAMES = ['Ariana', 'Bea', 'Carmen', 'Diana', 'Elena', 'Faith', 'Gina', 'Hannah', 'Iris', 'Janelle', 'Katrina', 'Liza', 'Mira', 'Nina', 'Olive', 'Patricia', 'Rhea', 'Sofia', 'Tessa', 'Vanessa'];
const LAST_NAMES = ['Santos', 'Reyes', 'Garcia', 'Mendoza', 'Cruz', 'Flores', 'Navarro', 'Ramos', 'Torres', 'Bautista', 'Lim', 'Aquino', 'De Leon', 'Villanueva'];
const COMMON_STREET = ['Purok 1', 'Purok 2', 'Barangay San Jose', 'Sitio Mahogany', 'Zone 4', 'Barangay Pag-asa'];

const USER_RECORDS = [
  { email: 'superadmin@f1kd.local', first_name: 'Super', last_name: 'Admin', role: 'Superadmin', gender: 'Other', location: 'Head Office', dob: '1988-06-15' },
  { email: 'admin@f1kd.local', first_name: 'Maria', last_name: 'Dela Cruz', role: 'Admin', gender: 'Female', location: 'Operations Office', dob: '1990-02-14' },
  { email: 'partner@f1kd.local', first_name: 'Rafael', last_name: 'Santos', role: 'Partner', gender: 'Male', location: 'Partnership Desk', dob: '1987-11-28' },
  { email: 'controller@f1kd.local', first_name: 'Grace', last_name: 'Mendoza', role: 'Controller', gender: 'Female', location: 'Finance Office', dob: '1985-07-10' },
  { email: 'community@f1kd.local', first_name: 'Lina', last_name: 'Reyes', role: 'Community Organizer', gender: 'Female', location: 'Community Outreach', dob: '1993-04-20' },
  { email: 'health@f1kd.local', first_name: 'Jonas', last_name: 'Lim', role: 'Health worker', gender: 'Male', location: 'Health Unit', dob: '1991-08-22' },
  { email: 'monitor@f1kd.local', first_name: 'Anne', last_name: 'Cruz', role: 'Monitor', gender: 'Female', location: 'Monitoring Unit', dob: '1992-09-09' },
  { email: 'school-admin@f1kd.local', first_name: 'Dianne', last_name: 'Villanueva', role: 'School Admin', gender: 'Female', location: 'School Administration', dob: '1989-01-05' },
];

function pick(list, index) {
  return list[index % list.length];
}

function randomDate(baseYear, monthOffset, dayOffset) {
  const date = new Date(baseYear, 0, 1);
  date.setMonth(date.getMonth() + monthOffset);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function makeAddress(index) {
  return `${pick(COMMON_STREET, index)}, ${pick(['Poblacion', 'Bahayang', 'Lusong', 'Bayan'], index + 2)} ${index + 1}`;
}

async function upsertUser(connection, user) {
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);
  const vars = [
    user.email,
    user.role,
    'Active',
    passwordHash,
    user.first_name,
    user.last_name,
    user.gender || 'Other',
    user.location || 'Unknown',
    user.dob || null,
    user.contact_number || `0917${String(Math.floor(Math.random() * 900000) + 100000)}`,
  ];

  const sql = `
    INSERT INTO users (email, role, status, password_hash, first_name, last_name, gender, location, dob, contact_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      role = VALUES(role),
      status = VALUES(status),
      password_hash = VALUES(password_hash),
      first_name = VALUES(first_name),
      last_name = VALUES(last_name),
      gender = VALUES(gender),
      location = VALUES(location),
      dob = VALUES(dob),
      contact_number = VALUES(contact_number)
  `;

  await connection.query(sql, vars);
}

async function seedUsers(connection) {
  for (const user of USER_RECORDS) {
    await upsertUser(connection, user);
  }
}

async function seedSchoolsAndHierarchy(connection) {
  const schoolIds = [];

  for (let schoolIndex = 0; schoolIndex < SCHOOL_DATA.length; schoolIndex += 1) {
    const school = SCHOOL_DATA[schoolIndex];
    const [schoolResult] = await connection.query(
      `INSERT INTO communities (community_code, name, area)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         area = VALUES(area)`,
      [school.code, school.name, school.area],
    );
    const schoolId = schoolResult.insertId || (await connection.query('SELECT id FROM communities WHERE community_code = ?', [school.code]))[0][0]?.id;
    schoolIds.push(schoolId);

    for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
      const groupCode = `GRP-${schoolIndex + 1}-${groupIndex + 1}`;
      const [groupResult] = await connection.query(
        `INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
         VALUES (?, ?, ?, ?, ?, 'Active')
         ON DUPLICATE KEY UPDATE
           community_id = VALUES(community_id),
           name = VALUES(name),
           leader = VALUES(leader),
           members_count = VALUES(members_count),
           status = VALUES(status)`,
        [groupCode, schoolId, `${school.name} Group ${GROUP_NAMES[groupIndex]}`, `Leader ${GROUP_NAMES[groupIndex]}`, 12],
      );
      const groupId = groupResult.insertId || (await connection.query('SELECT id FROM groups WHERE group_code = ?', [groupCode]))[0][0]?.id;

      for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
        const batchCode = `BAT-${schoolIndex + 1}-${groupIndex + 1}${BATCH_SUFFIX[batchIndex]}`;
        const [batchResult] = await connection.query(
          `INSERT INTO batches (batch_code, community_id, name, records, progress, status)
           VALUES (?, ?, ?, ?, ?, 'Active')
           ON DUPLICATE KEY UPDATE
             community_id = VALUES(community_id),
             name = VALUES(name),
             records = VALUES(records),
             progress = VALUES(progress),
             status = VALUES(status)`,
          [batchCode, schoolId, `${school.name} Batch ${GROUP_NAMES[groupIndex]}-${BATCH_SUFFIX[batchIndex]}`, 10, 70 + ((schoolIndex + groupIndex + batchIndex) * 5)],
        );
        const batchId = batchResult.insertId || (await connection.query('SELECT id FROM batches WHERE batch_code = ?', [batchCode]))[0][0]?.id;

        await connection.query('INSERT IGNORE INTO group_batch (group_id, batch_id) VALUES (?, ?)', [groupId, batchId]);
      }
    }
  }

  return schoolIds;
}

async function seedMothersAndChildren(connection, schoolIds) {
  let motherCounter = 1;
  let motherTotal = 0;
  let childTotal = 0;

  for (let schoolIndex = 0; schoolIndex < schoolIds.length; schoolIndex += 1) {
    const schoolId = schoolIds[schoolIndex];
    const schoolName = SCHOOL_DATA[schoolIndex]?.name || 'Demo School';
    const [groups] = await connection.query('SELECT id, group_code FROM groups WHERE community_id = ? ORDER BY id', [schoolId]);
    const [batches] = await connection.query('SELECT id, batch_code FROM batches WHERE community_id = ? ORDER BY id', [schoolId]);

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
        const batch = batches[groupIndex * 2 + batchIndex];

        for (let motherIndex = 0; motherIndex < 5; motherIndex += 1) {
          const firstName = pick(FIRST_NAMES, motherCounter + motherIndex);
          const lastName = pick(LAST_NAMES, motherCounter + motherIndex + schoolIndex);
          const motherCode = `MTH-${String(schoolIndex + 1).padStart(3, '0')}-${String(groupIndex + 1).padStart(2, '0')}-${String(motherIndex + 1).padStart(2, '0')}`;
          const dob = randomDate(1990 + schoolIndex, 2 + motherIndex, 8 + groupIndex);
          const lmpDate = randomDate(2025, 2 + motherIndex, 3 + batchIndex);
          const eddDate = randomDate(2026, 4 + motherIndex, 7 + groupIndex);
          const isHighRisk = motherIndex % 4 === 0;
          const incomplete = motherIndex === 4 && schoolIndex % 2 === 0;

          const motherFields = [
            'mother_code', 'community_id', 'group_id', 'batch_id', 'first_name', 'middle_name', 'last_name', 'maiden_surname',
            'suffix', 'mother_id_no', 'dob', 'lmp_date', 'edd_date', 'contact_number', 'is_high_risk', 'program_type',
            'emergency_name', 'emergency_contact', 'emergency_relationship', 'spouse_name', 'address', 'prenatal_reg_date',
            'trimester', 'gestational_age', 'prenatal_weight', 'prenatal_bp', 'prenatal_height', 'fundal_height', 'fhr',
            'gravida', 'para', 'abortion', 'stillbirth', 'status', 'visits', 'progress', 'weight', 'height', 'medical_conditions',
            'other_medical_history'
          ];

          const motherValues = [
            motherCode,
            schoolId,
            group.id,
            batch.id,
            firstName,
            incomplete ? null : pick(['Marie', 'Grace', 'Anne', 'Rose', 'Joy'], motherCounter + motherIndex),
            lastName,
            incomplete ? null : pick(['Castillo', 'Bautista', 'Villanueva', 'Mendoza', 'Flores'], motherIndex + schoolIndex),
            motherIndex % 3 === 0 ? 'Jr.' : null,
            `ID-${String(1000 + motherCounter + motherIndex)}`,
            dob,
            lmpDate,
            eddDate,
            `0917${String(1000000 + motherCounter + motherIndex * 13).slice(-7)}`,
            isHighRisk ? 1 : 0,
            isHighRisk ? 'High Risk Maternal Follow-up' : 'Maternal Health Program',
            incomplete ? null : `${pick(['Juan', 'Rico', 'Paolo', 'Samuel'], motherIndex)} ${pick(['Santos', 'Reyes', 'Garcia'], motherIndex + schoolIndex)}`,
            incomplete ? null : `0918${String(2000000 + motherCounter + motherIndex).slice(-7)}`,
            incomplete ? null : pick(['Spouse', 'Brother', 'Father', 'Relative'], motherIndex + schoolIndex),
            incomplete ? null : `${pick(['Juan', 'Renato', 'Pedro', 'Mark'], motherIndex + 1)} ${lastName}`,
            makeAddress(motherCounter + motherIndex),
            randomDate(2025, 1 + motherIndex, 12 + batchIndex),
            motherIndex % 2 === 0 ? '2nd Trimester' : '3rd Trimester',
            22 + motherIndex * 4,
            54 + motherIndex * 2.2,
            ['110/70', '116/78', '120/80', '118/76', '124/82'][motherIndex % 5],
            '156',
            `${18 + motherIndex * 2} cm`,
            `${130 + motherIndex * 4} bpm`,
            1 + (motherIndex % 3),
            motherIndex % 2,
            motherIndex % 7 === 0 ? 1 : 0,
            0,
            'Active',
            3 + motherIndex,
            65 + motherIndex * 7,
            58 + motherIndex * 1.6,
            156 + (motherIndex % 2),
            incomplete ? null : JSON.stringify([
              motherIndex % 2 === 0 ? 'Hypertension' : 'Anemia',
              motherIndex % 3 === 0 ? 'Gestational Diabetes' : 'None',
            ]),
            incomplete ? null : 'No previous surgeries. Follow-up with local clinic every month.'
          ];

          const [result] = await connection.query(
            `INSERT INTO mothers (${motherFields.join(', ')}) VALUES (${motherFields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${motherFields.map((field) => `${field}=VALUES(${field})`).join(', ')}`,
            motherValues,
          );

          const motherId = result.insertId || (await connection.query('SELECT id FROM mothers WHERE mother_code = ?', [motherCode]))[0][0]?.id;
          motherTotal += 1;

          await connection.query(
            `INSERT INTO mother_ob_history (mother_id, event_code, gestational_age, outcome, event_label, seq)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE event_code = VALUES(event_code), gestational_age = VALUES(gestational_age), outcome = VALUES(outcome), event_label = VALUES(event_label), seq = VALUES(seq)`,
            [motherId, 'ANC-1', `${22 + motherIndex} weeks`, 'Completed checkup and counseling', 'Prenatal Visit', 1],
          );

          await connection.query(
            `INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE has_condition = VALUES(has_condition)`,
            [motherId, 'Anemia', isHighRisk ? 1 : 0],
          );

          await connection.query(
            `INSERT INTO mother_dental_records (mother_id, visit_date, dental_facility, dentist_in_charge, community_dentist, dentist_license, dentist_contact, teeth_count, dental_findings, dental_remarks, tartar_removal, filling, cleaning, extraction, root_canal, other_procedure)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               visit_date = VALUES(visit_date),
               dental_facility = VALUES(dental_facility),
               dentist_in_charge = VALUES(dentist_in_charge),
               community_dentist = VALUES(community_dentist),
               dentist_license = VALUES(dentist_license),
               dentist_contact = VALUES(dentist_contact),
               teeth_count = VALUES(teeth_count),
               dental_findings = VALUES(dental_findings),
               dental_remarks = VALUES(dental_remarks),
               tartar_removal = VALUES(tartar_removal),
               filling = VALUES(filling),
               cleaning = VALUES(cleaning),
               extraction = VALUES(extraction),
               root_canal = VALUES(root_canal),
               other_procedure = VALUES(other_procedure)`,
            [motherId, randomDate(2025, 2 + motherIndex, 6), 'RHU Dental Unit', 'Dr. M. Santos', 'Nurse A. Reyes', 'DEN-001', `0919${String(100000 + motherCounter).slice(-7)}`, 28, 'Mild gingivitis observed', 'Return after 3 months for follow-up.', 1, 0, 1, 0, 0, 0],
          );

          await connection.query(
            `INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               vaccine_name = VALUES(vaccine_name),
               vaccine_date = VALUES(vaccine_date),
               remarks = VALUES(remarks)`,
            [motherId, 'TT2', randomDate(2025, 3 + motherIndex, 1), 'Administered during prenatal clinic'],
          );

          const childCount = motherIndex % 2 === 0 ? 2 : 1;
          for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
            const childName = pick(['Noah', 'Mia', 'Liam', 'Sofia', 'Aiden', 'Emma', 'Leo', 'Zara'], motherCounter + childIndex + schoolIndex);
            const childCode = `CHD-${String(schoolIndex + 1).padStart(3, '0')}-${String(motherCounter + motherIndex + 1).padStart(3, '0')}-${childIndex + 1}`;
            const birthDate = randomDate(2025, 2 + childIndex + schoolIndex, 5 + motherIndex);
            const childGender = childIndex % 2 === 0 ? 'Male' : 'Female';
            const haveIncompleteChild = (motherIndex + childIndex + schoolIndex) % 5 === 0;

            const childFields = [
              'child_code', 'mother_id', 'community_id', 'group_id', 'batch_id', 'first_name', 'middle_name', 'last_name', 'suffix',
              'birth_date', 'birth_weight', 'birth_length', 'gender', 'blood_type', 'no_of_child_delivered', 'multiple_birth_type',
              'exclusive_breastfeeding', 'expanded_newborn_screening', 'expanded_newborn_screening_result', 'delivery_type', 'health_status',
              'birth_place', 'birth_attendant', 'apgar_score', 'feeding_type', 'nutrition_notes', 'father_name', 'relationship', 'address', 'progress'
            ];

            const childValues = [
              childCode,
              motherId,
              schoolId,
              group.id,
              batch.id,
              childName,
              haveIncompleteChild ? null : pick(['Marie', 'Grace', 'Sofia'], childIndex + motherIndex),
              lastName,
              childIndex % 2 === 0 ? 'Jr.' : null,
              birthDate,
              2.8 + (motherIndex % 3) * 0.4,
              48 + (childIndex + schoolIndex) % 4,
              childGender,
              pick(['A+', 'O+', 'B+', 'AB+'], motherCounter + childIndex),
              childCount,
              childIndex > 0 && childCount > 1 ? 'Twin' : null,
              childIndex % 2 === 0 ? 'Exclusive Breastfeeding' : 'Complementary Feeding',
              haveIncompleteChild ? null : 'Hearing test normal; CBC within range.',
              haveIncompleteChild ? null : 'No critical concern after newborn screening.',
              pick(['Vaginal Delivery', 'Cesarean Section'], motherIndex + childIndex),
              haveIncompleteChild ? 'Needs follow-up' : 'Healthy',
              haveIncompleteChild ? null : `${schoolName} Birthing Center`,
              haveIncompleteChild ? null : `Dr. ${pick(['Reyes', 'Lim', 'Aguinaldo', 'Santos'], schoolIndex + childIndex)}`,
              haveIncompleteChild ? null : `${8 + childIndex}/${9 + childIndex}`,
              haveIncompleteChild ? null : (childIndex % 2 === 0 ? 'Breastfeeding' : 'Mixed Feeding'),
              haveIncompleteChild ? null : 'Consumes nutritious porridge and vegetables with good appetite.',
              haveIncompleteChild ? null : `${pick(['Rico', 'Marco', 'Samuel', 'Leonard'], childIndex + motherIndex)} ${pick(['Reyes', 'Flores', 'Garcia'], childIndex + motherIndex)}`,
              haveIncompleteChild ? null : pick(['Father', 'Guardian'], childIndex + motherIndex),
              haveIncompleteChild ? null : makeAddress(motherCounter + motherIndex + childIndex),
              72 + (motherIndex + childIndex * 8),
            ];

            const [childResult] = await connection.query(
              `INSERT INTO children (${childFields.join(', ')}) VALUES (${childFields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${childFields.map((field) => `${field}=VALUES(${field})`).join(', ')}`,
              childValues,
            );

            const childId = childResult.insertId || (await connection.query('SELECT id FROM children WHERE child_code = ?', [childCode]))[0][0]?.id;
            childTotal += 1;

            await connection.query(
              `INSERT INTO child_medical_conditions (child_id, condition_name, has_condition)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE has_condition = VALUES(has_condition)`,
              [childId, 'Fever', childIndex % 3 === 0 ? 1 : 0],
            );

            await connection.query(
              `INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 vaccine_name = VALUES(vaccine_name),
                 vaccine_date = VALUES(vaccine_date),
                 remarks = VALUES(remarks)`,
              [childId, 'BCG', birthDate, 'Given at clinic follow-up'],
            );

            await connection.query(
              `INSERT INTO child_checkups (child_id, week_number, next_checkup_date, visit_date, weight, height, head_circumference, developmental_status, service_provider, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 week_number = VALUES(week_number),
                 next_checkup_date = VALUES(next_checkup_date),
                 visit_date = VALUES(visit_date),
                 weight = VALUES(weight),
                 height = VALUES(height),
                 head_circumference = VALUES(head_circumference),
                 developmental_status = VALUES(developmental_status),
                 service_provider = VALUES(service_provider),
                 notes = VALUES(notes)`,
              [childId, 4 + childIndex, randomDate(2026, 2 + childIndex, 8), randomDate(2026, 1 + childIndex, 5), 3.2 + childIndex * 0.5, 52 + childIndex, 35 + childIndex, 'Normal', 'Nurse A. Reyes', 'Follow-up session normal and on target.'],
            );
          }

          motherCounter += 1;
        }
      }
    }
  }

  return { mothers: motherTotal, children: childTotal };
}

async function seedPrograms(connection) {
  const programs = [
    { name: 'Maternal Health Program', type: 'Nutrition', provider: 'Municipal Health Office', beneficiary_type: 'Mother', status: 'Active', target: 200, received: 176, activities: 14, latest: '2026-09-01', ended: null },
    { name: 'Child Nutrition Enhancement', type: 'Nutrition', provider: 'Provincial Nutrition Unit', beneficiary_type: 'Child', status: 'Active', target: 180, received: 162, activities: 12, latest: '2026-08-30', ended: null },
    { name: 'Community Family Support Program', type: 'Support', provider: 'Local Government Unit', beneficiary_type: 'Mother and Child', status: 'Active', target: 260, received: 219, activities: 18, latest: '2026-09-06', ended: null },
    { name: 'Preventive Care Campaign', type: 'Health', provider: 'RHU Clinic', beneficiary_type: 'Mother and Child', status: 'Active', target: 210, received: 188, activities: 10, latest: '2026-07-28', ended: null },
    { name: 'Micronutrient Supplement Drive', type: 'Health', provider: 'Department of Health', beneficiary_type: 'Child', status: 'Active', target: 150, received: 128, activities: 9, latest: '2026-08-12', ended: null },
    { name: 'Postnatal Recovery Support', type: 'Support', provider: 'Maternal Care Unit', beneficiary_type: 'Mother', status: 'Paused', target: 100, received: 61, activities: 8, latest: '2026-06-20', ended: '2026-08-20' },
  ];

  const programIds = [];
  for (const program of programs) {
    const [result] = await connection.query(
      `INSERT INTO programs (name, type, provider, description, beneficiary_type, status, target, received, activities, latest, ended)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         type = VALUES(type),
         provider = VALUES(provider),
         description = VALUES(description),
         beneficiary_type = VALUES(beneficiary_type),
         status = VALUES(status),
         target = VALUES(target),
         received = VALUES(received),
         activities = VALUES(activities),
         latest = VALUES(latest),
         ended = VALUES(ended)`,
      [program.name, program.type, program.provider, `${program.name} is implemented for ${program.beneficiary_type.toLowerCase()} participants across all school communities.`, program.beneficiary_type, program.status, program.target, program.received, program.activities, program.latest, program.ended],
    );
    const programId = result.insertId || (await connection.query('SELECT id FROM programs WHERE name = ?', [program.name]))[0][0]?.id;
    programIds.push(programId);

    for (let clusterIndex = 0; clusterIndex < 3; clusterIndex += 1) {
      await connection.query(
        `INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE beneficiaries = VALUES(beneficiaries), received = VALUES(received)`,
        [programId, clusterIndex % 2 === 0 ? 'School' : 'Community', `${clusterIndex + 1}`, 30 + clusterIndex * 12, 24 + clusterIndex * 10],
      );
    }
  }

  return programIds;
}

async function seedMonitoringLogs(connection, programIds) {
  const [mothers] = await connection.query('SELECT id, mother_code FROM mothers ORDER BY id');
  const [children] = await connection.query('SELECT id, child_code FROM children ORDER BY id');

  let logCounter = 0;
  for (const programId of programIds) {
    for (let index = 0; index < 8; index += 1) {
      const mother = mothers[(logCounter + index) % mothers.length];
      const child = children[(logCounter + index * 2) % children.length];
      const monitored = index % 2 === 0;
      const monitoredDate = randomDate(2026, (index % 4) + 1, (index % 9) + 1);

      await connection.query(
        `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_date = VALUES(monitored_date), monitored_by = VALUES(monitored_by), notes = VALUES(notes)`,
        [mother.mother_code, 'Mother', programId, monitored, monitoredDate, (index % 6) + 1, monitored ? 'Follow-up completed and caregiver informed.' : 'Awaiting follow-up and attendance confirmation.'],
      );

      await connection.query(
        `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_date = VALUES(monitored_date), monitored_by = VALUES(monitored_by), notes = VALUES(notes)`,
        [child.child_code, 'Child', programId, !monitored, randomDate(2026, (index % 5) + 2, (index % 7) + 2), (index % 5) + 1, !monitored ? 'Received checkup with nutrition assessment.' : 'Pending caregiver confirmation.'],
      );
      logCounter += 1;
    }
  }
}

async function main() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await seedUsers(connection);
    const schoolIds = await seedSchoolsAndHierarchy(connection);
    const stats = await seedMothersAndChildren(connection, schoolIds);
    const programIds = await seedPrograms(connection);
    await seedMonitoringLogs(connection, programIds);
    await connection.commit();

    const [communityCount] = await connection.query('SELECT COUNT(*) AS count FROM communities');
    const [userCount] = await connection.query('SELECT COUNT(*) AS count FROM users');
    const [motherCount] = await connection.query('SELECT COUNT(*) AS count FROM mothers');
    const [childCount] = await connection.query('SELECT COUNT(*) AS count FROM children');
    const [programCount] = await connection.query('SELECT COUNT(*) AS count FROM programs');
    const [logCount] = await connection.query('SELECT COUNT(*) AS count FROM monitoring_logs');

    console.log('Seed complete.');
    console.log(JSON.stringify({
      users: userCount[0].count,
      communities: communityCount[0].count,
      mothers: motherCount[0].count,
      children: childCount[0].count,
      programs: programCount[0].count,
      monitoringLogs: logCount[0].count,
      insertedStats: stats,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    console.error('Sample data seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
