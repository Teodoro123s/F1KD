import { calculateBmi } from '../../utils/beneficiary/beneficiaryHelpers.js';
import { getMotherTrimesterMonth } from '../../utils/beneficiary/motherProgress.js';
import { calculateWhoGrowthScores } from '../../utils/beneficiary/whoGrowthStandards.js';
import { getAgeInDecimalMonths } from '../../utils/beneficiary/childAge.mjs';

export const MONITORING_REPORT_FIELD_LABELS = {
  measurementDate: 'Check-up date',
  gestationalAge: 'Gestational age (weeks)',
  trimesterMonth: 'Month of trimester',
  nextCheckupDate: 'Next check-up date',
  currentAgeMonths: 'Current age (months)',
  breastfeedingStatus: 'Feeding method',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  bmiInterpretation: 'Recorded BMI interpretation',
  weightForAgeInterpretation: 'Weight-for-Age',
  lengthForAgeInterpretation: 'Length-for-Age',
  weightForLengthInterpretation: 'Weight-for-Length',
  hospitalReferral: 'Hospital referral',
  laboratoryRequests: 'Laboratory requests',
  assistanceAmount: 'Assistance amount (PHP)',
  sourceOfFunds: 'Source of funds',
  facilityType: 'Facility / referral source',
  bloodPressure: 'Blood pressure',
  developmentalStatus: 'Developmental status',
  serviceProvider: 'Service provider',
  fundalHeight: 'Fundal height',
  fetalHeartRate: 'Fetal heart rate',
  remarks: 'Check-up remarks',
};

export function getMonitoringReportCheckups(beneficiary, type) {
  const checkups = beneficiary?.checkups || [];
  return type === 'Mother' ? checkups.flat().filter(Boolean) : checkups.filter(Boolean);
}

export function isMonitoringReportCheckupInCurrentMonth(checkup, referenceDate = new Date()) {
  const recordedDate = checkup?.checkupDate ?? checkup?.visit_date ?? checkup?.checkup_date;
  if (!recordedDate) return false;
  const dateText = String(recordedDate);
  const match = dateText.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return Number(match[1]) === referenceDate.getFullYear()
      && Number(match[2]) === referenceDate.getMonth() + 1;
  }
  const parsedDate = new Date(dateText);
  return Number.isFinite(parsedDate.getTime())
    && parsedDate.getFullYear() === referenceDate.getFullYear()
    && parsedDate.getMonth() === referenceDate.getMonth();
}

export function filterMonitoringReportCheckups(checkups, onlyReferredToHospital, onlyNonNormalScreenings = false, developmentalStatusFilter = [], currentMonthOnly = false) {
  const screeningStatusFilter = new Set((Array.isArray(developmentalStatusFilter) ? developmentalStatusFilter : [])
    .map((status) => String(status).trim().toLowerCase().replace(/[\s_-]+/g, ' ')));
  return checkups.filter((checkup) => {
    if (currentMonthOnly && !isMonitoringReportCheckupInCurrentMonth(checkup)) return false;
    if (onlyReferredToHospital && getMonitoringReportValue(checkup, 'hospitalReferral') !== 'Yes') return false;
    if (screeningStatusFilter.size > 0 || onlyNonNormalScreenings) {
      const status = String(getMonitoringReportValue(checkup, 'developmentalStatus'))
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ' ');
      const requestedStatuses = screeningStatusFilter.size > 0
        ? screeningStatusFilter
        : new Set(['needs follow up', 'at risk']);
      if (!requestedStatuses.has(status)) return false;
    }
    return true;
  });
}

