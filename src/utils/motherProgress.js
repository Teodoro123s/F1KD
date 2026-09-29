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

export function getMotherDocumentProgress(mother = {}) {
  const documentGroups = [
    ['birthCertificate', ['birthCertificateDocumentName', 'birth_certificate_document_name', 'birthCertificateDocumentPath', 'birth_certificate_document_path']],
    ['consent', ['consentDocumentName', 'consent_document_name', 'consentDocumentPath', 'consent_document_path']],
  ];
  const completed = documentGroups.filter(([, keys]) => hasMeaningfulValue(firstMeaningfulValue(...keys.map((key) => mother?.[key])))).length;

  return {
    completed,
    total: documentGroups.length,
    percentage: Math.round((completed / documentGroups.length) * 100),
  };
}

export function getMotherMonitoringStartIndex(mother = {}) {
  const registeredTrimester = String(mother.trimester || mother.trimester_at_registration || '').toLowerCase();
  let startIndex = 0;
  if (registeredTrimester.includes('3rd') || registeredTrimester.includes('third')) startIndex = 6;
  else if (registeredTrimester.includes('2nd') || registeredTrimester.includes('second')) startIndex = 3;
  else {
    const gestationalAge = Number.parseInt(mother.gestationalAge ?? mother.gestational_age, 10);
    if (Number.isFinite(gestationalAge)) {
      if (gestationalAge > 26) startIndex = 6;
      else if (gestationalAge > 12) startIndex = 3;
      else if (gestationalAge > 4) startIndex = 1;
    }
  }

  return startIndex;
}

export function getMotherMonitoringProgress(mother = {}) {
  const startIndex = getMotherMonitoringStartIndex(mother);

  const checkups = Array.isArray(mother.checkups) ? mother.checkups.flat() : [];
  const remainingCheckups = checkups.slice(startIndex);
  const completed = remainingCheckups.filter(Boolean).length;
  const total = Math.max(1, 9 - startIndex);

  return {
    completed,
    total,
    percentage: Math.min(100, Math.round((completed / total) * 100)),
  };
}

export function getMotherProfileProgress(mother = {}) {
  const requiredFieldGroups = [
    ['firstName', ['firstName', 'first_name', 'name']],
    ['middleName', ['middleName', 'middle_name']],
    ['lastName', ['lastName', 'last_name']],
    ['maidenSurname', ['maidenSurname', 'maiden_surname']],
    ['dob', ['dob', 'dateOfBirth']],
    ['contactNumber', ['contactNumber', 'contact_number', 'contact']],
    ['province', ['province']],
    ['city', ['city']],
    ['barangay', ['barangay']],
    ['community', ['community', 'community_name', 'communityName', 'school', 'school_name', 'area']],
    ['group', ['group', 'group_name', 'groupName']],
    ['batch', ['batch', 'batch_name', 'batchName']],
    ['emergencyName', ['emergencyName', 'emergency_name']],
    ['emergencyContact', ['emergencyContact', 'emergency_contact']],
    ['emergencyRelationship', ['emergencyRelationship', 'emergency_relationship']],
    ['lmpDate', ['lmpDate', 'lmp']],
    ['eddDate', ['eddDate', 'edd']],
    ['prenatalRegDate', ['prenatalRegDate', 'prenatal_reg_date']],
    ['trimester', ['trimester']],
    ['gestationalAge', ['gestationalAge', 'gestational_age']],
    ['prenatalWeight', ['prenatalWeight', 'prenatal_weight']],
    ['prenatalBp', ['prenatalBp', 'prenatal_bp']],
    ['prenatalHeight', ['prenatalHeight', 'prenatal_height']],
    ['gravida', ['gravida']],
    ['abortion', ['abortion']],
    ['stillbirth', ['stillbirth']],
    ['otherMedicalHistory', ['otherMedicalHistory', 'other_medical_history']],
    ['dentalCheckupDate', ['dentalCheckupDate', 'dental_checkup_date']],
    ['dentalFacility', ['dentalFacility', 'dental_facility']],
    ['dentistInCharge', ['dentistInCharge', 'dentist_in_charge']],
    ['communityDentist', ['communityDentist', 'community_dentist']],
    ['dentistLicense', ['dentistLicense', 'dentist_license']],
    ['dentistContact', ['dentistContact', 'dentist_contact']],
    ['teethCount', ['teethCount', 'teeth_count']],
    ['dentalFindings', ['dentalFindings', 'dental_findings']],
    ['dentalRemarks', ['dentalRemarks', 'dental_remarks']],
    ['tt1Date', ['tt1Date', 'tt1_date']],
    ['tt1Remarks', ['tt1Remarks', 'tt1_remarks']],
    ['tt2Date', ['tt2Date', 'tt2_date']],
    ['tt2Remarks', ['tt2Remarks', 'tt2_remarks']],
    ['tt3Date', ['tt3Date', 'tt3_date']],
    ['tt3Remarks', ['tt3Remarks', 'tt3_remarks']],
    ['tt4Date', ['tt4Date', 'tt4_date']],
    ['tt4Remarks', ['tt4Remarks', 'tt4_remarks']],
    ['tt5Date', ['tt5Date', 'tt5_date']],
    ['tt5Remarks', ['tt5Remarks', 'tt5_remarks']],
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
