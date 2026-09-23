const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value === true;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item));
  if (typeof value === 'object') return Object.values(value).some((item) => hasMeaningfulValue(item));
  return true;
};
const firstMeaningfulValue = (...values) => values.find(hasMeaningfulValue);

export function getMotherProfileProgress(mother = {}) {
  const requiredFieldGroups = [
    ['firstName', ['firstName', 'first_name', 'name']],
    ['lastName', ['lastName', 'last_name']],
    ['dob', ['dob', 'dateOfBirth']],
    ['province', ['province']],
    ['city', ['city']],
    ['barangay', ['barangay']],
    ['community', ['community', 'community_name']],
    ['lmpDate', ['lmpDate', 'lmp']],
    ['eddDate', ['eddDate', 'edd']],
    ['prenatalRegDate', ['prenatalRegDate', 'prenatal_reg_date']],
    ['trimester', ['trimester']],
    ['gestationalAge', ['gestationalAge', 'gestational_age']],
    ['prenatalWeight', ['prenatalWeight', 'prenatal_weight']],
    ['prenatalBp', ['prenatalBp', 'prenatal_bp']],
    ['prenatalHeight', ['prenatalHeight', 'prenatal_height']],
    ['birthCertificateDocumentName', ['birthCertificateDocumentName', 'birth_certificate_document_name']],
    ['consentDocumentName', ['consentDocumentName', 'consent_document_name']],
  ];

  const completedEntries = requiredFieldGroups.filter(([, keys]) => {
    const value = firstMeaningfulValue(...keys.map((key) => mother?.[key]));
    return hasMeaningfulValue(value);
  });

  const completedFields = completedEntries.length;
  const totalFields = requiredFieldGroups.length;

  if (process.env.NODE_ENV !== 'production' && mother && Object.keys(mother).length > 0) {
    const label = mother.id || mother.motherId || mother.name || `${mother.firstName || ''} ${mother.lastName || ''}`.trim() || 'unnamed-mother';
    const missingFields = requiredFieldGroups
      .filter(([fieldName]) => !completedEntries.some(([entryName]) => entryName === fieldName))
      .map(([fieldName]) => fieldName);

    console.debug('[motherProgress]', {
      label,
      completedFields,
      totalFields,
      missingFields,
    });
  }

  if (totalFields === 0) return 0;
  return Math.min(100, Math.round((completedFields / totalFields) * 100));
}
