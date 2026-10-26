import React, { useEffect, useState } from 'react';
import DateInput from '../../components/ui/DateInput';
import { addMonthsPreservingDay, formatDateForInput } from '../../utils/formatting/dateFormat';
import { calculateWhoGrowthScores } from '../../utils/beneficiary/whoGrowthStandards';
import { getAgeInDecimalMonths, getAgeInMonths } from '../../utils/beneficiary/childAge.mjs';
import ConfirmModal from '../UserManagement/ConfirmModal';
import { notifyAction } from '../../components/ActionFeedback';
import AuditSignatures from '../../components/ui/AuditSignatures';

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

function getChildBirthMeasurement(child, field) {
  const snakeField = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return [
    child?.[field], child?.[snakeField],
    child?.raw?.[field], child?.raw?.[snakeField],
    child?.source?.[field], child?.source?.[snakeField],
    child?.data?.[field], child?.data?.[snakeField],
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function getSavedOrBirthMeasurement(savedValue, child, field, week) {
  if (savedValue !== undefined && savedValue !== null && String(savedValue).trim() !== '') return savedValue;
  return week === 1 ? getChildBirthMeasurement(child, field) : '';
}

function isCheckupMonthComplete(child, completedWeeks, month) {
  const hasSavedCheckup = (child?.checkups || []).some(
    (checkup) => Number(checkup.week_number ?? checkup.weekNumber) === month,
  );
  return hasSavedCheckup || completedWeeks.some((completedMonth) => Number(completedMonth) === month);
}

function getFirstIncompleteMonth(child, completedWeeks) {
  for (let month = 1; month <= TOTAL_MONTHS; month += 1) {
    if (!isCheckupMonthComplete(child, completedWeeks, month)) return month;
  }
  return TOTAL_MONTHS;
}

function getBreastfeedingStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1' ? 'Yes' : 'No';
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


export default function ChildMonitor({
  child,
  onSave,
  onCancel,
  completedWeeks = [],
  initialWeek = 1,
  readOnly = false,
  showAuditSignatures = false,
}) {
  const requestedMonth = Math.max(1, Math.min(TOTAL_MONTHS, Math.floor(Number(initialWeek) || 1)));
  const firstIncompleteMonth = getFirstIncompleteMonth(child, completedWeeks);
  const initialMonth = Math.min(requestedMonth, firstIncompleteMonth);
  const [week, setWeek] = useState(initialMonth);
  const [editingWeek, setEditingWeek] = useState(() => (!readOnly || initialMonth === 1 ? initialMonth : null));
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    checkupDate: getTodayDate(),
    nextCheckupDate: '',
    breastfeedingStatus: 'No',
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
  const previousMonthCheckup = (child?.checkups || []).find(
    (checkup) => Number(checkup.week_number ?? checkup.weekNumber) === week - 1,
  );
  const previousMonthDate = formatDate(previousMonthCheckup?.visit_date ?? previousMonthCheckup?.checkupDate);
  const childBirthDate = formatDate(getChildBirthDate(child));
  const scheduleAnchorDate = childBirthDate
    ? childBirthDate
    : firstRecordedCheckup?.date || form.checkupDate || getTodayDate();
  const scheduleAnchorWeek = childBirthDate ? 0 : firstRecordedCheckup?.week || 1;
  const scheduleAnchorDay = Number(scheduleAnchorDate.slice(-2));
  const update = (field) => (event) => setForm((current) => {
    const nextValue = event.target.value;
    const nextForm = { ...current, [field]: nextValue };
    if (field === 'checkupDate') {
      nextForm.nextCheckupDate = addMonthsPreservingDay(nextValue, 1);
    }
    return nextForm;
  });
  const isWeekCompleted = isCheckupMonthComplete(child, completedWeeks, week);
  const isReadOnly = (readOnly && editingWeek !== week) || isWeekCompleted;

  useEffect(() => {
    const scheduledDate = (previousMonthDate
      ? addMonthsPreservingDay(previousMonthDate, 1)
      : childBirthDate
        ? addMonthsPreservingDay(childBirthDate, week, scheduleAnchorDay)
        : addMonthsPreservingDay(scheduleAnchorDate, week - scheduleAnchorWeek, scheduleAnchorDay)) || getTodayDate();
    if (!savedCheckup) {
      setForm({
        checkupDate: scheduledDate,
        nextCheckupDate: addMonthsPreservingDay(scheduledDate, 1),
        breastfeedingStatus: getBreastfeedingStatus(child?.exclusiveBreastfeeding ?? child?.exclusive_breastfeeding),
        weight: week === 1 ? getChildBirthMeasurement(child, 'birthWeight') : '',
        height: week === 1 ? getChildBirthMeasurement(child, 'birthLength') : '',
        developmentalStatus: 'Normal',
        serviceProvider: '',
        remarks: '',
      });
      return;
    }
    const savedDate = formatDate(savedCheckup.visit_date ?? savedCheckup.checkupDate);
    setForm({
      checkupDate: savedDate || scheduledDate,
      nextCheckupDate: addMonthsPreservingDay(savedDate || scheduledDate, 1),
      breastfeedingStatus: getBreastfeedingStatus(savedCheckup.breastfeedingStatus ?? savedCheckup.exclusive_breastfeeding),
      weight: getSavedOrBirthMeasurement(savedCheckup.weight, child, 'birthWeight', week),
      height: getSavedOrBirthMeasurement(savedCheckup.height, child, 'birthLength', week),
      developmentalStatus: savedCheckup.developmental_status ?? savedCheckup.developmentalStatus ?? 'Normal',
      serviceProvider: savedCheckup.service_provider ?? savedCheckup.serviceProvider ?? '',
      remarks: savedCheckup.notes ?? savedCheckup.remarks ?? '',
    });
  }, [child, previousMonthDate, savedCheckup, scheduleAnchorDate, scheduleAnchorDay, scheduleAnchorWeek, week]);

  useEffect(() => {
    if (week > firstIncompleteMonth) {
      setWeek(firstIncompleteMonth);
      setEditingWeek(readOnly ? null : firstIncompleteMonth);
    }
  }, [firstIncompleteMonth, readOnly, week]);

  const goToWeek = (nextWeek, justSavedCurrentMonth = false) => {
    const next = Math.max(1, Math.min(TOTAL_MONTHS, nextWeek));
    if (next > firstIncompleteMonth && !(justSavedCurrentMonth && next === week + 1)) return;
    setWeek(next);
    if (!readOnly || next === 1) setEditingWeek(next);
  };
  const bmi = calculateBmi(form.weight, form.height);
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

  const renderDateField = ({ id, label, name, required = false, readOnly: fieldReadOnly = isReadOnly }) => (
    <div className="form-group full-width checkup-date-field">
      <label className={`checkup-field-label${required ? ' is-required' : ''}`} htmlFor={id}>{label}</label>
      <DateInput
        id={id}
        className="checkup-field-input"
        value={form[name]}
        onChange={(value) => setForm((current) => ({
          ...current,
          [name]: value,
          ...(name === 'checkupDate' ? { nextCheckupDate: addMonthsPreservingDay(value, 1) } : {}),
        }))}
        required={required}
        readOnly={fieldReadOnly}
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
      if (week === TOTAL_MONTHS && !isWeekCompleted) {
        notifyAction(`Congratulations! ${childName} has completed all 24 months of child monitoring.`);
      } else {
        notifyAction(`Month ${week} monitoring saved successfully.`);
      }
      if (!isWeekCompleted) goToWeek(week + 1, true);
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
              onClick={() => goToWeek(weekNumber)}
              disabled={isSaving || weekNumber > firstIncompleteMonth}
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
            {Array.from({ length: firstIncompleteMonth }, (_, index) => index + 1).map((monthNumber) => (
              <option key={monthNumber} value={monthNumber}>Month {monthNumber}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={() => goToWeek(week + 1)} disabled={week >= firstIncompleteMonth || week === TOTAL_MONTHS}>Next month</button>
      </div>

      <form className="child-monitor-form" onSubmit={handleSubmit} aria-readonly={isReadOnly}>
        <div className="checkup-card-body">
          <div className="checkup-form-heading">
            <div>
              <span className="checkup-module-kicker">Growth record</span>
              <div className="checkup-section-title">Child Check-up Record</div>
            </div>
            <div className="checkup-form-heading-actions">
              <span className="checkup-week-badge">M{week} / {TOTAL_MONTHS}</span>
            </div>
          </div>
          <p className="child-monitor-subtitle">M{week} of {TOTAL_MONTHS} · {childName}</p>
          <div className="checkup-grid">
            {renderDateField({ id: 'child-checkup-date', label: 'Check-up Date', name: 'checkupDate', required: true })}
            {renderDateField({ id: 'child-next-checkup-date', label: 'Next Check-up Date (Tentative)', name: 'nextCheckupDate', readOnly: true })}
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
              <label className="checkup-field-label" htmlFor="child-exclusive-breastfeeding">Exclusive Breastfeeding</label>
              <select id="child-exclusive-breastfeeding" className="checkup-field-input" value={form.breastfeedingStatus} onChange={update('breastfeedingStatus')} required disabled={isReadOnly}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
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
          {showAuditSignatures && (
            <div className="child-monitor-audit-footer">
              <AuditSignatures {...savedCheckup} />
            </div>
          )}
          <div className="checkup-actions">
            {readOnly && (
              <button
                type="button"
                className={isReadOnly ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setEditingWeek(isReadOnly ? week : null)}
                disabled={isSaving}
              >
                {isReadOnly ? 'Edit checkup' : 'Cancel edit'}
              </button>
            )}
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
