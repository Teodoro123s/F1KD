const DAYS_PER_MONTH = 30.4375;
const WHO_CHILD_GROWTH_MAX_AGE_DAYS = 1826;
const STANDING_HEIGHT_AGE_DAYS = 731;

const parseReference = (raw, measureColumn) => {
  const [headerLine, ...dataLines] = String(raw || '').trim().split(/\r?\n/);
  const headers = headerLine.trim().split(/\s+/);
  const columns = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rows = new Map();

  dataLines.forEach((line) => {
    const values = line.trim().split(/\s+/);
    if (values.length < headers.length) return;
    const sex = Number(values[columns.sex]);
    const measure = Number(values[columns[measureColumn]]);
    rows.set(`${sex}:${measure}`, {
      l: Number(values[columns.l]),
      m: Number(values[columns.m]),
      s: Number(values[columns.s]),
    });
  });

  return rows;
};

const sexCode = (sex) => {
  const normalized = String(sex || '').trim().toLowerCase();
  if (['male', 'm', '1'].includes(normalized)) return 1;
  if (['female', 'f', '2'].includes(normalized)) return 2;
  return null;
};

const utcDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const getAgeInDays = (birthDate, measurementDate) => {
  const birth = utcDate(birthDate);
  const measurement = utcDate(measurementDate);
  if (birth === null || measurement === null || measurement < birth) return null;
  return Math.floor((measurement - birth) / 86400000 + 0.5);
};

const isEligibleAge = (ageInDays) => Number.isFinite(ageInDays)
  && ageInDays >= 0
  && ageInDays <= WHO_CHILD_GROWTH_MAX_AGE_DAYS
  && ageInDays / DAYS_PER_MONTH <= 60;

const calculateLmsScore = (measurement, lms) => {
  const value = Number(measurement);
  if (!Number.isFinite(value) || value <= 0 || !lms) return null;

  const { l, m, s } = lms;
  const zAt = (observedValue) => Math.abs(l) < 1e-8
    ? Math.log(observedValue / m) / s
    : ((observedValue / m) ** l - 1) / (s * l);
  const valueAt = (standardDeviations) => Math.abs(l) < 1e-8
    ? m * Math.exp(s * standardDeviations)
    : m * (1 + l * s * standardDeviations) ** (1 / l);

  let zScore = zAt(value);
  if (!Number.isFinite(zScore)) return null;
  if (zScore > 3) {
    const sd3 = valueAt(3);
    const sd2 = valueAt(2);
    zScore = 3 + (value - sd3) / (sd3 - sd2);
  } else if (zScore < -3) {
    const sd3 = valueAt(-3);
    const sd2 = valueAt(-2);
    zScore = -3 + (value - sd3) / (sd2 - sd3);
  }

  return Number(zScore.toFixed(2));
};

const scoreForAge = (reference, measure, ageInDays, sex) => {
  if (!isEligibleAge(ageInDays) || sex === null) return null;
  const roundedAge = Math.floor(ageInDays + 0.5);
  return calculateLmsScore(measure, reference.get(`${sex}:${roundedAge}`));
};

const scoreForWeightForLengthOrHeight = (weight, lengthHeight, ageInDays, sex, references) => {
  const numericWeight = Number(weight);
  const numericLengthHeight = Number(lengthHeight);
  if (!isEligibleAge(ageInDays) || sex === null || !Number.isFinite(numericWeight) || numericWeight <= 0
    || !Number.isFinite(numericLengthHeight)) return null;

  const useLength = ageInDays < STANDING_HEIGHT_AGE_DAYS;
  const lowerBound = useLength ? 45 : 65;
  const upperBound = useLength ? 110 : 120;
  if (numericLengthHeight < lowerBound || numericLengthHeight > upperBound) return null;

  const scaledLength = numericLengthHeight * 10;
  const lowerTenth = Math.floor(scaledLength + 1e-8);
  const fraction = scaledLength - lowerTenth;
  const reference = useLength ? references.weightForLength : references.weightForHeight;
  const lowerLms = reference.get(`${sex}:${lowerTenth / 10}`);
  if (!lowerLms) return null;

  let lms = lowerLms;
  if (fraction > 1e-8) {
    const upperLms = reference.get(`${sex}:${(lowerTenth + 1) / 10}`);
    if (!upperLms) return null;
    lms = {
      l: lowerLms.l + fraction * (upperLms.l - lowerLms.l),
      m: lowerLms.m + fraction * (upperLms.m - lowerLms.m),
      s: lowerLms.s + fraction * (upperLms.s - lowerLms.s),
    };
  }

  return calculateLmsScore(numericWeight, lms);
};

const weightForAgeInterpretation = (zScore) => {
  if (zScore === null) return '';
  if (zScore < -3) return 'Severely Underweight';
  if (zScore < -2) return 'Underweight';
  if (zScore > 2) return 'High weight-for-age';
  return 'Normal';
};

const weightForLengthInterpretation = (zScore) => {
  if (zScore === null) return '';
  if (zScore < -3) return 'Severely Wasted';
  if (zScore < -2) return 'Wasted';
  if (zScore > 3) return 'Obese';
  if (zScore > 2) return 'Overweight';
  return 'Normal';
};

const lengthForAgeInterpretation = (zScore) => {
  if (zScore === null) return '';
  if (zScore < -3) return 'Severely Stunted';
  if (zScore < -2) return 'Stunted';
  if (zScore > 2) return 'Tall';
  return 'Normal';
};

export const createWhoGrowthStandards = ({ weightForAge, lengthForAge, weightForLength, weightForHeight }) => {
  const references = {
    weightForAge: parseReference(weightForAge, 'age'),
    lengthForAge: parseReference(lengthForAge, 'age'),
    weightForLength: parseReference(weightForLength, 'length'),
    weightForHeight: parseReference(weightForHeight, 'height'),
  };

  return ({ weight, lengthHeight, sex, birthDate, measurementDate }) => {
    const ageInDays = getAgeInDays(birthDate, measurementDate);
    const normalizedSex = sexCode(sex);
    const weightForAgeZScore = scoreForAge(references.weightForAge, weight, ageInDays, normalizedSex);
    const lengthForAgeZScore = scoreForAge(references.lengthForAge, lengthHeight, ageInDays, normalizedSex);
    const weightForLengthZScore = scoreForWeightForLengthOrHeight(weight, lengthHeight, ageInDays, normalizedSex, references);

    return {
      ageInDays,
      weightForAgeZScore,
      weightForLengthZScore,
      lengthForAgeZScore,
      weightForAgeInterpretation: weightForAgeInterpretation(weightForAgeZScore),
      weightForLengthInterpretation: weightForLengthInterpretation(weightForLengthZScore),
      lengthForAgeInterpretation: lengthForAgeInterpretation(lengthForAgeZScore),
    };
  };
};
