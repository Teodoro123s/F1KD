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

export function getAgeAtDate(dateOfBirth, targetDate) {
  const birth = parseIsoDate(dateOfBirth);
  const target = parseIsoDate(targetDate);
  if (!birth || !target || target < birth) return null;

  let age = target.getUTCFullYear() - birth.getUTCFullYear();
  if (target.getUTCMonth() < birth.getUTCMonth()
    || (target.getUTCMonth() === birth.getUTCMonth() && target.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function hasMaternalHighRiskTriggers(form = {}) {
  const ageAtDelivery = getAgeAtDate(form.dob, form.eddDate);
  const medicalConditions = form.medicalConditions || {};
  const hasHighRiskCondition = [
    'prevCesarean',
    'hypertension',
    'diabetes',
    'eclampsia',
    'heartDisease',
  ].some((condition) => Boolean(medicalConditions[condition]));

  return Number(form.miscarriages) >= 3
    || (ageAtDelivery !== null && (ageAtDelivery < 19 || ageAtDelivery >= 35))
    || hasHighRiskCondition;
}
