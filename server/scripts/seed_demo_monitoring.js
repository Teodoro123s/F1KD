require('dotenv').config();

const mysql = require('mysql2/promise');
const { motherMonitoringTotalSql } = require('../utils/motherMonitoring');

const databaseName = process.env.DB_NAME || 'f1kd';
const databaseHost = String(process.env.DB_HOST || '127.0.0.1').trim().toLowerCase();
const dryRun = process.argv.includes('--dry-run');
const schoolArg = process.argv.find((argument) => argument.startsWith('--school-id='));
const requestedSchoolId = schoolArg ? Number(schoolArg.slice('--school-id='.length)) : null;
const addSchoolsArg = process.argv.find((argument) => argument.startsWith('--add-schools='));
const requestedAddSchools = addSchoolsArg ? Number(addSchoolsArg.slice('--add-schools='.length)) : null;
const allowedLocalHosts = new Set(['127.0.0.1', 'localhost', '::1', 'db', 'mysql']);

if (!allowedLocalHosts.has(databaseHost) || databaseName.toLowerCase() !== 'f1kd') {
  throw new Error('Demo seeding is restricted to the local f1kd database.');
}
if (requestedSchoolId !== null && (!Number.isSafeInteger(requestedSchoolId) || requestedSchoolId < 1)) {
  throw new Error('--school-id must be a positive integer.');
}
if (requestedAddSchools !== null && requestedAddSchools !== 4) {
  throw new Error('--add-schools currently supports exactly 4 additional demo schools.');
}
if (requestedSchoolId !== null && requestedAddSchools !== null) {
  throw new Error('Use either --school-id or --add-schools, not both.');
}

const pool = mysql.createPool({
  host: databaseHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 2,
});

const now = new Date();
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const currentMonth = monthStart.toISOString().slice(0, 7);
const stamp = currentMonth.replace('-', '');
const currentDay = Math.min(now.getUTCDate(), 20);
const futureDay = now.getUTCDate() < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  ? now.getUTCDate() + 1
  : now.getUTCDate();
const maternalSteps = [
  { trimester: '1st Trimester', number: 1 },
  { trimester: '1st Trimester', number: 2 },
  { trimester: '1st Trimester', number: 3 },
  { trimester: '2nd Trimester', number: 1 },
  { trimester: '2nd Trimester', number: 2 },
  { trimester: '2nd Trimester', number: 3 },
  { trimester: '3rd Trimester', number: 1 },
  { trimester: '3rd Trimester', number: 2 },
  { trimester: '3rd Trimester', number: 3 },
];

function dateAtMonthOffset(monthOffset, day) {
  const monthDate = new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth() + monthOffset,
    1,
  ));
  const lastDay = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth(),
    Math.min(day, lastDay),
  ));
}

function dateText(date) {
  return date.toISOString().slice(0, 10);
}

function addMonthsPreservingDay(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return dateText(new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth(),
    Math.min(date.getUTCDate(), lastDay),
  )));
}

function maternalVisit(slot, monthOffset, day, options = {}) {
  const checkupDate = dateText(dateAtMonthOffset(monthOffset, day));
  const step = maternalSteps[slot];
  return {
    ...step,
    checkupDate,
    nextCheckupDate: slot === maternalSteps.length - 1
      ? null
      : options.nextCheckupDate || addMonthsPreservingDay(checkupDate, 1),
    gestationalAgeWeeks: options.gestationalAgeWeeks ?? null,
    bloodPressure: options.bloodPressure === undefined ? '120/80' : options.bloodPressure,
    weight: options.weight === undefined ? 58 + slot * 0.4 : options.weight,
    height: options.height === undefined ? 155 + (slot % 4) : options.height,
    bmi: options.bmi === undefined ? 23.8 : options.bmi,
    nutritionalStatus: options.nutritionalStatus || 'Normal',
    remarks: 'Synthetic demo monitoring record.',
  };
}

