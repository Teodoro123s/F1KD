const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

export function getMotherProfileProgress(mother = {}) {
  const completedFields = [
    firstValue(mother.firstName, mother.first_name, mother.name),
    firstValue(mother.middleName, mother.middle_name),
    firstValue(mother.lastName, mother.last_name),
    firstValue(mother.maidenSurname, mother.maiden_surname),
    firstValue(mother.dob, mother.dateOfBirth),
    firstValue(mother.contactNumber, mother.contact_number, mother.contact),
    firstValue(mother.province, mother.city, mother.barangay, mother.address, mother.area),
    firstValue(mother.community, mother.community_name),
    firstValue(mother.group, mother.group_name),
    firstValue(mother.batch, mother.batch_name),
    firstValue(mother.emergencyName, mother.emergency_name),
    firstValue(mother.emergencyContact, mother.emergency_contact),
    firstValue(mother.emergencyRelationship, mother.emergency_relationship),
    firstValue(mother.lmpDate, mother.lmp),
    firstValue(mother.eddDate, mother.edd),
    firstValue(mother.prenatalRegDate, mother.prenatal_reg_date),
    firstValue(mother.trimester),
    firstValue(mother.gestationalAge, mother.gestational_age),
    firstValue(mother.prenatalWeight, mother.prenatal_weight),
    firstValue(mother.prenatalBp, mother.prenatal_bp),
    firstValue(mother.prenatalHeight, mother.prenatal_height),
    firstValue(mother.gravida),
    firstValue(mother.para),
    firstValue(mother.abortion),
    firstValue(mother.stillbirth),
  ].filter(Boolean).length;

  return Math.round((completedFields / 24) * 100);
}
