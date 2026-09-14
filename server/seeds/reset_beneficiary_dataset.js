const mysql = require('mysql2/promise');
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

const firstNames = ['Ariana', 'Bea', 'Carmen', 'Diana', 'Elena', 'Faith', 'Gina', 'Hannah', 'Iris', 'Janelle', 'Katrina', 'Liza', 'Mira', 'Nina', 'Olive', 'Patricia', 'Rhea', 'Sofia', 'Tessa', 'Vanessa'];
const lastNames = ['Santos', 'Reyes', 'Garcia', 'Mendoza', 'Cruz', 'Flores', 'Navarro', 'Ramos', 'Torres', 'Bautista', 'Lim', 'Aquino', 'De Leon', 'Villanueva'];
const childNames = ['Noah', 'Mia', 'Liam', 'Sofia', 'Aiden', 'Emma', 'Leo', 'Zara', 'Kai', 'Elijah', 'Ava', 'Rafael', 'Mika', 'Yani', 'Luna'];

const pick = (list, index) => list[index % list.length];

const randomDate = (year, monthOffset, dayOffset) => {
  const d = new Date(year, 0, 1);
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
};

const makeAddress = (index) => `${index + 1} ${pick(['Purok 1', 'Purok 2', 'Barangay San Jose', 'Sitio Mahogany', 'Zone 4', 'Barangay Pag-asa'], index)}, ${pick(['Poblacion', 'Bahayang', 'Lusong', 'Bayan'], index + 2)}`;

function getMotherProfileState(index) {
  const isComplete = index % 3 !== 0 || index < 3;
  return {
    isComplete,
    documentsComplete: isComplete,
    riskStatus: isComplete ? 'High Risk Maternal Follow-up' : 'Maternal Health Program',
    emergencyName: isComplete ? `${pick(['Juan', 'Rico', 'Paolo', 'Samuel'], index)} ${pick(['Santos', 'Reyes', 'Garcia'], index + 2)}` : null,
    emergencyContact: isComplete ? `0918${String(2000000 + index * 41).slice(-7)}` : null,
    emergencyRelationship: isComplete ? pick(['Spouse', 'Brother', 'Father'], index + 3) : null,
    spouseName: isComplete ? `${pick(['Juan', 'Renato', 'Pedro', 'Mark'], index + 1)} ${pick(lastNames, index + 1)}` : null,
    address: isComplete ? makeAddress(index) : null,
    prenatalWeight: isComplete ? 54 + (index % 5) * 2.5 : null,
    prenatalBp: isComplete ? ['110/70', '116/78', '120/80', '118/76'][index % 4] : null,
    prenatalHeight: isComplete ? '156' : null,
    fundalHeight: isComplete ? `${18 + (index % 6) * 2} cm` : null,
    fhr: isComplete ? `${130 + (index % 5) * 4} bpm` : null,
    medicalConditions: isComplete ? JSON.stringify(['Hypertension', 'Anemia']) : null,
    otherMedicalHistory: isComplete ? 'No previous surgeries. Follow-up with local clinic every month.' : null,
  };
}

function getChildProfileState(index) {
  const isComplete = index % 3 !== 0 || index < 2;
  return {
    isComplete,
    birthDocument: isComplete ? '/uploads/child-complete.pdf' : null,
    birthWeight: isComplete ? 2.8 + (index % 4) * 0.4 : null,
    birthLength: isComplete ? 48 + (index % 5) : null,
    bloodType: isComplete ? pick(['A+', 'O+', 'B+', 'AB+'], index + 1) : null,
    exclusiveBreastfeeding: isComplete ? 'Exclusive Breastfeeding' : null,
    expandedNewbornScreening: isComplete ? 'Hearing test normal; CBC within range.' : null,
    expandedNewbornScreeningResult: isComplete ? 'No critical concern after newborn screening.' : null,
    deliveryType: isComplete ? pick(['Vaginal Delivery', 'Cesarean Section'], index + 2) : null,
    healthStatus: isComplete ? 'Healthy' : null,
    birthPlace: isComplete ? 'Community Birthing Center' : null,
    birthAttendant: isComplete ? `Dr. ${pick(['Reyes', 'Lim', 'Aguinaldo', 'Santos'], index + 3)}` : null,
    apgarScore: isComplete ? `${8 + (index % 3)}/${9 + (index % 3)}` : null,
    feedingType: isComplete ? 'Breastfeeding' : null,
    nutritionNotes: isComplete ? 'Consumes nutritious porridge and vegetables with good appetite.' : null,
    fatherName: isComplete ? `${pick(['Rico', 'Marco', 'Samuel', 'Leonard'], index + 2)} ${pick(['Reyes', 'Flores', 'Garcia'], index + 4)}` : null,
    relationship: isComplete ? pick(['Father', 'Guardian'], index + 4) : null,
    address: isComplete ? makeAddress(index + 20) : null,
    progress: isComplete ? 82 + (index % 6) * 3 : 20 + (index % 4) * 6,
  };
}

