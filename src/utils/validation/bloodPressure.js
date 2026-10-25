const BLOOD_PRESSURE_PATTERN = /^\d{2,3}\/\d{2,3}$/;
const BLOOD_PRESSURE_INPUT_PATTERN = /^(?:\d{0,3}|\d{1,3}\/\d{0,3})$/;

export const isBloodPressureInput = (value) => BLOOD_PRESSURE_INPUT_PATTERN.test(String(value ?? ''));

export const getBloodPressureError = (value, { required = true } = {}) => {
  const bloodPressure = String(value ?? '').trim();
  if (!bloodPressure) return required ? 'Blood pressure is required.' : '';
  if (!BLOOD_PRESSURE_PATTERN.test(bloodPressure)) {
    return 'Enter blood pressure as systolic/diastolic (for example, 120/80).';
  }

  const [systolic, diastolic] = bloodPressure.split('/').map(Number);
  if (systolic < 70 || systolic > 250) return 'Systolic pressure must be between 70 and 250 mmHg.';
  if (diastolic < 40 || diastolic > 150) return 'Diastolic pressure must be between 40 and 150 mmHg.';
  if (systolic <= diastolic) return 'Systolic pressure must be higher than diastolic pressure.';
  return '';
};

export const getMaternalBloodPressureStatusSuggestion = (value) => {
  if (getBloodPressureError(value)) return '';

  const [systolic, diastolic] = String(value).trim().split('/').map(Number);
  if (systolic >= 140 || diastolic >= 90) return 'At Risk';
  if (systolic < 90 || diastolic < 60 || systolic >= 120 || diastolic >= 80) return 'Needs Follow-up';
  return 'Normal';
};
