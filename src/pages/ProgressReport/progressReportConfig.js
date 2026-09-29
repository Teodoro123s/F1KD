import { formatDateForDisplay } from '../../utils/dateFormat';

export const EMPTY_SELECTIONS = { schoolId: '', groupId: '', batchId: '' };

export const REPORT_FIELDS = [
  ['school', 'School', 'Hierarchy'],
  ['group', 'Group', 'Hierarchy'],
  ['batch', 'Batch', 'Hierarchy'],
  ['mother', 'Mother Name', 'Identity'],
  ['child', 'Child Name', 'Identity'],
  ['age', 'Age', 'Identity'],
  ['pediatricAgeWeeks', 'Pedia Age (weeks)', 'Identity'],
  ['gender', 'Sex', 'Identity'],
  ['dateOfBirth', 'Date of Birth', 'Identity'],
  ['contact', 'Contact Number', 'Identity'],
  ['status', 'Status', 'Health & Status'],
  ['risk', 'Risk Level', 'Health & Status'],
  ['program', 'Program', 'Health & Status'],
  ['deliveryType', 'Delivery Type', 'Health & Status'],
  ['healthStatus', 'Health Status', 'Health & Status'],
  ['liveBirthDocument', 'Live Birth Document', 'Profile'],
  ['birthWeight', 'Birth Weight (kg)', 'Profile'],
  ['birthLength', 'Birth Length (cm)', 'Profile'],
  ['bloodType', 'Blood Type', 'Profile'],
  ['multipleBirth', 'Multiple Birth', 'Profile'],
  ['noOfChildDelivered', 'No. of Children Delivered', 'Profile'],
  ['expandedNewbornScreening', 'Expanded Newborn Screening', 'Profile'],
  ['expandedNewbornScreeningResult', 'Newborn Screening Result', 'Profile'],
  ['birthPlace', 'Birth Place', 'Profile'],
  ['birthAttendant', 'Birth Attendant', 'Profile'],
  ['apgarScore', 'APGAR Score', 'Profile'],
  ['feedingType', 'Feeding Type', 'Profile'],
  ['exclusiveBreastfeeding', 'Exclusive Breastfeeding', 'Profile'],
  ['nutritionNotes', 'Nutritional Notes', 'Profile'],
  ['fatherName', 'Father Name', 'Profile'],
  ['relationship', 'Relationship', 'Profile'],
  ['address', 'Address', 'Profile'],
  ['medicalConditions', 'Medical Conditions', 'Profile'],
  ['bcgDate', 'BCG Vaccine Record', 'Profile'],
  ['hepbDate', 'HepB Vaccine Record', 'Profile'],
  ['opvDate', 'OPV Vaccine Record', 'Profile'],
  ['dptDate', 'DPT Vaccine Record', 'Profile'],
  ['mmrDate', 'MMR Vaccine Record', 'Profile'],
  ['contactNumber', 'Contact Number', 'Profile'],
  ['addressDetails', 'Address Details', 'Profile'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Profile'],
  ['programConsentDocument', 'Program Consent Form', 'Profile'],
  ['gravida', 'Gravida', 'Profile'],
  ['abortion', 'Abortion', 'Profile'],
  ['stillbirth', 'Stillbirth', 'Profile'],
  ['philhealthNumber', 'PhilHealth Number', 'Profile'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the beneficiary profile is registered as a PhilHealth member.'],
  ['spouseName', 'Spouse Name', 'Profile'],
  ['emergencyName', 'Emergency Contact Name', 'Profile'],
  ['emergencyContact', 'Emergency Contact Number', 'Profile'],
  ['emergencyRelationship', 'Emergency Relationship', 'Profile'],
  ['lmpDate', 'Date of LMP', 'Profile'],
  ['eddDate', 'Expected Delivery Date', 'Profile'],
  ['prenatalRegDate', 'Prenatal Registration Date', 'Profile'],
  ['trimester', 'Trimester', 'Profile'],
  ['gestationalAge', 'Gestational Age', 'Profile'],
  ['prenatalWeight', 'Prenatal Weight (kg)', 'Profile'],
  ['prenatalBp', 'Prenatal Blood Pressure', 'Profile'],
  ['prenatalHeight', 'Prenatal Height (cm)', 'Profile'],
  ['fundalHeight', 'Fundal Height', 'Profile'],
  ['fhr', 'Fetal Heart Rate', 'Profile'],
  ['para', 'Para', 'Profile'],
  ['medicalConditions', 'Medical Conditions', 'Profile'],
  ['otherMedicalHistory', 'Other Medical History', 'Profile'],
  ['dentalCheckupDate', 'Dental Check-up Date', 'Profile'],
  ['dentalFacility', 'Dental Facility', 'Profile'],
  ['dentistInCharge', 'Dentist in Charge', 'Profile'],
  ['communityDentist', 'Community Dentist', 'Profile'],
  ['dentistLicense', 'Dentist License No.', 'Profile'],
  ['dentistContact', 'Dentist Contact', 'Profile'],
  ['teethCount', 'Number of Teeth', 'Profile'],
  ['dentalFindings', 'Dental Findings', 'Profile'],
  ['dentalWork', 'Dental Work Done', 'Profile'],
  ['dentalRemarks', 'Dental Remarks', 'Profile'],
  ['tt1Date', 'TT1 Date', 'Profile'], ['tt1Remarks', 'TT1 Remarks', 'Profile'],
  ['tt2Date', 'TT2 Date', 'Profile'], ['tt2Remarks', 'TT2 Remarks', 'Profile'],
  ['tt3Date', 'TT3 Date', 'Profile'], ['tt3Remarks', 'TT3 Remarks', 'Profile'],
  ['tt4Date', 'TT4 Date', 'Profile'], ['tt4Remarks', 'TT4 Remarks', 'Profile'],
  ['tt5Date', 'TT5 Date', 'Profile'], ['tt5Remarks', 'TT5 Remarks', 'Profile'],
  ['ttVaccineRecord', 'Tetanus Toxoid Vaccine Record', 'Profile'],
  ['weightForAge', 'Weight-for-Age (kg)', 'Growth & Monitoring'],
  ['heightForAge', 'Length-for-Age (cm)', 'Growth & Monitoring'],
  ['weightForLengthZScore', 'Weight-for-Length/Height Z-Score', 'Growth & Monitoring'],
  ['weightForLengthInterpretation', 'Weight-for-Length Interpretation', 'Growth & Monitoring'],
  ['weightForAgeZScore', 'Weight-for-Age Z-Score', 'Growth & Monitoring'],
  ['weightForAgeInterpretation', 'Weight-for-Age Interpretation', 'Growth & Monitoring'],
  ['bmiForAge', 'BMI-for-Age', 'Growth & Monitoring'],
  ['bmiInterpretation', 'BMI Interpretation', 'Growth & Monitoring'],
  ['lengthForAgeZScore', 'Length/Height-for-Age Z-Score', 'Growth & Monitoring'],
  ['lengthForAgeInterpretation', 'Length-for-Age Interpretation', 'Growth & Monitoring'],
  ['initialWeight', 'Initial Weight (kg)', 'Profile'],
  ['initialHeight', 'Initial Height (cm)', 'Profile'],
  ['initialBmi', 'Initial BMI', 'Profile'],
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['receivedBenefitTotal', 'Total Received Benefits', 'Program Report'],
  ['receivedBenefitFrequency', 'Benefit Receipt Frequency', 'Program Report'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Program Report'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
  ['measurementDate', 'Measurement Date', 'Monitoring'],
];

export const DEFAULT_VISIBLE_FIELDS = [
  'school', 'group', 'batch', 'mother', 'child',
  'weightForLengthInterpretation', 'weightForAgeInterpretation', 'heightForAge',
  'lengthForAgeZScore', 'lengthForAgeInterpretation', 'activitiesCompleted',
  'totalActivities', 'progress',
];

export const addGrowthScoresBeforeInterpretations = (fields) => [
  ['weightForLengthZScore', 'weightForLengthInterpretation'],
  ['weightForAgeZScore', 'weightForAgeInterpretation'],
  ['lengthForAgeZScore', 'lengthForAgeInterpretation'],
].reduce((orderedFields, [scoreField, interpretationField]) => {
  if (!orderedFields.includes(interpretationField)) return orderedFields;
  const nextFields = orderedFields.filter((field) => field !== scoreField);
  nextFields.splice(nextFields.indexOf(interpretationField), 0, scoreField);
  return nextFields;
}, fields);

export const GROWTH_METRICS = [
  ['weightForLengthInterpretation', 'Weight-for-Length/Height', 'WHO uses Weight-for-Length below 24 months and Weight-for-Height from 24 months.'],
  ['weightForAgeInterpretation', 'Weight-for-Age', 'WHO indicator for low weight relative to exact age; it does not classify overweight.'],
  ['lengthForAgeInterpretation', 'Length/Height-for-Age', 'WHO indicator using exact age in days and sex-specific LMS references.'],
];

export const WHO_NUMERIC_GROWTH_METRICS = [
  ['weightForLengthZScore', 'Weight-for-Length/Height Z-Score', 'WHO LMS z-score for weight relative to length/height.'],
  ['weightForAgeZScore', 'Weight-for-Age Z-Score', 'WHO LMS z-score for weight relative to age.'],
  ['lengthForAgeZScore', 'Length/Height-for-Age Z-Score', 'WHO LMS z-score for length/height relative to age.'],
];

export const INTERPRETATION_METRICS = new Set(GROWTH_METRICS.map(([id]) => id));
export const MOTHER_GROWTH_METRICS = [['bmiForAge', 'BMI', 'Latest BMI recorded by Mother Monitoring.']];

export const NUMERIC_GROWTH_METRICS = (beneficiaryType = 'child') => beneficiaryType === 'mother'
  ? [['bmiForAge', 'BMI', 'Latest BMI recorded by Mother Monitoring.']]
  : WHO_NUMERIC_GROWTH_METRICS;

export const PROFILE_METRICS = [
  ['age', 'Age', 'Age calculated from the beneficiary profile date of birth.'],
  ['initialWeight', 'Initial Weight (kg)', 'Birth weight for children or prenatal baseline weight for mothers.'],
  ['initialHeight', 'Initial Height (cm)', 'Birth length for children or prenatal baseline height for mothers.'],
  ['initialBmi', 'Initial BMI', 'Baseline BMI recorded or calculated from the profile measurements.'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the beneficiary profile is registered as a PhilHealth member.'],
  ['gender', 'Sex', 'Sex recorded in the child profile.'],
  ['liveBirthDocument', 'Live Birth Document', 'Uploaded live birth document for the child.'],
  ['birthWeight', 'Birth Weight (kg)', 'Birth weight recorded in the child profile.'],
  ['birthLength', 'Birth Length (cm)', 'Birth length recorded in the child profile.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the child profile.'],
  ['multipleBirth', 'Multiple Birth', 'Multiple-birth classification recorded in the child profile.'],
  ['deliveryType', 'Delivery Type', 'Delivery type recorded in the child profile.'],
  ['contactNumber', 'Contact Number', 'Contact number recorded in the mother profile.'],
];

export const CHILD_PROFILE_METRICS = [
  ['gender', 'Sex', 'Sex recorded in the child profile.'],
  ['liveBirthDocument', 'Live Birth Document', 'Uploaded live birth document for the child.'],
  ['birthWeight', 'Birth Weight (kg)', 'Birth weight recorded in the child profile.'],
  ['birthLength', 'Birth Length (cm)', 'Birth length recorded in the child profile.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the child profile.'],
  ['multipleBirth', 'Multiple Birth', 'Multiple-birth classification recorded in the child profile.'],
  ['deliveryType', 'Delivery Type', 'Delivery type recorded in the child profile.'],
  ['healthStatus', 'Health Status', 'Child health status recorded in the child profile.'],
  ['noOfChildDelivered', 'No. of Children Delivered', 'Number of children delivered in the birth event.'],
  ['expandedNewbornScreening', 'Expanded Newborn Screening', 'Expanded newborn screening status.'],
  ['expandedNewbornScreeningResult', 'Newborn Screening Result', 'Expanded newborn screening result.'],
  ['birthPlace', 'Birth Place', 'Birth place recorded in the child profile.'],
  ['birthAttendant', 'Birth Attendant', 'Birth attendant recorded in the child profile.'],
  ['apgarScore', 'APGAR Score', 'APGAR score recorded in the child profile.'],
  ['feedingType', 'Feeding Type', 'Feeding type recorded in the child profile.'],
  ['exclusiveBreastfeeding', 'Exclusive Breastfeeding', 'Exclusive breastfeeding value recorded in the child profile.'],
  ['nutritionNotes', 'Nutritional Notes', 'Nutrition notes recorded in the child profile.'],
  ['fatherName', 'Father Name', 'Father name recorded in the child profile.'],
  ['relationship', 'Relationship', 'Relationship value recorded in the child profile.'],
  ['address', 'Address', 'Address recorded in the child profile.'],
  ['medicalConditions', 'Medical Conditions', 'Recorded child medical conditions.'],
  ['bcgDate', 'BCG Vaccine Record', 'All recorded BCG dose dates and remarks.'],
  ['hepbDate', 'HepB Vaccine Record', 'All recorded Hepatitis B dose dates and remarks.'],
  ['opvDate', 'OPV Vaccine Record', 'All recorded OPV dose dates and remarks.'],
  ['dptDate', 'DPT Vaccine Record', 'All recorded DPT dose dates and remarks.'],
  ['mmrDate', 'MMR Vaccine Record', 'All recorded MMR dose dates and remarks.'],
];

export const CHILD_PROFILE_FIELD_SECTIONS = {
  gender: 'general', liveBirthDocument: 'general', address: 'general', fatherName: 'general', relationship: 'general',
  birthWeight: 'prenatal-ob', birthLength: 'prenatal-ob', bloodType: 'prenatal-ob', multipleBirth: 'prenatal-ob', deliveryType: 'prenatal-ob',
  noOfChildDelivered: 'prenatal-ob', expandedNewbornScreening: 'prenatal-ob', expandedNewbornScreeningResult: 'prenatal-ob', birthPlace: 'prenatal-ob', birthAttendant: 'prenatal-ob', apgarScore: 'prenatal-ob',
  healthStatus: 'medical-dental', feedingType: 'medical-dental', exclusiveBreastfeeding: 'medical-dental', nutritionNotes: 'medical-dental', medicalConditions: 'medical-dental',
  bcgDate: 'vaccine', hepbDate: 'vaccine', opvDate: 'vaccine', dptDate: 'vaccine', mmrDate: 'vaccine',
};

export const PROFILE_SECTION_LABELS = {
  all: 'All profile fields',
  general: 'General',
  'prenatal-ob': 'Prenatal / OB',
  'medical-dental': 'Medical / Dental',
  vaccine: 'Vaccine',
};

export const MOTHER_PROFILE_FIELD_SECTIONS = {
  contactNumber: 'general', addressDetails: 'general', motherBirthCertificate: 'general', programConsentDocument: 'general', philhealthMember: 'general', philhealthNumber: 'general', spouseName: 'general', emergencyName: 'general', emergencyContact: 'general', emergencyRelationship: 'general',
  initialWeight: 'prenatal-ob', initialHeight: 'prenatal-ob', lmpDate: 'prenatal-ob', eddDate: 'prenatal-ob', prenatalRegDate: 'prenatal-ob', trimester: 'prenatal-ob', gestationalAge: 'prenatal-ob', prenatalWeight: 'prenatal-ob', prenatalBp: 'prenatal-ob', prenatalHeight: 'prenatal-ob', fundalHeight: 'prenatal-ob', fhr: 'prenatal-ob', gravida: 'prenatal-ob', para: 'prenatal-ob', abortion: 'prenatal-ob', stillbirth: 'prenatal-ob',
  medicalConditions: 'medical-dental', otherMedicalHistory: 'medical-dental', dentalCheckupDate: 'medical-dental', dentalFacility: 'medical-dental', dentistInCharge: 'medical-dental', communityDentist: 'medical-dental', dentistLicense: 'medical-dental', dentistContact: 'medical-dental', teethCount: 'medical-dental', dentalFindings: 'medical-dental', dentalWork: 'medical-dental', dentalRemarks: 'medical-dental',
  ttVaccineRecord: 'vaccine',
};

export const MOTHER_PROFILE_SECTION_LABELS = {
  general: 'General',
  'prenatal-ob': 'Prenatal / OB',
  'medical-dental': 'Medical / Dental',
  vaccine: 'Vaccine',
};

export const MOTHER_PROFILE_METRICS = [
  ['contactNumber', 'Contact Number', 'Contact number recorded in the mother profile.'],
  ['addressDetails', 'Address Details', 'Whether address details are recorded in the mother profile.'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Whether the mother birth certificate is uploaded.'],
  ['programConsentDocument', 'Program Consent Form', 'Whether the program consent form is uploaded.'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the mother is registered as a PhilHealth member.'],
  ['philhealthNumber', 'PhilHealth Number', 'PhilHealth number recorded in the mother profile.'],
  ['spouseName', 'Spouse Name', 'Spouse name recorded in the mother profile.'],
  ['emergencyName', 'Emergency Contact Name', 'Emergency contact name recorded in the mother profile.'],
  ['emergencyContact', 'Emergency Contact Number', 'Emergency contact number recorded in the mother profile.'],
  ['emergencyRelationship', 'Emergency Relationship', 'Emergency contact relationship.'],
  ['initialWeight', 'Initial Weight (kg)', 'Prenatal baseline weight.'],
  ['initialHeight', 'Initial Height (cm)', 'Prenatal baseline height.'],
  ['gravida', 'Gravida', 'Number of pregnancies.'],
  ['abortion', 'Abortion', 'Recorded abortion count.'],
  ['stillbirth', 'Stillbirth', 'Recorded stillbirth count.'],
  ['lmpDate', 'Date of LMP', 'Last menstrual period date.'],
  ['eddDate', 'Expected Delivery Date', 'Expected delivery date.'],
  ['prenatalRegDate', 'Prenatal Registration Date', 'Date of prenatal registration.'],
  ['trimester', 'Trimester', 'Trimester at registration.'],
  ['gestationalAge', 'Gestational Age', 'Gestational age at registration.'],
  ['prenatalWeight', 'Prenatal Weight (kg)', 'Weight at prenatal registration.'],
  ['prenatalBp', 'Prenatal Blood Pressure', 'Blood pressure at prenatal registration.'],
  ['prenatalHeight', 'Prenatal Height (cm)', 'Height at prenatal registration.'],
  ['fundalHeight', 'Fundal Height', 'Fundal height recorded in the mother profile.'],
  ['fhr', 'Fetal Heart Rate', 'Fetal heart rate recorded in the mother profile.'],
  ['para', 'Para', 'Number of births recorded in the mother profile.'],
  ['medicalConditions', 'Medical Conditions', 'Recorded maternal medical conditions.'],
  ['otherMedicalHistory', 'Other Medical History', 'Other medical history notes.'],
  ['dentalCheckupDate', 'Dental Check-up Date', 'Date of dental check-up.'],
  ['dentalFacility', 'Dental Facility', 'Dental clinic or health facility.'],
  ['dentistInCharge', 'Dentist in Charge', 'Dentist in charge.'],
  ['communityDentist', 'Community Dentist', 'Community dentist name.'],
  ['dentistLicense', 'Dentist License No.', 'Dentist license number.'],
  ['dentistContact', 'Dentist Contact', 'Dentist contact number.'],
  ['teethCount', 'Number of Teeth', 'Number of teeth recorded.'],
  ['dentalFindings', 'Dental Findings', 'Dental findings or diagnosis.'],
  ['dentalWork', 'Dental Work Done', 'Dental work recorded.'],
  ['dentalRemarks', 'Dental Remarks', 'Dental recommendations or remarks.'],
  ['ttVaccineRecord', 'Tetanus Toxoid Vaccine Record', 'All recorded TT dose dates and remarks.'],
];

export const PROFILE_GRAPH_FIELDS = [
  ['gender', 'Sex', 'pie'],
  ['deliveryType', 'Delivery Type', 'pie'],
  ['liveBirthDocument', 'Live Birth Document', 'boolean'],
  ['bloodType', 'Blood Type', 'pie'],
  ['philhealthMember', 'PhilHealth Member', 'pie'],
  ['birthWeight', 'Birth Weight (kg)', 'histogram'],
  ['birthLength', 'Birth Length (cm)', 'histogram'],
  ['initialWeight', 'Initial Weight (kg)', 'histogram'],
  ['initialHeight', 'Initial Height (cm)', 'histogram'],
  ['bmiInterpretation', 'BMI Interpretation', 'pie'],
  ['contactNumber', 'Contact Number', 'boolean'],
];

export const PROFILE_GRAPH_FIELD_MAP = new Map(PROFILE_GRAPH_FIELDS.map(([id, label, type]) => [id, { label, type }]));
export const PRESENCE_PROFILE_FIELDS = new Set(['contactNumber', 'liveBirthDocument', 'philhealthMember']);

export const PROGRAM_METRICS = [
  ['receivedBenefitTotal', 'Total Received Benefits', 'Total true benefit-receipt events in the selected period.'],
  ['receivedBenefitFrequency', 'Receipt Frequency', 'Number of true receipt events in the selected period.'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Average true receipt events per active month.'],
];

export const REPORT_TABS = ['Community', 'Report Focus', 'Growth Metrics', 'Results'];
export const REPORT_FOCUS_OPTIONS = [
  ['beneficiary-batch', 'Individual Report', 'batch'],
  ['beneficiary-group', 'Individual Report', 'group'],
  ['beneficiary-school', 'Individual Report', 'school'],
  ['batch-group', 'Batch Report', 'group'],
  ['batch-school', 'Batch Report', 'school'],
  ['group-school', 'Group Report', 'school'],
];

export const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const getInterpretationLevels = (metric = '') => {
  const key = String(metric || '').toLowerCase();
  if (key.includes('weight-for-age')) {
    return ['Severely Underweight', 'Underweight', 'Normal', 'High weight-for-age'];
  }
  if (key.includes('length') || key.includes('height')) {
    return ['Severely Stunted', 'Stunted', 'Normal', 'Tall', 'Very Tall'];
  }
  if (key.includes('weight')) {
    return ['Severely Underweight', 'Underweight', 'Normal', 'Overweight', 'Obese'];
  }
  return ['Severely Wasted', 'Wasted', 'Normal', 'Overweight', 'Obese'];
};

export const normalizeNutritionLabel = (value) => {
  const label = String(value ?? '').trim();
  if (!label) return '';
  const normalized = label.toLowerCase();
  if (['severely wasted', 'severely_wasted', 'severely-wasted'].includes(normalized)) return 'Severely Wasted';
  if (['wasted', 'malnourished'].includes(normalized)) return 'Wasted';
  if (['severely underweight', 'severely_underweight', 'severely-underweight', 'severely below expected', 'severely-below-expected', 'severely_below_expected'].includes(normalized)) return 'Severely Underweight';
  if (['underweight', 'below expected', 'below-expected', 'below_expected'].includes(normalized)) return 'Underweight';
  if (normalized === 'high weight-for-age') return 'High weight-for-age';
  if (['severely stunted', 'severely_stunted', 'severely-stunted'].includes(normalized)) return 'Severely Stunted';
  if (['stunted'].includes(normalized)) return 'Stunted';
  if (['tall', 'above expected', 'above-expected', 'above_expected'].includes(normalized)) return 'Tall';
  if (['very tall', 'very_tall', 'very-tall'].includes(normalized)) return 'Very Tall';
  if (['obese', 'severely obese', 'severely_obese', 'severely-obese'].includes(normalized)) return normalized.includes('severely') ? 'Severely Obese' : 'Obese';
  if (['overweight'].includes(normalized)) return 'Overweight';
  if (['normal', 'within expected range', 'within expected', 'within_expected', 'normal screening range'].includes(normalized)) return 'Normal';
  return label;
};

export const mapInterpretationToBand = (value, metric) => {
  const normalized = normalizeNutritionLabel(value);
  const bands = getInterpretationLevels(metric);
  if (!normalized) return bands[2];
  const index = bands.indexOf(normalized);
  return index >= 0 ? bands[index] : (
    normalized === 'Severely Obese' ? bands[4]
      : normalized === 'Obese' ? bands[4]
        : normalized === 'Overweight' ? bands[3]
          : normalized === 'Normal' ? bands[2]
            : normalized === 'Underweight' ? bands[1]
              : normalized === 'Severely Underweight' ? bands[0]
                : normalized === 'Severely Stunted' ? bands[0]
                  : normalized === 'Stunted' ? bands[1]
                    : normalized === 'Tall' ? bands[3]
                      : normalized === 'Very Tall' ? bands[4]
                        : normalized === 'High weight-for-age' ? bands[bands.length - 1]
                        : normalized === 'Severely Wasted' ? bands[0]
                          : normalized === 'Wasted' ? bands[1]
                            : bands[2]
  );
};

export const getBmiInterpretation = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const bmi = Number(value);
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Underweight screening range';
  if (bmi < 25) return 'Normal screening range';
  if (bmi < 30) return 'Overweight screening range';
  return 'Obese screening range';
};

export const formatCellValue = (field, value) => {
  if (PRESENCE_PROFILE_FIELDS.has(field)) return value === null || value === undefined || String(value).trim() === '' ? 'No' : 'Yes';
  if (value === null || value === undefined || value === '') return '—';
  if (['bcgDate', 'hepbDate', 'opvDate', 'dptDate', 'mmrDate', 'ttVaccineRecord'].includes(field)) {
    if (Array.isArray(value)) {
      return value.map(({ dose, date }) => `Dose ${dose}: ${formatDateForDisplay(date)}`).join('; ') || '—';
    }
    if (value && typeof value === 'object') {
      const doses = (value.doses || []).map(({ dose, date }) => `Dose ${dose}: ${formatDateForDisplay(date)}`);
      if (value.remarks) doses.push(`Remarks: ${value.remarks}`);
      return doses.join('; ') || '—';
    }
  }
  if (field && /Interpretation$/i.test(field)) return normalizeNutritionLabel(value);
  if (field && /ZScore$/i.test(field)) {
    const score = Number(value);
    return value !== null && value !== undefined && value !== '' && Number.isFinite(score) ? score.toFixed(2) : '—';
  }
  if (['dateOfBirth', 'lastActivityDate', 'nextCheckupDate', 'measurementDate', 'bcgDate', 'hepbDate', 'opvDate', 'dptDate', 'mmrDate', 'lmpDate', 'eddDate', 'prenatalRegDate', 'dentalCheckupDate', 'tt1Date', 'tt2Date', 'tt3Date', 'tt4Date', 'tt5Date'].includes(field)) {
    return formatDateForDisplay(value);
  }
  return String(value);
};

export const chartDate = (value) => {
  return value ? formatDateForDisplay(value) : 'No date';
};

export const getPointValue = (point, metric) => {
  const direct = point?.[metric];
  if (direct !== null && direct !== undefined && direct !== '' && Number.isFinite(Number(direct))) return Number(direct);
  const aliases = {
    weightForAge: point?.weight,
    heightForAge: point?.height,
    bmiForAge: point?.bmi,
  };
  const aliasValue = aliases[metric];
  return aliasValue !== null && aliasValue !== undefined && aliasValue !== '' && Number.isFinite(Number(aliasValue)) ? Number(aliasValue) : null;
};

export const getPointInterpretation = (point, metric) => normalizeNutritionLabel(String(point?.[metric] || '').trim());

export const averageNumeric = (values) => {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  return numbers.length ? Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1)) : null;
};

export const getMode = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
};

export const getProfileGraphValue = (row, field) => {
  if (field === 'liveBirthDocument') return row?.liveBirthDocument ? 'Yes' : 'No';
  if (['contactNumber', 'addressDetails', 'motherBirthCertificate', 'programConsentDocument'].includes(field)) return row?.[field] ? 'Yes' : 'No';
  if (field === 'philhealthMember') return row?.philhealthMember || 'No';
  return row?.[field] === undefined || row?.[field] === null || row?.[field] === '' ? 'Not recorded' : String(row[field]);
};