const motherTemplates = [
  { gestationalAge: 0, trimester: '1st Trimester', registrationOffset: 0, registrationDay: 5, visits: [] },
  { gestationalAge: 0, trimester: '1st Trimester', registrationOffset: -1, registrationDay: 5, visits: [maternalVisit(0, -1, 5)] },
  {
    gestationalAge: 16, trimester: '2nd Trimester', registrationOffset: -1, registrationDay: 7,
    visits: [
      maternalVisit(3, -1, 7),
      maternalVisit(4, 0, 7, { bloodPressure: null }),
    ],
  },
  {
    gestationalAge: 28, trimester: '3rd Trimester', registrationOffset: -2, registrationDay: 10,
    visits: [maternalVisit(6, -2, 10), maternalVisit(7, -1, 10)],
  },
  {
    gestationalAge: 0, trimester: '1st Trimester', registrationOffset: -1, registrationDay: 20,
    visits: [
      maternalVisit(0, -1, 20),
      maternalVisit(1, 0, futureDay, { nextCheckupDate: null }),
    ],
  },
  {
    gestationalAge: 16, trimester: '2nd Trimester', registrationOffset: -2, registrationDay: 1,
    visits: [maternalVisit(3, -2, 1), maternalVisit(4, -1, 1), maternalVisit(5, 0, currentDay)],
  },
  { gestationalAge: null, trimester: null, registrationOffset: null, registrationDay: null, visits: [] },
  {
    gestationalAge: 0, trimester: '1st Trimester', registrationOffset: 0, registrationDay: 10,
    visits: [maternalVisit(0, 0, 10)],
  },
  {
    gestationalAge: 0, trimester: '1st Trimester', registrationOffset: -2, registrationDay: 24,
    visits: [maternalVisit(0, -2, 24), maternalVisit(1, -1, 24), maternalVisit(2, 0, currentDay)],
  },
  {
    gestationalAge: 0, trimester: '1st Trimester', registrationOffset: -1, registrationDay: 15,
    visits: [
      maternalVisit(0, -1, 15, { nextCheckupDate: dateText(dateAtMonthOffset(0, 18)) }),
      maternalVisit(1, 0, currentDay, { weight: null }),
    ],
  },
  {
    gestationalAge: 20, trimester: '2nd Trimester', registrationOffset: -4, registrationDay: 20,
    visits: [
      maternalVisit(4, -4, 20),
      maternalVisit(5, -3, 20),
      maternalVisit(6, -2, 20),
      maternalVisit(7, -1, 20),
    ],
  },
  {
    gestationalAge: 28, trimester: '3rd Trimester', registrationOffset: -1, registrationDay: 1,
    visits: [
      maternalVisit(6, -1, 1),
      maternalVisit(7, 0, currentDay, { height: null }),
    ],
  },
];

function childVisit(childId, monthNumber, visitDate, options = {}) {
  return {
    childId,
    monthNumber,
    visitDate,
    nextCheckupDate: addMonthsPreservingDay(visitDate, 1),
    weight: options.weight === undefined ? 4.5 + monthNumber * 0.35 : options.weight,
    height: options.height === undefined ? 54 + monthNumber * 1.15 : options.height,
    headCircumference: 39 + Math.min(monthNumber, 12) * 0.25,
    feedingMethod: options.feedingMethod === undefined ? 'Mixed feeding' : options.feedingMethod,
    developmentalStatus: 'Normal',
    notes: 'Synthetic demo monitoring record.',
  };
}

