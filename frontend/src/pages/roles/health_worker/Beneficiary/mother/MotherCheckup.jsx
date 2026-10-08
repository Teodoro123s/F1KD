import React, { useEffect, useMemo, useRef, useState } from 'react';
import StepWizard from '../../_shared/components/StepWizard';
import DateInput from '../../../../../components/ui/DateInput';
import { formatDateForDisplay, normalizeDateValue } from '../../_shared/utils/dateFormat';
import { getMotherMonitoringStartIndex } from '../../_shared/utils/motherProgress';
import MonitoringProgressReport from '../../../../shared/Beneficiary/MonitoringProgressReport';

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

const LAB_ASSISTANCE_OPTIONS = [
  'Complete Blood Count (CBC)',
  'Urinalysis',
  'Blood Typing and Rh Factor',
  'Hepatitis B, HIV, and Syphilis Screening',
  'Glucose Screening (OGTT)',
  'Genetic and Chromosomal Screening',
];

const getTrimesterFromGestationalAge = (weeks) => {
  if (weeks > 26) return '3rd Trimester';
  if (weeks > 12) return '2nd Trimester';
  return '1st Trimester';
};

const getMonitoringStartDetails = (mother = {}) => {
  const registrationDate = mother.prenatalRegDate || mother.prenatal_reg_date || '';
  const registeredTrimester = mother.trimester || mother.trimester_at_registration || '';
  const lmpDate = mother.lmpDate || mother.lmp || '';

  let currentWeeks = Number.parseInt(mother.gestationalAge ?? mother.gestational_age, 10);
  if (lmpDate) {
    const lmp = new Date(lmpDate);
    if (!Number.isNaN(lmp.getTime())) {
      const today = new Date();
      const diffDays = Math.max(0, Math.floor((today - lmp) / (1000 * 60 * 60 * 24)));
      currentWeeks = Math.floor(diffDays / 7);
    }
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

const createInitialFormState = (mother, checkup = null, blank = false, previousCheckup = null) => ({
  checkupDate: checkup?.checkupDate ? formatDate(checkup.checkupDate) : formatDate(previousCheckup?.nextCheckupDate || mother.prenatalRegDate || mother.prenatal_reg_date),
  gestationalAge: blank ? '' : ((checkup?.gestationalAge ?? getMonitoringStartDetails(mother).gestationalAge) || calculateGestationalAge(mother.lmpDate, mother.gestationalAge)),
  bp: blank ? '' : checkup?.bp ?? mother.prenatalBp ?? mother.bloodPressure ?? '',
  weight: blank ? '' : checkup?.weight ?? mother.prenatalWeight ?? mother.weight ?? '',
  height: blank ? '' : checkup?.height ?? mother.prenatalHeight ?? mother.height ?? '',
  fundalHeight: blank ? '' : checkup?.fundalHeight ?? mother.fundalHeight ?? '',
  fhr: blank ? '' : checkup?.fhr ?? mother.fhr ?? '',
  serviceProvider: checkup?.serviceProvider ?? '',
  nextCheckupDate: blank ? '' : formatDate(checkup?.nextCheckupDate),
  referral: checkup?.referral ?? false,
  labAssistance: checkup?.labAssistance ?? false,
  labAssistanceTests: checkup?.labAssistanceTests ?? [],
  amount: checkup?.amount ?? '',
  sourceOfFunds: blank ? '' : checkup?.sourceOfFunds ?? 'Municipal Fund',
  facilityType: checkup?.facilityType ?? 'Govt',
  milkDate: formatDate(checkup?.milkDate),
  milkQuantity: checkup?.milkQuantity ?? '',
  remarks: checkup?.remarks ?? '',
});

export default function MotherCheckup({ mother, onSave = () => {}, onCancel = () => {}, forceEdit = false }) {
  if (!mother) return null;

  const monitoringStart = getMonitoringStartDetails(mother);
  const monitoringStartStep = getMotherMonitoringStartIndex(mother);
  const initialStep = getInitialStep(mother.checkups, monitoringStartStep);
  const [activeStep, setActiveStep] = useState(initialStep);
  const previousMotherId = useRef(mother.id || mother.motherId);
  const [formState, setFormState] = useState(() => createInitialFormState(mother, getCheckupForStep(mother, initialStep), false, getPreviousCheckupForStep(mother, initialStep)));
  const [pendingSave, setPendingSave] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const motherId = mother.id || mother.motherId;
    if (previousMotherId.current !== motherId) {
      previousMotherId.current = motherId;
      const start = getMonitoringStartDetails(mother);
      setActiveStep(getInitialStep(start.trimester, mother.checkups, start.gestationalAge));
    }
  }, [mother]);

  useEffect(() => {
    const firstIncomplete = getFirstIncompleteStep(mother.checkups, getMotherMonitoringStartIndex(mother));
    const isFutureStep = firstIncomplete !== -1 && activeStep > firstIncomplete;
    setFormState(createInitialFormState(mother, getCheckupForStep(mother, activeStep), isFutureStep, getPreviousCheckupForStep(mother, activeStep)));
  }, [mother, activeStep]);

  const updateField = (field) => (value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const {
    checkupDate,
    gestationalAge,
    bp,
    weight,
    height,
    fundalHeight,
    fhr,
    serviceProvider,
    nextCheckupDate,
    referral,
    labAssistance,
    labAssistanceTests,
    amount,
    sourceOfFunds,
    facilityType,
    milkDate,
    milkQuantity,
    remarks,
  } = formState;

  const bmi = calculateBmi(weight, height);
  const showReferralFields = referral === true;

  const nutritionalStatus = useMemo(() => {
    const value = parseFloat(bmi);
    if (Number.isNaN(value)) return 'Normal';
    if (value < 18.5) return 'Underweight';
    if (value < 25) return 'Normal';
    return 'Overweight';
  }, [bmi]);

  const bpWarning = useMemo(() => {
    if (!bp) return null;
    const parts = bp.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0], 10);
    const dia = parseInt(parts[1], 10);
    if (!Number.isNaN(sys) && !Number.isNaN(dia) && (sys >= 140 || dia >= 90)) {
      return 'High Blood Pressure Alert: BP is ≥ 140/90 mmHg. Please monitor for gestational hypertension or preeclampsia.';
    }
    return null;
  }, [bp]);

  const hasWarnings = Boolean(bpWarning);
  const name = mother.motherName || mother.communityName || mother.name;

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
    setActiveStep(nextStep);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

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
      serviceProvider,
      nextCheckupDate: formatDateForPayload(nextCheckupDate),
      referral,
      labAssistance,
      amount,
      sourceOfFunds,
      facilityType,
      milkDate: formatDateForPayload(milkDate),
      milkQuantity,
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
    if (saved !== false && !forceEdit) {
      setActiveStep((current) => Math.min(current + 1, CHECKUPS.length - 1));
    }
  };

  const resetForm = () => {
    setFormState(createInitialFormState(mother, getCheckupForStep(mother, activeStep)));
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
        checkups={mother.checkups || []}
      />

      <form className="mother-checkup-form" onSubmit={handleSubmit}>
        <fieldset disabled={isReadOnly}>
        <div className={`checkup-card${isCompleted ? ' checkup-card-completed' : ''}${isFuture || isSkipped ? ' checkup-card-locked' : ''}`}>
          <div className="checkup-card-body">
            <div className="checkup-section-title">Pregnancy Record</div>
            {isMaternalPhaseComplete ? <p className="checkup-state-message">Maternal monitoring phase complete · all 9 check-ups recorded</p> : isCompleted && <p className="checkup-state-message">Completed check-up · view only</p>}
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
                <label className="checkup-field-label" htmlFor="gestational-age">Gestation Period</label>
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
                {mother.lmpDate && <span className="checkup-field-help">Calculated from the LMP date</span>}
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
                <label className="checkup-field-label" htmlFor="height">Height (cm)</label>
                <input
                  id="height"
                  type="number"
                  className="checkup-field-input"
                  value={height}
                  placeholder="e.g. 150"
                  onChange={(e) => updateField('height')(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label is-required" htmlFor="bp">Blood Pressure</label>
                <input
                  id="bp"
                  type="text"
                  className="checkup-field-input"
                  value={bp}
                  placeholder="120/80"
                  onChange={(e) => updateField('bp')(e.target.value)}
                  required
                />
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
            </div>

            {showReferralFields ? (
              <>
                <div className="checkup-section-title">Assistance & Funding</div>
                <div className="checkup-grid">
                  <div className="horizontal-toggle-row full-width">
                    <span className="horizontal-toggle-label">Lab Assistance Provided</span>
                    <label className="ios-switch">
                      <input
                        type="checkbox"
                        checked={labAssistance}
                        onChange={(e) => updateField('labAssistance')(e.target.checked)}
                      />
                      <span className="ios-slider"></span>
                    </label>
                  </div>

                  {labAssistance && (
                    <div className="form-group full-width">
                      <details className="lab-assistance-dropdown" open>
                        <summary>Choose assisted laboratory tests</summary>
                        <div className="lab-assistance-options">
                          {LAB_ASSISTANCE_OPTIONS.map((option) => (
                            <label key={option} className="lab-assistance-option">
                              <input
                                type="checkbox"
                                checked={labAssistanceTests.includes(option)}
                                onChange={(event) => updateField('labAssistanceTests')(
                                  event.target.checked
                                    ? [...labAssistanceTests, option]
                                    : labAssistanceTests.filter((test) => test !== option),
                                )}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="checkup-field-label" htmlFor="amount">Assistance Amount (PHP)</label>
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="checkup-field-input"
                      placeholder="e.g. 500.00"
                      value={amount}
                      onChange={(e) => updateField('amount')(e.target.value)}
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
                  <p className="checkup-state-message">Referral to hospital is not selected. Assistance and funding fields are not required for this checkup.</p>
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

            {hasWarnings && (
              <div className="clinical-warnings" style={{ marginTop: '24px' }}>
                <div className="warning-title">⚠️ Clinical Warnings</div>
                <ul>
                  {bpWarning && <li>{bpWarning}</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
        </fieldset>

        <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '24px' }}>
          <button type="submit" className="btn-primary" disabled={isReadOnly}>
            Save Checkup
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm} disabled={isReadOnly}>
            Cancel
          </button>
        </div>
      </form>
      <MonitoringProgressReport beneficiaryType="Mother" beneficiary={mother} />
      {pendingSave && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setPendingSave(null)}>
          <div className="modal program-product-modal" role="dialog" aria-modal="true" aria-labelledby="save-checkup-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="save-checkup-title">Confirm check-up</h2>
              <button type="button" className="modal-close" onClick={() => setPendingSave(null)} disabled={saving} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p>Save this check-up record?</p>
              <p><strong>{pendingSave.checkup.trimesterLabel} · Check-up {pendingSave.checkup.checkupNumber}</strong></p>
              <p>Check-up date: {pendingSave.payload.checkupDate || 'Not selected'}</p>
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
