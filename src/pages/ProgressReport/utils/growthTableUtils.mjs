const growthScoreFields = new Set([
  'weightForAgeZScore',
  'lengthForAgeZScore',
  'weightForLengthZScore',
]);

export const withoutGrowthScores = (fields) => fields.filter((field) => !growthScoreFields.has(field));

export const growthTableFieldsForMetric = (metric) => {
  if (metric?.startsWith('weightForLength')) return ['weightForLengthInterpretation'];
  if (metric?.startsWith('weightForAge')) return ['weightForAge', 'weightForAgeInterpretation'];
  if (metric?.startsWith('lengthForAge') || metric?.startsWith('heightForAge')) return ['heightForAge', 'lengthForAgeInterpretation'];
  if (metric === 'bmiForAge') return ['bmiForAge', 'bmiInterpretation'];
  if (metric) return [metric];
  return [];
};
