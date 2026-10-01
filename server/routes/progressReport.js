const express = require('express');
const pool = require('../db');
const { getWhoGrowthStandards } = require('../services/whoGrowthStandards');

const router = express.Router();

function collectVaccineRecord(dates, remarks) {
  const availableDoses = dates.flatMap((date, index) => (date ? [{ dose: index + 1, date }] : []));
  if (!availableDoses.length && !remarks) return '';
  return { doses: availableDoses, remarks: remarks || '' };
}

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const getBmiInterpretation = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const bmi = Number(value);
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Underweight screening range';
  if (bmi < 25) return 'Normal screening range';
  if (bmi < 30) return 'Overweight screening range';
  return 'Obese screening range';
};

const normalizeProgramBeneficiaryType = (value) => String(value || '').trim().toLowerCase().replace(/\s*&\s*/g, ' and ');

function shouldApplyProgramMonitoringData({ programName } = {}) {
  return String(programName || '').trim().length > 0;
}

function resolveProgramReportTargets({ row, granularity, programBeneficiaryType }) {
  const normalizedType = normalizeProgramBeneficiaryType(programBeneficiaryType);
  const includeMother = normalizedType === 'mother' || normalizedType === 'mother and child' || normalizedType === 'mother & child' || granularity === 'mother';
  const includeChild = normalizedType === 'child' || normalizedType === 'mother and child' || normalizedType === 'mother & child' || granularity !== 'mother';
  const targets = [];
  if (includeMother && row?.motherId) targets.push({ type: 'mother', id: row.motherId });
  if (includeChild && row?.childId) targets.push({ type: 'child', id: row.childId });
  return targets;
}

