export const MATERNAL_PROGRESS_REPORT_FIELD_LIBRARY = [
  { id: 'name', label: 'Beneficiary Name', category: 'Demographics' },
  { id: 'id', label: 'ID', category: 'System' },
  { id: 'phone', label: 'Phone', category: 'Demographics' },
  { id: 'dob', label: 'Date of Birth', category: 'Demographics' },
  { id: 'community', label: 'Community', category: 'Demographics' },
  { id: 'group', label: 'Group', category: 'Demographics' },
  { id: 'batch', label: 'Batch', category: 'Demographics' },
  { id: 'programType', label: 'Program Type', category: 'Programs' },
  { id: 'status', label: 'Status', category: 'System' },
  { id: 'risk', label: 'Risk Status', category: 'System' },
  { id: 'trimester', label: 'Trimester', category: 'Pregnancy' },
  { id: 'gestationalAge', label: 'Gestational Age', category: 'Pregnancy' },
  { id: 'lmpDate', label: 'LMP Date', category: 'Pregnancy' },
  { id: 'eddDate', label: 'EDD', category: 'Pregnancy' },
  { id: 'prenatalRegDate', label: 'Prenatal Registration', category: 'Pregnancy' },
  { id: 'prenatalWeight', label: 'Prenatal Weight', category: 'Vitals' },
  { id: 'prenatalBp', label: 'Blood Pressure', category: 'Vitals' },
  { id: 'prenatalHeight', label: 'Prenatal Height', category: 'Vitals' },
  { id: 'fundalHeight', label: 'Fundal Height', category: 'Vitals' },
  { id: 'fhr', label: 'FHR', category: 'Vitals' },
  { id: 'weight', label: 'Weight', category: 'Vitals' },
  { id: 'height', label: 'Height', category: 'Vitals' },
  { id: 'bmi', label: 'BMI', category: 'Vitals' },
  { id: 'gravida', label: 'Gravida', category: 'Obstetric History' },
  { id: 'para', label: 'Para', category: 'Obstetric History' },
  { id: 'abortion', label: 'Abortions', category: 'Obstetric History' },
  { id: 'stillbirth', label: 'Stillbirths', category: 'Obstetric History' },
  { id: 'emergencyName', label: 'Emergency Contact Name', category: 'Pregnancy' },
  { id: 'emergencyContact', label: 'Emergency Contact Number', category: 'Pregnancy' },
  { id: 'emergencyRelationship', label: 'Emergency Contact Relationship', category: 'Pregnancy' },
  { id: 'spouseName', label: 'Spouse Name', category: 'Demographics' },
  { id: 'medicalConditions', label: 'Medical Conditions', category: 'Pregnancy' },
  { id: 'otherMedicalHistory', label: 'Other Medical History', category: 'Pregnancy' },
  { id: 'tt1Date', label: 'TT1', category: 'Immunizations' },
  { id: 'tt2Date', label: 'TT2', category: 'Immunizations' },
  { id: 'tt3Date', label: 'TT3', category: 'Immunizations' },
  { id: 'tt4Date', label: 'TT4', category: 'Immunizations' },
  { id: 'tt5Date', label: 'TT5', category: 'Immunizations' },
  { id: 'dentalCheckupDate', label: 'Oral Health Check Date', category: 'Documents' },
  { id: 'dentalFacility', label: 'Oral Health Facility', category: 'Documents' },
  { id: 'dentalFindings', label: 'Oral Health Findings', category: 'Documents' },
  { id: 'dentalRemarks', label: 'Oral Health Remarks', category: 'Documents' },
  { id: 'birthCertificateDocumentName', label: 'Birth Certificate', category: 'Documents' },
  { id: 'consentDocumentName', label: 'Consent Form', category: 'Documents' },
  { id: 'assessment', label: 'Last Assessment', category: 'System' },
  { id: 'progress', label: 'Progress %', category: 'System' },
  { id: 'trend', label: 'Trend', category: 'System' },
  { id: 'createdAt', label: 'Created At', category: 'System' },
  { id: 'age', label: 'Age', category: 'Demographics' },
  { id: 'gpa', label: 'GPA', category: 'Obstetric History' },
  { id: 'vaccines', label: 'Vaccines', category: 'Immunizations' },
  { id: 'oralHealth', label: 'Oral Health', category: 'Documents' },
  { id: 'programs', label: 'Programs', category: 'Programs' },
  { id: 'documents', label: 'Documents', category: 'Documents' },
];

