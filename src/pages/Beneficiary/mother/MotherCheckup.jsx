import React, { useEffect, useMemo, useRef, useState } from 'react';
import StepWizard from '../../../components/StepWizard';
import DateInput from '../../../components/ui/DateInput';
import AuditSignatures from '../../../components/ui/AuditSignatures';
import FieldInfoTooltip from '../../../components/ui/FieldInfoTooltip';
import { formatDateForDisplay, normalizeDateValue } from '../../../utils/dateFormat';
import { getMotherCheckupDate, getMotherMonitoringStartIndex, getMotherNextCheckupDate } from '../../../utils/motherProgress';
import { formatCurrencyAmount, normalizeCurrencyAmount, sanitizeCurrencyAmount } from '../../../utils/currencyAmount';
import { getBloodPressureError, isBloodPressureInput } from '../../../utils/bloodPressure';
import { useStepNavigation } from '../../../utils/useStepNavigation';
import { StepNavigationStatus } from '../../../components/ui/StepNavigationButton';

const TRIMESTERS = [
  { label: '1st Trimester', code: 'T1' },
  { label: '2nd Trimester', code: 'T2' },
  { label: '3rd Trimester', code: 'T3' },
];

const CHECKUPS = TRIMESTERS.flatMap((trimester, trimesterIndex) =>
  [1, 2, 3].map((checkupNumber) => ({
    key: `${trimester.code}-${checkupNumber}`,
    trimesterLabel: trimester.label,
    trimesterCode: trimester.code,
    checkupNumber,
    stepIndex: trimesterIndex * 3 + checkupNumber - 1,
  }))
);

const LAB_REQUEST_OPTIONS = [
  'Complete Blood Count',
  'Hemoglobin Count',
  'Oral Glucose Tolerance',
  'Breast Examination',
  'Stool Examination',
  'Sputum Analysis',
  'Acetic Acid Wash',
  'Bacterium Screening',
  'Urinalysis',
  'Pap Smear',
  'STI / HIV / AIDS Screening',
  'Hepatitis B Screening',
  'Other',
];

const getTrimesterFromGestationalAge = (weeks) => {
  if (weeks > 26) return '3rd Trimester';
  if (weeks > 12) return '2nd Trimester';
  return '1st Trimester';
};

const getMonitoringStartDetails = (mother = {}) => {
  const registrationDate = mother.prenatalRegDate || mother.prenatal_reg_date || '';
  const registeredTrimester = mother.trimester || mother.trimester_at_registration || '';
  const lmpDate = mother.lmpDate || mother.lmp_date || mother.lmp || '';

  let currentWeeks = NaN;
  if (lmpDate && registrationDate) {
    const lmp = new Date(`${formatDate(lmpDate)}T00:00:00Z`);
    if (!Number.isNaN(lmp.getTime())) {
      const registration = new Date(`${formatDate(registrationDate)}T00:00:00Z`);
      if (!Number.isNaN(registration.getTime()) && registration >= lmp) {
        const diffDays = Math.floor((registration - lmp) / (7 * 24 * 60 * 60 * 1000));
        currentWeeks = diffDays;
      }
    }
  }
  if (!Number.isFinite(currentWeeks)) {
    currentWeeks = Number.parseInt(mother.gestationalAge ?? mother.gestational_age, 10);
  }

  const trimester = registeredTrimester || (Number.isFinite(currentWeeks)
    ? getTrimesterFromGestationalAge(currentWeeks)
    : '2nd Trimester');

  const monthIndex = Number.isFinite(currentWeeks)
    ? Math.max(1, Math.min(3, Math.floor((currentWeeks - 1) / 4) + 1))
    : 1;

  return {
    registrationDate,
    trimester,
    gestationalAge: Number.isFinite(currentWeeks) ? String(currentWeeks) : String(mother.gestationalAge || ''),
    monthOffset: Math.max(0, Math.min(2, Math.max(0, monthIndex - 1))),
  };
};

