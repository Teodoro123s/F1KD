const BLOOD_PRESSURE_PATTERN = /^\d{2,3}\/\d{2,3}$/;

function getBloodPressureError(value, { required = true } = {}) {
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
}

module.exports = { getBloodPressureError };
