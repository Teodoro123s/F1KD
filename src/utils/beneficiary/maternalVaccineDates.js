export const MATERNAL_VACCINE_SEQUENCES = [
  { label: 'Tetanus Toxoid', fields: ['tt1Date', 'tt2Date', 'tt3Date'] },
  { label: 'Influenza', fields: ['influenzaDate', 'influenzaDose2Date', 'influenzaDose3Date'] },
  { label: 'Hepatitis A', fields: ['hepatitisADate', 'hepatitisADose2Date', 'hepatitisADose3Date'] },
  { label: 'Hepatitis B', fields: ['hepatitisBDate', 'hepatitisBDose2Date', 'hepatitisBDose3Date'] },
  { label: 'COVID-19', fields: ['covid19Date', 'covid19Dose2Date', 'covid19Dose3Date'] },
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

export function getMaternalVaccineDateErrors(form = {}, today = new Date()) {
  const errors = {};
  const todayIso = formatLocalDate(today);

  MATERNAL_VACCINE_SEQUENCES.forEach(({ fields }) => {
    let previousDate = '';
    fields.forEach((field, index) => {
      const value = String(form[field] ?? '').trim();
      if (!value) {
        previousDate = '';
        return;
      }

      const date = parseIsoDate(value);
      if (!date) {
        errors[field] = 'Enter a valid vaccine date.';
        previousDate = '';
        return;
      }

      if (index > 0 && !previousDate) {
        errors[field] = `Enter Dose ${index} date first.`;
      } else if (value > todayIso) {
        errors[field] = 'Vaccine date cannot be in the future.';
      } else if (previousDate && value < previousDate) {
        errors[field] = 'Each dose date must be on or after the previous dose.';
      }
      previousDate = value;
    });
  });

  return errors;
}
