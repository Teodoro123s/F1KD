export const DEFAULT_GUIDANCE_PREFERENCES = {
  guidedToursEnabled: true,
  onboardingEnabled: true,
  contextualTooltipsEnabled: true,
  pageExplanationsEnabled: true,
  workflowGuideEnabled: true,
  onboardingCompleted: true,
  onboardingDismissed: false,
  tourRole: null,
  tourStatus: 'not_started',
  tourStep: 0,
};

export function normalizeGuidancePreferences(value) {
  const preferences = { ...DEFAULT_GUIDANCE_PREFERENCES, ...value };
  if (!['not_started', 'in_progress', 'completed'].includes(preferences.tourStatus)) {
    preferences.tourStatus = 'not_started';
  }
  preferences.tourStep = Number.isInteger(Number(preferences.tourStep))
    ? Math.max(0, Number(preferences.tourStep))
    : 0;
  return preferences;
}

export const CHECKUP_HELP = {
  maternal: {
    gestationalAge: {
      label: 'Gestation Period',
      content: 'Gestational age is the pregnancy duration in weeks. It is calculated from the last menstrual period (LMP) date when one is on file; otherwise enter the weeks from the prenatal record.',
    },
    trimesterMonth: {
      label: 'Month of Trimester',
      content: 'This is calculated from gestational age. Each trimester month represents a four-week period; it is not a calendar month.',
    },
    bloodPressure: {
      label: 'Blood Pressure',
      essential: true,
      content: 'Enter systolic/diastolic pressure (for example, 120/80): systolic is the top number and diastolic is the bottom number. Suggested status: At Risk at systolic 140 or higher or diastolic 90 or higher; Needs Follow-up at systolic 120–139, diastolic 80–89, systolic below 90, or diastolic below 60; otherwise Normal. This is a screening suggestion, not a diagnosis.',
    },
    bmi: {
      label: 'Auto-Calculation/BMI',
      essential: true,
      content: 'BMI means body mass index. It is calculated from the recorded weight and height. Pregnancy affects how BMI is interpreted, so use it as a screening measure and consult a qualified health worker.',
    },
    developmentalScreening: {
      label: 'Developmental Screening',
      essential: true,
      content: 'Record the result of the screening completed during this visit. Needs Follow-up and At Risk indicate that further review may be needed; they are not diagnoses.',
    },
    bmiStatus: {
      label: 'BMI Status',
      essential: true,
      content: 'This status is based on the recorded BMI. It is a screening result, not a diagnosis; a qualified health worker can interpret it in the context of pregnancy.',
    },
    hospitalReferral: {
      label: 'Referral to Hospital',
      content: 'Select Yes if the mother was referred to a hospital during this visit. This opens fields for related tests and assistance.',
    },
    laboratoryRequests: {
      label: 'Laboratory Request(s)',
      content: 'Select the tests requested for this referral, not test results.',
    },
    assistanceAmount: {
      label: 'Assistance Amount (PHP)',
      content: 'Enter the financial assistance recorded for this referral, in Philippine pesos.',
    },
    sourceOfFunds: {
      label: 'Source of Funds',
      content: 'Choose the organization or source that provided the recorded assistance.',
    },
    facilityType: {
      label: 'Facility Type',
      content: 'Choose the type of facility where the referred service was provided.',
    },
  },
  child: {
    currentMonth: {
      label: 'Current month',
      content: 'Choose the monthly check-up to view. M1 is the first monthly check-up and M24 is the 24th.',
    },
    currentAge: {
      label: 'Current Age (months)',
      content: "Age on the check-up date, calculated from the child's date of birth.",
    },
    feedingMethod: {
      label: 'Feeding Method',
      content: 'Choose the feeding pattern reported for the child. Exclusive breastfeeding means breast milk only; mixed feeding combines breast milk with other milk or formula; complementary feeding means other foods have been introduced alongside milk.',
    },
    length: {
      label: 'Length (cm)',
      content: "Record the child's measured body length in centimeters for this visit. Use the measurement method and equipment required by your health program.",
    },
    headCircumference: {
      label: 'Head Circumference (cm)',
      content: "Record the measurement around the child's head in centimeters, if taken during this visit.",
    },
    weightForAge: {
      label: 'Weight-for-Age',
      essential: true,
      content: "Compares the child's weight with the WHO reference for children of the same age and sex. It is a screening indicator, not a diagnosis.",
    },
    lengthForAge: {
      label: 'Length-for-Age',
      essential: true,
      content: "Compares the child's length with the WHO reference for children of the same age and sex. It is a screening indicator, not a diagnosis.",
    },
    weightForLength: {
      label: 'Weight-for-Length',
      essential: true,
      content: "Compares the child's weight with the WHO reference for children of the same length and sex. It is a screening indicator, not a diagnosis.",
    },
    developmentalScreening: {
      label: 'Developmental Screening',
      essential: true,
      content: 'Record the result of the screening completed during this visit. Needs Follow-up and At Risk indicate that further review may be needed; they are not diagnoses.',
    },
  },
};

