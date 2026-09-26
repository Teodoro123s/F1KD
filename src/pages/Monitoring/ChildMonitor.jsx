import React, { useEffect, useState } from 'react';
import { formatDateForDisplay, formatDateForInput } from '../../utils/dateFormat';
import { calculateWhoGrowthScores } from '../../utils/whoGrowthStandards';
import ConfirmModal from '../UserManagement/ConfirmModal';
import { notifyAction } from '../../components/ActionFeedback';

const TOTAL_MONTHS = 24;

function getChildName(child) {
  return child?.name || [child?.firstName || child?.first_name, child?.middleName || child?.middle_name, child?.lastName || child?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed child';
}

function getChildBirthDate(child) {
  return child?.birthDate
    || child?.birth_date
    || child?.birthdate
    || child?.dateOfBirth
    || child?.dob
    || child?.raw?.birthDate
    || child?.raw?.birth_date
    || child?.source?.birthDate
    || child?.source?.birth_date
    || child?.data?.birthDate
    || child?.data?.birth_date
    || '';
}

function formatDate(value) {
  return formatDateForInput(value);
}

function formatDateForPayload(value) {
  return String(value || '').trim().replaceAll('/', '-');
}

function formatDateDisplay(value) {
  const normalized = formatDateForInput(value);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-');
  return `${month}/${day}/${year}`;
}

function formatDateTyping(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function calculateBmi(weight, height) {
  const numericWeight = Number(weight);
  const numericLength = Number(height);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericLength)
    || numericWeight <= 0 || numericLength <= 0) return '';
  return (numericWeight / ((numericLength / 100) ** 2)).toFixed(1);
}

function getAgeInMonths(birthDate, assessmentDate) {
  if (!birthDate || !assessmentDate) return null;
  const birth = new Date(`${formatDateForInput(birthDate)}T00:00:00`);
  const assessment = new Date(`${formatDateForInput(assessmentDate)}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(assessment.getTime()) || birth > assessment) return null;
  return Math.max(0, (assessment.getFullYear() - birth.getFullYear()) * 12
    + assessment.getMonth() - birth.getMonth() - (assessment.getDate() < birth.getDate() ? 1 : 0));
}

function getAgeInHalfMonths(birthDate, assessmentDate) {
  if (!birthDate || !assessmentDate) return null;
  const birth = new Date(`${formatDateForInput(birthDate)}T00:00:00`);
  const assessment = new Date(`${formatDateForInput(assessmentDate)}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(assessment.getTime()) || birth > assessment) return null;

  let completeMonths = (assessment.getFullYear() - birth.getFullYear()) * 12
    + assessment.getMonth() - birth.getMonth();
  if (assessment.getDate() < birth.getDate()) completeMonths -= 1;

  const anniversary = new Date(birth);
  anniversary.setMonth(anniversary.getMonth() + completeMonths);
  const remainingDays = Math.max(0, Math.floor((assessment - anniversary) / (24 * 60 * 60 * 1000)));
  return completeMonths + (remainingDays >= 15 ? 0.5 : 0);
}