async function clearBeneficiaries(connection) {
  await connection.query('DELETE FROM monitoring_logs');
  await connection.query('DELETE FROM mother_checkups');
  await connection.query('DELETE FROM child_checkups');
  await connection.query('DELETE FROM mother_ob_history');
  await connection.query('DELETE FROM mother_medical_conditions');
  await connection.query('DELETE FROM mother_dental_records');
  await connection.query('DELETE FROM mother_vaccinations');
  await connection.query('DELETE FROM child_medical_conditions');
  await connection.query('DELETE FROM child_vaccinations');
  await connection.query('DELETE FROM children');
  await connection.query('DELETE FROM mothers');
}

async function getHierarchy(connection) {
  const [communities] = await connection.query('SELECT id, name FROM communities ORDER BY id');
  const [groups] = await connection.query('SELECT id, community_id, name FROM groups ORDER BY id');
  const [batches] = await connection.query('SELECT id, community_id, name FROM batches ORDER BY id');
  return { communities, groups, batches };
}

function getAssignments(index, groups, batches) {
  const selectedGroup = groups[index % groups.length] || groups[0];
  const selectedBatch = batches[(index + 1) % batches.length] || batches[0];
  return {
    community_id: selectedGroup.community_id,
    group_id: selectedGroup.id,
    batch_id: selectedBatch.id,
  };
}

