export const normalizeProgramBeneficiaryType = (value) => String(value || 'Mother')
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/\s+/g, ' ');

export const supportsBeneficiaryType = (programType, beneficiaryType) => {
  const normalizedType = normalizeProgramBeneficiaryType(programType);
  return normalizedType === beneficiaryType || normalizedType === 'mother and child';
};

export const isReceiptReceived = (value) => value === true || value === 1 || value === '1' || value === 'true';

export const getBeneficiaryName = (beneficiary, beneficiaryType) => {
  const firstName = beneficiary?.firstName || beneficiary?.first_name || '';
  const middleName = beneficiary?.middleName || beneficiary?.middle_name || '';
  const lastName = beneficiary?.lastName || beneficiary?.last_name || '';
  const suffix = beneficiary?.suffix || '';
  const name = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim();
  return name || (beneficiaryType === 'mother' ? 'Mother' : 'Child');
};
