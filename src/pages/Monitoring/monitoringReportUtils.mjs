import { calculateBmi } from '../../utils/beneficiary/beneficiaryHelpers.js';

export const MONITORING_REPORT_FIELD_LABELS = {
  measurementDate: 'Check-up date',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  bmiInterpretation: 'Recorded BMI interpretation',
  hospitalReferral: 'Hospital referral',
  laboratoryRequests: 'Laboratory requests',
  assistanceAmount: 'Assistance amount (PHP)',
  sourceOfFunds: 'Source of funds',
  facilityType: 'Facility / referral source',
  bloodPressure: 'Blood pressure',
  developmentalStatus: 'Developmental status',
  remarks: 'Check-up remarks',
};

export function getMonitoringReportCheckups(beneficiary, type) {
  const checkups = beneficiary?.checkups || [];
  return type === 'Mother' ? checkups.flat().filter(Boolean) : checkups.filter(Boolean);
}

export function filterMonitoringReportCheckups(checkups, onlyReferredToHospital, onlyNonNormalScreenings = false) {
  return checkups.filter((checkup) => {
    if (onlyReferredToHospital && getMonitoringReportValue(checkup, 'hospitalReferral') !== 'Yes') return false;
    if (onlyNonNormalScreenings) {
      const status = String(getMonitoringReportValue(checkup, 'developmentalStatus'))
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ' ');
      if (!['needs follow up', 'at risk'].includes(status)) return false;
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

export function getMonitoringReportValue(checkup, metricId) {
  const value = (...keys) => keys
    .map((key) => checkup?.[key])
    .find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  switch (metricId) {
    case 'measurementDate': {
      const date = value('checkupDate', 'visit_date', 'checkup_date');
      return date ? String(date).slice(0, 10) : '—';
    }
    case 'weight': return value('weight') ?? '—';
    case 'height': return value('height') ?? '—';
    case 'bmi': return value('bmi') ?? (calculateBmi(checkup?.weight, checkup?.height) || '—');
    case 'bmiInterpretation': return value('nutritionalStatus', 'nutritional_status', 'bmiInterpretation') ?? '—';
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
      if (referred === undefined) return '—';
      return referred === true || referred === 1 || referred === '1' || ['true', 'yes'].includes(String(referred).toLowerCase()) ? 'Yes' : 'No';
    }
    case 'bloodPressure': return value('bp', 'bloodPressure', 'blood_pressure') ?? '—';
    case 'developmentalStatus': return value('developmentalStatus', 'developmental_status') ?? '—';
    case 'remarks': return value('remarks', 'notes') ?? '—';
    default: return '—';
  }
}