export const CHILD_PROGRESS_REPORT_FIELD_LIBRARY = [
  { id: 'name', label: 'Child Name', category: 'Demographics' },
  { id: 'id', label: 'ID', category: 'System' },
  { id: 'dob', label: 'Date of Birth', category: 'Demographics' },
  { id: 'age', label: 'Age', category: 'Demographics' },
  { id: 'community', label: 'Community', category: 'Demographics' },
  { id: 'group', label: 'Group', category: 'Demographics' },
  { id: 'batch', label: 'Batch', category: 'Demographics' },
  { id: 'programType', label: 'Program Type', category: 'Programs' },
  { id: 'status', label: 'Status', category: 'System' },
  { id: 'risk', label: 'Risk Status', category: 'System' },
  { id: 'pediatricWeek', label: 'Pedia Week', category: 'Growth & Monitoring' },
  { id: 'zScore', label: 'Z-Score', category: 'Growth & Monitoring' },
  { id: 'nutritionalStatus', label: 'Nutritional Status', category: 'Growth & Monitoring' },
  { id: 'feedingType', label: 'Feeding Program', category: 'Programs' },
  { id: 'exclusiveBreastfeeding', label: 'Exclusive Breastfeeding', category: 'Programs' },
  { id: 'bcgDate', label: 'BCG', category: 'Immunizations' },
  { id: 'opvDate', label: 'OPV', category: 'Immunizations' },
  { id: 'dptDate', label: 'DPT', category: 'Immunizations' },
  { id: 'assessment', label: 'Last Assessment', category: 'System' },
  { id: 'progress', label: 'Progress %', category: 'System' },
  { id: 'trend', label: 'Trend', category: 'System' },
  { id: 'source', label: 'Source', category: 'System' },
];

export const PROGRESS_REPORT_FIELD_LIBRARY = MATERNAL_PROGRESS_REPORT_FIELD_LIBRARY;
export const REPORT_COLUMNS = MATERNAL_PROGRESS_REPORT_FIELD_LIBRARY;

export const REPORT_TABS = ['Master List', 'Ranked List', 'Graph View'];

export const MATERNAL_ROLE_DEFAULT_COLUMNS = {
  default: ['name', 'id', 'community', 'group', 'batch', 'trimester', 'progress', 'trend'],
  nurse: ['name', 'id', 'phone', 'community', 'group', 'batch', 'trimester', 'gestationalAge', 'prenatalBp', 'bmi', 'tt1Date', 'tt2Date', 'tt3Date', 'dentalCheckupDate', 'progress'],
  'program manager': ['name', 'id', 'community', 'group', 'batch', 'programType', 'status', 'risk', 'trimester', 'progress', 'trend', 'documents'],
  admin: ['name', 'id', 'community', 'group', 'batch', 'phone', 'programType', 'status', 'risk', 'tt1Date', 'tt2Date', 'tt3Date', 'dentalCheckupDate', 'progress'],
};

export const CHILD_ROLE_DEFAULT_COLUMNS = {
  default: ['name', 'id', 'community', 'group', 'batch', 'pediatricWeek', 'progress', 'trend'],
  nurse: ['name', 'id', 'community', 'group', 'batch', 'pediatricWeek', 'zScore', 'nutritionalStatus', 'feedingType', 'bcgDate', 'opvDate', 'dptDate', 'progress'],
  'program manager': ['name', 'id', 'community', 'group', 'batch', 'programType', 'status', 'risk', 'pediatricWeek', 'nutritionalStatus', 'feedingType', 'progress', 'trend'],
  admin: ['name', 'id', 'community', 'group', 'batch', 'status', 'risk', 'pediatricWeek', 'zScore', 'feedingType', 'bcgDate', 'opvDate', 'dptDate', 'progress'],
};

export const ROLE_DEFAULT_COLUMNS = MATERNAL_ROLE_DEFAULT_COLUMNS;

export function getDefaultVisibleColumns(role, entityType = 'Mothers') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const defaults = entityType === 'Children' ? CHILD_ROLE_DEFAULT_COLUMNS : MATERNAL_ROLE_DEFAULT_COLUMNS;
  if (normalizedRole.includes('nurse')) return defaults.nurse;
  if (normalizedRole.includes('manager') || normalizedRole.includes('program')) return defaults['program manager'];
  if (normalizedRole.includes('admin') || normalizedRole.includes('superadmin')) return defaults.admin;
  return defaults.default;
}

export function getReportColumnsForEntity(entityType = 'Mothers') {
  return entityType === 'Children' ? CHILD_PROGRESS_REPORT_FIELD_LIBRARY : MATERNAL_PROGRESS_REPORT_FIELD_LIBRARY;
}

