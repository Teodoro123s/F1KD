const CHILD_VACCINE_SEQUENCES = [
  ['bcgDose1', 'bcgDose2', 'bcgDose3'],
  ['hepbDose1', 'hepbDose2', 'hepbDose3'],
  ['ipvDose1', 'ipvDose2', 'ipvDose3'],
  ['opvDose1', 'opvDose2', 'opvDose3'],
  ['pcvDose1', 'pcvDose2', 'pcvDose3'],
  ['dptDose1', 'dptDose2', 'dptDose3'],
  ['mmrDose1', 'mmrDose2', 'mmrDose3'],
];

const NUMERIC_LIMITS = {
  birthWeight: { max: 10, label: 'Birth weight', unit: 'kg' },
  birthLength: { max: 80, label: 'Birth length', unit: 'cm' },
  headCircumference: { max: 60, label: 'Head circumference', unit: 'cm' },
  chestCircumference: { max: 60, label: 'Chest circumference', unit: 'cm' },
  noOfChildDelivered: { max: 20, label: 'Number of children delivered', wholeNumber: true },
};

function parseIsoDate(value) {
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
}

function getChildRecordValidationError(body = {}, today = new Date()) {
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const birthDateValue = String(body.birthDate ?? body.birth_date ?? '').trim();
  const birthDate = birthDateValue ? parseIsoDate(birthDateValue) : null;

  if (!birthDateValue) return 'Birth date is required.';
  if (!birthDate) return 'Enter a valid birth date.';
  if (birthDateValue > todayIso) return 'Birth date cannot be in the future.';

  for (const [field, { max, label, unit, wholeNumber }] of Object.entries(NUMERIC_LIMITS)) {
    const value = String(body[field] ?? '').trim();
    if (!value) continue;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > max || (wholeNumber && !Number.isInteger(number))) {
      const range = unit ? `greater than 0 and no more than ${max} ${unit}` : `a whole number from 1 to ${max}`;
      return `${label} must be ${range}.`;
    }
  }

  const apgarScore = String(body.apgarScore ?? body.apgar_score ?? '').trim();
  if (apgarScore && !/^(?:10|[0-9])(?:\/10)?$/.test(apgarScore)) {
    return 'Apgar score must be from 0 to 10 (for example, 8 or 8/10).';
  }

  for (const fields of CHILD_VACCINE_SEQUENCES) {
    let previousDate = '';
    for (const [index, field] of fields.entries()) {
      const value = String(body[field] ?? '').trim();
      if (!value) {
        previousDate = '';
        continue;
      }
      if (!parseIsoDate(value)) return 'Enter a valid vaccine date.';
      if (value > todayIso) return 'Vaccine date cannot be in the future.';
      if (value < birthDateValue) return "Vaccine date cannot be before the child's birth date.";
      if (index > 0 && !previousDate) return `Enter Dose ${index} date first.`;
      if (previousDate && value < previousDate) return 'Each dose date must be on or after the previous dose.';
      previousDate = value;
    }
  }

  return '';
}

module.exports = { getChildRecordValidationError };
