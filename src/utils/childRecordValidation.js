export const CHILD_VACCINE_SEQUENCES = [
  ['bcgDose1', 'bcgDose2', 'bcgDose3'],
  ['hepbDose1', 'hepbDose2', 'hepbDose3'],
  ['ipvDose1', 'ipvDose2', 'ipvDose3'],
  ['opvDose1', 'opvDose2', 'opvDose3'],
  ['pcvDose1', 'pcvDose2', 'pcvDose3'],
  ['dptDose1', 'dptDose2', 'dptDose3'],
  ['mmrDose1', 'mmrDose2', 'mmrDose3'],
];

const parseIsoDate = (value) => {
  const match = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date
    : null;
};

const formatLocalDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const NUMERIC_LIMITS = {
  birthWeight: { min: 0, max: 10, label: 'Birth weight', unit: 'kg' },
  birthLength: { min: 0, max: 80, label: 'Birth length', unit: 'cm' },
  headCircumference: { min: 0, max: 60, label: 'Head circumference', unit: 'cm' },
  chestCircumference: { min: 0, max: 60, label: 'Chest circumference', unit: 'cm' },
  noOfChildDelivered: { min: 1, max: 20, label: 'Number of children delivered', unit: '' },
};

export function getChildRecordErrors(form = {}, today = new Date()) {
  const errors = {};
  const todayIso = formatLocalDate(today);
  const birthDateValue = String(form.birthDate ?? '').trim();
  const birthDate = birthDateValue ? parseIsoDate(birthDateValue) : null;

  if (!birthDateValue) errors.birthDate = 'Birth date is required.';
  else if (!birthDate) errors.birthDate = 'Enter a valid birth date.';
  else if (birthDateValue > todayIso) errors.birthDate = 'Birth date cannot be in the future.';

  Object.entries(NUMERIC_LIMITS).forEach(([field, { min, max, label, unit }]) => {
    const value = String(form[field] ?? '').trim();
    if (!value) return;
    const number = Number(value);
    const belowMinimum = field === 'noOfChildDelivered' ? number < min : number <= min;
    if (!Number.isFinite(number) || belowMinimum || number > max
      || (field === 'noOfChildDelivered' && !Number.isInteger(number))) {
      const range = unit ? `${min}–${max} ${unit}` : `${min}–${max}`;
      errors[field] = `${label} must be a valid number between ${range}.`;
    }
  });

  const apgarScore = String(form.apgarScore ?? '').trim();
  if (apgarScore && !/^(?:10|[0-9])(?:\/10)?$/.test(apgarScore)) {
    errors.apgarScore = 'Apgar score must be from 0 to 10 (for example, 8 or 8/10).';
  }

  CHILD_VACCINE_SEQUENCES.forEach((fields) => {
    let previousDate = '';
    fields.forEach((field, index) => {
      const value = String(form[field] ?? '').trim();
      if (!value) {
        previousDate = '';
        return;
      }
      if (!parseIsoDate(value)) {
        errors[field] = 'Enter a valid vaccine date.';
        previousDate = '';
        return;
      }
      if (value > todayIso) errors[field] = 'Vaccine date cannot be in the future.';
      else if (birthDate && value < birthDateValue) errors[field] = "Vaccine date cannot be before the child's birth date.";
      else if (index > 0 && !previousDate) errors[field] = `Enter Dose ${index} date first.`;
      else if (previousDate && value < previousDate) errors[field] = 'Each dose date must be on or after the previous dose.';
      previousDate = value;
    });
  });

  return errors;
}
