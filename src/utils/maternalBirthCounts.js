const BIRTH_COUNT_FIELDS = [
  ['childrenBornAlive', 'Children Born Alive'],
  ['childrenDiedAfterBirth', 'Children Born Alive but Now Deceased'],
  ['totalChildren', 'Total Children'],
  ['miscarriages', 'Miscarriages'],
];

export function calculateTotalChildren(childrenBornAlive, childrenDiedAfterBirth) {
  const living = String(childrenBornAlive ?? '').trim();
  const deceased = String(childrenDiedAfterBirth ?? '').trim();
  if (!living || !deceased || !/^\d+$/.test(living) || !/^\d+$/.test(deceased)) return '';
  const total = Number(living) + Number(deceased);
  return Number.isSafeInteger(total) ? String(total) : '';
}

export function getMaternalBirthCountErrors(form = {}, { requireAll = false } = {}) {
  const errors = {};
  const counts = {};

  for (const [field, label] of BIRTH_COUNT_FIELDS) {
    const value = String(form[field] ?? '').trim();
    if (!value) {
      if (requireAll) errors[field] = `${label} is required.`;
      continue;
    }
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      errors[field] = `${label} must be a whole number greater than or equal to 0.`;
      continue;
    }
    counts[field] = Number(value);
  }

  if (counts.childrenBornAlive !== undefined && counts.totalChildren !== undefined
    && counts.childrenBornAlive > counts.totalChildren) {
    errors.childrenBornAlive = 'Cannot exceed Total Children.';
  }
  if (counts.childrenDiedAfterBirth !== undefined && counts.totalChildren !== undefined
    && counts.childrenDiedAfterBirth > counts.totalChildren) {
    errors.childrenDiedAfterBirth = 'Cannot exceed Total Children.';
  }
  if (counts.totalChildren !== undefined
    && counts.childrenBornAlive !== undefined
    && counts.childrenDiedAfterBirth !== undefined
    && counts.totalChildren !== counts.childrenBornAlive + counts.childrenDiedAfterBirth) {
    errors.totalChildren = 'Must equal Children Born Alive plus Children Born Alive but Now Deceased.';
  }

  return errors;
}

export function hasMiscarriageHighRiskCount(form = {}) {
  const miscarriages = Number(form.miscarriages);
  return String(form.miscarriages ?? '').trim() !== ''
    && Number.isInteger(miscarriages)
    && miscarriages >= 3;
}
