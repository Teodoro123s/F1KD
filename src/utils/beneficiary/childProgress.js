const hasMeaningfulValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const firstValue = (...values) => values.find(hasMeaningfulValue);

export function getChildProfileProgress(child = {}) {
  const completedFields = [
    // General
    firstValue(child.firstName, child.first_name, child.name),
    firstValue(child.middleName, child.middle_name),
    firstValue(child.lastName, child.last_name),
    firstValue(child.birthDate, child.birth_date),
    firstValue(child.gender),
    // Prenatal / OB
    firstValue(child.birthWeight, child.birth_weight),
    firstValue(child.birthLength, child.birth_length),
    firstValue(child.bloodType, child.blood_type),
    firstValue(child.noOfChildDelivered, child.no_of_child_delivered),
    firstValue(child.multipleBirthType, child.multiple_birth_type),
    firstValue(child.deliveryType, child.delivery_type),
    firstValue(child.expandedNewbornScreening, child.expanded_newborn_screening),
    firstValue(child.birthAttendant, child.birth_attendant),
    firstValue(child.apgarScore, child.apgar_score),
    firstValue(child.nutritionNotes, child.nutrition_notes),
  ].filter((value) => hasMeaningfulValue(value)).length;

  return Math.round((completedFields / 15) * 100);
}

export function getChildDocumentProgress(child = {}) {
  const documentName = [child.birthDocumentName, child.birth_document_name].find(hasMeaningfulValue);
  const documentPath = [child.birthDocumentPath, child.birth_document_path].find(hasMeaningfulValue);
  const hasBirthDocument = hasMeaningfulValue(documentName) && hasMeaningfulValue(documentPath);

  return {
    completed: hasBirthDocument ? 1 : 0,
    total: 1,
    percentage: hasBirthDocument ? 100 : 0,
  };
}

export function getChildMonitoringProgress(child = {}) {
  const checkupWeeks = Array.isArray(child.checkups)
    ? child.checkups.flat(Infinity).map((checkup) => checkup?.weekNumber ?? checkup?.week_number)
    : [];
  const completed = new Set([
    ...(Array.isArray(child.completedWeeks) ? child.completedWeeks : []),
    ...checkupWeeks,
  ]
    .map(Number)
    .filter((week) => Number.isInteger(week) && week >= 1 && week <= 24)).size;
  const total = 24;
  return {
    completed,
    total,
    percentage: Math.min(100, Math.round((completed / total) * 100)),
  };
}
