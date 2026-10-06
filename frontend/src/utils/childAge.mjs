const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  const dayFirstMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch.map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const utcDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const addCalendarMonths = (date, months) => {
  const absoluteMonth = date.getFullYear() * 12 + date.getMonth() + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth - year * 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Date.UTC(year, month, Math.min(date.getDate(), lastDay));
};

export function getAgeInDays(birthDate, assessmentDate) {
  const birth = parseDate(birthDate);
  const assessment = parseDate(assessmentDate);
  if (!birth || !assessment || utcDay(assessment) < utcDay(birth)) return null;
  const diffMs = assessment.getTime() - birth.getTime();
  return Math.round(diffMs / 86400000);
}

export function getAgeInMonths(birthDate, assessmentDate) {
  if (!birthDate || !assessmentDate) return null;
  const birth = parseDate(birthDate);
  const assessment = parseDate(assessmentDate);
  if (!birth || !assessment || assessment < birth) return null;

  let totalMonths = (assessment.getFullYear() - birth.getFullYear()) * 12
    + (assessment.getMonth() - birth.getMonth());

  if (utcDay(assessment) < addCalendarMonths(birth, totalMonths)) {
    totalMonths -= 1;
  }

  return Math.max(0, totalMonths);
}

export function getAgeInDecimalMonths(birthDate, assessmentDate) {
  if (!birthDate || !assessmentDate) return null;
  const birth = parseDate(birthDate);
  const assessment = parseDate(assessmentDate);
  if (!birth || !assessment || utcDay(assessment) < utcDay(birth)) return null;

  let completeMonths = (assessment.getFullYear() - birth.getFullYear()) * 12
    + (assessment.getMonth() - birth.getMonth());
  let anniversary = addCalendarMonths(birth, completeMonths);
  if (utcDay(assessment) < anniversary) {
    completeMonths -= 1;
    anniversary = addCalendarMonths(birth, completeMonths);
  }

  const nextAnniversary = addCalendarMonths(birth, completeMonths + 1);
  const fraction = (utcDay(assessment) - anniversary) / (nextAnniversary - anniversary);
  return Number((completeMonths + fraction).toFixed(2));
}