export default function ChildMonitor({ child, onSave, onCancel, completedWeeks = [] }) {
  const [week, setWeek] = useState(1);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dateDrafts, setDateDrafts] = useState({});
  const datePickerRefs = React.useRef({});
  const [form, setForm] = useState(() => ({
    checkupDate: getTodayDate(),
    nextCheckupDate: '',
    feedingType: child?.feedingType || child?.feeding_type || '',
    weight: '',
    height: '',
    developmentalStatus: 'Normal',
    serviceProvider: '',
    remarks: '',
  }));

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const updateDateField = (field) => (event) => {
    const draft = formatDateTyping(event.target.value);
    setDateDrafts((current) => ({ ...current, [field]: draft }));
    const isoValue = parseDateInput(draft);
    if (isoValue) setForm((current) => ({ ...current, [field]: isoValue }));
  };
  const childName = getChildName(child);

  useEffect(() => {
    setDateDrafts({});
    const savedCheckup = (child?.checkups || []).find((checkup) => Number(checkup.week_number ?? checkup.weekNumber) === week);
    if (!savedCheckup) {
      const previousCheckup = (child?.checkups || [])
        .filter((checkup) => Number(checkup.week_number ?? checkup.weekNumber) < week)
        .sort((left, right) => Number(right.week_number ?? right.weekNumber) - Number(left.week_number ?? left.weekNumber))[0];
      setForm({
        checkupDate: formatDate(previousCheckup?.next_checkup_date ?? previousCheckup?.nextCheckupDate) || getTodayDate(),
        nextCheckupDate: '',
        feedingType: child?.feedingType || child?.feeding_type || '',
        weight: '',
        height: '',
        developmentalStatus: 'Normal',
        serviceProvider: '',
        remarks: '',
      });
      return;
    }
    setForm({
      checkupDate: formatDate(savedCheckup.visit_date ?? savedCheckup.checkupDate),
      nextCheckupDate: formatDate(savedCheckup.next_checkup_date ?? savedCheckup.nextCheckupDate),
      feedingType: child?.feedingType || child?.feeding_type || '',
      weight: savedCheckup.weight ?? '',
      height: savedCheckup.height ?? '',
      developmentalStatus: savedCheckup.developmental_status ?? savedCheckup.developmentalStatus ?? 'Normal',
      serviceProvider: savedCheckup.service_provider ?? savedCheckup.serviceProvider ?? '',
      remarks: savedCheckup.notes ?? savedCheckup.remarks ?? '',
    });
  }, [child, week]);

  const goToWeek = (nextWeek) => setWeek(Math.max(1, Math.min(TOTAL_MONTHS, nextWeek)));
  const bmi = calculateBmi(form.weight, form.height);
  const childBirthDate = getChildBirthDate(child);
  const ageInMonths = getAgeInMonths(childBirthDate, form.checkupDate);
  const currentAgeInMonths = getAgeInHalfMonths(childBirthDate, form.checkupDate);
  const gender = child?.gender || child?.sex || '';
  const whoGrowthScores = calculateWhoGrowthScores({
    weight: form.weight,
    lengthHeight: form.height,
    sex: gender,
    birthDate: childBirthDate,
    measurementDate: form.checkupDate,
  });
  const missingGrowthContext = !gender ? 'Enter sex' : ageInMonths === null ? 'Enter birth date' : '';
  const weightLengthInterpretation = whoGrowthScores.weightForLengthInterpretation || missingGrowthContext
    || (Number(form.weight) > 0 && Number(form.height) > 0 ? 'Outside WHO reference range' : 'Enter valid weight and length');
  const weightLengthZScore = whoGrowthScores.weightForLengthZScore === null || whoGrowthScores.weightForLengthZScore === undefined
    ? ''
    : Number(whoGrowthScores.weightForLengthZScore).toFixed(2);
  const weightAgeInterpretation = whoGrowthScores.weightForAgeInterpretation || missingGrowthContext
    || (Number(form.weight) > 0 ? 'Outside WHO reference range' : 'Enter valid weight');
  const weightAgeZScore = whoGrowthScores.weightForAgeZScore === null || whoGrowthScores.weightForAgeZScore === undefined
    ? ''
    : Number(whoGrowthScores.weightForAgeZScore).toFixed(2);
  const lengthAgeInterpretation = whoGrowthScores.lengthForAgeInterpretation || missingGrowthContext
    || (Number(form.height) > 0 ? 'Outside WHO reference range' : 'Enter valid length');

  const renderDateField = ({ id, label, name, required = false }) => (
    <div className="form-group full-width">
      <label className="checkup-field-label" htmlFor={id}>{label}</label>
      <div className="date-input-container">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="\d{2}/\d{2}/\d{4}"
          className="checkup-field-input"
          value={dateDrafts[name] ?? formatDateDisplay(form[name])}
          onChange={updateDateField(name)}
          placeholder="MM/DD/YYYY"
          required={required}
        />
        <input
          ref={(element) => { datePickerRefs.current[name] = element; }}
          className="native-date-picker-input"
          type="date"
          value={formatDateForInput(form[name])}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDateDrafts((current) => ({ ...current, [name]: formatDateDisplay(nextValue) }));
            setForm((current) => ({ ...current, [name]: nextValue }));
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          className="calendar-toggle-btn"
          onClick={() => {
            const picker = datePickerRefs.current[name];
            if (picker) {
              try {
                if (typeof picker.showPicker === 'function') picker.showPicker();
                else picker.focus();
              } catch (_) {
                picker.focus();
              }
            }
          }}
          aria-label={`Open calendar for ${label}`}
          tabIndex={-1}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSaving) setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    setShowSaveConfirm(false);
    setIsSaving(true);
    try {
      const saved = await onSave({ ...form, checkupDate: formatDateForPayload(form.checkupDate), week, childId: child.id || child.child_id });
      if (saved === false) return;
      notifyAction(`Month ${week} monitoring saved successfully.`);
      goToWeek(week + 1);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="child-monitor-page">
      <div className="child-monitor-stepper" aria-label="Child monitoring months">
        {Array.from({ length: TOTAL_MONTHS }, (_, index) => index + 1).map((weekNumber) => (
          <button
            type="button"
            key={weekNumber}
            className={`child-monitor-week${weekNumber === week ? ' active' : ''}${completedWeeks.includes(weekNumber) ? ' complete' : ''}`}
            onClick={() => setWeek(weekNumber)}
            aria-label={`Month ${weekNumber}`}
          >
            M{weekNumber}
          </button>
        ))}
      </div>

      <div className="child-monitor-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToWeek(week - 1)} disabled={week === 1}>Previous month</button>
        <label htmlFor="child-monitor-week-select">
          Current month
          <select id="child-monitor-week-select" value={week} onChange={(event) => goToWeek(Number(event.target.value))}>
            {Array.from({ length: TOTAL_MONTHS }, (_, index) => index + 1).map((monthNumber) => (
              <option key={monthNumber} value={monthNumber}>Month {monthNumber}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={() => goToWeek(week + 1)} disabled={week === TOTAL_MONTHS}>Next month</button>
      </div>

      <form className="child-monitor-form" onSubmit={handleSubmit}>
        <div className="checkup-card-body">
          <div className="checkup-form-heading">
            <div>
              <span className="checkup-module-kicker">Growth record</span>
              <div className="checkup-section-title">Child Check-up Record</div>
            </div>
            <span className="checkup-week-badge">M{week} / {TOTAL_MONTHS}</span>
          </div>
          <p className="child-monitor-subtitle">M{week} of {TOTAL_MONTHS} · {childName}</p>
          <div className="checkup-grid">
            {renderDateField({ id: 'child-checkup-date', label: 'Check-up Date', name: 'checkupDate', required: true })}
            {renderDateField({ id: 'child-next-checkup-date', label: 'Next Check-up Date (Tentative)', name: 'nextCheckupDate' })}
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-current-age-months">Current Age (months)</label>
              <input
                id="child-current-age-months"
                type="text"
                className="checkup-field-input"
                value={currentAgeInMonths === null ? '' : currentAgeInMonths.toString()}
                placeholder="Calculated from DOB"
                readOnly
              />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-feeding-type">Feeding Type</label>
              <select id="child-monitor-feeding-type" className="checkup-field-input" value={form.feedingType} onChange={update('feedingType')}>
                <option value="">Select feeding type</option>
                <option value="Breastfeed">Breastfeed</option>
                <option value="Bottle feed">Bottle feed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight">Weight (kg)</label>
              <input id="child-monitor-weight" type="number" step="0.1" className="checkup-field-input" value={form.weight} onChange={update('weight')} required />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-height">Length (cm)</label>
              <input id="child-monitor-height" type="number" min="45" max="100" step="0.1" className="checkup-field-input" value={form.height} onChange={update('height')} required />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-bmi">BMI (Secondary Reference)</label>
              <input id="child-monitor-bmi" type="text" className="checkup-field-input" value={bmi} readOnly placeholder="Auto-calculated" />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-length">Weight-for-Length (Primary Standard)</label>
              <input id="child-monitor-weight-length" type="text" className="checkup-field-input" value={weightLengthInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-length-z">Weight-for-Length Z-Score (WHO)</label>
              <input id="child-monitor-weight-length-z" type="text" className="checkup-field-input" value={weightLengthZScore} readOnly placeholder="Auto-calculated" />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-age">Weight-for-Age</label>
              <input id="child-monitor-weight-age" type="text" className="checkup-field-input" value={weightAgeInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-age-z">Weight-for-Age Z-Score (WHO)</label>
              <input id="child-monitor-weight-age-z" type="text" className="checkup-field-input" value={weightAgeZScore} readOnly placeholder="Auto-calculated" />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-length-age">Length-for-Age</label>
              <input id="child-monitor-length-age" type="text" className="checkup-field-input" value={lengthAgeInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-developmental-status">Developmental Screening</label>
              <select id="child-developmental-status" className="checkup-field-input" value={form.developmentalStatus} onChange={update('developmentalStatus')}>
                <option>Normal</option>
                <option>Needs Follow-up</option>
                <option>At Risk</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-service-provider">Health Worker / Provider</label>
              <input id="child-service-provider" type="text" className="checkup-field-input" value={form.serviceProvider} onChange={update('serviceProvider')} placeholder="e.g. Nurse or midwife" />
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-monitor-remarks">Growth and Development Notes</label>
              <textarea id="child-monitor-remarks" className="checkup-field-input" rows="3" value={form.remarks} onChange={update('remarks')} placeholder="Growth, feeding, or health observations" />
            </div>
          </div>
          <div className="checkup-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Progress'}</button>
          </div>
        </div>
      </form>
      <ConfirmModal
        show={showSaveConfirm}
        message={`Save the check-up record for ${childName} for M${week}?`}
        onConfirm={confirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </section>
  );
}

export { getChildName };
