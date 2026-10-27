import { formatDateForDisplay } from '../../utils/formatting/dateFormat';
import {
  formatPhilHealthNumberForReport,
  formatPresenceProfileValue,
  PRESENCE_PROFILE_FIELDS,
} from './utils/profileFieldFormatting.mjs';
import {
  getInterpretationLevels,
  mapInterpretationToBand,
  normalizeNutritionLabel,
} from './utils/interpretationBands.mjs';
import { uniqueReportFields } from './utils/uniqueReportFields.mjs';

export { PRESENCE_PROFILE_FIELDS };
export { getInterpretationLevels, mapInterpretationToBand, normalizeNutritionLabel };

export const EMPTY_SELECTIONS = { schoolId: '', groupId: '', batchId: '' };

export const REPORT_FIELDS = uniqueReportFields([
  ['school', 'School', 'Hierarchy'],
  ['group', 'Group', 'Hierarchy'],
  ['batch', 'Batch', 'Hierarchy'],
  ['mother', 'Mother Name', 'Identity'],
  ['child', 'Child Name', 'Identity'],
  ['age', 'Age', 'Identity'],
  ['ageAtCheckupMonths', 'Age at Check-up (months)', 'Identity'],
  ['pediatricAgeWeeks', 'Pedia Age (weeks)', 'Identity'],
  ['gender', 'Sex', 'Identity'],
  ['dateOfBirth', 'Date of Birth', 'Identity'],
  ['contact', 'Contact Number', 'Identity'],
  ['status', 'Status', 'Health & Status'],
  ['risk', 'Risk Level', 'Health & Status'],
  ['program', 'Project', 'Health & Status'],
  ['deliveryType', 'Delivery Type', 'Health & Status'],
  ['healthStatus', 'Health Status', 'Health & Status'],
  ['liveBirthDocument', 'Live Birth Document', 'Profile'],
  ['birthWeight', 'Birth Weight (kg)', 'Profile'],
  ['birthLength', 'Birth Length (cm)', 'Profile'],
  ['headCircumference', 'Head Circumference (cm)', 'Profile'],
  ['chestCircumference', 'Chest Circumference (cm)', 'Profile'],
  ['bloodType', 'Blood Type', 'Profile'],
  ['multipleBirth', 'Multiple Birth', 'Profile'],
  ['noOfChildDelivered', 'No. of Children Delivered', 'Profile'],
  ['expandedNewbornScreening', 'Expanded Newborn Screening', 'Profile'],
  ['expandedNewbornScreeningResult', 'Newborn Screening Result', 'Profile'],
  ['birthPlaceCity', 'Birth City / Municipality', 'Profile'],
  ['birthPlaceProvince', 'Birth Province', 'Profile'],
  ['birthAttendant', 'Birth Attendant', 'Profile'],
  ['apgarScore', 'APGAR Score', 'Profile'],
  ['feedingType', 'Feeding Type', 'Profile'],
  ['exclusiveBreastfeeding', 'Exclusive Breastfeeding', 'Profile'],
  ['nutritionNotes', 'Nutritional Notes', 'Profile'],
  ['fatherName', 'Father Name', 'Profile'],
  ['relationship', 'Relationship', 'Profile'],
  ['address', 'Address', 'Profile'],
  ['medicalConditions', 'Medical Conditions', 'Profile'],
  ['childCongenitalHeartDisease', 'Medical: Congenital Heart Disease', 'Profile'],
  ['childRespiratoryIssues', 'Medical: Respiratory Issues', 'Profile'],
  ['childPrematurity', 'Medical: Prematurity', 'Profile'],
  ['childJaundice', 'Medical: Jaundice', 'Profile'],
  ['childAnemia', 'Medical: Anemia', 'Profile'],
  ['childGrowthDelay', 'Medical: Growth Delay', 'Profile'],
  ['bcgDate', 'BCG Vaccine Record', 'Profile'],
  ['hepbDate', 'HepB Vaccine Record', 'Profile'],
  ['ipvDate', 'IPV Vaccine Record', 'Profile'],
  ['opvDate', 'OPV Vaccine Record', 'Profile'],
  ['pcvDate', 'PCV Vaccine Record', 'Profile'],
  ['dptDate', 'DPT Vaccine Record', 'Profile'],
  ['mmrDate', 'MMR Vaccine Record', 'Profile'],
  ...['bcg', 'hepb', 'ipv', 'opv', 'pcv', 'dpt', 'mmr'].flatMap((vaccine) => [
    [vaccine + 'Dose1Date', `${vaccine.toUpperCase()} Dose 1 Date`, 'Profile'],
    [vaccine + 'Dose2Date', `${vaccine.toUpperCase()} Dose 2 Date`, 'Profile'],
    [vaccine + 'Dose3Date', `${vaccine.toUpperCase()} Dose 3 Date`, 'Profile'],
    [vaccine + 'Remarks', `${vaccine.toUpperCase()} Vaccine Remarks / Facility`, 'Profile'],
  ]),
  ['contactNumber', 'Contact Number', 'Profile'],
  ['addressDetails', 'Address Details', 'Profile'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Profile'],
  ['programConsentDocument', 'Project Consent Form', 'Profile'],
  ['maidenSurname', 'Maiden Surname', 'Profile'],
  ['allergies', 'Allergies', 'Profile'],
  ['civilStatus', 'Civil Status', 'Profile'],
  ['employmentStatus', 'Employment Status', 'Profile'],
  ['educationalAttainment', 'Educational Attainment', 'Profile'],
  ['dataPrivacySigned', 'Data Privacy Consent', 'Profile'],
  ['mediaReleaseSigned', 'Media Release Consent', 'Profile'],
  ['gravida', 'Gravida', 'Profile'],
  ['abortion', 'Abortion', 'Profile'],
  ['stillbirth', 'Stillbirth', 'Profile'],
  ['totalChildren', 'Total Children', 'Profile'],
  ['childrenBornAlive', 'Children Born Alive', 'Profile'],
  ['miscarriages', 'Miscarriages', 'Profile'],
  ['childrenDiedAfterBirth', 'Children Died After Birth', 'Profile'],
  ['obHistory', 'Previous Obstetric History', 'Profile'],
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
  ...[
    ['hypertension', 'Hypertension'],
    ['diabetes', 'Diabetes'],
    ['eclampsia', 'Eclampsia'],
    ['asthma', 'Asthma'],
    ['heartDisease', 'Heart Disease'],
    ['kidneyDisease', 'Kidney Disease'],
    ['epilepsy', 'Epilepsy'],
    ['goiter', 'Goiter'],
    ['tuberculosis', 'Tuberculosis'],
    ['parasitism', 'Parasitism'],
    ['anemia', 'Anemia'],
    ['urinaryTractInfection', 'Urinary Tract Infection'],
    ['genitalTractInfection', 'Genital Tract Infection'],
    ['smoking', 'Smoking'],
    ['alcoholIntake', 'Alcohol Intake'],
    ['illegalDrugUse', 'Illegal Drug Use'],
    ['otherInfectiousDisease', 'Other Infectious Disease'],
    ['cancer', 'Cancer'],
    ['std', 'Sexually Transmitted Diseases'],
    ['multiplePregnancy', 'Multiple Pregnancy'],
    ['prevCesarean', 'Previous Caesarean Section'],
  ].map(([id, label]) => [`maternalCondition_${id}`, `Medical: ${label}`, 'Profile']),
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
  ['dentalWork_tartarRemoval', 'Dental: Tartar Removal', 'Profile'],
  ['dentalWork_filling', 'Dental: Filling', 'Profile'],
  ['dentalWork_cleaning', 'Dental: Cleaning', 'Profile'],
  ['dentalWork_extraction', 'Dental: Extraction', 'Profile'],
  ['dentalWork_rootCanal', 'Dental: Root Canal', 'Profile'],
  ['dentalWork_other', 'Dental: Other Work', 'Profile'],
  ['dentalRemarks', 'Dental Remarks', 'Profile'],
  ['tt1Date', 'TT1 Date', 'Profile'], ['tt1Remarks', 'TT1 Remarks', 'Profile'],
  ['tt2Date', 'TT2 Date', 'Profile'], ['tt2Remarks', 'TT2 Remarks', 'Profile'],
  ['tt3Date', 'TT3 Date', 'Profile'], ['tt3Remarks', 'TT3 Remarks', 'Profile'],
  ['tt4Date', 'TT4 Date', 'Profile'], ['tt4Remarks', 'TT4 Remarks', 'Profile'],
  ['tt5Date', 'TT5 Date', 'Profile'], ['tt5Remarks', 'TT5 Remarks', 'Profile'],
  ['ttVaccineRecord', 'Tetanus Toxoid Vaccine Record', 'Profile'],
  ...['tt1', 'tt2', 'tt3', 'tt4', 'tt5'].flatMap((dose) => [
    [`${dose}Date`, `TT ${dose.slice(2)} Date`, 'Profile'],
    [`${dose}Remarks`, `TT ${dose.slice(2)} Remarks`, 'Profile'],
  ]),
  ...['influenza', 'hepatitisA', 'hepatitisB', 'covid19'].flatMap((vaccine) => [
    [`${vaccine}Date`, `${vaccine} Dose 1 Date`, 'Profile'],
    [`${vaccine}Dose2Date`, `${vaccine} Dose 2 Date`, 'Profile'],
    [`${vaccine}Dose3Date`, `${vaccine} Dose 3 Date`, 'Profile'],
    [`${vaccine}Remarks`, `${vaccine} Remarks / Facility`, 'Profile'],
  ]),
  ['weightForAge', 'Weight (kg)', 'Growth & Monitoring'],
  ['heightForAge', 'Length (cm)', 'Growth & Monitoring'],
  ['weightForAgeZScore', 'Weight-for-Age Z-Score', 'Growth & Monitoring'],
  ['weightForAgeInterpretation', 'Weight-for-Age Interpretation', 'Growth & Monitoring'],
  ['lengthForAgeZScore', 'Length-for-Age Z-Score', 'Growth & Monitoring'],
  ['lengthForAgeInterpretation', 'Length-for-Age Interpretation', 'Growth & Monitoring'],
  ['weightForLengthZScore', 'Weight-for-Length Z-Score', 'Growth & Monitoring'],
  ['weightForLengthInterpretation', 'Weight-for-Length Interpretation', 'Growth & Monitoring'],
  ['bmiForAge', 'BMI', 'Growth & Monitoring'],
  ['bmiInterpretation', 'BMI Interpretation', 'Growth & Monitoring'],
  ['bloodPressure', 'Blood Pressure', 'Monitoring'],
  ['initialWeight', 'Initial Weight (kg)', 'Profile'],
  ['initialHeight', 'Initial Height (cm)', 'Profile'],
  ['initialBmi', 'Initial BMI', 'Profile'],
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['receivedBenefitTotal', 'Total Received Benefits', 'Project Report'],
  ['receivedBenefitFrequency', 'Benefit Receipt Frequency', 'Project Report'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Project Report'],
  ['programDocumentation', 'Documentation Attached', 'Project Report'],
  ['hospitalReferral', 'Referral to Hospital', 'Monitoring'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
  ['measurementDate', 'Check-up Date', 'Monitoring'],
]);

export const DEFAULT_VISIBLE_FIELDS = [
  'school', 'group', 'batch', 'mother', 'child',
  'weightForAgeInterpretation', 'lengthForAgeInterpretation',
  'heightForAge', 'weightForLengthInterpretation', 'activitiesCompleted',
  'totalActivities', 'progress',
];

export const GROWTH_METRICS = [
  ['weightForAgeInterpretation', 'Weight-for-Age', 'WHO indicator for low weight relative to exact age; it does not classify overweight.'],
  ['lengthForAgeInterpretation', 'Length-for-Age', 'Matches the Child Check-up field; WHO uses length before 24 months and standing height from 24 months.'],
  ['weightForLengthInterpretation', 'Weight-for-Length', 'Matches the Child Check-up field; WHO switches to weight-for-height from 24 months.'],
];

export const WHO_NUMERIC_GROWTH_METRICS = [
  ['weightForAge', 'Weight (kg)', 'Raw child weight recorded at each check-up.'],
  ['heightForAge', 'Length/Height (cm)', 'Raw child length or height recorded at each check-up.'],
  ['weightForLengthZScore', 'Weight-for-Length Z-Score', 'WHO LMS z-score for weight relative to length; height is used from 24 months.'],
];

export const INTERPRETATION_METRICS = new Set(GROWTH_METRICS.map(([id]) => id));
export const MOTHER_GROWTH_METRICS = [
  ['bmiForAge', 'BMI', 'Latest BMI recorded by Mother Monitoring.'],
  ['hospitalReferral', 'Referral to Hospital', 'Review referral and assistance details recorded at maternal check-ups.'],
];

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
  ['headCircumference', 'Head Circumference (cm)', 'Head circumference recorded at birth.'],
  ['chestCircumference', 'Chest Circumference (cm)', 'Chest circumference recorded at birth.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the child profile.'],
  ['multipleBirth', 'Multiple Birth', 'Multiple-birth classification recorded in the child profile.'],
  ['deliveryType', 'Delivery Type', 'Delivery type recorded in the child profile.'],
  ['healthStatus', 'Health Status', 'Child health status recorded in the child profile.'],
  ['noOfChildDelivered', 'No. of Children Delivered', 'Number of children delivered in the birth event.'],
  ['expandedNewbornScreening', 'Expanded Newborn Screening', 'Expanded newborn screening status.'],
  ['expandedNewbornScreeningResult', 'Newborn Screening Result', 'Expanded newborn screening result.'],
  ['birthPlaceCity', 'Birth City / Municipality', 'City or municipality where the child was born.'],
  ['birthPlaceProvince', 'Birth Province', 'Province where the child was born.'],
  ['birthAttendant', 'Birth Attendant', 'Birth attendant recorded in the child profile.'],
  ['apgarScore', 'APGAR Score', 'APGAR score recorded in the child profile.'],
  ['feedingType', 'Feeding Type', 'Feeding type recorded in the child profile.'],
  ['exclusiveBreastfeeding', 'Exclusive Breastfeeding', 'Exclusive breastfeeding value recorded in the child profile.'],
  ['nutritionNotes', 'Nutritional Notes', 'Nutrition notes recorded in the child profile.'],
  ['fatherName', 'Father Name', 'Father name recorded in the child profile.'],
  ['relationship', 'Relationship', 'Relationship value recorded in the child profile.'],
  ['address', 'Address', 'Address recorded in the child profile.'],
  ['medicalConditions', 'Medical Conditions', 'Recorded child medical conditions.'],
  ['childCongenitalHeartDisease', 'Medical: Congenital Heart Disease', 'Whether congenital heart disease is recorded.'],
  ['childRespiratoryIssues', 'Medical: Respiratory Issues', 'Whether respiratory issues are recorded.'],
  ['childPrematurity', 'Medical: Prematurity', 'Whether prematurity is recorded.'],
  ['childJaundice', 'Medical: Jaundice', 'Whether jaundice is recorded.'],
  ['childAnemia', 'Medical: Anemia', 'Whether anemia is recorded.'],
  ['childGrowthDelay', 'Medical: Growth Delay', 'Whether growth delay is recorded.'],
  ['bcgDate', 'BCG Vaccine Record', 'All recorded BCG dose dates and remarks.'],
  ['hepbDate', 'HepB Vaccine Record', 'All recorded Hepatitis B dose dates and remarks.'],
  ['opvDate', 'OPV Vaccine Record', 'All recorded OPV dose dates and remarks.'],
  ['dptDate', 'DPT Vaccine Record', 'All recorded DPT dose dates and remarks.'],
  ['mmrDate', 'MMR Vaccine Record', 'All recorded MMR dose dates and remarks.'],
  ...['bcg', 'hepb', 'ipv', 'opv', 'pcv', 'dpt', 'mmr'].flatMap((vaccine) => [
    [`${vaccine}Dose1Date`, `${vaccine.toUpperCase()} Dose 1 Date`, `Recorded ${vaccine.toUpperCase()} dose 1 date.`],
    [`${vaccine}Dose2Date`, `${vaccine.toUpperCase()} Dose 2 Date`, `Recorded ${vaccine.toUpperCase()} dose 2 date.`],
    [`${vaccine}Dose3Date`, `${vaccine.toUpperCase()} Dose 3 Date`, `Recorded ${vaccine.toUpperCase()} dose 3 date.`],
    [`${vaccine}Remarks`, `${vaccine.toUpperCase()} Vaccine Remarks / Facility`, `Recorded ${vaccine.toUpperCase()} vaccine remarks or facility.`],
  ]),
];

export const CHILD_PROFILE_FIELD_SECTIONS = {
  gender: 'general', liveBirthDocument: 'general', address: 'general', fatherName: 'general', relationship: 'general',
  birthWeight: 'prenatal-ob', birthLength: 'prenatal-ob', headCircumference: 'prenatal-ob', chestCircumference: 'prenatal-ob', bloodType: 'prenatal-ob', multipleBirth: 'prenatal-ob', deliveryType: 'prenatal-ob',
  noOfChildDelivered: 'prenatal-ob', expandedNewbornScreening: 'prenatal-ob', expandedNewbornScreeningResult: 'prenatal-ob', birthPlaceCity: 'prenatal-ob', birthPlaceProvince: 'prenatal-ob', birthAttendant: 'prenatal-ob', apgarScore: 'prenatal-ob',
  healthStatus: 'medical-dental', feedingType: 'medical-dental', exclusiveBreastfeeding: 'medical-dental', nutritionNotes: 'medical-dental', medicalConditions: 'medical-dental',
  childCongenitalHeartDisease: 'medical-dental', childRespiratoryIssues: 'medical-dental', childPrematurity: 'medical-dental', childJaundice: 'medical-dental', childAnemia: 'medical-dental', childGrowthDelay: 'medical-dental',
  bcgDate: 'vaccine', hepbDate: 'vaccine', ipvDate: 'vaccine', opvDate: 'vaccine', pcvDate: 'vaccine', dptDate: 'vaccine', mmrDate: 'vaccine',
  ...Object.fromEntries(['bcg', 'hepb', 'ipv', 'opv', 'pcv', 'dpt', 'mmr'].flatMap((vaccine) => [
    [`${vaccine}Dose1Date`, 'vaccine'], [`${vaccine}Dose2Date`, 'vaccine'], [`${vaccine}Dose3Date`, 'vaccine'], [`${vaccine}Remarks`, 'vaccine'],
  ])),
};

export const PROFILE_SECTION_LABELS = {
  all: 'All profile fields',
  general: 'General',
  'prenatal-ob': 'Prenatal / OB',
  'medical-dental': 'Medical / Dental',
  vaccine: 'Vaccine',
};

export const MOTHER_PROFILE_FIELD_SECTIONS = {
  age: 'general', birthPlaceCity: 'general', birthPlaceProvince: 'general', contactNumber: 'general', addressDetails: 'general', motherBirthCertificate: 'general', programConsentDocument: 'general', philhealthMember: 'general', philhealthNumber: 'general', spouseName: 'general', emergencyName: 'general', emergencyContact: 'general', emergencyRelationship: 'general', maidenSurname: 'general',
  civilStatus: 'general', employmentStatus: 'general', educationalAttainment: 'general', dataPrivacySigned: 'general', mediaReleaseSigned: 'general',
  initialWeight: 'prenatal-ob', initialHeight: 'prenatal-ob', initialBmi: 'prenatal-ob', lmpDate: 'prenatal-ob', eddDate: 'prenatal-ob', prenatalRegDate: 'prenatal-ob', trimester: 'prenatal-ob', gestationalAge: 'prenatal-ob', prenatalWeight: 'prenatal-ob', prenatalBp: 'prenatal-ob', prenatalHeight: 'prenatal-ob', fundalHeight: 'prenatal-ob', fhr: 'prenatal-ob', gravida: 'prenatal-ob', para: 'prenatal-ob', abortion: 'prenatal-ob', stillbirth: 'prenatal-ob', totalChildren: 'prenatal-ob', childrenBornAlive: 'prenatal-ob', miscarriages: 'prenatal-ob', childrenDiedAfterBirth: 'prenatal-ob', obHistory: 'prenatal-ob',
  medicalConditions: 'medical-dental', allergies: 'medical-dental', bloodType: 'medical-dental', otherMedicalHistory: 'medical-dental', dentalCheckupDate: 'medical-dental', dentalFacility: 'medical-dental', dentistInCharge: 'medical-dental', communityDentist: 'medical-dental', dentistLicense: 'medical-dental', dentistContact: 'medical-dental', teethCount: 'medical-dental', dentalFindings: 'medical-dental', dentalWork: 'medical-dental', dentalRemarks: 'medical-dental',
  ...Object.fromEntries([
    'hypertension', 'diabetes', 'eclampsia', 'asthma', 'heartDisease', 'kidneyDisease', 'epilepsy', 'goiter', 'tuberculosis', 'parasitism', 'anemia', 'urinaryTractInfection', 'genitalTractInfection', 'smoking', 'alcoholIntake', 'illegalDrugUse', 'otherInfectiousDisease', 'cancer', 'std', 'multiplePregnancy', 'prevCesarean',
  ].map((id) => [`maternalCondition_${id}`, 'medical-dental'])),
  ...Object.fromEntries(['tartarRemoval', 'filling', 'cleaning', 'extraction', 'rootCanal', 'other'].map((id) => [`dentalWork_${id}`, 'medical-dental'])),
  ttVaccineRecord: 'vaccine',
  ...Object.fromEntries([
    ...['tt1', 'tt2', 'tt3', 'tt4', 'tt5'].flatMap((dose) => [[`${dose}Date`, 'vaccine'], [`${dose}Remarks`, 'vaccine']]),
    ...['influenza', 'hepatitisA', 'hepatitisB', 'covid19'].flatMap((vaccine) => [
      [`${vaccine}Date`, 'vaccine'], [`${vaccine}Dose2Date`, 'vaccine'], [`${vaccine}Dose3Date`, 'vaccine'], [`${vaccine}Remarks`, 'vaccine'],
    ]),
  ]),
};

export const MOTHER_PROFILE_SECTION_LABELS = {
  general: 'General',
  'prenatal-ob': 'Prenatal / OB',
  'medical-dental': 'Medical / Dental',
  vaccine: 'Vaccine',
};

export const MOTHER_PROFILE_METRICS = [
  ['age', 'Age', 'Age calculated from the mother profile date of birth.'],
  ['birthPlaceCity', 'Birth City / Municipality', 'City or municipality where the mother was born.'],
  ['birthPlaceProvince', 'Birth Province', 'Province where the mother was born.'],
  ['maidenSurname', 'Maiden Surname', 'Maiden surname recorded in the mother profile.'],
  ['contactNumber', 'Contact Number', 'Contact number recorded in the mother profile.'],
  ['addressDetails', 'Address Details', 'Whether address details are recorded in the mother profile.'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Whether the mother birth certificate is uploaded.'],
  ['programConsentDocument', 'Project Consent Form', 'Whether the project consent form is uploaded.'],
  ['civilStatus', 'Civil Status', 'Civil status recorded in the mother profile.'],
  ['employmentStatus', 'Employment Status', 'Employment status recorded in the mother profile.'],
  ['educationalAttainment', 'Educational Attainment', 'Educational attainment recorded in the mother profile.'],
  ['dataPrivacySigned', 'Data Privacy Consent', 'Whether the data privacy form is signed.'],
  ['mediaReleaseSigned', 'Media Release Consent', 'Whether the media release form is signed.'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the mother is registered as a PhilHealth member.'],
  ['philhealthNumber', 'PhilHealth Number', 'PhilHealth number recorded in the mother profile.'],
  ['spouseName', 'Spouse Name', 'Spouse name recorded in the mother profile.'],
  ['emergencyName', 'Emergency Contact Name', 'Emergency contact name recorded in the mother profile.'],
  ['emergencyContact', 'Emergency Contact Number', 'Emergency contact number recorded in the mother profile.'],
  ['emergencyRelationship', 'Emergency Relationship', 'Emergency contact relationship.'],
  ['initialWeight', 'Initial Weight (kg)', 'Prenatal baseline weight.'],
  ['initialHeight', 'Initial Height (cm)', 'Prenatal baseline height.'],
  ['initialBmi', 'Initial BMI', 'Baseline BMI calculated from prenatal weight and height.'],
  ['gravida', 'Gravida', 'Number of pregnancies.'],
  ['abortion', 'Abortion', 'Recorded abortion count.'],
  ['stillbirth', 'Stillbirth', 'Recorded stillbirth count.'],
  ['totalChildren', 'Total Children', 'Total children recorded in the obstetric profile.'],
  ['childrenBornAlive', 'Children Born Alive', 'Children born alive recorded in the obstetric profile.'],
  ['miscarriages', 'Miscarriages', 'Recorded miscarriage count.'],
  ['childrenDiedAfterBirth', 'Children Died After Birth', 'Children who died after birth recorded in the obstetric profile.'],
  ['obHistory', 'Previous Obstetric History', 'Recorded prior obstetric events, gestational ages, and outcomes.'],
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
  ['allergies', 'Allergies', 'Allergies recorded in the mother profile.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the mother profile.'],
  ...[
    ['hypertension', 'Hypertension'],
    ['diabetes', 'Diabetes'],
    ['eclampsia', 'Eclampsia'],
    ['asthma', 'Asthma'],
    ['heartDisease', 'Heart Disease'],
    ['kidneyDisease', 'Kidney Disease'],
    ['epilepsy', 'Epilepsy'],
    ['goiter', 'Goiter'],
    ['tuberculosis', 'Tuberculosis'],
    ['parasitism', 'Parasitism'],
    ['anemia', 'Anemia'],
    ['urinaryTractInfection', 'Urinary Tract Infection'],
    ['genitalTractInfection', 'Genital Tract Infection'],
    ['smoking', 'Smoking'],
    ['alcoholIntake', 'Alcohol Intake'],
    ['illegalDrugUse', 'Illegal Drug Use'],
    ['otherInfectiousDisease', 'Other Infectious Disease'],
    ['cancer', 'Cancer'],
    ['std', 'Sexually Transmitted Diseases'],
    ['multiplePregnancy', 'Multiple Pregnancy'],
    ['prevCesarean', 'Previous Caesarean Section'],
  ].map(([id, label]) => [`maternalCondition_${id}`, `Medical: ${label}`, `Whether ${label.toLowerCase()} is recorded.`]),
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
  ...[
    ['tartarRemoval', 'Tartar Removal'],
    ['filling', 'Filling'],
    ['cleaning', 'Cleaning'],
    ['extraction', 'Extraction'],
    ['rootCanal', 'Root Canal'],
    ['other', 'Other'],
  ].map(([id, label]) => [`dentalWork_${id}`, `Dental: ${label}`, `Whether ${label.toLowerCase()} was recorded.`]),
  ['dentalRemarks', 'Dental Remarks', 'Dental recommendations or remarks.'],
  ['ttVaccineRecord', 'Tetanus Toxoid Vaccine Record', 'All recorded TT dose dates and remarks.'],
  ...['tt1', 'tt2', 'tt3', 'tt4', 'tt5'].flatMap((dose) => [
    [`${dose}Date`, `TT ${dose.slice(2)} Date`, `Recorded tetanus toxoid ${dose.slice(2)} dose date.`],
    [`${dose}Remarks`, `TT ${dose.slice(2)} Remarks`, `Recorded tetanus toxoid ${dose.slice(2)} remarks.`],
  ]),
  ...['influenza', 'hepatitisA', 'hepatitisB', 'covid19'].flatMap((vaccine) => [
    [`${vaccine}Date`, `${vaccine} Dose 1 Date`, `Recorded ${vaccine} dose 1 date.`],
    [`${vaccine}Dose2Date`, `${vaccine} Dose 2 Date`, `Recorded ${vaccine} dose 2 date.`],
    [`${vaccine}Dose3Date`, `${vaccine} Dose 3 Date`, `Recorded ${vaccine} dose 3 date.`],
    [`${vaccine}Remarks`, `${vaccine} Remarks / Facility`, `Recorded ${vaccine} vaccine remarks or facility.`],
  ]),
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
export const PROGRAM_METRICS = [
  ['receivedBenefitTotal', 'Total Received Benefits', 'Total true benefit-receipt events in the selected period.'],
  ['receivedBenefitFrequency', 'Receipt Frequency', 'Number of true receipt events in the selected period.'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Average true receipt events per active month.'],
  ['programDocumentation', 'Documentation Attached', 'Yes when at least one selected project receipt has attached photo documentation; otherwise No.'],
];

export const REPORT_TABS = ['Community & Report Focus', 'Growth Metrics', 'Results'];

export const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

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
  if (field === 'philhealthNumber') return formatPhilHealthNumberForReport(value);
  const presenceValue = formatPresenceProfileValue(field, value);
  if (presenceValue !== null) return presenceValue;
  if (field === 'hospitalReferral') {
    return value === true || value === 1 || value === '1'
      || ['true', 'yes'].includes(String(value ?? '').trim().toLowerCase())
      ? 'Yes'
      : 'No';
  }
  if (value === null || value === undefined || value === '') return '—';
  if (['bcgDate', 'hepbDate', 'ipvDate', 'opvDate', 'pcvDate', 'dptDate', 'mmrDate', 'ttVaccineRecord'].includes(field)) {
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
  if (field === 'dateOfBirth' || field === 'measurementDate' || field.endsWith('Date')) {
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

export const getPointInterpretation = (point, metric) => metric === 'bmiInterpretation'
  ? getBmiInterpretation(point?.bmi)
  : normalizeNutritionLabel(String(point?.[metric] || '').trim());

export const getProfileGraphValue = (row, field) => {
  if (field === 'liveBirthDocument') return row?.liveBirthDocument ? 'Yes' : 'No';
  if (['contactNumber', 'addressDetails', 'motherBirthCertificate', 'programConsentDocument'].includes(field)) return row?.[field] ? 'Yes' : 'No';
  if (field === 'philhealthMember') return row?.philhealthMember || 'No';
  return row?.[field] === undefined || row?.[field] === null || row?.[field] === '' ? 'Not recorded' : String(row[field]);
};
