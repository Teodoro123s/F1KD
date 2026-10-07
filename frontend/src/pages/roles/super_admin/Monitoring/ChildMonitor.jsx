import React, { useEffect, useState } from 'react';
import DateInput from '../../../../components/ui/DateInput';
import { addMonthsPreservingDay, formatDateForInput } from '../_shared/utils/dateFormat';
import { calculateWhoGrowthScores } from '../_shared/utils/whoGrowthStandards';
import { getAgeInDecimalMonths, getAgeInMonths } from '../_shared/utils/childAge.mjs';
import ConfirmModal from '../UserManagement/ConfirmModal';
import { notifyAction } from '../_shared/components/ActionFeedback';

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


export default function ChildMonitor({ child, onSave, onCancel, completedWeeks = [], initialWeek = 1, forceEdit = false }) {
  const [week, setWeek] = useState(() => Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(Number(initialWeek) || 1))));
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const childName = getChildName(child);
  const savedCheckup = (child?.checkups || []).find((checkup) => Number(checkup.week_number ?? checkup.weekNumber) === week);
  const getWeekDevelopmentalStatus = (weekNumber) => {
    if (weekNumber === week) return form.developmentalStatus;
    const checkup = (child?.checkups || []).find((item) => Number(item.week_number ?? item.weekNumber) === weekNumber);
    return checkup?.developmental_status ?? checkup?.developmentalStatus ?? '';
  };
  const firstRecordedCheckup = (child?.checkups || [])
    .map((checkup) => ({
      week: Number(checkup.week_number ?? checkup.weekNumber),
      date: formatDate(checkup.visit_date ?? checkup.checkupDate),
    }))
    .filter((checkup) => Number.isInteger(checkup.week) && checkup.date)
    .sort((left, right) => left.week - right.week)[0];
  const scheduleAnchorDate = firstRecordedCheckup?.date || form.checkupDate || getTodayDate();
  const scheduleAnchorWeek = firstRecordedCheckup?.week || 1;
  const scheduleAnchorDay = Number(scheduleAnchorDate.slice(-2));
  const update = (field) => (event) => setForm((current) => {
    const nextValue = event.target.value;
    const nextForm = { ...current, [field]: nextValue };
    if (field === 'checkupDate') {
      nextForm.nextCheckupDate = addMonthsPreservingDay(nextValue, 1, scheduleAnchorDay);
    }
    return nextForm;
  });
  const isWeekCompleted = Boolean(savedCheckup) || completedWeeks.some((weekNumber) => Number(weekNumber) === week);
  const isReadOnly = isWeekCompleted && !forceEdit;

  useEffect(() => {
    const scheduledDate = addMonthsPreservingDay(scheduleAnchorDate, week - scheduleAnchorWeek, scheduleAnchorDay) || getTodayDate();
    if (!savedCheckup) {
      setForm({
        checkupDate: scheduledDate,
        nextCheckupDate: addMonthsPreservingDay(scheduledDate, 1, scheduleAnchorDay),
        feedingType: child?.feedingType || child?.feeding_type || '',
        weight: '',
        height: '',
        developmentalStatus: 'Normal',
        serviceProvider: '',
        remarks: '',
      });
      return;
    }
    const savedDate = formatDate(savedCheckup.visit_date ?? savedCheckup.checkupDate);
    setForm({
      checkupDate: savedDate,
      nextCheckupDate: addMonthsPreservingDay(savedDate, 1, scheduleAnchorDay),
      feedingType: child?.feedingType || child?.feeding_type || '',
      weight: savedCheckup.weight ?? '',
      height: savedCheckup.height ?? '',
      developmentalStatus: savedCheckup.developmental_status ?? savedCheckup.developmentalStatus ?? 'Normal',
      serviceProvider: savedCheckup.service_provider ?? savedCheckup.serviceProvider ?? '',
      remarks: savedCheckup.notes ?? savedCheckup.remarks ?? '',
    });
  }, [child, forceEdit, savedCheckup, scheduleAnchorDate, scheduleAnchorDay, scheduleAnchorWeek, week]);

  const goToWeek = (nextWeek) => setWeek(Math.max(1, Math.min(TOTAL_MONTHS, nextWeek)));
  const bmi = calculateBmi(form.weight, form.height);
  const childBirthDate = getChildBirthDate(child);
  const ageInMonths = getAgeInMonths(childBirthDate, form.checkupDate);
  const currentAgeInMonths = getAgeInDecimalMonths(childBirthDate, form.checkupDate);
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
  const interpretationClass = (value) => `checkup-field-input checkup-interpretation ${String(value).trim().toLowerCase() === 'normal' ? 'is-normal' : 'is-abnormal'}`;

  const renderDateField = ({ id, label, name, required = false }) => (
    <div className="form-group full-width">
      <label className={`checkup-field-label${required ? ' is-required' : ''}`} htmlFor={id}>{label}</label>
      <DateInput
        id={id}
        className="checkup-field-input"
        value={form[name]}
        onChange={(value) => setForm((current) => ({
          ...current,
          [name]: value,
          ...(name === 'checkupDate' ? { nextCheckupDate: addMonthsPreservingDay(value, 1, scheduleAnchorDay) } : {}),
        }))}
        required={required}
        readOnly={isReadOnly}
        ariaLabel={label}
      />
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSaving && !isReadOnly) setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    if (isReadOnly) return;
    setShowSaveConfirm(false);
    setIsSaving(true);
    try {
      const saved = await onSave({ ...form, checkupDate: formatDateForPayload(form.checkupDate), week, childId: child.id || child.child_id });
      if (saved === false) return;
      notifyAction(`Month ${week} monitoring saved successfully.`);
      if (!forceEdit || !isWeekCompleted) goToWeek(week + 1);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="child-monitor-page">
      <div className="child-monitor-stepper" aria-label="Child monitoring months">
        {Array.from({ length: TOTAL_MONTHS }, (_, index) => index + 1).map((weekNumber) => (
          (() => {
            const status = String(getWeekDevelopmentalStatus(weekNumber)).toLowerCase();
            const statusClass = status === 'at risk' ? ' at-risk' : status === 'needs follow-up' ? ' needs-follow-up' : '';
            const statusLabel = status === 'at risk' ? ', At Risk' : status === 'needs follow-up' ? ', Needs Follow-up' : '';
            return <button
              type="button"
              key={weekNumber}
              className={`child-monitor-week${weekNumber === week ? ' active' : ''}${completedWeeks.includes(weekNumber) ? ' complete' : ''}${statusClass}`}
              aria-current={weekNumber === week ? 'step' : undefined}
              onClick={() => setWeek(weekNumber)}
              aria-label={`Month ${weekNumber}${statusLabel}`}
            >
              M{weekNumber}
            </button>;
          })()
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

      <form className="child-monitor-form" onSubmit={handleSubmit} aria-readonly={isReadOnly}>
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
              <select id="child-monitor-feeding-type" className="checkup-field-input" value={form.feedingType} onChange={update('feedingType')} disabled={isReadOnly}>
                <option value="">Select feeding type</option>
                <option value="Breastfeed">Breastfeed</option>
                <option value="Bottle feed">Bottle feed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkup-field-label is-required" htmlFor="child-monitor-weight">Weight (kg)</label>
              <input id="child-monitor-weight" type="number" step="0.1" className="checkup-field-input" value={form.weight} onChange={update('weight')} required readOnly={isReadOnly} />
            </div>
            <div className="form-group">
              <label className="checkup-field-label is-required" htmlFor="child-monitor-height">Length (cm)</label>
              <input id="child-monitor-height" type="number" min="45" max="100" step="0.1" className="checkup-field-input" value={form.height} onChange={update('height')} required readOnly={isReadOnly} />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-bmi">BMI (Secondary Reference)</label>
              <input id="child-monitor-bmi" type="text" className="checkup-field-input" value={bmi} readOnly placeholder="Auto-calculated" />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-length">Weight-for-Length (Primary Standard)</label>
              <input id="child-monitor-weight-length" type="text" className={interpretationClass(weightLengthInterpretation)} value={weightLengthInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight-age">Weight-for-Age</label>
              <input id="child-monitor-weight-age" type="text" className={interpretationClass(weightAgeInterpretation)} value={weightAgeInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-length-age">Length-for-Age</label>
              <input id="child-monitor-length-age" type="text" className={interpretationClass(lengthAgeInterpretation)} value={lengthAgeInterpretation} readOnly />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-developmental-status">Developmental Screening</label>
              <select id="child-developmental-status" className="checkup-field-input" value={form.developmentalStatus} onChange={update('developmentalStatus')} disabled={isReadOnly}>
                <option>Normal</option>
                <option>Needs Follow-up</option>
                <option>At Risk</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-service-provider">Health Worker / Provider</label>
              <input id="child-service-provider" type="text" className="checkup-field-input" value={form.serviceProvider} onChange={update('serviceProvider')} placeholder="e.g. Nurse or midwife" readOnly={isReadOnly} />
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-monitor-remarks">Growth and Development Notes</label>
              <textarea id="child-monitor-remarks" className="checkup-field-input" rows="3" value={form.remarks} onChange={update('remarks')} placeholder="Growth, feeding, or health observations" readOnly={isReadOnly} />
            </div>
          </div>
          <div className="checkup-actions">
            <button type="submit" className="btn-primary" disabled={isReadOnly || isSaving}>{isSaving ? 'Saving...' : 'Save Checkup'}</button>
            <button type="button" className="btn-secondary" onClick={() => onCancel?.()} disabled={isReadOnly || isSaving}>Cancel</button>
            {isReadOnly && <span className="checkup-week-badge" role="status">Saved · Read-only</span>}
          </div>
        </div>
      </form>
      <ConfirmModal
        show={showSaveConfirm}
        className="checkup-confirm-modal"
        message={`Save the check-up record for ${childName} for M${week}?`}
        onConfirm={confirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </section>
  );
}

export { getChildName };