const childTemplates = [
  { birthOffset: -1, birthDay: 5, throughMonth: 1, partialMonth: null },
  { birthOffset: -1, birthDay: 10, throughMonth: 0, partialMonth: null },
  { birthOffset: -2, birthDay: 24, throughMonth: 2, partialMonth: { month: 2, weight: null } },
  { birthOffset: -2, birthDay: 7, throughMonth: 2, partialMonth: null },
  { birthOffset: -12, birthDay: 10, throughMonth: 11, partialMonth: null },
  { birthOffset: -12, birthDay: 11, throughMonth: 12, partialMonth: { month: 12, height: null } },
  { birthOffset: -16, birthDay: 15, throughMonth: 15, partialMonth: null },
  { birthOffset: -5, birthDay: 1, throughMonth: 5, partialMonth: { month: 5, feedingMethod: null } },
  { birthOffset: null, birthDay: null, throughMonth: 2, anchorOffset: -1, anchorDay: 24, partialMonth: null },
  { birthOffset: null, birthDay: null, throughMonth: 0, partialMonth: null },
  { birthOffset: -20, birthDay: 20, throughMonth: 20, partialMonth: null },
  { birthOffset: -24, birthDay: 12, throughMonth: 23, partialMonth: null },
];

function buildChildVisits(childId, template, birthDate) {
  const visits = [];
  const anchorDate = birthDate
    ? null
    : template.anchorOffset === undefined
      ? null
      : dateText(dateAtMonthOffset(template.anchorOffset, template.anchorDay));
  const anchorMonth = birthDate ? 0 : 1;
  const firstSlotDate = new Map();

  for (let monthNumber = 1; monthNumber <= template.throughMonth; monthNumber += 1) {
    const previousVisitDate = firstSlotDate.get(monthNumber - 1);
    const visitDate = previousVisitDate
      ? addMonthsPreservingDay(previousVisitDate, 1)
      : birthDate
        ? dateText(dateAtMonthOffset(template.birthOffset + monthNumber, template.birthDay))
        : anchorDate
          ? addMonthsPreservingDay(anchorDate, monthNumber - anchorMonth)
          : null;
    if (!visitDate) continue;
    firstSlotDate.set(monthNumber, visitDate);
    const options = template.partialMonth?.month === monthNumber
      ? template.partialMonth
      : {};
    visits.push(childVisit(childId, monthNumber, visitDate, options));
  }
  return visits;
}

function getDemoSuffix(schoolSlot, itemIndex, width) {
  const itemSuffix = String(itemIndex + 1).padStart(width, '0');
  return schoolSlot === null
    ? `${stamp}-${itemSuffix}`
    : `${stamp}-${String(schoolSlot).padStart(2, '0')}-${itemSuffix}`;
}

async function findOrCreateDemoSchool(connection, index) {
  const suffix = String(index + 1).padStart(2, '0');
  const code = `DEMO-S-${stamp}-${suffix}`;
  const name = `Demo Monitoring School ${stamp}-${suffix}`;
  const [existing] = await connection.query(
    'SELECT id, name, archived_at FROM communities WHERE community_code = ? LIMIT 1',
    [code],
  );
  if (existing.length) {
    const row = existing[0];
    if (row.name !== name || row.archived_at) {
      throw new Error(`Existing demo school ${code} does not match the active synthetic school.`);
    }
    return { id: row.id, name: row.name, created: false };
  }
  const [result] = await connection.query(
    'INSERT INTO communities (community_code, name, area) VALUES (?, ?, ?)',
    [code, name, 'Synthetic demo data'],
  );
  return { id: result.insertId, name, created: true };
}

