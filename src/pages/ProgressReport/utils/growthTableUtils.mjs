const growthScoreFields = new Set([
  'weightForAgeZScore',
  'lengthForAgeZScore',
  'weightForLengthZScore',
]);

export const GROWTH_TABLE_FIELDS = new Set([
  'weightForAge',
  'heightForAge',
  'weightForLengthZScore',
  'weightForLengthInterpretation',
  'weightForAgeZScore',
  'weightForAgeInterpretation',
  'bmiForAge',
  'bmiInterpretation',
  'lengthForAgeZScore',
  'lengthForAgeInterpretation',
  'hospitalReferral',
]);

export const normalizeReferralValue = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return null;
};

export const monitoringDetailValue = (point, field) => {
  if (['hospitalReferral', 'labAssistanceProvided', 'milkSubsidyProvided'].includes(field)) {
    return normalizeReferralValue(point?.[field]);
  }
  return point?.[field] ?? null;
};

export const withoutGrowthScores = (fields) => fields.filter((field) => !growthScoreFields.has(field));

export const growthTableFieldsForMetric = (metric) => {
  if (metric?.startsWith('weightForLength')) return ['weightForLengthInterpretation'];
  if (metric?.startsWith('weightForAge')) return ['weightForAge', 'weightForAgeInterpretation'];
  if (metric?.startsWith('lengthForAge') || metric?.startsWith('heightForAge')) return ['heightForAge', 'lengthForAgeInterpretation'];
  if (metric === 'bmiForAge') return ['bmiForAge', 'bmiInterpretation'];
  if (metric) return [metric];
  return [];
};
