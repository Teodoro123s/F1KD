import { getPointInterpretation, getPointValue } from '../progressReportConfig';
import { filterInterpretationFields } from './interpretationFields.mjs';
import { growthTableFieldsForMetric, withoutGrowthScores } from './growthTableUtils.mjs';

export { filterInterpretationFields };
export { growthTableFieldsForMetric, withoutGrowthScores };

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
]);

export const MONITORING_HISTORY_EXCLUDED_FIELDS = new Set([
  'progress',
  'totalActivities',
  'activitiesCompleted',
  'weightForAgeInterpretation',
  'pediatricAgeWeeks',
]);

export const pointValueForTableField = (point, field) => {
  if (field.endsWith('Interpretation')) return getPointInterpretation(point, field);
  if (field.endsWith('ZScore')) return getPointValue(point, field);
  if (field === 'heightForAge') return getPointValue(point, 'heightForAge');
  if (field === 'weightForAge') return getPointValue(point, 'weightForAge');
  if (field === 'bmiForAge') return getPointValue(point, 'bmiForAge');
  return getPointValue(point, field);
};