export function getFieldGroups(entityType = 'Mothers') {
  return entityType === 'Children'
    ? ['Demographics', 'Growth & Monitoring', 'Immunizations', 'Programs', 'System']
    : ['Demographics', 'Pregnancy', 'Vitals', 'Obstetric History', 'Immunizations', 'Documents', 'Programs', 'System'];
}

export function getFieldById(fieldId) {
  return [...MATERNAL_PROGRESS_REPORT_FIELD_LIBRARY, ...CHILD_PROGRESS_REPORT_FIELD_LIBRARY].find((field) => field.id === fieldId) || null;
}

export function getColumnValue(row, fieldId) {
  const value = row?.[fieldId];
  if (fieldId === 'name') return row?.name || '';
  if (fieldId === 'id') return row?.id || '';
  if (fieldId === 'phone') return row?.phone || row?.contactNumber || row?.source?.contactNumber || '';
  if (fieldId === 'dob') return row?.dob || row?.source?.dob || '';
  if (fieldId === 'community') return row?.community || row?.source?.community || '';
  if (fieldId === 'group') return row?.group || row?.source?.group || '';
  if (fieldId === 'batch') return row?.batch || row?.source?.batch || '';
  if (fieldId === 'programType') return row?.programType || row?.source?.programType || '';
  if (fieldId === 'status') return row?.status || row?.source?.status || 'Active';
  if (fieldId === 'risk') return row?.risk ? 'High Risk' : 'Low Risk';
  if (fieldId === 'gestationalAge') return row?.gestationalAge || row?.source?.gestationalAge || '';
  if (fieldId === 'lmpDate') return row?.lmpDate || row?.source?.lmpDate || '';
  if (fieldId === 'eddDate') return row?.eddDate || row?.source?.eddDate || '';
  if (fieldId === 'prenatalRegDate') return row?.prenatalRegDate || row?.source?.prenatalRegDate || '';
  if (fieldId === 'prenatalWeight') return row?.prenatalWeight || row?.source?.prenatalWeight || '';
  if (fieldId === 'prenatalBp') return row?.prenatalBp || row?.source?.prenatalBp || '';
  if (fieldId === 'prenatalHeight') return row?.prenatalHeight || row?.source?.prenatalHeight || '';
  if (fieldId === 'fundalHeight') return row?.fundalHeight || row?.source?.fundalHeight || '';
  if (fieldId === 'fhr') return row?.fhr || row?.source?.fhr || '';
  if (fieldId === 'weight') return row?.weight || row?.source?.weight || '';
  if (fieldId === 'height') return row?.height || row?.source?.height || '';
  if (fieldId === 'bmi') return row?.bmi || row?.source?.bmi || '';
  if (fieldId === 'gravida') return row?.gravida ?? row?.source?.gravida ?? '';
  if (fieldId === 'para') return row?.para ?? row?.source?.para ?? '';
  if (fieldId === 'abortion') return row?.abortion ?? row?.source?.abortion ?? '';
  if (fieldId === 'stillbirth') return row?.stillbirth ?? row?.source?.stillbirth ?? '';
  if (fieldId === 'emergencyName') return row?.emergencyName || row?.source?.emergencyName || '';
  if (fieldId === 'emergencyContact') return row?.emergencyContact || row?.source?.emergencyContact || '';
  if (fieldId === 'emergencyRelationship') return row?.emergencyRelationship || row?.source?.emergencyRelationship || '';
  if (fieldId === 'spouseName') return row?.spouseName || row?.source?.spouseName || '';
  if (fieldId === 'medicalConditions') return Array.isArray(row?.medicalConditions) ? row.medicalConditions.join(', ') : (row?.medicalConditions ? Object.keys(row.medicalConditions).filter((key) => row.medicalConditions[key]).join(', ') : '');
  if (fieldId === 'otherMedicalHistory') return row?.otherMedicalHistory || row?.source?.otherMedicalHistory || '';
  if (fieldId === 'tt1Date') return row?.tt1Date || row?.source?.tt1Date || '';
  if (fieldId === 'tt2Date') return row?.tt2Date || row?.source?.tt2Date || '';
  if (fieldId === 'tt3Date') return row?.tt3Date || row?.source?.tt3Date || '';
  if (fieldId === 'tt4Date') return row?.tt4Date || row?.source?.tt4Date || '';
  if (fieldId === 'tt5Date') return row?.tt5Date || row?.source?.tt5Date || '';
  if (fieldId === 'dentalCheckupDate') return row?.dentalCheckupDate || row?.source?.dentalCheckupDate || '';
  if (fieldId === 'dentalFacility') return row?.dentalFacility || row?.source?.dentalFacility || '';
  if (fieldId === 'dentalFindings') return row?.dentalFindings || row?.source?.dentalFindings || '';
  if (fieldId === 'dentalRemarks') return row?.dentalRemarks || row?.source?.dentalRemarks || '';
  if (fieldId === 'birthCertificateDocumentName') return row?.birthCertificateDocumentName || row?.source?.birthCertificateDocumentName || '';
  if (fieldId === 'consentDocumentName') return row?.consentDocumentName || row?.source?.consentDocumentName || '';
  if (fieldId === 'assessment') return row?.assessment || '';
  if (fieldId === 'progress') return row?.progress ?? 0;
  if (fieldId === 'trend') return row?.trend || 'down';
  if (fieldId === 'createdAt') return row?.createdAt || row?.source?.createdAt || '';
  if (fieldId === 'age') return row?.age ?? '';
  if (fieldId === 'gpa') return row?.gpa ?? row?.source?.gpa ?? '';
  if (fieldId === 'vaccines') return row?.vaccines || row?.source?.vaccines || '';
  if (fieldId === 'oralHealth') return row?.oralHealth || row?.source?.oralHealth || '';
  if (fieldId === 'programs') return row?.programs || row?.source?.programs || '';
  if (fieldId === 'documents') return row?.documents || row?.source?.documents || '';
  if (value === undefined || value === null || value === '') return '';
  return value;
}

