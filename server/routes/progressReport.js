const express = require('express');
const pool = require('../db');
const { getWhoGrowthStandards } = require('../services/whoGrowthStandards');

const router = express.Router();

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const getBmiInterpretation = (value) => {
  const bmi = Number(value);
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Underweight screening range';
  if (bmi < 25) return 'Normal screening range';
  if (bmi < 30) return 'Overweight screening range';
  return 'Obese screening range';
};

const parseParams = (query, scope = {}) => ({
  schoolId: numberOrNull(scope.schoolId) ?? numberOrNull(query.schoolId),
  groupId: numberOrNull(scope.groupId) ?? numberOrNull(query.groupId),
  batchId: numberOrNull(query.batchId),
  motherId: numberOrNull(query.motherId),
  programName: String(query.programName || '').trim(),
  benefitPeriod: query.benefitPeriod === 'month' ? 'month' : 'overall',
  benefitMonth: /^\d{4}-\d{2}$/.test(String(query.benefitMonth || '')) ? String(query.benefitMonth) : '',
  granularity: query.granularity === 'mother' ? 'mother' : 'child',
  search: String(query.search || '').trim(),
  page: Math.max(1, Number(query.page) || 1),
  perPage: Math.min(100, Math.max(1, Number(query.perPage) || 50)),
  exportAll: String(query.export || '') === '1',
});

const hierarchyWhere = (params, aliases = { mother: 'm', child: 'c' }) => {
  const conditions = [];
  const values = [];
  const owner = aliases.child || aliases.mother;
  const mother = aliases.mother || 'm';
  if (params.schoolId) { conditions.push(`COALESCE(${owner}.community_id, ${mother}.community_id) = ?`); values.push(params.schoolId); }
  if (params.groupId) { conditions.push(`COALESCE(${owner}.group_id, ${mother}.group_id) = ?`); values.push(params.groupId); }
  if (params.batchId) { conditions.push(`COALESCE(${owner}.batch_id, ${mother}.batch_id) = ?`); values.push(params.batchId); }
  if (params.motherId) { conditions.push(`${aliases.mother}.id = ?`); values.push(params.motherId); }
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(`CONCAT_WS(' ', ${aliases.child}.first_name, ${aliases.child}.middle_name, ${aliases.child}.last_name, ${aliases.mother}.first_name, ${aliases.mother}.last_name, ${aliases.child}.child_code, ${aliases.mother}.mother_code) LIKE ?`);
    values.push(term);
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
};