const parseParams = (query, scope = {}) => ({
  schoolId: numberOrNull(scope.schoolId) ?? numberOrNull(query.schoolId),
  groupId: numberOrNull(scope.groupId) ?? numberOrNull(query.groupId),
  batchId: numberOrNull(query.batchId),
  motherId: numberOrNull(query.motherId),
  programName: String(query.programName || '').trim(),
  programBeneficiaryType: String(query.programBeneficiaryType || '').trim(),
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
  if (params.groupId) {
    conditions.push(`(
      COALESCE(${owner}.group_id, ${mother}.group_id) = ?
      OR COALESCE(${owner}.batch_id, ${mother}.batch_id) IN (
        SELECT scoped_group_batch.batch_id
        FROM group_batch scoped_group_batch
        WHERE scoped_group_batch.group_id = ?
      )
    )`);
    values.push(params.groupId, params.groupId);
  }
  if (params.batchId) { conditions.push(`COALESCE(${owner}.batch_id, ${mother}.batch_id) = ?`); values.push(params.batchId); }
  if (params.motherId) { conditions.push(`${aliases.mother}.id = ?`); values.push(params.motherId); }
  if (params.search) {
    const term = `%${params.search}%`;
    const searchableName = aliases.child
      ? `CONCAT_WS(' ', ${aliases.child}.first_name, ${aliases.child}.middle_name, ${aliases.child}.last_name, ${aliases.mother}.first_name, ${aliases.mother}.last_name, ${aliases.child}.child_code, ${aliases.mother}.mother_code)`
      : `CONCAT_WS(' ', ${mother}.first_name, ${mother}.middle_name, ${mother}.last_name, ${mother}.mother_code)`;
    conditions.push(`${searchableName} LIKE ?`);
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
    const isMotherReport = params.granularity === 'mother';
    const filters = hierarchyWhere(params, isMotherReport ? { mother: 'm' } : undefined);
    const childCheckupDateFilter = (alias) => `(c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR ${alias}.visit_date >= c.birth_date)`;
    const motherCheckupDateFilter = (alias) => `${alias}.checkup_date IS NOT NULL`;
    const childActivitiesExpression = `(SELECT COUNT(*) FROM child_checkups completed_cc WHERE completed_cc.child_id = c.id AND completed_cc.week_number IS NOT NULL)`;
    const progressExpression = `ROUND(${childActivitiesExpression} * 100 / 24, 0)`;
    const motherProgressExpression = `ROUND(COUNT(DISTINCT mc.id) * 100 / 9, 0)`;
    const baseFrom = isMotherReport ? `
      FROM mothers m
      LEFT JOIN communities school ON school.id = m.community_id
      LEFT JOIN groups g ON g.id = m.group_id
      LEFT JOIN batches b ON b.id = m.batch_id
      LEFT JOIN mother_checkups mc ON mc.mother_id = m.id AND ${motherCheckupDateFilter('mc')}
      ${filters.sql}` : `
      FROM children c
      INNER JOIN mothers m ON m.id = c.mother_id
      LEFT JOIN communities school ON school.id = COALESCE(c.community_id, m.community_id)
      LEFT JOIN groups g ON g.id = COALESCE(c.group_id, m.group_id)
      LEFT JOIN batches b ON b.id = COALESCE(c.batch_id, m.batch_id)
      LEFT JOIN child_checkups cc ON cc.child_id = c.id AND ${childCheckupDateFilter('cc')}
      LEFT JOIN mother_checkups mc ON mc.mother_id = m.id
      ${filters.sql}`;

    const groupExpression = params.granularity === 'mother'
      ? 'm.id, m.mother_code, m.first_name, m.middle_name, m.last_name, m.suffix, school.name, g.name, b.name'
      : 'c.id, c.child_code, c.first_name, c.middle_name, c.last_name, m.id, m.mother_code, m.first_name, m.last_name, school.name, g.name, b.name';
    const motherNameExpression = `TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.suffix))`;
    const childNameExpression = params.granularity === 'mother' ? 'NULL' : `TRIM(CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name, c.suffix))`;
    const totalExpression = isMotherReport ? '9' : '24';
    const monthAgeExpression = `CASE
      WHEN c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR c.birth_date > CURDATE() THEN NULL
      ELSE TIMESTAMPDIFF(MONTH, c.birth_date, CURDATE()) - CASE WHEN DAY(CURDATE()) < DAY(c.birth_date) THEN 1 ELSE 0 END
    END`;
    const ageExpression = params.granularity === 'mother'
      ? 'TIMESTAMPDIFF(YEAR, m.dob, CURDATE())'
      : monthAgeExpression;
    const pediatricAgeWeeksExpression = params.granularity === 'mother'
      ? 'NULL'
      : `CASE WHEN c.birth_date IS NULL OR c.birth_date < '1900-01-01' OR c.birth_date > CURDATE() THEN NULL ELSE TIMESTAMPDIFF(WEEK, c.birth_date, COALESCE((SELECT latest_cc.visit_date FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id AND ${childCheckupDateFilter('latest_cc')} ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1), CURDATE())) END`;
    const genderExpression = params.granularity === 'mother' ? 'NULL' : 'c.gender';
    const statusExpression = params.granularity === 'mother' ? 'm.status' : 'c.health_status';
    const dobExpression = params.granularity === 'mother' ? 'm.dob' : 'c.birth_date';
    const groupDetails = params.granularity === 'mother'
      ? 'm.dob, m.prenatal_weight, m.prenatal_height, m.philhealth_member, m.status, m.contact_number, m.address, m.birth_certificate_document_name, m.consent_document_name, m.gravida, m.para, m.abortion, m.stillbirth, m.lmp_date, m.edd_date, m.prenatal_reg_date, m.trimester, m.gestational_age, m.prenatal_bp, m.fundal_height, m.fhr, m.emergency_name, m.emergency_contact, m.emergency_relationship, m.spouse_name, m.philhealth_number, m.other_medical_history, m.is_high_risk, m.program_type'
      : 'c.birth_date, c.birth_weight, c.birth_length, c.birth_document_name, m.philhealth_member, c.gender, c.blood_type, c.multiple_birth_type, c.delivery_type, c.health_status, c.no_of_child_delivered, c.expanded_newborn_screening, c.expanded_newborn_screening_result, c.birth_place, c.birth_attendant, c.apgar_score, c.feeding_type, c.exclusive_breastfeeding, c.nutrition_notes, c.father_name, c.relationship, c.address, m.contact_number, m.is_high_risk, m.program_type';
    const query = `
      SELECT
        school.id AS school_id, school.name AS school_name,
        g.id AS group_id, g.name AS group_name,
        b.id AS batch_id, b.name AS batch_name,
        ${params.granularity === 'mother' ? 'NULL' : 'c.id'} AS child_id,
        m.id AS mother_id, m.mother_code,
        ${motherNameExpression} AS mother_name,
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
        ${params.granularity === 'mother' ? 'NULL' : 'c.health_status'} AS health_status,
        ${params.granularity === 'mother' ? 'm.lmp_date' : 'NULL'} AS lmp_date,
        ${params.granularity === 'mother' ? 'm.edd_date' : 'NULL'} AS edd_date,
        ${params.granularity === 'mother' ? 'm.prenatal_reg_date' : 'NULL'} AS prenatal_reg_date,
        ${params.granularity === 'mother' ? 'm.trimester' : 'NULL'} AS trimester,
        ${params.granularity === 'mother' ? 'm.gestational_age' : 'NULL'} AS gestational_age,
        ${params.granularity === 'mother' ? 'm.prenatal_weight' : 'NULL'} AS prenatal_weight,
        ${params.granularity === 'mother' ? 'm.prenatal_bp' : 'NULL'} AS prenatal_bp,
        ${params.granularity === 'mother' ? 'm.prenatal_height' : 'NULL'} AS prenatal_height,
        ${params.granularity === 'mother' ? 'm.fundal_height' : 'NULL'} AS fundal_height,
        ${params.granularity === 'mother' ? 'm.fhr' : 'NULL'} AS fhr,
        ${params.granularity === 'mother' ? 'm.para' : 'NULL'} AS para,
        ${params.granularity === 'mother' ? 'm.emergency_name' : 'NULL'} AS emergency_name,
        ${params.granularity === 'mother' ? 'm.emergency_contact' : 'NULL'} AS emergency_contact,
        ${params.granularity === 'mother' ? 'm.emergency_relationship' : 'NULL'} AS emergency_relationship,
        ${params.granularity === 'mother' ? 'm.spouse_name' : 'NULL'} AS spouse_name,
        ${params.granularity === 'mother' ? 'm.philhealth_number' : 'NULL'} AS philhealth_number,
        ${params.granularity === 'mother' ? 'm.other_medical_history' : 'NULL'} AS other_medical_history,
        ${params.granularity === 'mother' ? "(SELECT GROUP_CONCAT(condition_name ORDER BY condition_name SEPARATOR ', ') FROM mother_medical_conditions mmc WHERE mmc.mother_id = m.id AND mmc.has_condition = 1)" : 'NULL'} AS medical_conditions,
        ${params.granularity === 'mother' ? "(SELECT visit_date FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dental_checkup_date,
        ${params.granularity === 'mother' ? "(SELECT dental_facility FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dental_facility,
        ${params.granularity === 'mother' ? "(SELECT dentist_in_charge FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dentist_in_charge,
        ${params.granularity === 'mother' ? "(SELECT community_dentist FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS community_dentist,
        ${params.granularity === 'mother' ? "(SELECT dentist_license FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dentist_license,
        ${params.granularity === 'mother' ? "(SELECT dentist_contact FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dentist_contact,
        ${params.granularity === 'mother' ? "(SELECT teeth_count FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS teeth_count,
        ${params.granularity === 'mother' ? "(SELECT dental_findings FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dental_findings,
        ${params.granularity === 'mother' ? "(SELECT CONCAT_WS(', ', IF(tartar_removal = 1, 'Tartar Removal', NULL), IF(filling = 1, 'Filling', NULL), IF(cleaning = 1, 'Cleaning', NULL), IF(extraction = 1, 'Extraction', NULL), IF(root_canal = 1, 'Root Canal', NULL), IF(other_procedure = 1, 'Other', NULL)) FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dental_work,
        ${params.granularity === 'mother' ? "(SELECT dental_remarks FROM mother_dental_records mdr WHERE mdr.mother_id = m.id ORDER BY id DESC LIMIT 1)" : 'NULL'} AS dental_remarks,
        ${params.granularity === 'mother' ? "(SELECT vaccine_date FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT1' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt1_date,
        ${params.granularity === 'mother' ? "(SELECT remarks FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT1' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt1_remarks,
        ${params.granularity === 'mother' ? "(SELECT vaccine_date FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT2' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt2_date,
        ${params.granularity === 'mother' ? "(SELECT remarks FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT2' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt2_remarks,
        ${params.granularity === 'mother' ? "(SELECT vaccine_date FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT3' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt3_date,
        ${params.granularity === 'mother' ? "(SELECT remarks FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT3' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt3_remarks,
        ${params.granularity === 'mother' ? "(SELECT vaccine_date FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT4' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt4_date,
        ${params.granularity === 'mother' ? "(SELECT remarks FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT4' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt4_remarks,
        ${params.granularity === 'mother' ? "(SELECT vaccine_date FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT5' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt5_date,
        ${params.granularity === 'mother' ? "(SELECT remarks FROM mother_vaccinations mv WHERE mv.mother_id = m.id AND vaccine_name = 'TT5' ORDER BY id DESC LIMIT 1)" : 'NULL'} AS tt5_remarks,
        ${params.granularity === 'mother' ? 'NULL' : 'c.no_of_child_delivered'} AS no_of_child_delivered,
        ${params.granularity === 'mother' ? 'NULL' : 'c.expanded_newborn_screening'} AS expanded_newborn_screening,
        ${params.granularity === 'mother' ? 'NULL' : 'c.expanded_newborn_screening_result'} AS expanded_newborn_screening_result,
        ${params.granularity === 'mother' ? 'NULL' : 'c.birth_place'} AS birth_place,
        ${params.granularity === 'mother' ? 'NULL' : 'c.birth_attendant'} AS birth_attendant,
        ${params.granularity === 'mother' ? 'NULL' : 'c.apgar_score'} AS apgar_score,
        ${params.granularity === 'mother' ? 'NULL' : 'c.feeding_type'} AS feeding_type,
        ${params.granularity === 'mother' ? 'NULL' : 'c.exclusive_breastfeeding'} AS exclusive_breastfeeding,
        ${params.granularity === 'mother' ? 'NULL' : 'c.nutrition_notes'} AS nutrition_notes,
        ${params.granularity === 'mother' ? 'NULL' : 'c.father_name'} AS father_name,
        ${params.granularity === 'mother' ? 'NULL' : 'c.relationship'} AS relationship,
        ${params.granularity === 'mother' ? 'NULL' : 'c.address'} AS address,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(condition_name ORDER BY condition_name SEPARATOR ', ') FROM child_medical_conditions cmc WHERE cmc.child_id = c.id AND cmc.has_condition = 1)"} AS medical_conditions,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'BCG' AND dose_number = 1 ORDER BY id DESC LIMIT 1)"} AS bcg_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'BCG' AND dose_number = 2 ORDER BY id DESC LIMIT 1)"} AS bcg_dose2_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'BCG' AND dose_number = 3 ORDER BY id DESC LIMIT 1)"} AS bcg_dose3_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(CONCAT('Dose ', cv.dose_number, ': ', TRIM(cv.remarks)) ORDER BY cv.dose_number, cv.id SEPARATOR '; ') FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'BCG' AND remarks IS NOT NULL AND TRIM(remarks) <> '')"} AS bcg_remarks,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'HepB' AND dose_number = 1 ORDER BY id DESC LIMIT 1)"} AS hepb_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'HepB' AND dose_number = 2 ORDER BY id DESC LIMIT 1)"} AS hepb_dose2_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'HepB' AND dose_number = 3 ORDER BY id DESC LIMIT 1)"} AS hepb_dose3_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(CONCAT('Dose ', cv.dose_number, ': ', TRIM(cv.remarks)) ORDER BY cv.dose_number, cv.id SEPARATOR '; ') FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'HepB' AND remarks IS NOT NULL AND TRIM(remarks) <> '')"} AS hepb_remarks,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'OPV' AND dose_number = 1 ORDER BY id DESC LIMIT 1)"} AS opv_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'OPV' AND dose_number = 2 ORDER BY id DESC LIMIT 1)"} AS opv_dose2_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'OPV' AND dose_number = 3 ORDER BY id DESC LIMIT 1)"} AS opv_dose3_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(CONCAT('Dose ', cv.dose_number, ': ', TRIM(cv.remarks)) ORDER BY cv.dose_number, cv.id SEPARATOR '; ') FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'OPV' AND remarks IS NOT NULL AND TRIM(remarks) <> '')"} AS opv_remarks,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'DPT' AND dose_number = 1 ORDER BY id DESC LIMIT 1)"} AS dpt_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'DPT' AND dose_number = 2 ORDER BY id DESC LIMIT 1)"} AS dpt_dose2_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'DPT' AND dose_number = 3 ORDER BY id DESC LIMIT 1)"} AS dpt_dose3_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(CONCAT('Dose ', cv.dose_number, ': ', TRIM(cv.remarks)) ORDER BY cv.dose_number, cv.id SEPARATOR '; ') FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'DPT' AND remarks IS NOT NULL AND TRIM(remarks) <> '')"} AS dpt_remarks,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'MMR' AND dose_number = 1 ORDER BY id DESC LIMIT 1)"} AS mmr_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'MMR' AND dose_number = 2 ORDER BY id DESC LIMIT 1)"} AS mmr_dose2_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT vaccine_date FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'MMR' AND dose_number = 3 ORDER BY id DESC LIMIT 1)"} AS mmr_dose3_date,
        ${params.granularity === 'mother' ? 'NULL' : "(SELECT GROUP_CONCAT(CONCAT('Dose ', cv.dose_number, ': ', TRIM(cv.remarks)) ORDER BY cv.dose_number, cv.id SEPARATOR '; ') FROM child_vaccinations cv WHERE cv.child_id = c.id AND vaccine_name = 'MMR' AND remarks IS NOT NULL AND TRIM(remarks) <> '')"} AS mmr_remarks,
        ${params.granularity === 'mother' ? 'NULL' : 'c.birth_document_name'} AS live_birth_document,
        ${params.granularity === 'mother' ? 'NULL' : 'c.blood_type'} AS blood_type,
        ${params.granularity === 'mother' ? 'NULL' : 'c.multiple_birth_type'} AS multiple_birth_type,
        ${params.granularity === 'mother' ? 'm.address' : 'NULL'} AS address_details,
        ${params.granularity === 'mother' ? 'm.birth_certificate_document_name' : 'NULL'} AS mother_birth_certificate,
        ${params.granularity === 'mother' ? 'm.consent_document_name' : 'NULL'} AS program_consent_document,
        ${params.granularity === 'mother' ? 'm.gravida' : 'NULL'} AS gravida,
        ${params.granularity === 'mother' ? 'm.abortion' : 'NULL'} AS abortion,
        ${params.granularity === 'mother' ? 'm.stillbirth' : 'NULL'} AS stillbirth,
        ${params.granularity === 'mother' ? 'NULL' : `(SELECT latest_cc.weight FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id AND ${childCheckupDateFilter('latest_cc')} ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)`} AS weight_for_age,
        ${params.granularity === 'mother' ? 'NULL' : `(SELECT latest_cc.height FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id AND ${childCheckupDateFilter('latest_cc')} ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)`} AS height_for_age,
        ${params.granularity === 'mother' ? `(SELECT latest_mc.bmi FROM mother_checkups latest_mc WHERE latest_mc.mother_id = m.id AND ${motherCheckupDateFilter('latest_mc')} ORDER BY latest_mc.checkup_date DESC, latest_mc.id DESC LIMIT 1)` : `(SELECT ROUND(latest_cc.weight / POW(NULLIF(latest_cc.height, 0) / 100, 2), 1) FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id AND ${childCheckupDateFilter('latest_cc')} ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)`} AS bmi_for_age,
        ${params.granularity === 'mother' ? `(SELECT latest_mc.checkup_date FROM mother_checkups latest_mc WHERE latest_mc.mother_id = m.id AND ${motherCheckupDateFilter('latest_mc')} ORDER BY latest_mc.checkup_date DESC, latest_mc.id DESC LIMIT 1)` : `(SELECT latest_cc.visit_date FROM child_checkups latest_cc WHERE latest_cc.child_id = c.id AND ${childCheckupDateFilter('latest_cc')} ORDER BY latest_cc.visit_date DESC, latest_cc.id DESC LIMIT 1)`} AS measurement_date,
        ${isMotherReport ? 'COUNT(DISTINCT mc.id)' : childActivitiesExpression} AS activities_completed,
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
      healthStatus: row.health_status || '',
      lmpDate: row.lmp_date || '',
      eddDate: row.edd_date || '',
      prenatalRegDate: row.prenatal_reg_date || '',
      trimester: row.trimester || '',
      gestationalAge: row.gestational_age || '',
      prenatalWeight: row.prenatal_weight === null || row.prenatal_weight === undefined ? '' : Number(row.prenatal_weight),
      prenatalBp: row.prenatal_bp || '',
      prenatalHeight: row.prenatal_height === null || row.prenatal_height === undefined ? '' : Number(row.prenatal_height),
      fundalHeight: row.fundal_height || '',
      fhr: row.fhr || '',
      para: row.para === null || row.para === undefined ? '' : Number(row.para),
      emergencyName: row.emergency_name || '',
      emergencyContact: row.emergency_contact || '',
      emergencyRelationship: row.emergency_relationship || '',
      spouseName: row.spouse_name || '',
      philhealthNumber: row.philhealth_number || '',
      medicalConditions: row.medical_conditions || '',
      otherMedicalHistory: row.other_medical_history || '',
      dentalCheckupDate: row.dental_checkup_date || '',
      dentalFacility: row.dental_facility || '',
      dentistInCharge: row.dentist_in_charge || '',
      communityDentist: row.community_dentist || '',
      dentistLicense: row.dentist_license || '',
      dentistContact: row.dentist_contact || '',
      teethCount: row.teeth_count === null || row.teeth_count === undefined ? '' : Number(row.teeth_count),
      dentalFindings: row.dental_findings || '',
      dentalWork: row.dental_work || '',
      dentalRemarks: row.dental_remarks || '',
      tt1Date: row.tt1_date || '', tt1Remarks: row.tt1_remarks || '',
      tt2Date: row.tt2_date || '', tt2Remarks: row.tt2_remarks || '',
      tt3Date: row.tt3_date || '', tt3Remarks: row.tt3_remarks || '',
      tt4Date: row.tt4_date || '', tt4Remarks: row.tt4_remarks || '',
      tt5Date: row.tt5_date || '', tt5Remarks: row.tt5_remarks || '',
      ttVaccineRecord: collectVaccineRecord(
        [row.tt1_date, row.tt2_date, row.tt3_date, row.tt4_date, row.tt5_date],
        [row.tt1_remarks, row.tt2_remarks, row.tt3_remarks, row.tt4_remarks, row.tt5_remarks]
          .map((remarks, index) => remarks ? `Dose ${index + 1}: ${remarks}` : '')
          .filter(Boolean)
          .join('; ')
      ),
      noOfChildDelivered: row.no_of_child_delivered === null || row.no_of_child_delivered === undefined ? '' : Number(row.no_of_child_delivered),
      expandedNewbornScreening: row.expanded_newborn_screening || '',
      expandedNewbornScreeningResult: row.expanded_newborn_screening_result || '',
      birthPlace: row.birth_place || '',
      birthAttendant: row.birth_attendant || '',
      apgarScore: row.apgar_score || '',
      feedingType: row.feeding_type || '',
      exclusiveBreastfeeding: row.exclusive_breastfeeding || '',
      nutritionNotes: row.nutrition_notes || '',
      fatherName: row.father_name || '',
      relationship: row.relationship || '',
      address: row.address || '',
      medicalConditions: row.medical_conditions || '',
      bcgDate: collectVaccineRecord([row.bcg_date, row.bcg_dose2_date, row.bcg_dose3_date], row.bcg_remarks),
      hepbDate: collectVaccineRecord([row.hepb_date, row.hepb_dose2_date, row.hepb_dose3_date], row.hepb_remarks),
      opvDate: collectVaccineRecord([row.opv_date, row.opv_dose2_date, row.opv_dose3_date], row.opv_remarks),
      dptDate: collectVaccineRecord([row.dpt_date, row.dpt_dose2_date, row.dpt_dose3_date], row.dpt_remarks),
      mmrDate: collectVaccineRecord([row.mmr_date, row.mmr_dose2_date, row.mmr_dose3_date], row.mmr_remarks),
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
      const applyMonitoringData = shouldApplyProgramMonitoringData(params);
      if (applyMonitoringData) {
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
            `SELECT COALESCE(CAST(m.id AS CHAR), CAST(c.id AS CHAR), CAST(ml.beneficiary_id AS CHAR)) AS beneficiary_id,
              LOWER(ml.beneficiary_type) AS beneficiary_type,
                  COUNT(*) AS total_received,
                  COUNT(DISTINCT DATE_FORMAT(ml.monitored_date, '%Y-%m')) AS active_months
           FROM monitoring_logs ml
           INNER JOIN programs p ON p.id = ml.program_id
           LEFT JOIN mothers m ON LOWER(ml.beneficiary_type) = 'mother' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(m.mother_code AS CHAR))))
           LEFT JOIN children c ON LOWER(ml.beneficiary_type) = 'child' AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(c.child_code AS CHAR))))
           WHERE ${benefitConditions.join(' AND ')}
           GROUP BY COALESCE(CAST(m.id AS CHAR), CAST(c.id AS CHAR), CAST(ml.beneficiary_id AS CHAR)),
                    LOWER(ml.beneficiary_type)`,
          benefitValues,
        );
        const benefitMap = new Map(benefitRows.map((row) => [`${row.beneficiary_type}:${String(row.beneficiary_id)}`, row]));
        const programBeneficiaryType = params.programBeneficiaryType || 'Mother and Child';
        normalizedRows.forEach((row) => {
          const targets = resolveProgramReportTargets({
            row,
            granularity: params.granularity,
            programBeneficiaryType,
          });
          const benefitDetails = targets.map(({ type, id }) => benefitMap.get(`${type}:${String(id)}`)).filter(Boolean);
          const totalReceived = benefitDetails.reduce((sum, benefit) => sum + Number(benefit.total_received || 0), 0);
          const activeMonths = benefitDetails.reduce((sum, benefit) => sum + Number(benefit.active_months || 0), 0);
          row.receivedBenefitTotal = totalReceived;
          row.receivedBenefitFrequency = totalReceived;
          row.receivedBenefitAveragePerMonth = activeMonths ? Number((totalReceived / activeMonths).toFixed(1)) : 0;
        });
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
           AND ${childCheckupDateFilter('cc')}
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
        `SELECT mother_id, checkup_date, gestational_age_weeks, bmi,
          referred_to_hospital, lab_assistance_provided, assistance_amount,
          source_of_funds, facility_type
         FROM mother_checkups
         WHERE mother_id IN (${motherIds.map(() => '?').join(',')})
           AND checkup_date IS NOT NULL
           AND ${motherCheckupDateFilter('mother_checkups')}
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
          hospitalReferral: Boolean(checkup.referred_to_hospital),
          labAssistanceProvided: Boolean(checkup.lab_assistance_provided),
          assistanceAmount: checkup.assistance_amount === null || checkup.assistance_amount === undefined
            ? null
            : Number(checkup.assistance_amount),
          sourceOfFunds: checkup.source_of_funds || '',
          facilityType: checkup.facility_type || '',
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
    console.error('[Progress Report] report error:', error);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'db error' : error.message });
  }
});

module.exports = router;
module.exports.resolveProgramReportTargets = resolveProgramReportTargets;
module.exports.shouldApplyProgramMonitoringData = shouldApplyProgramMonitoringData;