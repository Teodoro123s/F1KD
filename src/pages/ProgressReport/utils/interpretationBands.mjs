export const getInterpretationLevels = (metric = '') => {
  const key = String(metric || '').toLowerCase();
  const normalizedKey = key.replace(/[^a-z]/g, '');
  if (normalizedKey.includes('weightforlength') || normalizedKey.includes('weightforheight')) {
    return ['Severe acute malnutrition', 'Moderate acute malnutrition', 'Normal', 'Overweight', 'Obese'];
  }
  if (normalizedKey.includes('weightforage')) {
    return ['Severely Underweight', 'Underweight', 'Normal', 'High weight-for-age'];
  }
  if (normalizedKey.includes('length') || normalizedKey.includes('height')) {
    return ['Severely Stunted', 'Stunted', 'Normal', 'Tall', 'Very Tall'];
  }
  if (normalizedKey.includes('weight')) {
    return ['Severely Underweight', 'Underweight', 'Normal', 'Overweight', 'Obese'];
  }
  return ['Severe acute malnutrition', 'Moderate acute malnutrition', 'Normal', 'Overweight', 'Obese'];
};

export const normalizeNutritionLabel = (value) => {
  const label = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!label) return '';
  const normalized = label.toLowerCase();
  if (['severe acute malnutrition', 'severely wasted', 'severely_wasted', 'severely-wasted'].includes(normalized)) return 'Severe acute malnutrition';
  if (['moderate acute malnutrition', 'acute malnutrition', 'wasted', 'malnourished'].includes(normalized)) return 'Moderate acute malnutrition';
  if (['severely underweight', 'severely_underweight', 'severely-underweight', 'severely below expected', 'severely-below-expected', 'severely_below_expected'].includes(normalized)) return 'Severely Underweight';
  if (['underweight', 'below expected', 'below-expected', 'below_expected'].includes(normalized)) return 'Underweight';
  if (normalized === 'high weight-for-age') return 'High weight-for-age';
  if (['severely stunted', 'severely_stunted', 'severely-stunted'].includes(normalized)) return 'Severely Stunted';
  if (normalized === 'stunted') return 'Stunted';
  if (['tall', 'above expected', 'above-expected', 'above_expected'].includes(normalized)) return 'Tall';
  if (['very tall', 'very_tall', 'very-tall'].includes(normalized)) return 'Very Tall';
  if (['obese', 'severely obese', 'severely_obese', 'severely-obese'].includes(normalized)) return normalized.includes('severely') ? 'Severely Obese' : 'Obese';
  if (normalized === 'overweight') return 'Overweight';
  if (['normal', 'within expected range', 'within expected', 'within_expected', 'normal screening range'].includes(normalized)) return 'Normal';
  return label;
};

export const mapInterpretationToBand = (value, metric) => {
  const normalized = normalizeNutritionLabel(value);
  const bands = getInterpretationLevels(metric);
  if (!normalized) return bands[2];
  const index = bands.indexOf(normalized);
  if (index >= 0) return bands[index];

  const fallbackIndexes = {
    'Severely Obese': 4,
    Obese: 4,
    Overweight: 3,
    Normal: 2,
    Underweight: 1,
    'Severely Underweight': 0,
    'Severely Stunted': 0,
    Stunted: 1,
    Tall: 3,
    'Very Tall': 4,
    'High weight-for-age': bands.length - 1,
    'Severe acute malnutrition': 0,
    'Moderate acute malnutrition': 1,
  };
  return bands[fallbackIndexes[normalized] ?? 2] || bands[2];
};
