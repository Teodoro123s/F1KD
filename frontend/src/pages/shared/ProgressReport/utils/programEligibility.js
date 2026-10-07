export function normalizeProgramBeneficiaryType(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ');
}

export function matchesProgramBeneficiaryType(program, selectedType) {
  const programType = normalizeProgramBeneficiaryType(
    program?.beneficiaryType || program?.beneficiary_type || 'Mother and Child'
  );
  const normalizedSelectedType = normalizeProgramBeneficiaryType(selectedType);

  if (!normalizedSelectedType || normalizedSelectedType === 'all') {
    return true;
  }

  if (programType === 'mother and child') {
    return true;
  }

  return programType === normalizedSelectedType;
}
