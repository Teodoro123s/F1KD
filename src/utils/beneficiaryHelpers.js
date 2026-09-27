export const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const DEFAULT_CHECKUPS = [[null, null, null], [null, null, null], [null, null, null]];
export const getFirstIncompleteCheckup = (checkups = DEFAULT_CHECKUPS) => {
  for (let t = 0; t < 3; t += 1) {
    for (let s = 0; s < 3; s += 1) {
      if (!checkups[t]?.[s]?.completed) {
        return { trimester: t + 1, step: s + 1 };
      }
    }
  }
  return null;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateGestationalDetails = (lmpDate, registrationDate) => {
  const lmp = parseDateOnly(lmpDate);
  if (!lmp) return { gestationalAge: '', trimester: '' };

  const registration = parseDateOnly(registrationDate) || new Date();
  const diffDays = Math.max(0, Math.floor((registration - lmp) / (1000 * 60 * 60 * 24)));
  const gestationalAge = String(Math.floor(diffDays / 7));

  let trimester = '1st Trimester';
  if (gestationalAge > 26) trimester = '3rd Trimester';
  else if (gestationalAge > 12) trimester = '2nd Trimester';

  return { gestationalAge, trimester };
};

export const getInitialCheckups = () => {
  return [[null, null, null], [null, null, null], [null, null, null]];
};

export const getStepStatus = (mother, tIdx, stepIdx, defaultCheckups = DEFAULT_CHECKUPS) => {
  if (!mother) return 'locked';
  const checkups = mother.checkups || defaultCheckups;
  if (checkups[tIdx]?.[stepIdx]?.completed) return 'completed';

  const firstIncomplete = getFirstIncompleteCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete.trimester === tIdx + 1 && firstIncomplete.step === stepIdx + 1) {
    return 'active';
  }

  return 'locked';
};

export const PEDIATRIC_CHECKPOINTS = ['Birth / 0 Weeks', '6 Weeks', '3 Months', '6 Months', '9 Months', '12 Months (48 Weeks)'];
export const DEFAULT_PEDIA_CHECKUPS = Array(PEDIATRIC_CHECKPOINTS.length).fill(null);

export const getFirstIncompletePediaCheckup = (checkups = DEFAULT_PEDIA_CHECKUPS) => {
  for (let i = 0; i < PEDIATRIC_CHECKPOINTS.length; i += 1) {
    if (!checkups[i]?.completed) {
      return i + 1;
    }
  }
  return null;
};

export const getPediaStepStatus = (child, stepIdx) => {
  if (!child) return 'locked';
  const checkups = child.childCheckups || DEFAULT_PEDIA_CHECKUPS;
  if (checkups[stepIdx]?.completed) return 'completed';
  const firstIncomplete = getFirstIncompletePediaCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete === stepIdx + 1) return 'active';
  return 'locked';
};

export const getPediaBmiStatus = (bmi) => {
  const value = parseFloat(bmi);
  if (Number.isNaN(value)) return '';
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Overweight';
  return 'Obese';
};

export const getTrimesterLabelFromCheckups = (checkups = DEFAULT_CHECKUPS) => {
  const firstIncomplete = getFirstIncompleteCheckup(checkups);
  if (!firstIncomplete) return '3rd Trimester';
  return ['1st Trimester', '2nd Trimester', '3rd Trimester'][firstIncomplete.trimester - 1];
};