async function seedDemoProjects(connection, school, schoolSlot) {
  const schoolLabel = `S${String(schoolSlot || 0).padStart(2, '0')}`;
  const projects = [
    { title: 'Maternal Wellness Kits', type: 'Health Support', beneficiaryType: 'Mother' },
    { title: 'Child Nutrition Support', type: 'Nutrition', beneficiaryType: 'Child' },
    { title: 'Family Health Outreach', type: 'Community Health', beneficiaryType: 'Mother and Child' },
  ];
  const completionPatterns = [
    [24, 3, 0],
    [12, 6, 6],
    [0, 0, 0],
    [24, 6, 3],
  ];
  const [scopeGroups] = await connection.query(
    `SELECT id, name FROM groups
     WHERE community_id = ? AND archived_at IS NULL
     ORDER BY id LIMIT 4`,
    [school.id],
  );
  const [scopeBatches] = await connection.query(
    `SELECT id, name FROM batches
     WHERE community_id = ? AND archived_at IS NULL
     ORDER BY id LIMIT 4`,
    [school.id],
  );
  if (scopeGroups.length !== 4 || scopeBatches.length !== 4) {
    throw new Error(`Demo projects need four active groups and batches for ${school.name}.`);
  }

  const counts = { projects: 0, projectScopes: 0 };
  for (let projectIndex = 0; projectIndex < projects.length; projectIndex += 1) {
    const project = projects[projectIndex];
    const projectNumber = String(projectIndex + 1).padStart(2, '0');
    const name = `Demo Project ${stamp} ${schoolLabel} P${projectNumber} - ${project.title}`;
    const receivedByScope = completionPatterns[(Number(schoolSlot || 0) + projectIndex) % completionPatterns.length];
    const [existing] = await connection.query(
      'SELECT id, provider, archived_at FROM programs WHERE name = ? LIMIT 1',
      [name],
    );
    let programId;
    if (existing.length) {
      if (existing[0].provider !== 'Synthetic Demo Program' || existing[0].archived_at) {
        throw new Error(`Existing demo project "${name}" is archived or does not match the synthetic seed.`);
      }
      programId = existing[0].id;
    } else {
      const [result] = await connection.query(
        `INSERT INTO programs (
          name, type, provider, description, beneficiary_type, status,
          target, received, activities, latest
        ) VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?)`,
        [
          name,
          project.type,
          'Synthetic Demo Program',
          'Synthetic sample project data for school performance reporting.',
          project.beneficiaryType,
          36,
          receivedByScope.reduce((total, count) => total + count, 0),
          3 + projectIndex,
          dateText(dateAtMonthOffset(0, currentDay)),
        ],
      );
      programId = result.insertId;
      counts.projects += 1;
    }

    const groupIndex = projectIndex;
    const scopes = [
      { type: 'School', name: school.name, scopeId: school.id, beneficiaries: 24 },
      {
        type: 'Group',
        name: scopeGroups[groupIndex].name,
        scopeId: scopeGroups[groupIndex].id,
        beneficiaries: 6,
      },
      {
        type: 'Batch',
        name: scopeBatches[groupIndex].name,
        scopeId: scopeBatches[groupIndex].id,
        beneficiaries: 6,
      },
    ];
    for (let index = 0; index < scopes.length; index += 1) {
      const scope = scopes[index];
      const [result] = await connection.query(
        `INSERT IGNORE INTO program_clusters (
          program_id, scope_type, scope_name, scope_id, beneficiaries, received
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [programId, scope.type, scope.name, scope.scopeId, scope.beneficiaries, receivedByScope[index]],
      );
      counts.projectScopes += Number(result.affectedRows > 0);
    }
  }
  return counts;
}

async function findOrCreateGroup(connection, schoolId, index, schoolSlot = null) {
  const suffix = String(index + 1).padStart(2, '0');
  const code = `DEMO-G-${getDemoSuffix(schoolSlot, index, 2)}`;
  const name = schoolSlot === null
    ? `Demo Group ${stamp}-${suffix}`
    : `Demo Group ${stamp}-${String(schoolSlot).padStart(2, '0')}-${suffix}`;
  const [existing] = await connection.query(
    'SELECT id, community_id, name, archived_at FROM groups WHERE group_code = ? LIMIT 1',
    [code],
  );
  if (existing.length) {
    const row = existing[0];
    if (Number(row.community_id) !== Number(schoolId) || row.name !== name || row.archived_at) {
      throw new Error(`Existing demo group ${code} does not match the selected active school.`);
    }
    return { id: row.id, created: false };
  }
  const [result] = await connection.query(
    'INSERT INTO groups (group_code, community_id, name, leader, members_count, status) VALUES (?, ?, ?, ?, ?, ?)',
    [code, schoolId, name, `Demo Coordinator ${suffix}`, 3, 'Active'],
  );
  return { id: result.insertId, created: true };
}

async function findOrCreateBatch(connection, schoolId, groupId, index, schoolSlot = null) {
  const suffix = String(index + 1).padStart(2, '0');
  const code = `DEMO-B-${getDemoSuffix(schoolSlot, index, 2)}`;
  const name = schoolSlot === null
    ? `Demo Batch ${stamp}-${suffix}`
    : `Demo Batch ${stamp}-${String(schoolSlot).padStart(2, '0')}-${suffix}`;
  const [existing] = await connection.query(
    'SELECT id, community_id, name, archived_at FROM batches WHERE batch_code = ? LIMIT 1',
    [code],
  );
  let batchId;
  let created = false;
  if (existing.length) {
    const row = existing[0];
    if (Number(row.community_id) !== Number(schoolId) || row.name !== name || row.archived_at) {
      throw new Error(`Existing demo batch ${code} does not match the selected active school.`);
    }
    batchId = row.id;
  } else {
    const [result] = await connection.query(
      'INSERT INTO batches (batch_code, community_id, name, records, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
      [code, schoolId, name, 3, 0, 'Active'],
    );
    batchId = result.insertId;
    created = true;
  }

  const [links] = await connection.query(
    'SELECT group_id FROM group_batch WHERE group_id = ? AND batch_id = ? LIMIT 1',
    [groupId, batchId],
  );
  if (!links.length) {
    await connection.query(
      'INSERT INTO group_batch (group_id, batch_id) VALUES (?, ?)',
      [groupId, batchId],
    );
  }
  return { id: batchId, created };
}

async function findOrCreateMother(connection, schoolId, groupId, batchId, index, template, schoolSlot = null) {
  const suffix = String(index + 1).padStart(3, '0');
  const code = `DEMO-M-${getDemoSuffix(schoolSlot, index, 3)}`;
  const firstName = schoolSlot === null
    ? `Demo Mother ${suffix}`
    : `Demo Mother ${String(schoolSlot).padStart(2, '0')}-${suffix}`;
  const lastName = 'Seed';
  const registrationDate = template.registrationOffset === null
    ? null
    : dateText(dateAtMonthOffset(template.registrationOffset, template.registrationDay));
  const [existing] = await connection.query(
    'SELECT id, community_id, group_id, batch_id, archived_at FROM mothers WHERE mother_code = ? LIMIT 1',
    [code],
  );
  if (existing.length) {
    const row = existing[0];
    if (Number(row.community_id) !== Number(schoolId)
      || Number(row.group_id) !== Number(groupId)
      || Number(row.batch_id) !== Number(batchId)
      || row.archived_at) {
      throw new Error(`Existing demo mother ${code} has a different or archived assignment.`);
    }
    return { id: row.id, created: false };
  }

  const [result] = await connection.query(
    `INSERT INTO mothers (
      mother_code, community_id, group_id, batch_id, first_name, last_name,
      prenatal_reg_date, trimester, gestational_age, status, is_high_risk
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', FALSE)`,
    [
      code,
      schoolId,
      groupId,
      batchId,
      firstName,
      lastName,
      registrationDate,
      template.trimester,
      template.gestationalAge,
    ],
  );
  return { id: result.insertId, created: true };
}

async function findOrCreateChild(connection, schoolId, groupId, batchId, motherId, index, template, schoolSlot = null) {
  const suffix = String(index + 1).padStart(3, '0');
  const code = `DEMO-C-${getDemoSuffix(schoolSlot, index, 3)}`;
  const firstName = schoolSlot === null
    ? `Demo Child ${suffix}`
    : `Demo Child ${String(schoolSlot).padStart(2, '0')}-${suffix}`;
  const lastName = 'Seed';
  const birthDate = template.birthOffset === null
    ? null
    : dateText(dateAtMonthOffset(template.birthOffset, template.birthDay));
  const [existing] = await connection.query(
    'SELECT id, mother_id, community_id, group_id, batch_id, archived_at FROM children WHERE child_code = ? LIMIT 1',
    [code],
  );
  if (existing.length) {
    const row = existing[0];
    if (Number(row.mother_id) !== Number(motherId)
      || Number(row.community_id) !== Number(schoolId)
      || Number(row.group_id) !== Number(groupId)
      || Number(row.batch_id) !== Number(batchId)
      || row.archived_at) {
      throw new Error(`Existing demo child ${code} has a different or archived assignment.`);
    }
    return { id: row.id, birthDate, created: false };
  }

  const [result] = await connection.query(
    `INSERT INTO children (
      child_code, mother_id, community_id, group_id, batch_id,
      first_name, last_name, birth_date, gender, feeding_type,
      exclusive_breastfeeding, health_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      motherId,
      schoolId,
      groupId,
      batchId,
      firstName,
      lastName,
      birthDate,
      index % 2 === 0 ? 'Female' : 'Male',
      'Mixed feeding',
      'Mixed feeding',
      'Normal',
    ],
  );
  return { id: result.insertId, birthDate, created: true };
}

async function insertMotherCheckups(connection, motherId, visits) {
  let created = 0;
  for (const visit of visits) {
    const [existing] = await connection.query(
      'SELECT id FROM mother_checkups WHERE mother_id = ? AND trimester = ? AND checkup_number = ? LIMIT 1',
      [motherId, visit.trimester, visit.number],
    );
    if (existing.length) continue;
    await connection.query(
      `INSERT INTO mother_checkups (
        mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
        blood_pressure, weight_kg, height_cm, bmi, nutritional_status,
        next_checkup_date, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        motherId,
        visit.trimester,
        visit.number,
        visit.checkupDate,
        visit.gestationalAgeWeeks,
        visit.bloodPressure,
        visit.weight,
        visit.height,
        visit.bmi,
        visit.nutritionalStatus,
        visit.nextCheckupDate,
        visit.remarks,
      ],
    );
    created += 1;
  }
  return created;
}

async function insertChildCheckups(connection, visits) {
  let created = 0;
  for (const visit of visits) {
    const [existing] = await connection.query(
      'SELECT id FROM child_checkups WHERE child_id = ? AND week_number = ? LIMIT 1',
      [visit.childId, visit.monthNumber],
    );
    if (existing.length) continue;
    await connection.query(
      `INSERT INTO child_checkups (
        child_id, week_number, visit_date, next_checkup_date, weight, height,
        head_circumference, exclusive_breastfeeding, developmental_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visit.childId,
        visit.monthNumber,
        visit.visitDate,
        visit.nextCheckupDate,
        visit.weight,
        visit.height,
        visit.headCircumference,
        visit.feedingMethod,
        visit.developmentalStatus,
        visit.notes,
      ],
    );
    created += 1;
  }
  return created;
}

async function seedSchool(connection, selectedSchool, schoolSlot, summary) {
  const groups = [];
  const batches = [];
  for (let index = 0; index < 4; index += 1) {
    const group = await findOrCreateGroup(connection, selectedSchool.id, index, schoolSlot);
    const batch = await findOrCreateBatch(connection, selectedSchool.id, group.id, index, schoolSlot);
    groups.push(group.id);
    batches.push(batch.id);
    summary.groups += Number(group.created);
    summary.batches += Number(batch.created);
  }
  const projectCounts = await seedDemoProjects(connection, selectedSchool, schoolSlot);
  summary.projects += projectCounts.projects;
  summary.projectScopes += projectCounts.projectScopes;

  const seededChildren = [];
  for (let index = 0; index < motherTemplates.length; index += 1) {
    const groupIndex = Math.floor(index / 3);
    const mother = await findOrCreateMother(
      connection,
      selectedSchool.id,
      groups[groupIndex],
      batches[groupIndex],
      index,
      motherTemplates[index],
      schoolSlot,
    );
    summary.mothers += Number(mother.created);
    summary.maternalCheckups += await insertMotherCheckups(
      connection,
      mother.id,
      motherTemplates[index].visits,
    );

    const child = await findOrCreateChild(
      connection,
      selectedSchool.id,
      groups[groupIndex],
      batches[groupIndex],
      mother.id,
      index,
      childTemplates[index],
      schoolSlot,
    );
    summary.children += Number(child.created);
    const visits = buildChildVisits(child.id, childTemplates[index], child.birthDate);
    summary.childCheckups += await insertChildCheckups(connection, visits);
    seededChildren.push({ motherId: mother.id, childId: child.id });
  }

  for (const { motherId, childId } of seededChildren) {
    await connection.query(
      `UPDATE mothers m
       SET progress = LEAST(100, ROUND(
         (SELECT COUNT(*) FROM mother_checkups WHERE mother_id = ?) * 100
         / ${motherMonitoringTotalSql('m')}
       ))
       WHERE m.id = ?`,
      [motherId, motherId],
    );
    await connection.query(
      `UPDATE children c
       SET progress = LEAST(100, ROUND(
         (SELECT COUNT(*) FROM child_checkups WHERE child_id = ? AND week_number BETWEEN 1 AND 24) * 100 / 24
       ))
       WHERE c.id = ?`,
      [childId, childId],
    );
  }
}

async function run() {
  const connection = await pool.getConnection();
  const summary = {
    schoolsSeeded: 0,
    schoolsCreated: 0,
    groups: 0,
    batches: 0,
    projects: 0,
    projectScopes: 0,
    mothers: 0,
    children: 0,
    maternalCheckups: 0,
    childCheckups: 0,
  };

  try {
    await connection.beginTransaction();
    const [activeSchools] = await connection.query(
      'SELECT id, name FROM communities WHERE archived_at IS NULL ORDER BY id FOR UPDATE',
    );
    let targetSchools;
    if (requestedAddSchools !== null) {
      const baseGroupCode = `DEMO-G-${stamp}-01`;
      const [baseSchools] = await connection.query(
        `SELECT c.id, c.name FROM communities c
         INNER JOIN groups g ON g.community_id = c.id
         WHERE g.group_code = ? AND c.archived_at IS NULL
         LIMIT 2`,
        [baseGroupCode],
      );
      if (baseSchools.length !== 1) {
        throw new Error('Unable to identify the original demo school; expected exactly one matching demo group.');
      }
      targetSchools = [{ ...baseSchools[0], schoolSlot: null }];
      for (let index = 0; index < requestedAddSchools; index += 1) {
        const demoSchool = await findOrCreateDemoSchool(connection, index);
        targetSchools.push({ ...demoSchool, schoolSlot: index + 1 });
        summary.schoolsCreated += Number(demoSchool.created);
      }
    } else {
      const selectedSchool = requestedSchoolId === null
        ? activeSchools.length === 1 ? activeSchools[0] : null
        : activeSchools.find((school) => Number(school.id) === requestedSchoolId);
      if (!selectedSchool) {
        throw new Error(activeSchools.length > 1 && requestedSchoolId === null
          ? 'More than one active school exists; specify --school-id.'
          : 'No matching active school was found.');
      }
      targetSchools = [{ ...selectedSchool, schoolSlot: null }];
    }
    summary.schoolsSeeded = targetSchools.length;

    const seededSchoolNames = [];
    for (const school of targetSchools) {
      await seedSchool(connection, school, school.schoolSlot, summary);
      seededSchoolNames.push(school.name);
    }

    if (dryRun) await connection.rollback();
    else await connection.commit();
    console.log(JSON.stringify({
      result: dryRun ? 'dry-run rolled back' : 'seed committed',
      schools: seededSchoolNames,
      month: currentMonth,
      synthetic: true,
      ...summary,
    }, null, 2));
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Unable to roll back demo seed transaction:', rollbackError.message);
    }
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Demo seed failed:', error.message);
  process.exitCode = 1;
});