export const SEARCH_FILTER_RULES = [
  { id: 'risk', pattern: /\bhigh risk\b/i, label: 'Risk: High' },
  { id: 'trimester', pattern: /\b(1st|2nd|3rd) trimester\b/i, getLabel: (match) => `Trimester: ${match[1]}` },
  { id: 'progress', pattern: /\bprogress\s+(0\s*[-to]+\s*25|26\s*[-to]+\s*50|51\s*[-to]+\s*75|76\s*[-to]+\s*100)\s*%?/i, getLabel: (match) => `Progress: ${match[1].replace(/\s+/g, '')}%` },
  { id: 'bmi', pattern: /\b(underweight|normal|overweight|obese)\b/i, getLabel: (match) => `BMI: ${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}` },
  { id: 'birth-cert', pattern: /\bmissing birth cert(?:ificate)?\b/i, label: 'Missing: Birth Cert' },
  { id: 'consent', pattern: /\bmissing consent\b/i, label: 'Missing: Consent' },
  { id: 'vaccine', pattern: /\bmissing (TT[1-5])\b/i, getLabel: (match) => `Vaccine: ${match[1].toUpperCase()} Missing` },
  { id: 'dental', pattern: /\bdental done\b/i, label: 'Dental: Completed' },
  { id: 'gpa', pattern: /\bprimigravida\b/i, label: 'Gravida: 1' },
];

export const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';

