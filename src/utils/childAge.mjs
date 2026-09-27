const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const date = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function getAgeInDays(birthDate, assessmentDate) {
  const birth = parseDate(birthDate);
  const assessment = parseDate(assessmentDate);
  if (!birth || !assessment || assessment < birth) return null;
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

  if (assessment.getDate() < birth.getDate()) {
    totalMonths -= 1;
  }

  return Math.max(0, totalMonths);
}

export function getAgeInHalfMonths(birthDate, assessmentDate) {
  if (!birthDate || !assessmentDate) return null;
  const birth = parseDate(birthDate);
  const assessment = parseDate(assessmentDate);
  if (!birth || !assessment || assessment < birth) return null;

  let completeMonths = (assessment.getFullYear() - birth.getFullYear()) * 12
    + (assessment.getMonth() - birth.getMonth());

  if (assessment.getDate() < birth.getDate()) {
    completeMonths -= 1;
  }

  const anniversary = new Date(birth);
  anniversary.setMonth(anniversary.getMonth() + completeMonths);
  const remainingDays = Math.max(0, Math.floor((assessment - anniversary) / 86400000));

  return completeMonths + (remainingDays >= 15 ? 0.5 : 0);
}