const getInitialStep = (checkups = [], startStep = 0) => {
  const hasAnySavedCheckup = Array.isArray(checkups) && checkups.flat().some(Boolean);
  if (!hasAnySavedCheckup) return startStep;

  const firstIncompleteStep = CHECKUPS.findIndex((_, index) => index >= startStep && !checkups?.[Math.floor(index / 3)]?.[index % 3]?.completed);
  return firstIncompleteStep === -1 ? CHECKUPS.length - 1 : firstIncompleteStep;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const formatDateForPayload = (value) => normalizeDateValue(value) || '';

const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const calculateGestationalAge = (lmpDate, fallbackWeeks) => {
  if (lmpDate) {
    const lmp = new Date(lmpDate);
    if (!Number.isNaN(lmp.getTime())) {
      const today = new Date();
      const diffDays = Math.max(0, Math.floor((today - lmp) / (1000 * 60 * 60 * 24)));
      return Math.floor(diffDays / 7);
    }
  }

  const fallback = parseInt(fallbackWeeks, 10);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const getCheckupForStep = (mother, step) => {
  const trimesterIndex = Math.floor(step / 3);
  const checkupIndex = step % 3;
  return mother.checkups?.[trimesterIndex]?.[checkupIndex] || null;
};

const getPreviousCheckupForStep = (mother, step) => step > 0 ? getCheckupForStep(mother, step - 1) : null;

const getFirstIncompleteStep = (checkups = [], startIndex = 0) => CHECKUPS.findIndex((_, index) => index >= startIndex && !checkups?.[Math.floor(index / 3)]?.[index % 3]?.completed);

const createInitialFormState = (mother, checkup = null, blank = false, previousCheckup = null, useProfileDefaults = false) => {
  const checkupDate = getMotherCheckupDate(
    checkup,
    previousCheckup,
    useProfileDefaults ? mother.prenatalRegDate || mother.prenatal_reg_date : '',
  );
  return {
    checkupDate,
    gestationalAge: blank ? '' : ((checkup?.gestationalAge ?? getMonitoringStartDetails(mother).gestationalAge) || calculateGestationalAge(mother.lmpDate, mother.gestationalAge)),
    bp: blank ? '' : checkup?.bp ?? (useProfileDefaults ? mother.prenatalBp ?? mother.bloodPressure ?? '' : ''),
    weight: blank ? '' : checkup?.weight ?? (useProfileDefaults ? mother.prenatalWeight ?? mother.weight ?? '' : ''),
    height: blank ? '' : checkup?.height ?? (useProfileDefaults ? mother.prenatalHeight ?? mother.height ?? '' : ''),
    fundalHeight: blank ? '' : checkup?.fundalHeight ?? (useProfileDefaults ? mother.fundalHeight ?? '' : ''),
    fhr: blank ? '' : checkup?.fhr ?? (useProfileDefaults ? mother.fhr ?? '' : ''),
    developmentalStatus: checkup?.developmentalStatus ?? checkup?.developmental_status ?? 'Normal',
    serviceProvider: checkup?.serviceProvider ?? '',
    nextCheckupDate: blank ? '' : getMotherNextCheckupDate(checkupDate, checkup?.nextCheckupDate),
    referral: checkup?.referral ?? false,
    laboratoryRequests: checkup?.laboratoryRequests ?? [],
    amount: sanitizeCurrencyAmount(checkup?.amount ?? ''),
    sourceOfFunds: blank ? '' : checkup?.sourceOfFunds ?? 'Municipal Fund',
    facilityType: checkup?.facilityType ?? 'Govt',
    milkDate: formatDate(checkup?.milkDate),
    milkQuantity: checkup?.milkQuantity ?? '',
    milkSubsidy: checkup?.milkSubsidy ?? Boolean(checkup?.milkDate || checkup?.milkQuantity),
    treatmentServices: checkup?.treatmentServices ?? '',
    remarks: checkup?.remarks ?? '',
  };
};

export default function MotherCheckup({ mother, onSave = () => {}, onCancel = () => {}, forceEdit = false, showAuditSignatures = false }) {
  if (!mother) return null;

  const monitoringStart = getMonitoringStartDetails(mother);
  const monitoringStartStep = getMotherMonitoringStartIndex(mother);
  const initialStep = getInitialStep(mother.checkups, monitoringStartStep);
  const [activeStep, setActiveStep] = useState(initialStep);
  const previousMotherId = useRef(mother.id || mother.motherId);
  const stepFormDraftsRef = useRef(new Map());
  const [formState, setFormState] = useState(() => createInitialFormState(mother, getCheckupForStep(mother, initialStep), false, getPreviousCheckupForStep(mother, initialStep)));
  const [amountFocused, setAmountFocused] = useState(false);
  const [bloodPressureTouched, setBloodPressureTouched] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [saving, setSaving] = useState(false);
  const { navigationDirection, navigationError, isNavigating, runStepNavigation } = useStepNavigation();

  useEffect(() => {
    const motherId = mother.id || mother.motherId;
    if (previousMotherId.current !== motherId) {
      previousMotherId.current = motherId;
      stepFormDraftsRef.current.clear();
      setActiveStep(getInitialStep(mother.checkups, getMotherMonitoringStartIndex(mother)));
    }
  }, [mother]);

  useEffect(() => {
    const firstIncomplete = getFirstIncompleteStep(mother.checkups, getMotherMonitoringStartIndex(mother));
    const isFutureStep = firstIncomplete !== -1 && activeStep > firstIncomplete;
    const hasSavedCheckups = Array.isArray(mother.checkups) && mother.checkups.flat().some(Boolean);
    const isRegistrationStep = activeStep === getMotherMonitoringStartIndex(mother);
    const currentCheckup = getCheckupForStep(mother, activeStep);
    const previousCheckup = getPreviousCheckupForStep(mother, activeStep);
    const savedDraft = stepFormDraftsRef.current.get(activeStep);
    const nextFormState = savedDraft ? { ...savedDraft } : createInitialFormState(
      mother,
      currentCheckup,
      isFutureStep,
      previousCheckup,
      !hasSavedCheckups && isRegistrationStep,
    );
    if (!currentCheckup?.checkupDate && !nextFormState.checkupDate) {
      nextFormState.checkupDate = getMotherCheckupDate(null, previousCheckup);
    }
    if (!nextFormState.nextCheckupDate && nextFormState.checkupDate) {
      nextFormState.nextCheckupDate = getMotherNextCheckupDate(nextFormState.checkupDate);
    }
    setFormState(nextFormState);
    setAmountFocused(false);
    setBloodPressureTouched(false);
  }, [mother, activeStep]);

  const updateField = (field) => (value) => {
    setFormState((prev) => {
      if (field !== 'checkupDate') return { ...prev, [field]: value };
      const automaticNextDate = getMotherNextCheckupDate(prev.checkupDate);
      return {
        ...prev,
        checkupDate: value,
        ...(!prev.nextCheckupDate || prev.nextCheckupDate === automaticNextDate
          ? { nextCheckupDate: getMotherNextCheckupDate(value) }
          : {}),
      };
    });
  };

  const {
    checkupDate,
    gestationalAge,
    bp,
    weight,
    height,
    fundalHeight,
    fhr,
    developmentalStatus,
    serviceProvider,
    nextCheckupDate,
    referral,
    laboratoryRequests,
    amount,
    sourceOfFunds,
    facilityType,
    milkDate,
    milkQuantity,
    milkSubsidy,
    treatmentServices,
    remarks,
  } = formState;

  const bmi = calculateBmi(weight, height);
  const showReferralFields = referral === true;
  const bloodPressureError = bloodPressureTouched ? getBloodPressureError(bp) : '';

  const nutritionalStatus = useMemo(() => {
    const value = parseFloat(bmi);
    if (Number.isNaN(value)) return 'Normal';
    if (value < 18.5) return 'Underweight';
    if (value < 25) return 'Normal';
    return 'Overweight';
  }, [bmi]);

  const activeTrimester = Math.floor(activeStep / 3) + 1;
  const activeStepIndex = (activeStep % 3) + 1;
  const activeCheckup = getCheckupForStep(mother, activeStep);
  const isCompleted = Boolean(activeCheckup?.completed);
  const firstIncompleteStep = getFirstIncompleteStep(mother.checkups, monitoringStartStep);
  const isMaternalPhaseComplete = firstIncompleteStep === -1;
  const isFuture = firstIncompleteStep !== -1 && activeStep > firstIncompleteStep;
  const isSkipped = activeStep < monitoringStartStep && !isCompleted;
  const isReadOnly = !forceEdit && (isCompleted || isFuture || isSkipped);

  const handleStepClick = (trimester, step) => {
    const nextStep = (trimester - 1) * 3 + (step - 1);
    if (nextStep === activeStep || saving) return false;
    return runStepNavigation(() => {
      stepFormDraftsRef.current.set(activeStep, formState);
      setActiveStep(nextStep);
      return true;
    }, 'step');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBloodPressureTouched(true);
    const bloodPressureError = getBloodPressureError(bp);
    if (bloodPressureError) {
      document.getElementById('bp')?.focus();
      return;
    }

    const currentCheckup = CHECKUPS[activeStep] || CHECKUPS[0];
    const payload = {
      checkupDate: formatDateForPayload(checkupDate),
      gestationalAge,
      bp,
      weight,
      height,
      bmi,
      nutritionalStatus,
      fundalHeight,
      fhr,
      developmentalStatus,
      serviceProvider,
      nextCheckupDate: formatDateForPayload(nextCheckupDate),
      referral,
      labAssistance: referral,
      labAssistanceTests: [],
      laboratoryRequests: referral ? laboratoryRequests : [],
      amount: referral ? normalizeCurrencyAmount(amount) : '',
      sourceOfFunds,
      facilityType,
      milkDate: formatDateForPayload(milkDate),
      milkQuantity,
      milkSubsidy,
      treatmentServices,
      remarks,
      motherId: mother.id,
      trimester: currentCheckup.trimesterLabel,
      checkupNumber: currentCheckup.checkupNumber,
    };

    if (isReadOnly) return;
    setPendingSave({ payload, checkup: currentCheckup });
  };

  const confirmSave = async () => {
    if (!pendingSave || saving) return;
    setSaving(true);
    const saved = await onSave(pendingSave.payload);
    setSaving(false);
    setPendingSave(null);
    if (saved !== false) stepFormDraftsRef.current.delete(activeStep);
    if (saved !== false && !forceEdit) {
      setActiveStep((current) => Math.min(current + 1, CHECKUPS.length - 1));
    }
  };

  const resetForm = () => {
    stepFormDraftsRef.current.delete(activeStep);
    setFormState(createInitialFormState(mother, getCheckupForStep(mother, activeStep)));
    setBloodPressureTouched(false);
    onCancel();
  };

  return (
    <section className="mother-checkup-page">
      <StepWizard
        mother={mother}
        activeTrimester={activeTrimester}
        activeStep={activeStepIndex}
        startStep={monitoringStartStep}
        onStepClick={handleStepClick}
        navigationDisabled={isNavigating || saving}
        checkups={mother.checkups || []}
      />
      <StepNavigationStatus direction={navigationDirection} error={navigationError} />

      <form className="mother-checkup-form" onSubmit={handleSubmit}>
        <fieldset disabled={isReadOnly || isNavigating}>
        <div className={`checkup-card${isCompleted ? ' checkup-card-completed' : ''}${isFuture || isSkipped ? ' checkup-card-locked' : ''}`}>
          <div className="checkup-card-body">
            <div className="checkup-section-title">Pregnancy Record</div>
            {isMaternalPhaseComplete ? <p className="checkup-state-message">Maternal monitoring phase complete · all 9 check-ups recorded</p> : isCompleted && <p className="checkup-state-message">Completed check-up · view only</p>}
            {showAuditSignatures && <AuditSignatures {...activeCheckup} />}
            {isFuture && <p className="checkup-state-message">This check-up will be available after the previous visit is completed.</p>}
            {isSkipped && <p className="checkup-state-message">This visit was skipped based on gestational age at registration.</p>}
            <div className="checkup-grid">
              <div className="form-group full-width">
                <label className="checkup-field-label is-required" htmlFor="checkup-date">Check-up Date</label>
                  <DateInput
                    id="checkup-date"
                    className="checkup-field-input"
                    value={checkupDate}
                    onChange={updateField('checkupDate')}
                    ariaLabel="Checkup date"
                    required
                  />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="gestational-age">
                  Gestation Period
                  {mother.lmpDate && <FieldInfoTooltip content="Gestational age is calculated from the last menstrual period (LMP) date." />}
                </label>
                <input
                  id="gestational-age"
                  type="number"
                  min="0"
                  max="42"
                  className="checkup-field-input"
                  value={gestationalAge}
                  placeholder="Enter weeks"
                  onChange={(e) => updateField('gestationalAge')(e.target.value)}
                  readOnly={Boolean(mother.lmpDate)}
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label is-required" htmlFor="weight">Weight (kg)</label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  className="checkup-field-input"
                  value={weight}
                  placeholder="e.g. 55.0"
                  onChange={(e) => updateField('weight')(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label is-required" htmlFor="height">Height (cm)</label>
                <input
                  id="height"
                  type="number"
                  min="1"
                  className="checkup-field-input"
                  value={height}
                  placeholder="e.g. 150"
                  onChange={(e) => updateField('height')(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label is-required" htmlFor="bp">
                  Blood Pressure
                  <FieldInfoTooltip content="Enter systolic/diastolic using numbers and one slash only (for example, 120/80)." />
                </label>
                <input
                  id="bp"
                  type="text"
                  className="checkup-field-input"
                  value={bp}
                  placeholder="120/80"
                  inputMode="text"
                  maxLength={7}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(bloodPressureError)}
                  aria-describedby={bloodPressureError ? 'bp-error' : undefined}
                  aria-required="true"
                  onChange={(e) => {
                    if (isBloodPressureInput(e.target.value)) updateField('bp')(e.target.value);
                  }}
                />
                {bloodPressureError && <small id="bp-error" className="field-validation-error" role="alert">{bloodPressureError}</small>}
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="bmi">Auto-Calculation/BMI</label>
                <input
                  id="bmi"
                  type="text"
                  className="checkup-field-input"
                  value={bmi}
                  readOnly
                  placeholder="Auto-calculated"
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="mother-developmental-status">Developmental Screening</label>
                <select
                  id="mother-developmental-status"
                  className="checkup-field-input"
                  value={developmentalStatus}
                  onChange={(event) => updateField('developmentalStatus')(event.target.value)}
                >
                  <option>Normal</option>
                  <option>Needs Follow-up</option>
                  <option>At Risk</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="nutritional-status">BMI Status</label>
                <div className={`bmi-status-badge ${nutritionalStatus.toLowerCase()}`}>
                  {nutritionalStatus.toUpperCase()}
                </div>
              </div>

              <div className="form-group full-width">
                <label className="checkup-field-label" htmlFor="service-provider">Service Provider</label>
                <input
                  id="service-provider"
                  type="text"
                  className="checkup-field-input"
                  value={serviceProvider}
                  placeholder="e.g. Dr. Amelia Vance"
                  onChange={(e) => updateField('serviceProvider')(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="checkup-field-label" htmlFor="next-checkup-date">Next Checkup Date</label>
                  <DateInput
                    id="next-checkup-date"
                    className="checkup-field-input"
                    value={nextCheckupDate}
                    onChange={updateField('nextCheckupDate')}
                    ariaLabel="Next checkup date"
                  />
              </div>

              <div className="horizontal-toggle-row full-width">
                <span className="horizontal-toggle-label">Referral to Hospital</span>
                <div className="horizontal-toggle-buttons">
                  <button
                    type="button"
                    className={`toggle-btn ${!referral ? 'active' : ''}`}
                    onClick={() => updateField('referral')(false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${referral ? 'active' : ''}`}
                    onClick={() => updateField('referral')(true)}
                  >
                    Yes
                  </button>
                </div>
              </div>
              {referral && (
                <fieldset className="form-group full-width">
                  <legend className="checkup-field-label">Laboratory Request(s)</legend>
                  <div className="lab-request-checkbox-list" role="group" aria-label="Laboratory request(s)">
                    {LAB_REQUEST_OPTIONS.map((option) => (
                      <label key={option} className={`lab-request-option ${laboratoryRequests.includes(option) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={laboratoryRequests.includes(option)}
                          onChange={(event) => updateField('laboratoryRequests')(
                            event.target.checked
                              ? [...laboratoryRequests, option]
                              : laboratoryRequests.filter((test) => test !== option),
                          )}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <span className="checkup-field-help">Select one or more laboratory tests requested for referral.</span>
                </fieldset>
              )}
            </div>

            {showReferralFields ? (
              <>
                <div className="checkup-section-title">Assistance & Funding</div>
                <div className="checkup-grid">
                  <div className="form-group">
                    <label className="checkup-field-label" htmlFor="amount">Assistance Amount (PHP)</label>
                    <input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      className="checkup-field-input"
                      placeholder="0.00"
                      value={amountFocused ? amount : formatCurrencyAmount(amount)}
                      onFocus={() => setAmountFocused(true)}
                      onChange={(e) => updateField('amount')(sanitizeCurrencyAmount(e.target.value))}
                      onBlur={() => {
                        updateField('amount')(normalizeCurrencyAmount(amount));
                        setAmountFocused(false);
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkup-field-label" htmlFor="source-of-funds">Source of Funds</label>
                    <select
                      id="source-of-funds"
                      className="checkup-field-input"
                      style={{ appearance: 'auto' }}
                      value={sourceOfFunds}
                      onChange={(e) => updateField('sourceOfFunds')(e.target.value)}
                    >
                      <option value="Municipal Fund">Municipal Fund</option>
                      <option value="Provincial Fund">Provincial Fund</option>
                      <option value="National Fund">National Fund</option>
                      <option value="NGO">NGO</option>
                      <option value="Private">Private</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="checkup-field-label">Facility Type</label>
                    <div className="facility-type-buttons" role="group" aria-label="Facility type">
                      {['Govt', 'Private', 'Partner Org', 'Others'].map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={`facility-type-btn ${facilityType === type ? 'active' : ''}`}
                          aria-pressed={facilityType === type}
                          onClick={() => updateField('facilityType')(type)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </>
            ) : (
              <div className="checkup-grid" style={{ marginTop: '16px' }}>
                <div className="form-group full-width">
                  <p className="checkup-state-message">Referral and laboratory assistance were not selected for this check-up.</p>
                </div>
              </div>
            )}

            <div className="checkup-grid">
              <div className="form-group full-width" style={{ marginTop: '12px' }}>
                <label className="checkup-field-label" htmlFor="remarks">Remarks / Notes</label>
                <textarea
                  id="remarks"
                  className="checkup-field-input"
                  rows="3"
                  value={remarks}
                  placeholder="Enter observations, referrals, or complications..."
                  onChange={(e) => updateField('remarks')(e.target.value)}
                />
              </div>
            </div>

          </div>
        </div>
        </fieldset>

        <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '24px' }}>
          <button type="submit" className="btn-primary" disabled={isReadOnly || isNavigating}>
            Save Checkup
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm} disabled={isReadOnly || isNavigating}>
            Cancel
          </button>
        </div>
      </form>
      {pendingSave && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setPendingSave(null)}>
          <div className="modal program-product-modal checkup-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="save-checkup-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="save-checkup-title">Confirm check-up</h2>
              <button type="button" className="modal-close" onClick={() => setPendingSave(null)} disabled={saving} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p className="checkup-confirm-intro">Review the check-up details before saving.</p>
              <div className="checkup-confirm-heading">
                <strong>{pendingSave.checkup.trimesterLabel} · Check-up {pendingSave.checkup.checkupNumber}</strong>
                <span>{formatDateForDisplay(pendingSave.payload.checkupDate)}</span>
              </div>
              <dl className="checkup-confirm-summary">
                <div>
                  <dt>Gestation period</dt>
                  <dd>{pendingSave.payload.gestationalAge ? `${pendingSave.payload.gestationalAge} weeks` : '—'}</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{pendingSave.payload.weight ? `${pendingSave.payload.weight} kg` : '—'}</dd>
                </div>
                <div>
                  <dt>Blood pressure</dt>
                  <dd>{pendingSave.payload.bp || '—'}</dd>
                </div>
                <div>
                  <dt>BMI</dt>
                  <dd>{pendingSave.payload.bmi || '—'}{pendingSave.payload.nutritionalStatus ? ` · ${pendingSave.payload.nutritionalStatus}` : ''}</dd>
                </div>
                <div>
                  <dt>Hospital referral</dt>
                  <dd>{pendingSave.payload.referral ? 'Yes' : 'No'}</dd>
                </div>
                {pendingSave.payload.referral && (
                  <>
                    <div className="checkup-confirm-summary-wide">
                      <dt>Laboratory requests</dt>
                      <dd>
                        {pendingSave.payload.laboratoryRequests.length
                          ? pendingSave.payload.laboratoryRequests.join(', ')
                          : 'None selected'}
                      </dd>
                    </div>
                    {(pendingSave.payload.amount || pendingSave.payload.sourceOfFunds || pendingSave.payload.facilityType) && (
                      <div className="checkup-confirm-summary-wide">
                        <dt>Assistance and funding</dt>
                        <dd>
                          {pendingSave.payload.amount ? `${formatCurrencyAmount(pendingSave.payload.amount)} PHP` : 'No amount entered'}
                          {pendingSave.payload.sourceOfFunds ? ` · ${pendingSave.payload.sourceOfFunds}` : ''}
                          {pendingSave.payload.facilityType ? ` · ${pendingSave.payload.facilityType}` : ''}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              <p className="checkup-confirm-note">Confirming will save these details to the maternal monitoring record.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setPendingSave(null)} disabled={saving}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmSave} disabled={saving}>{saving ? 'Saving...' : 'Confirm and save'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