router.get('/options', async (req, res) => {
  try {
    const schoolClause = req.groupId ? 'WHERE id = (SELECT community_id FROM groups WHERE id = ?)' : req.schoolId ? 'WHERE id = ?' : '';
    const groupClause = req.groupId ? 'WHERE id = ?' : req.schoolId ? 'WHERE community_id = ?' : '';
    const batchClause = req.groupId ? 'WHERE EXISTS (SELECT 1 FROM group_batch WHERE group_batch.batch_id = batches.id AND group_batch.group_id = ?)' : req.schoolId ? 'WHERE community_id = ?' : '';
    const [schools] = await pool.query(`SELECT id, name FROM communities ${schoolClause} ORDER BY name`, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);
    const [groups] = await pool.query(`SELECT id, name, community_id AS schoolId FROM groups ${groupClause} ORDER BY name`, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);
    const [batches] = await pool.query(`SELECT id, name, batch_code AS code, community_id AS schoolId FROM batches ${batchClause} ORDER BY name`, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);
    const [mothers] = await pool.query(`
      SELECT m.id, m.mother_code AS code,
        TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix)) AS name,
        m.community_id AS schoolId, m.group_id AS groupId, m.batch_id AS batchId
      FROM mothers m ${req.groupId ? 'WHERE m.group_id = ?' : req.schoolId ? 'WHERE m.community_id = ?' : ''} ORDER BY name
    `, req.groupId ? [req.groupId] : req.schoolId ? [req.schoolId] : []);
    res.json({ schools, groups, batches, mothers });
  } catch (error) {
    console.error('[Progress Report] options error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const params = parseParams(req.query, req);
    const filters = hierarchyWhere(params);
    const progressExpression = `ROUND(COUNT(DISTINCT cc.id) * 100 / 48, 0)`;
    const motherProgressExpression = `ROUND(COUNT(DISTINCT mc.id) * 100 / 9, 0)`;
    const baseFrom = `
      FROM children c
      INNER JOIN mothers m ON m.id = c.mother_id
      LEFT JOIN communities school ON school.id = COALESCE(c.community_id, m.community_id)
      LEFT JOIN groups g ON g.id = COALESCE(c.group_id, m.group_id)
      LEFT JOIN batches b ON b.id = COALESCE(c.batch_id, m.batch_id)
      LEFT JOIN child_checkups cc ON cc.child_id = c.id
      LEFT JOIN mother_checkups mc ON mc.mother_id = m.id
      ${filters.sql}`;

    const groupExpression = params.granularity === 'mother'
      ? 'm.id, m.mother_code, m.first_name, m.middle_name, m.last_name, m.suffix, school.name, g.name, b.name'
      : 'c.id, c.child_code, c.first_name, c.middle_name, c.last_name, m.id, m.mother_code, m.first_name, m.last_name, school.name, g.name, b.name';
    const nameExpression = params.granularity === 'mother'
      ? `TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix))`
      : `TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix))`;
    const childNameExpression = params.granularity === 'mother' ? 'NULL' : `TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix))`;
    const totalExpression = params.granularity === 'mother' ? 'COUNT(DISTINCT c.id) * 48' : '48';
    const monthAgeExpression = `CASE
      WHEN c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR c.birth_date > CURDATE() THEN NULL
      ELSE TIMESTAMPDIFF(MONTH, c.birth_date, CURDATE()) - CASE WHEN DAY(CURDATE()) < DAY(c.birth_date) THEN 1 ELSE 0 END
    END`;
    const ageExpression = params.granularity === 'mother'
      ? 'TIMESTAMPDIFF(YEAR, m.dob, CURDATE())'
      : monthAgeExpression;
    const pediatricAgeWeeksExpression = params.granularity === 'mother'
      ? 'NULL'
      : `CASE WHEN c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR c.birth_date > CURDATE() THEN NULL ELSE TIMESTAMPDIFF(WEEK, c.birth_date, COALESCE((SELECT latest_cc.visit_date FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1), CURDATE())) END`;
    const genderExpression = params.granularity === 'mother' ? 'NULL' : 'c.gender';
    const statusExpression = params.granularity === 'mother' ? 'm.status' : 'c.health_status';
    const dobExpression = params.granularity === 'mother' ? 'm.dob' : 'c.birth_date';
    const groupDetails = params.granularity === 'mother'
      ? 'm.dob, m.prenatal_weight, m.prenatal_height, m.philhealth_member, m.status, m.contact_number, m.address, m.birth_certificate_document_name, m.consent_document_name, m.gravida, m.abortion, m.stillbirth, m.is_high_risk, m.program_type'
      : 'c.birth_date, c.birth_weight, c.birth_length, c.birth_document_name, m.philhealth_member, c.gender, c.blood_type, c.multiple_birth_type, c.delivery_type, c.health_status, m.contact_number, m.is_high_risk, m.program_type';
    const query = `
      SELECT
        school.id AS school_id, school.name AS school_name,
        g.id AS group_id, g.name AS group_name,
        b.id AS batch_id, b.name AS batch_name,
        ${params.granularity === 'mother' ? 'NULL' : 'c.id'} AS child_id,
        m.id AS mother_id, m.mother_code,
        ${nameExpression} AS mother_name,
        ${childNameExpression} AS child_name,
        ${ageExpression} AS age,
        ${pediatricAgeWeeksExpression} AS pediatric_age_weeks,
        ${genderExpression} AS gender,
        ${statusExpression} AS status,
        ${dobExpression} AS date_of_birth,
        m.philhealth_member AS philhealth_member,
        ${params.granularity === 'mother' ? 'm.prenatal_weight' : 'c.birth_weight'} AS initial_weight,
        ${params.granularity === 'mother' ? 'm.prenatal_height' : 'c.birth_length'} AS initial_height,
        m.contact_number AS contact_number,
        CASE WHEN m.is_high_risk = 1 THEN 'High risk' ELSE 'Normal risk' END AS risk,
        m.program_type AS program,
        ${params.granularity === 'mother' ? 'MAX(mc.checkup_date)' : 'MAX(cc.visit_date)'} AS last_activity_date,
        ${params.granularity === 'mother' ? 'MIN(mc.next_checkup_date)' : 'MIN(cc.next_checkup_date)'} AS next_checkup_date,
        ${params.granularity === 'mother' ? 'NULL' : 'c.delivery_type'} AS delivery_type,
        ${params.granularity === 'mother' ? 'NULL' : 'c.birth_document_name'} AS live_birth_document,
        ${params.granularity === 'mother' ? 'NULL' : 'c.blood_type'} AS blood_type,
        ${params.granularity === 'mother' ? 'NULL' : 'c.multiple_birth_type'} AS multiple_birth_type,
        ${params.granularity === 'mother' ? 'm.address' : 'NULL'} AS address_details,
        ${params.granularity === 'mother' ? 'm.birth_certificate_document_name' : 'NULL'} AS mother_birth_certificate,
        ${params.granularity === 'mother' ? 'm.consent_document_name' : 'NULL'} AS program_consent_document,
        ${params.granularity === 'mother' ? 'm.gravida' : 'NULL'} AS gravida,
        ${params.granularity === 'mother' ? 'm.abortion' : 'NULL'} AS abortion,
        ${params.granularity === 'mother' ? 'm.stillbirth' : 'NULL'} AS stillbirth,
        ${params.granularity === 'mother' ? 'NULL' : '(SELECT latest_cc.weight FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)'} AS weight_for_age,
        ${params.granularity === 'mother' ? 'NULL' : '(SELECT latest_cc.height FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)'} AS height_for_age,
        ${params.granularity === 'mother' ? '(SELECT latest_mc.bmi FROM mother_checkups latest_mc WHERE latest_mc.mother_id = m.id ORDER BY latest_mc.checkup_date DESC, latest_mc.id DESC LIMIT 1)' : '(SELECT ROUND(latest_cc.weight / POW(NULLIF(latest_cc.height, 0) / 100, 2), 1) FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)'} AS bmi_for_age,
        ${params.granularity === 'mother' ? '(SELECT latest_mc.checkup_date FROM mother_checkups latest_mc WHERE latest_mc.mother_id = m.id ORDER BY latest_mc.checkup_date DESC, latest_mc.id DESC LIMIT 1)' : '(SELECT latest_cc.visit_date FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)'} AS measurement_date,
        COUNT(DISTINCT cc.id) AS activities_completed,
        ${totalExpression} AS total_activities,
        ${params.granularity === 'mother' ? motherProgressExpression : progressExpression} AS progress
      ${baseFrom}
      GROUP BY ${groupExpression}, ${groupDetails}
      ORDER BY school.name, g.name, b.name, mother_name, child_name`;
    const [rows] = await pool.query(query, filters.values);
    let normalizedRows = rows.map((row) => ({
      schoolId: row.school_id,
      school: row.school_name || 'Unassigned school',
      groupId: row.group_id,
      group: row.group_name || 'Unassigned group',
      batchId: row.batch_id,
      batch: row.batch_name || 'Unassigned batch',
      childId: row.child_id,
      motherId: row.mother_id,
      mother: row.mother_name || row.mother_code || 'Unnamed mother',
      child: row.child_name || (params.granularity === 'mother' ? row.mother_name : 'Unnamed child'),
      age: row.age === null || row.age === undefined ? '' : Number(row.age),
      gender: row.gender || '',
      status: row.status || '',
      dateOfBirth: row.date_of_birth || '',
      philhealthMember: Number(row.philhealth_member) === 1 ? 'Yes' : 'No',
      initialWeight: row.initial_weight === null || row.initial_weight === undefined ? '' : Number(row.initial_weight),
      initialHeight: row.initial_height === null || row.initial_height === undefined ? '' : Number(row.initial_height),
      initialBmi: Number.isFinite(Number(row.initial_weight)) && Number(row.initial_weight) > 0 && Number.isFinite(Number(row.initial_height)) && Number(row.initial_height) > 0
        ? Number((Number(row.initial_weight) / ((Number(row.initial_height) / 100) ** 2)).toFixed(1))
        : '',
      pediatricAgeWeeks: row.pediatric_age_weeks === null || row.pediatric_age_weeks === undefined ? '' : Number(row.pediatric_age_weeks),
      contact: row.contact_number || '',
      risk: row.risk || '',
      program: row.program || '',
      lastActivityDate: row.last_activity_date || '',
      nextCheckupDate: row.next_checkup_date || '',
      deliveryType: row.delivery_type || '',
      liveBirthDocument: row.live_birth_document || '',
      bloodType: row.blood_type || '',
      multipleBirth: row.multiple_birth_type || '',
      addressDetails: row.address_details || '',
      motherBirthCertificate: row.mother_birth_certificate || '',
      programConsentDocument: row.program_consent_document || '',
      contactNumber: row.contact_number || '',
      gravida: row.gravida === null || row.gravida === undefined ? '' : Number(row.gravida),
      abortion: row.abortion === null || row.abortion === undefined ? '' : Number(row.abortion),
      stillbirth: row.stillbirth === null || row.stillbirth === undefined ? '' : Number(row.stillbirth),
      birthWeight: row.initial_weight === null || row.initial_weight === undefined ? '' : Number(row.initial_weight),
      birthLength: row.initial_height === null || row.initial_height === undefined ? '' : Number(row.initial_height),
      weightForAge: row.weight_for_age === null || row.weight_for_age === undefined ? '' : Number(row.weight_for_age),
      heightForAge: row.height_for_age === null || row.height_for_age === undefined ? '' : Number(row.height_for_age),
      bmiForAge: row.bmi_for_age === null || row.bmi_for_age === undefined ? '' : Number(row.bmi_for_age),
      bmiInterpretation: getBmiInterpretation(row.bmi_for_age),
      measurementDate: row.measurement_date || '',
      growthSeries: [],
      activitiesCompleted: Number(row.activities_completed || 0),
      totalActivities: Number(row.total_activities || 0),
      progress: Number(row.progress || 0),
      receivedBenefitTotal: 0,
      receivedBenefitFrequency: 0,
      receivedBenefitAveragePerMonth: 0,
    }));
    if (params.granularity !== 'mother' || normalizedRows.length) {
      const benefitConditions = ['ml.monitored = 1'];
      const benefitValues = [];
      if (params.programName) {
        benefitConditions.push('LOWER(TRIM(p.name)) = LOWER(TRIM(?))');
        benefitValues.push(params.programName);
      }
      if (params.benefitPeriod === 'month' && params.benefitMonth) {
        benefitConditions.push("DATE_FORMAT(ml.monitored_date, '%Y-%m') = ?");
        benefitValues.push(params.benefitMonth);
      }
      if (params.schoolId) { benefitConditions.push('COALESCE(m.community_id, c.community_id) = ?'); benefitValues.push(params.schoolId); }
      if (params.groupId) { benefitConditions.push('COALESCE(m.group_id, c.group_id) = ?'); benefitValues.push(params.groupId); }
      if (params.batchId) { benefitConditions.push('COALESCE(m.batch_id, c.batch_id) = ?'); benefitValues.push(params.batchId); }
      const [benefitRows] = await pool.query(
        `SELECT ml.beneficiary_id, LOWER(ml.beneficiary_type) AS beneficiary_type,
                COUNT(*) AS total_received,
                COUNT(DISTINCT DATE_FORMAT(ml.monitored_date, '%Y-%m')) AS active_months
         FROM monitoring_logs ml
         INNER JOIN programs p ON p.id = ml.program_id
         LEFT JOIN mothers m ON LOWER(ml.beneficiary_type) = 'mother' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(m.mother_code AS CHAR))))
         LEFT JOIN children c ON LOWER(ml.beneficiary_type) = 'child' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(c.child_code AS CHAR))))
         WHERE ${benefitConditions.join(' AND ')}
         GROUP BY ml.beneficiary_id, LOWER(ml.beneficiary_type)`,
        benefitValues,
      );
      const benefitMap = new Map(benefitRows.map((row) => [`${row.beneficiary_type}:${String(row.beneficiary_id)}`, row]));
      normalizedRows.forEach((row) => {
        const type = params.granularity === 'mother' ? 'mother' : 'child';
        const ids = [row[type === 'mother' ? 'motherId' : 'childId'], row[type === 'mother' ? 'mother' : 'child']].filter(Boolean);
        const benefit = ids.map((id) => benefitMap.get(`${type}:${String(id)}`)).find(Boolean);
        const totalReceived = Number(benefit?.total_received || 0);
        const activeMonths = Number(benefit?.active_months || 0);
        row.receivedBenefitTotal = totalReceived;
        row.receivedBenefitFrequency = totalReceived;
        row.receivedBenefitAveragePerMonth = activeMonths ? Number((totalReceived / activeMonths).toFixed(1)) : 0;
      });
      if (params.programName) {
        normalizedRows = normalizedRows.filter((row) => row.receivedBenefitTotal > 0);
      }
    }
    const childIds = normalizedRows.map((row) => row.childId).filter(Boolean);
    if (childIds.length) {
      const [checkupRows] = await pool.query(
        `SELECT cc.child_id, cc.week_number, cc.visit_date, cc.weight, cc.height, c.gender, c.birth_date,
                CASE WHEN c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR c.birth_date > cc.visit_date
                  THEN NULL ELSE TIMESTAMPDIFF(WEEK, c.birth_date, cc.visit_date) END AS calculated_age_weeks
         FROM child_checkups cc
         INNER JOIN children c ON c.id = cc.child_id
         WHERE cc.child_id IN (${childIds.map(() => '?').join(',')})
           AND cc.visit_date IS NOT NULL
         ORDER BY cc.visit_date, cc.id`,
        childIds,
      );
      const calculateWhoGrowthScores = await getWhoGrowthStandards();
      const seriesByChild = new Map();
      checkupRows.forEach((checkup) => {
        const series = seriesByChild.get(checkup.child_id) || [];
        const weight = Number(checkup.weight);
        const height = Number(checkup.height);
        series.push({
          date: checkup.visit_date,
          ageWeeks: Number.isFinite(Number(checkup.week_number))
            ? Number(checkup.week_number)
            : Number.isFinite(Number(checkup.calculated_age_weeks)) ? Number(checkup.calculated_age_weeks) : null,
          weight: Number.isFinite(weight) && weight > 0 ? weight : null,
          height: Number.isFinite(height) && height > 0 ? height : null,
          bmi: Number.isFinite(weight) && weight > 0 && Number.isFinite(height) && height > 0 ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : null,
          ...calculateWhoGrowthScores({
            weight,
            lengthHeight: height,
            sex: checkup.gender,
            birthDate: checkup.birth_date,
            measurementDate: checkup.visit_date,
          }),
        });
        seriesByChild.set(checkup.child_id, series);
      });
      normalizedRows.forEach((row) => {
        row.growthSeries = seriesByChild.get(row.childId) || [];
        const latestPoint = row.growthSeries.at(-1);
        row.weightForLengthInterpretation = latestPoint?.weightForLengthInterpretation || '';
        row.weightForAgeInterpretation = latestPoint?.weightForAgeInterpretation || '';
        row.lengthForAgeInterpretation = latestPoint?.lengthForAgeInterpretation || '';
        row.weightForLengthZScore = latestPoint?.weightForLengthZScore ?? '';
        row.weightForAgeZScore = latestPoint?.weightForAgeZScore ?? '';
        row.lengthForAgeZScore = latestPoint?.lengthForAgeZScore ?? '';
      });
    }
    const motherIds = normalizedRows.map((row) => row.motherId).filter(Boolean);
    if (params.granularity === 'mother' && motherIds.length) {
      const [checkupRows] = await pool.query(
        `SELECT mother_id, checkup_date, gestational_age_weeks, bmi
         FROM mother_checkups
         WHERE mother_id IN (${motherIds.map(() => '?').join(',')})
           AND checkup_date IS NOT NULL
         ORDER BY checkup_date, id`,
        motherIds,
      );
      const seriesByMother = new Map();
      checkupRows.forEach((checkup) => {
        const series = seriesByMother.get(checkup.mother_id) || [];
        const bmi = Number(checkup.bmi);
        const ageWeeks = Number(checkup.gestational_age_weeks);
        series.push({
          date: checkup.checkup_date,
          ageWeeks: Number.isFinite(ageWeeks) ? ageWeeks : null,
          weight: null,
          height: null,
          bmi: Number.isFinite(bmi) && bmi > 0 ? bmi : null,
        });
        seriesByMother.set(checkup.mother_id, series);
      });
      normalizedRows.forEach((row) => { row.growthSeries = seriesByMother.get(row.motherId) || []; });
    }
    const total = normalizedRows.length;
    const page = params.exportAll ? 1 : params.page;
    const perPage = params.exportAll ? Math.max(total, 1) : params.perPage;
    const pagedRows = normalizedRows.slice((page - 1) * perPage, page * perPage);
    const averageProgress = total ? Math.round(normalizedRows.reduce((sum, row) => sum + row.progress, 0) / total) : 0;
    const groupCount = new Set(normalizedRows.map((row) => row.groupId).filter(Boolean)).size;
    const batchCount = new Set(normalizedRows.map((row) => row.batchId).filter(Boolean)).size;
    res.json({
      rows: pagedRows,
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
      summary: { total, averageProgress, groupCount, batchCount },
      breadcrumb: [params.schoolId ? normalizedRows[0]?.school : 'All Schools', params.groupId ? normalizedRows[0]?.group : 'All Groups', params.batchId ? normalizedRows[0]?.batch : 'All Batches'].filter(Boolean),
    });
  } catch (error) {
    console.error('[Progress Report] report error:', error.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;