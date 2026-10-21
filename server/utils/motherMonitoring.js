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

function getMotherRegistrationGestationalAge({
  lmpDate,
  prenatalRegDate,
  gestationalAge,
  trimester,
} = {}) {
  if (lmpDate && prenatalRegDate) {
    const lmp = new Date(`${String(lmpDate).slice(0, 10)}T00:00:00Z`);
    const registration = new Date(`${String(prenatalRegDate).slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(lmp.getTime()) && !Number.isNaN(registration.getTime()) && registration >= lmp) {
      return Math.floor((registration - lmp) / (7 * 24 * 60 * 60 * 1000));
    }
  }

  const parsedAge = Number.parseInt(gestationalAge, 10);
  if (Number.isFinite(parsedAge) && parsedAge > 0) return parsedAge;

  if (String(trimester || '').toLowerCase().includes('3rd') || String(trimester || '').toLowerCase().includes('third')) return 28;
  if (String(trimester || '').toLowerCase().includes('2nd') || String(trimester || '').toLowerCase().includes('second')) return 16;
  return 8;
}

function getMotherInitialCheckupSlot(gestationalAge) {
  return MATERNAL_CHECKUP_STEPS.find((step) => step.week >= gestationalAge)
    || MATERNAL_CHECKUP_STEPS[MATERNAL_CHECKUP_STEPS.length - 1];
}

function motherRegistrationWeeksSql(alias = 'm') {
  return `COALESCE(
    CASE
      WHEN ${alias}.lmp_date IS NOT NULL
        AND ${alias}.prenatal_reg_date IS NOT NULL
        AND ${alias}.prenatal_reg_date >= ${alias}.lmp_date
      THEN TIMESTAMPDIFF(WEEK, ${alias}.lmp_date, ${alias}.prenatal_reg_date)
    END,
    NULLIF(${alias}.gestational_age, 0),
    CASE
      WHEN LOWER(${alias}.trimester) LIKE '%3rd%' OR LOWER(${alias}.trimester) LIKE '%third%' THEN 28
      WHEN LOWER(${alias}.trimester) LIKE '%2nd%' OR LOWER(${alias}.trimester) LIKE '%second%' THEN 16
      ELSE 8
    END
  )`;
}

function motherExpectedCheckupsSql(alias = 'm') {
  const registrationWeeks = motherRegistrationWeeksSql(alias);
  return `(CASE
    WHEN ${registrationWeeks} <= 8 THEN 9
    WHEN ${registrationWeeks} <= 10 THEN 8
    WHEN ${registrationWeeks} <= 12 THEN 7
    WHEN ${registrationWeeks} <= 16 THEN 6
    WHEN ${registrationWeeks} <= 20 THEN 5
    WHEN ${registrationWeeks} <= 24 THEN 4
    WHEN ${registrationWeeks} <= 28 THEN 3
    WHEN ${registrationWeeks} <= 32 THEN 2
    ELSE 1
  END)`;
}

function motherMonitoringTotalSql(alias = 'm') {
  const registrationWeeks = motherRegistrationWeeksSql(alias);
  const priorCheckupWeek = `CASE
    WHEN prior_mc.trimester = '1st Trimester' THEN 6 + (prior_mc.checkup_number * 2)
    WHEN prior_mc.trimester = '2nd Trimester' THEN 12 + (prior_mc.checkup_number * 4)
    WHEN prior_mc.trimester = '3rd Trimester' THEN 24 + (prior_mc.checkup_number * 4)
    ELSE NULL
  END`;
  return `(${motherExpectedCheckupsSql(alias)} + (
    SELECT COUNT(*)
    FROM mother_checkups prior_mc
    WHERE prior_mc.mother_id = ${alias}.id
      AND ${priorCheckupWeek} < ${registrationWeeks}
  ))`;
}

function motherInitialCheckupDueSql(alias = 'm') {
  const firstCheckpointWeek = `CASE
    WHEN LOWER(${alias}.trimester) LIKE '%3rd%' OR LOWER(${alias}.trimester) LIKE '%third%' THEN 28
    WHEN LOWER(${alias}.trimester) LIKE '%2nd%' OR LOWER(${alias}.trimester) LIKE '%second%' THEN 16
    ELSE 8
  END`;
  return `(${motherRegistrationWeeksSql(alias)} <= ${firstCheckpointWeek})`;
}

module.exports = {
  getMotherInitialCheckupSlot,
  getMotherRegistrationGestationalAge,
  motherExpectedCheckupsSql,
  motherInitialCheckupDueSql,
  motherMonitoringTotalSql,
};
