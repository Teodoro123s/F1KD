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
    firstValue(child.exclusiveBreastfeeding, child.exclusive_breastfeeding),
    firstValue(child.expandedNewbornScreening, child.expanded_newborn_screening),
    firstValue(child.expandedNewbornScreeningResult, child.expanded_newborn_screening_result),
    firstValue(child.birthAttendant, child.birth_attendant),
    firstValue(child.apgarScore, child.apgar_score),
    firstValue(child.feedingType, child.feeding_type),
    firstValue(child.nutritionNotes, child.nutrition_notes),
  ].filter((value) => hasMeaningfulValue(value)).length;

  return Math.round((completedFields / 18) * 100);
}

export function getChildMonitoringProgress(child = {}) {
  const completed = Array.isArray(child.completedWeeks) ? child.completedWeeks.length : 0;
  const total = 24;
  return {
    completed,
    total,
    percentage: Math.min(100, Math.round((completed / total) * 100)),
  };
}