export const ADDITIONAL_FIELD_HELP = {
  beneficiaryRegistration: {
    label: 'Beneficiary registration',
    definitions: [
      { label: 'Contact number', content: 'Enter exactly 11 digits starting with 09.' },
      { label: 'PhilHealth PIN', content: 'Enter 12 digits, formatted as XX-XXXXXXXXX-X.' },
      { label: 'LMP', content: 'LMP means the first day of the last menstrual period; it is used to calculate EDD and gestational age.' },
      { label: 'EDD', content: 'EDD is calculated from the LMP date. Enable the override option only when a provider confirms a different date.' },
      { label: 'Prenatal weight', content: 'Enter the mother’s measured weight at the first prenatal check-up, in kilograms.' },
      { label: 'Prenatal blood pressure', content: 'Numbers and one slash only; up to 3 digits on each side.' },
      { label: 'Prenatal height', content: 'Enter height in centimeters; this value is used to calculate the initial BMI.' },
      { label: 'Living children', content: 'Number of children already born who are currently living. Do not include the current pregnancy; enter 0 if none.' },
      { label: 'Deceased children', content: 'Number of children already born who later died. Do not include the current pregnancy; enter 0 if none.' },
      { label: 'Child date of birth', content: 'Use the birth date shown on the child’s official record.' },
      { label: 'Birth weight', content: 'Enter the recorded weight at birth in kilograms.' },
      { label: 'Birth length', content: 'Enter the recorded length at birth in centimeters.' },
      { label: 'Birth circumference', content: 'Enter the measurement recorded at birth, in centimeters.' },
      { label: 'Apgar Score', content: 'Record the documented Apgar score. Leave blank if it is not available.' },
    ],
  },
  batchDocumentation: {
    label: 'Batch documentation',
    definitions: [
      { label: 'Evidence photos', content: 'Select 3-10 photos in JPG, PNG, or WEBP format. Each photo can be up to 5 MB, with a 25 MB total limit per entry. You can add photos in multiple selections.' },
    ],
  },
  reporting: {
    label: 'Reports and AI',
    definitions: [
      { label: 'Check-up report request', content: 'Name mothers or children and the check-up details you need. Child growth fields are Weight-for-Age, Length-for-Age, and Weight-for-Length; child BMI is not available. You can request screening status, first/latest check-ups, current month, or recorded hospital referrals for mothers. School, group, and batch scope stays fixed to the selection above.' },
      { label: 'Report scope', content: 'The current school, group, or batch selection limits which records are available to the report. The assistant does not expand that scope.' },
      { label: 'AI report request format', content: 'Format: [type]: [fields]. Examples: Child check-up: date; Weight-for-Age, Length-for-Age, or Weight-for-Length interpretation or Z-score. Child BMI is not a check-up field. Child profile: general details; medical/dental history; vaccine doses and dates. Mother profile: general details; prenatal/OB history; medical/dental history; vaccine doses and dates. Project: benefits received; average per month; documentation. School, Group, and Batch scope stays fixed. Choose a project and period after the preview.' },
    ],
  },
};
