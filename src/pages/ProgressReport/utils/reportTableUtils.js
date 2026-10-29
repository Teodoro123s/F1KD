import { getPointInterpretation, getPointValue } from '../progressReportConfig';
import { filterInterpretationFields } from './interpretationFields.mjs';
import {
  GROWTH_TABLE_FIELDS,
  growthTableFieldsForMetric,
  monitoringDetailValue,
  withoutGrowthScores,
} from './growthTableUtils.mjs';

export { filterInterpretationFields };
export { GROWTH_TABLE_FIELDS, growthTableFieldsForMetric, withoutGrowthScores };

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
  return monitoringDetailValue(point, field);
};