export function escapeMonitoringReportCsvValue(value) {
  const text = String(value ?? '');
  return /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function getCheckupDate(checkup) {
  const date = checkup?.checkupDate ?? checkup?.visit_date ?? checkup?.checkup_date;
  if (!date) return null;
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getLatestMonitoringReportCheckup(checkups) {
  return checkups.reduce((latest, checkup, index) => {
    if (!latest) return { checkup, index, timestamp: getCheckupDate(checkup) };
    const timestamp = getCheckupDate(checkup);
    if (timestamp !== null && (latest.timestamp === null || timestamp > latest.timestamp
      || (timestamp === latest.timestamp && index > latest.index))) {
      return { checkup, index, timestamp };
    }
    if (timestamp === null && latest.timestamp === null && index > latest.index) {
      return { checkup, index, timestamp };
    }
    return latest;
  }, null)?.checkup ?? null;
}

export function getFirstMonitoringReportCheckup(checkups) {
  return checkups.reduce((first, checkup, index) => {
    if (!first) return { checkup, index, timestamp: getCheckupDate(checkup) };
    const timestamp = getCheckupDate(checkup);
    if (timestamp !== null && (first.timestamp === null || timestamp < first.timestamp
      || (timestamp === first.timestamp && index < first.index))) {
      return { checkup, index, timestamp };
    }
    if (timestamp === null && first.timestamp === null && index < first.index) {
      return { checkup, index, timestamp };
    }
    return first;
  }, null)?.checkup ?? null;
}

function getChildBirthDate(child) {
  return child?.birthDate ?? child?.birth_date ?? child?.birthdate ?? child?.dateOfBirth ?? child?.dob ?? '';
}

function getChildGrowthScores(checkup, child) {
  return calculateWhoGrowthScores({
    weight: checkup?.weight,
    lengthHeight: checkup?.height,
    sex: child?.gender ?? child?.sex ?? '',
    birthDate: getChildBirthDate(child),
    measurementDate: checkup?.checkupDate ?? checkup?.visit_date ?? checkup?.checkup_date ?? '',
  });
}

export function getMonitoringReportValue(checkup, metricId, beneficiary = null) {
  const value = (...keys) => keys
    .map((key) => checkup?.[key])
    .find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  switch (metricId) {
    case 'measurementDate': {
      const date = value('checkupDate', 'visit_date', 'checkup_date');
      return date ? String(date).slice(0, 10) : '—';
    }
    case 'gestationalAge': return value('gestationalAge', 'gestational_age', 'gestational_age_weeks') ?? '—';
    case 'trimesterMonth': {
      const gestationalAge = value('gestationalAge', 'gestational_age', 'gestational_age_weeks');
      return gestationalAge === undefined ? '—' : getMotherTrimesterMonth(gestationalAge, value('trimester') || '');
    }
    case 'nextCheckupDate': {
      const date = value('nextCheckupDate', 'next_checkup_date');
      return date ? String(date).slice(0, 10) : '—';
    }
    case 'currentAgeMonths': {
      const savedAge = value('currentAgeMonths', 'current_age_months', 'ageInMonths', 'age_in_months');
      if (savedAge !== undefined) return savedAge;
      const measurementDate = value('checkupDate', 'visit_date', 'checkup_date');
      const age = getAgeInDecimalMonths(getChildBirthDate(beneficiary), measurementDate);
      return age ?? '—';
    }
    case 'breastfeedingStatus': return value('feedingMethod', 'breastfeedingStatus', 'exclusive_breastfeeding', 'exclusiveBreastfeeding') ?? '—';
    case 'weight': return value('weight') ?? '—';
    case 'height': return value('height') ?? '—';
    case 'bmi': return value('bmi') ?? (calculateBmi(checkup?.weight, checkup?.height) || '—');
    case 'bmiInterpretation': return value('nutritionalStatus', 'nutritional_status', 'bmiInterpretation', 'bmi_interpretation') ?? '—';
    case 'weightForAgeInterpretation': return getChildGrowthScores(checkup, beneficiary).weightForAgeInterpretation || 'Not available';
    case 'lengthForAgeInterpretation': return getChildGrowthScores(checkup, beneficiary).lengthForAgeInterpretation || 'Not available';
    case 'weightForLengthInterpretation': return getChildGrowthScores(checkup, beneficiary).weightForLengthInterpretation || 'Not available';
    case 'fundalHeight': return value('fundalHeight', 'fundal_height', 'fundal_height_cm') ?? '—';
    case 'fetalHeartRate': return value('fhr', 'fetalHeartRate', 'fetal_heart_rate_bpm') ?? '—';
    case 'assistanceAmount': return value('amount', 'assistanceAmount', 'assistance_amount') ?? '—';
    case 'sourceOfFunds': return value('sourceOfFunds', 'source_of_funds') ?? '—';
    case 'facilityType': return value('facilityType', 'facility_type') ?? '—';
    case 'laboratoryRequests': {
      const requests = value('laboratoryRequests', 'laboratory_requests');
      if (Array.isArray(requests)) return requests.join(', ') || '—';
      return requests ? String(requests) : '—';
    }
    case 'hospitalReferral': {
      const referred = value('referral', 'referredToHospital', 'referred_to_hospital');
      return referred === true || referred === 1 || referred === '1' || ['true', 'yes'].includes(String(referred ?? '').trim().toLowerCase()) ? 'Yes' : 'No';
    }
    case 'bloodPressure': return value('bp', 'bloodPressure', 'blood_pressure') ?? '—';
    case 'developmentalStatus': return value('developmentalStatus', 'developmental_status') ?? '—';
    case 'serviceProvider': return value('serviceProvider', 'service_provider') ?? '—';
    case 'remarks': return value('remarks', 'notes') ?? '—';
    default: return '—';
  }
}
