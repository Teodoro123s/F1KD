import { getPointInterpretation, getPointValue } from '../progressReportConfig';

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
  'bmiForAgeZScore',
  'headCircumference',
  'headCircumferenceForAgeZScore',
  'armCircumference',
  'armCircumferenceForAgeZScore',
  'tricepsSkinfold',
  'tricepsSkinfoldForAgeZScore',
  'subscapularSkinfold',
  'subscapularSkinfoldForAgeZScore',
]);

export const MONITORING_HISTORY_EXCLUDED_FIELDS = new Set([
  'progress',
  'totalActivities',
  'activitiesCompleted',
  'weightForAgeInterpretation',
  'pediatricAgeWeeks',
]);

export const growthTableFieldsForMetric = (metric) => {
  if (metric?.startsWith('weightForLength')) return ['weightForLengthZScore', 'weightForLengthInterpretation'];
  if (metric?.startsWith('weightForAge')) return ['weightForAge', 'weightForAgeZScore', 'weightForAgeInterpretation'];
  if (metric?.startsWith('lengthForAge') || metric?.startsWith('heightForAge')) return ['heightForAge', 'lengthForAgeZScore', 'lengthForAgeInterpretation'];
  if (metric === 'bmiForAge' || metric === 'bmiInterpretation') return ['bmiForAge', 'bmiInterpretation'];
  if (metric === 'bmiForAgeZScore') return ['bmiForAge', 'bmiForAgeZScore'];
  if (metric === 'headCircumferenceForAgeZScore') return ['headCircumference', metric];
  if (metric === 'armCircumferenceForAgeZScore') return ['armCircumference', metric];
  if (metric === 'tricepsSkinfoldForAgeZScore') return ['tricepsSkinfold', metric];
  if (metric === 'subscapularSkinfoldForAgeZScore') return ['subscapularSkinfold', metric];
  if (metric) return [metric];
  return [];
};

export const pointValueForTableField = (point, field) => {
  if (field.endsWith('Interpretation')) return getPointInterpretation(point, field);
  if (field.endsWith('ZScore')) return getPointValue(point, field);
  if (field === 'heightForAge') return getPointValue(point, 'heightForAge');
  if (field === 'weightForAge') return getPointValue(point, 'weightForAge');
  if (field === 'bmiForAge') return getPointValue(point, 'bmiForAge');
  return getPointValue(point, field);
};