export const formatDelta = (current, previous) => {
  const delta = Number(current) - Number(previous);
  return Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${delta}%` : 'No comparable value';
};

export const fullName = (item) => item.name || [item.firstName || item.first_name, item.middleName || item.middle_name, item.lastName || item.last_name].filter(Boolean).join(' ') || 'Unnamed beneficiary';

export const hasValue = (value) => value !== undefined && value !== null && value !== '';

export const normalizeToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const matchesEntityToken = (value, token) => {
  const normalizedValue = normalizeToken(value);
  const normalizedToken = normalizeToken(token);
  return normalizedValue === normalizedToken || normalizedValue.endsWith(normalizedToken);
};

export const getBmiCategory = (value) => {
  const bmi = Number(value);
  if (!Number.isFinite(bmi)) return 'Not recorded';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export function getInitialCheckup(mother) {
  return Array.isArray(mother.checkups)
    ? mother.checkups.flat().filter((checkup) => checkup?.checkupDate).sort((a, b) => new Date(a.checkupDate) - new Date(b.checkupDate))[0] || null
    : null;
}

export function normalizeMother(mother) {
  const initialCheckup = getInitialCheckup(mother);
  const completed = Array.isArray(mother.checkups) ? mother.checkups.flat().filter(Boolean).length : 0;
  const progress = Number.isFinite(Number(mother.progress)) ? Number(mother.progress) : Math.round((completed / 9) * 100);
  const dob = mother.dob || mother.birthDate || '';
  const age = dob ? Math.max(0, new Date().getFullYear() - new Date(dob).getFullYear()) : '';
  const vaccines = [mother.tt1Date, mother.tt2Date, mother.tt3Date, mother.tt4Date, mother.tt5Date].filter(Boolean);

  return {
    id: mother.motherId || mother.id,
    name: fullName(mother),
    phone: mother.contactNumber || mother.phone || '',
    dob,
    age,
    community: mother.community || mother.area || '',
    school: mother.community || mother.area || '',
    group: mother.group || '',
    batch: mother.batch || '',
    programType: mother.programType || '',
    status: mother.status || 'Active',
    trimester: mother.trimester || 'Not recorded',
    gestationalAge: mother.gestationalAge || '',
    lmpDate: mother.lmpDate || '',
    eddDate: mother.eddDate || '',
    prenatalRegDate: mother.prenatalRegDate || '',
    prenatalWeight: mother.prenatalWeight || '',
    prenatalBp: mother.prenatalBp || mother.bloodPressure || '',
    prenatalHeight: mother.prenatalHeight || '',
    fundalHeight: mother.fundalHeight || '',
    fhr: mother.fhr || '',
    weight: mother.weight || '',
    height: mother.height || '',
    bmi: mother.bmi || initialCheckup?.bmi || '',
    gravida: mother.gravida ?? '',
    para: mother.para ?? '',
    abortion: mother.abortion ?? '',
    stillbirth: mother.stillbirth ?? '',
    emergencyName: mother.emergencyName || '',
    emergencyContact: mother.emergencyContact || '',
    emergencyRelationship: mother.emergencyRelationship || '',
    spouseName: mother.spouseName || '',
    medicalConditions: mother.medicalConditions || {},
    otherMedicalHistory: mother.otherMedicalHistory || '',
    tt1Date: mother.tt1Date || '',
    tt2Date: mother.tt2Date || '',
    tt3Date: mother.tt3Date || '',
    tt4Date: mother.tt4Date || '',
    tt5Date: mother.tt5Date || '',
    dentalCheckupDate: mother.dentalCheckupDate || '',
    dentalFacility: mother.dentalFacility || '',
    dentalFindings: mother.dentalFindings || '',
    dentalRemarks: mother.dentalRemarks || '',
    birthCertificateDocumentName: mother.birthCertificateDocumentName || '',
    consentDocumentName: mother.consentDocumentName || '',
    assessment: formatDate(mother.prenatalRegDate || mother.createdAt),
    progress,
    trend: progress >= 50 ? 'up' : 'down',
    risk: mother.isHighRisk === 'Yes',
    initialBmi: initialCheckup?.bmi || '',
    initialBmiCategory: getBmiCategory(initialCheckup?.bmi),
    birthCert: hasValue(mother.birthCertificateDocumentName),
    consent: hasValue(mother.consentDocumentName),
    dental: hasValue(mother.dentalCheckupDate),
    tt: [mother.tt1Date, mother.tt2Date, mother.tt3Date, mother.tt4Date, mother.tt5Date],
    vaccines: vaccines.join(', '),
    oralHealth: mother.dentalCheckupDate ? 'Completed' : 'Pending',
    programs: mother.programType || 'General',
    documents: [mother.birthCertificateDocumentName, mother.consentDocumentName].filter(Boolean).join(', ') || 'None',
    type: 'Mothers',
    source: mother,
  };
}

export function normalizeChild(child) {
  const progress = Math.min(100, Math.round(((child.completedWeeks || []).length / 48) * 100));

  return {
    id: child.child_code || child.id,
    name: fullName(child),
    phone: child.contactNumber || '',
    dob: child.birth_date || child.birthDate || '',
    age: child.age || '',
    community: child.community_name || child.community || '',
    school: child.community_name || child.community || '',
    group: child.group_name || child.group || '',
    batch: child.batch_name || child.batch || '',
    programType: child.programType || '',
    status: child.status || 'Active',
    trimester: 'Pedia',
    assessment: formatDate(child.created_at),
    progress,
    trend: progress >= 50 ? 'up' : 'down',
    risk: false,
    type: 'Children',
    source: child,
  };
}

export const getRowKey = (row, index = 0) => {
  const idPart = String(row?.id ?? row?.name ?? row?.source?.id ?? row?.source?.motherId ?? row?.source?.child_code ?? 'unknown');
  const typePart = String(row?.type ?? 'row');
  const namePart = String(row?.name ?? row?.source?.name ?? '');
  return `${typePart}-${idPart}-${namePart}-${index}`;
};