async function insertMother(connection, index, assignments, motherSequence) {
  const profileState = getMotherProfileState(index);
  const completeProfile = profileState.isComplete;
  const firstName = pick(firstNames, index);
  const lastName = pick(lastNames, index + 2);
  const motherCode = `MTH-${String(motherSequence).padStart(3, '0')}`;
  const dob = randomDate(1988 + (index % 5), 2 + index, 6 + (index % 7));
  const lmpDate = randomDate(2025, 1 + (index % 5), 6 + (index % 9));
  const eddDate = randomDate(2026, 3 + (index % 4), 8 + (index % 8));

  const birthCertificatePath = completeProfile ? `/uploads/mother-${motherCode}.pdf` : null;
  const consentPath = completeProfile ? `/uploads/consent-${motherCode}.pdf` : null;

  const motherValues = [
    motherCode,
    assignments.community_id,
    assignments.group_id,
    assignments.batch_id,
    firstName,
    completeProfile ? pick(['Marie', 'Grace', 'Anne', 'Rose'], index) : null,
    lastName,
    completeProfile ? pick(['Castillo', 'Bautista', 'Villanueva', 'Mendoza'], index + 1) : null,
    completeProfile && index % 2 === 0 ? 'Jr.' : null,
    `ID-${1000 + index}`,
    dob,
    lmpDate,
    eddDate,
    `0917${String(1000000 + index * 37).slice(-7)}`,
    index % 4 === 0 ? 1 : 0,
    profileState.riskStatus,
    profileState.emergencyName,
    profileState.emergencyContact,
    profileState.emergencyRelationship,
    profileState.spouseName,
    profileState.address,
    randomDate(2025, 1 + (index % 4), 10 + (index % 6)),
    index % 2 === 0 ? '2nd Trimester' : '3rd Trimester',
    22 + (index % 6) * 4,
    profileState.prenatalWeight,
    profileState.prenatalBp,
    profileState.prenatalHeight,
    profileState.fundalHeight,
    profileState.fhr,
    1 + (index % 3),
    index % 2,
    index % 5 === 0 ? 1 : 0,
    0,
    'Active',
    3 + (index % 4),
    completeProfile ? 90 + (index % 5) * 5 : 42 + (index % 4) * 8,
    completeProfile ? 58 + (index % 5) * 1.6 : null,
    completeProfile ? 156 + (index % 2) : null,
    profileState.medicalConditions,
    profileState.otherMedicalHistory,
    birthCertificatePath,
    consentPath,
  ];

  const fields = [
    'mother_code', 'community_id', 'group_id', 'batch_id', 'first_name', 'middle_name', 'last_name', 'maiden_surname',
    'suffix', 'mother_id_no', 'dob', 'lmp_date', 'edd_date', 'contact_number', 'is_high_risk', 'program_type',
    'emergency_name', 'emergency_contact', 'emergency_relationship', 'spouse_name', 'address', 'prenatal_reg_date',
    'trimester', 'gestational_age', 'prenatal_weight', 'prenatal_bp', 'prenatal_height', 'fundal_height', 'fhr',
    'gravida', 'para', 'abortion', 'stillbirth', 'status', 'visits', 'progress', 'weight', 'height', 'medical_conditions', 'other_medical_history',
    'birth_certificate_document_path', 'consent_document_path'
  ];

  const [result] = await connection.query(
    `INSERT INTO mothers (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    motherValues,
  );

  const motherId = result.insertId;

  if (completeProfile) {
    await connection.query(
      `INSERT INTO mother_ob_history (mother_id, event_code, gestational_age, outcome, event_label, seq) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE event_code = VALUES(event_code), gestational_age = VALUES(gestational_age), outcome = VALUES(outcome), event_label = VALUES(event_label), seq = VALUES(seq)`,
      [motherId, 'ANC-1', `${22 + (index % 6)} weeks`, 'Completed checkup and counseling', 'Prenatal Visit', 1],
    );
  }

  await connection.query(
    `INSERT INTO mother_medical_conditions (mother_id, condition_name, has_condition) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE has_condition = VALUES(has_condition)`,
    [motherId, 'Anemia', completeProfile ? 1 : 0],
  );

  if (completeProfile) {
    await connection.query(
      `INSERT INTO mother_dental_records (mother_id, visit_date, dental_facility, dentist_in_charge, community_dentist, dentist_license, dentist_contact, teeth_count, dental_findings, dental_remarks, tartar_removal, filling, cleaning, extraction, root_canal, other_procedure)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE visit_date = VALUES(visit_date), dental_facility = VALUES(dental_facility), dentist_in_charge = VALUES(dentist_in_charge), community_dentist = VALUES(community_dentist), dentist_license = VALUES(dentist_license), dentist_contact = VALUES(dentist_contact), teeth_count = VALUES(teeth_count), dental_findings = VALUES(dental_findings), dental_remarks = VALUES(dental_remarks), tartar_removal = VALUES(tartar_removal), filling = VALUES(filling), cleaning = VALUES(cleaning), extraction = VALUES(extraction), root_canal = VALUES(root_canal), other_procedure = VALUES(other_procedure)`,
      [motherId, randomDate(2025, 2 + (index % 4), 6), 'RHU Dental Unit', 'Dr. M. Santos', 'Nurse A. Reyes', 'DEN-001', `0919${String(100000 + index).slice(-7)}`, 28, 'Mild gingivitis observed', 'Return after 3 months for follow-up.', 1, 0, 1, 0, 0, 0],
    );
  }

  await connection.query(
    `INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE vaccine_name = VALUES(vaccine_name), vaccine_date = VALUES(vaccine_date), remarks = VALUES(remarks)`,
    [motherId, 'TT2', randomDate(2025, 3 + (index % 5), 1), completeProfile ? 'Administered during prenatal clinic' : 'Pending schedule'],
  );

  return motherId;
}

async function insertChild(connection, motherId, index, schoolName, assignments, childSequence) {
  const profileState = getChildProfileState(index);
  const completeProfile = profileState.isComplete;
  const childCode = `CHD-${String(childSequence).padStart(3, '0')}`;
  const birthDate = randomDate(2025, 1 + (index % 4), 5 + (index % 9));
  const firstName = pick(childNames, index + motherId);
  const lastName = pick(lastNames, index + motherId + 4);

  const birthDocumentPath = completeProfile ? `/uploads/child-${childCode}.pdf` : null;

  const values = [
    childCode,
    motherId,
    assignments.community_id,
    assignments.group_id,
    assignments.batch_id,
    firstName,
    completeProfile ? pick(['Marie', 'Grace', 'Sofia'], index) : null,
    lastName,
    completeProfile && index % 2 === 0 ? 'Jr.' : null,
    birthDate,
    profileState.birthWeight,
    profileState.birthLength,
    index % 2 === 0 ? 'Male' : 'Female',
    profileState.bloodType,
    1,
    null,
    profileState.exclusiveBreastfeeding,
    profileState.expandedNewbornScreening,
    profileState.expandedNewbornScreeningResult,
    profileState.deliveryType,
    profileState.healthStatus,
    profileState.birthPlace,
    profileState.birthAttendant,
    profileState.apgarScore,
    profileState.feedingType,
    profileState.nutritionNotes,
    profileState.fatherName,
    profileState.relationship,
    profileState.address,
    profileState.progress,
    birthDocumentPath,
  ];

  const fields = [
    'child_code', 'mother_id', 'community_id', 'group_id', 'batch_id', 'first_name', 'middle_name', 'last_name', 'suffix',
    'birth_date', 'birth_weight', 'birth_length', 'gender', 'blood_type', 'no_of_child_delivered', 'multiple_birth_type',
    'exclusive_breastfeeding', 'expanded_newborn_screening', 'expanded_newborn_screening_result', 'delivery_type', 'health_status',
    'birth_place', 'birth_attendant', 'apgar_score', 'feeding_type', 'nutrition_notes', 'father_name', 'relationship', 'address', 'progress',
    'birth_document_path'
  ];

  const [result] = await connection.query(
    `INSERT INTO children (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    values,
  );

  const childId = result.insertId;

  if (completeProfile) {
    await connection.query(
      `INSERT INTO child_vaccinations (child_id, vaccine_name, vaccine_date, remarks)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE vaccine_name = VALUES(vaccine_name), vaccine_date = VALUES(vaccine_date), remarks = VALUES(remarks)`,
      [childId, 'BCG', birthDate, 'Given at clinic follow-up'],
    );
  }

  if (completeProfile) {
    await connection.query(
      `INSERT INTO child_checkups (child_id, week_number, next_checkup_date, visit_date, weight, height, head_circumference, developmental_status, service_provider, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE week_number = VALUES(week_number), next_checkup_date = VALUES(next_checkup_date), visit_date = VALUES(visit_date), weight = VALUES(weight), height = VALUES(height), head_circumference = VALUES(head_circumference), developmental_status = VALUES(developmental_status), service_provider = VALUES(service_provider), notes = VALUES(notes)`,
      [childId, 4, randomDate(2026, 1, 15), randomDate(2026, 1, 10), 3.6, 53.0, 35.6, 'Normal', 'Nurse A. Reyes', 'Follow-up session normal and on target.'],
    );
  }

  return childId;
}

async function seedMonitoring(connection, motherIds, childIds) {
  const [programs] = await connection.query('SELECT id FROM programs ORDER BY id LIMIT 3');
  const programIds = programs.map((row) => row.id);

  for (let i = 0; i < motherIds.length; i += 1) {
    const motherId = motherIds[i];
    const completedCheckups = i < 6 ? 9 : (i < 12 ? 3 : 1);
    for (let checkupNumber = 1; checkupNumber <= completedCheckups; checkupNumber += 1) {
      const trimester = checkupNumber === 1 ? '1st Trimester' : checkupNumber === 2 ? '2nd Trimester' : '3rd Trimester';
      await connection.query(
        `INSERT INTO mother_checkups (
          mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks, blood_pressure, weight_kg, height_cm, bmi,
          nutritional_status, fundal_height_cm, fetal_heart_rate_bpm, service_provider, next_checkup_date,
          referred_to_hospital, lab_assistance_provided, assistance_amount, source_of_funds, facility_type,
          milk_subsidy_date, milk_quantity_pcs, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          checkup_date = VALUES(checkup_date), gestational_age_weeks = VALUES(gestational_age_weeks), blood_pressure = VALUES(blood_pressure),
          weight_kg = VALUES(weight_kg), height_cm = VALUES(height_cm), bmi = VALUES(bmi), nutritional_status = VALUES(nutritional_status),
          fundal_height_cm = VALUES(fundal_height_cm), fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm), service_provider = VALUES(service_provider),
          next_checkup_date = VALUES(next_checkup_date), referred_to_hospital = VALUES(referred_to_hospital), lab_assistance_provided = VALUES(lab_assistance_provided),
          assistance_amount = VALUES(assistance_amount), source_of_funds = VALUES(source_of_funds), facility_type = VALUES(facility_type),
          milk_subsidy_date = VALUES(milk_subsidy_date), milk_quantity_pcs = VALUES(milk_quantity_pcs), remarks = VALUES(remarks)`,
        [
          motherId, trimester, checkupNumber, randomDate(2025, 1 + checkupNumber, 10), 18 + checkupNumber * 8,
          '110/70', 54 + checkupNumber, 156, 22.1, 'Normal', 18 + checkupNumber * 2, 136, 'Nurse A. Reyes',
          randomDate(2026, 2 + checkupNumber, 6), false, false, null, null, null, null, null, 'Routine monitoring completed.'
        ],
      );
    }
  }

  for (let i = 0; i < childIds.length; i += 1) {
    const childId = childIds[i];
    const completedWeeks = i < 5 ? [4, 8, 12, 16, 20, 24] : (i < 10 ? [4, 8, 12] : [4]);
    for (const weekNumber of completedWeeks) {
      await connection.query(
        `INSERT INTO child_checkups (child_id, week_number, next_checkup_date, visit_date, weight, height, head_circumference, developmental_status, service_provider, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE week_number = VALUES(week_number), next_checkup_date = VALUES(next_checkup_date), visit_date = VALUES(visit_date), weight = VALUES(weight), height = VALUES(height), head_circumference = VALUES(head_circumference), developmental_status = VALUES(developmental_status), service_provider = VALUES(service_provider), notes = VALUES(notes)`,
        [childId, weekNumber, randomDate(2026, 1 + weekNumber, 8), randomDate(2026, 1 + weekNumber, 3), 3.5 + weekNumber * 0.2, 52 + weekNumber * 0.7, 35 + weekNumber * 0.2, 'Normal', 'Nurse A. Reyes', 'Assessment completed and caregiver informed.'],
      );
    }
  }

  for (const programId of programIds) {
    const logTemplate = [
      { beneficiaryType: 'Mother', monitored: true, date: '2026-09-12', notes: 'Follow-up completed and caregiver informed.' },
      { beneficiaryType: 'Mother', monitored: false, date: '2026-09-14', notes: 'Awaiting follow-up and attendance confirmation.' },
      { beneficiaryType: 'Child', monitored: true, date: '2026-09-08', notes: 'Received checkup with nutrition assessment.' },
      { beneficiaryType: 'Child', monitored: false, date: '2026-09-10', notes: 'Pending caregiver confirmation.' },
    ];

    for (const [index, item] of logTemplate.entries()) {
      const beneficiaryId = item.beneficiaryType === 'Mother' ? motherIds[index % motherIds.length] : childIds[index % childIds.length];
      const beneficiaryCode = item.beneficiaryType === 'Mother'
        ? (await connection.query('SELECT mother_code FROM mothers WHERE id = ?', [beneficiaryId]))[0][0]?.mother_code
        : (await connection.query('SELECT child_code FROM children WHERE id = ?', [beneficiaryId]))[0][0]?.child_code;

      await connection.query(
        `INSERT INTO monitoring_logs (beneficiary_id, beneficiary_type, program_id, monitored, monitored_date, monitored_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE monitored = VALUES(monitored), monitored_date = VALUES(monitored_date), monitored_by = VALUES(monitored_by), notes = VALUES(notes)`,
        [beneficiaryCode, item.beneficiaryType, programId, item.monitored, item.date, 1 + (index % 5), item.notes],
      );
    }
  }
}

async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await clearBeneficiaries(connection);
    const { groups, batches } = await getHierarchy(connection);
    const motherIds = [];
    const childIds = [];
    let motherSequence = 1;
    let childSequence = 1;

    for (let i = 0; i < 18; i += 1) {
      const assignments = getAssignments(i, groups, batches);
      const motherId = await insertMother(connection, i, assignments, motherSequence);
      motherIds.push(motherId);
      motherSequence += 1;

      const hasChild = i % 2 === 0 || i % 5 === 0;
      if (hasChild) {
        const childCount = i % 3 === 0 ? 2 : 1;
        for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
          const schoolName = (await connection.query('SELECT name FROM communities WHERE id = ?', [assignments.community_id]))[0][0]?.name || 'Community School';
          const childId = await insertChild(connection, motherId, i + childIndex, schoolName, assignments, childSequence);
          childIds.push(childId);
          childSequence += 1;
        }
      }
    }

    await seedMonitoring(connection, motherIds, childIds);
    await connection.commit();

    const [motherCount] = await connection.query('SELECT COUNT(*) AS count FROM mothers');
    const [childCount] = await connection.query('SELECT COUNT(*) AS count FROM children');
    const [monitorCount] = await connection.query('SELECT COUNT(*) AS count FROM monitoring_logs');
    const [motherCheckupCount] = await connection.query('SELECT COUNT(*) AS count FROM mother_checkups');
    const [childCheckupCount] = await connection.query('SELECT COUNT(*) AS count FROM child_checkups');

    console.log(JSON.stringify({
      mothers: motherCount[0].count,
      children: childCount[0].count,
      monitoringLogs: monitorCount[0].count,
      motherCheckups: motherCheckupCount[0].count,
      childCheckups: childCheckupCount[0].count,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    console.error('Reset and rebuild failed:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
