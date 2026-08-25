import React, { useEffect, useMemo, useState } from 'react';
import StepWizard from '../../../components/StepWizard';

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

const getTrimesterIndex = (trimester) => {
  const index = TRIMESTERS.findIndex((item) => item.label === trimester);
  return index === -1 ? 0 : index;
};

const getInitialStep = (trimester, checkups = []) => {
  const registeredStep = getTrimesterIndex(trimester) * 3;
  const firstIncompleteStep = CHECKUPS.findIndex((_, index) => index >= registeredStep && !checkups?.[Math.floor(index / 3)]?.[index % 3]?.completed);
  return firstIncompleteStep === -1 ? CHECKUPS.length - 1 : firstIncompleteStep;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0].replaceAll('-', '/');
};

const formatDateForPayload = (value) => String(value || '').trim().replaceAll('/', '-');

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

const getFirstIncompleteStep = (checkups = [], startIndex = 0) => CHECKUPS.findIndex((_, index) => index >= startIndex && !checkups?.[Math.floor(index / 3)]?.[index % 3]?.completed);

const createInitialFormState = (mother, checkup = null, blank = false) => ({
  checkupDate: blank ? '' : formatDate(checkup?.checkupDate) || formatDate(mother.createdAt || mother.created_at || mother.raw?.created_at || mother.prenatalRegDate || new Date()),
  gestationalAge: blank ? '' : checkup?.gestationalAge ?? calculateGestationalAge(mother.lmpDate, mother.gestationalAge),
  bp: blank ? '' : checkup?.bp ?? mother.prenatalBp ?? mother.bloodPressure ?? '',
  weight: blank ? '' : checkup?.weight ?? mother.prenatalWeight ?? mother.weight ?? '',
  height: blank ? '' : checkup?.height ?? mother.prenatalHeight ?? mother.height ?? '',
  fundalHeight: blank ? '' : checkup?.fundalHeight ?? mother.fundalHeight ?? '',
  fhr: blank ? '' : checkup?.fhr ?? mother.fhr ?? '',
  serviceProvider: checkup?.serviceProvider ?? '',
  nextCheckupDate: blank ? '' : formatDate(checkup?.nextCheckupDate),
  referral: checkup?.referral ?? false,
  labAssistance: checkup?.labAssistance ?? false,
  amount: checkup?.amount ?? '',
  sourceOfFunds: blank ? '' : checkup?.sourceOfFunds ?? 'Municipal Fund',
  facilityType: checkup?.facilityType ?? 'Govt',
  milkDate: formatDate(checkup?.milkDate),
  milkQuantity: checkup?.milkQuantity ?? '',
  remarks: checkup?.remarks ?? '',
});

export default function MotherCheckup({ mother, onSave = () => {}, onCancel = () => {} }) {
  if (!mother) return null;

  const initialStep = getInitialStep(mother.trimester || '1st Trimester', mother.checkups);
  const [activeStep, setActiveStep] = useState(initialStep);
  const [formState, setFormState] = useState(() => createInitialFormState(mother, getCheckupForStep(mother, initialStep)));

  useEffect(() => {
    setActiveStep(getInitialStep(mother.trimester || '1st Trimester', mother.checkups));
  }, [mother]);

  useEffect(() => {
    const firstIncomplete = getFirstIncompleteStep(mother.checkups, getTrimesterIndex(mother.trimester || '1st Trimester') * 3);
    const isFutureStep = firstIncomplete !== -1 && activeStep > firstIncomplete;
    setFormState(createInitialFormState(mother, getCheckupForStep(mother, activeStep), isFutureStep));
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
    amount,
    sourceOfFunds,
    facilityType,
    milkDate,
    milkQuantity,
    remarks,
  } = formState;

  const bmi = calculateBmi(weight, height);

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

  const fhrWarning = useMemo(() => {
    if (!fhr) return null;
    const rate = parseInt(fhr, 10);
    if (!Number.isNaN(rate) && (rate < 110 || rate > 160)) {
      return `Abnormal Fetal Heart Rate Alert: FHR is ${rate} bpm (normal range 110-160).`;
    }
    return null;
  }, [fhr]);

  const growthWarning = useMemo(() => {
    if (!fundalHeight || gestationalAge < 20) return null;
    const fh = parseInt(fundalHeight, 10);
    if (!Number.isNaN(fh) && Math.abs(fh - gestationalAge) > 3) {
      return `Abnormal Growth Alert: Fundal height (${fh} cm) deviates from gestational age (${gestationalAge} weeks) by more than 3 cm.`;
    }
    return null;
  }, [fundalHeight, gestationalAge]);

  const hasWarnings = bpWarning || fhrWarning || growthWarning;
  const name = mother.motherName || mother.communityName || mother.name;

  const activeTrimester = Math.floor(activeStep / 3) + 1;
  const activeStepIndex = (activeStep % 3) + 1;
  const activeCheckup = getCheckupForStep(mother, activeStep);
  const isCompleted = Boolean(activeCheckup?.completed);
  const firstIncompleteStep = getFirstIncompleteStep(mother.checkups, getTrimesterIndex(mother.trimester || '1st Trimester') * 3);
  const isFuture = firstIncompleteStep !== -1 && activeStep > firstIncompleteStep;
  const isReadOnly = isCompleted || isFuture;

  const handleStepClick = (trimester, step) => {
    const nextStep = (trimester - 1) * 3 + (step - 1);
    setActiveStep(nextStep);
  };

  const handleSubmit = (event) => {
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
    onSave(payload);
    setActiveStep((current) => Math.min(current + 1, CHECKUPS.length - 1));
  };

  const resetForm = () => {
    setFormState(createInitialFormState(mother));
    onCancel();
  };

  return (
    <section className="mother-checkup-page">
      <StepWizard
        mother={mother}
        activeTrimester={activeTrimester}
        activeStep={activeStepIndex}
        onStepClick={handleStepClick}
        checkups={mother.checkups || []}
      />

      <form className="mother-checkup-form" onSubmit={handleSubmit}>
        <fieldset disabled={isReadOnly}>
        <div className={`checkup-card${isCompleted ? ' checkup-card-completed' : ''}${isFuture ? ' checkup-card-locked' : ''}`}>
          <div className="checkup-card-body">
            <div className="checkup-section-title">Pregnancy Record</div>
            {isCompleted && <p className="checkup-state-message">Completed check-up · view only</p>}
            {isFuture && <p className="checkup-state-message">This check-up will be available after the previous visit is completed.</p>}
            <div className="checkup-grid">
              <div className="form-group full-width">
                <label className="checkup-field-label" htmlFor="checkup-date">Check-up Date</label>
                <input
                  id="checkup-date"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}/\d{2}/\d{2}"
                  className="checkup-field-input"
                  value={checkupDate}
                  placeholder="yyyy/mm/dd"
                  onChange={(e) => updateField('checkupDate')(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="gestational-age">Gestation Period</label>
                <input
                  id="gestational-age"
                  type="text"
                  className="checkup-field-input"
                  value={`${gestationalAge} Weeks`}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="weight">Weight (kg)</label>
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
                <label className="checkup-field-label" htmlFor="bp">Blood Pressure</label>
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

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="fundal-height">Fundal Height (cm)</label>
                <input
                  id="fundal-height"
                  type="number"
                  className="checkup-field-input"
                  value={fundalHeight}
                  placeholder="e.g. 20"
                  onChange={(e) => updateField('fundalHeight')(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="fhr">Fetal Heart Rate (bpm)</label>
                <input
                  id="fhr"
                  type="number"
                  className="checkup-field-input"
                  value={fhr}
                  placeholder="e.g. 140"
                  onChange={(e) => updateField('fhr')(e.target.value)}
                />
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
                <input
                  id="next-checkup-date"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}/\d{2}/\d{2}"
                  className="checkup-field-input"
                  value={nextCheckupDate}
                  placeholder="yyyy/mm/dd"
                  onChange={(e) => updateField('nextCheckupDate')(e.target.value)}
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
                <div className="facility-btn-group">
                  {['Govt', 'Private', 'Partner Org', 'Others'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={`facility-btn ${facilityType === type ? 'active' : ''}`}
                      onClick={() => updateField('facilityType')(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="checkup-section-title">Milk Subsidy</div>
            <div className="checkup-grid">
              <div className="form-group">
                <label className="checkup-field-label" htmlFor="milk-date">Milk Subsidy Date</label>
                <input
                  id="milk-date"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}/\d{2}/\d{2}"
                  className="checkup-field-input"
                  value={milkDate}
                  placeholder="yyyy/mm/dd"
                  onChange={(e) => updateField('milkDate')(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="checkup-field-label" htmlFor="milk-quantity">Milk Quantity (pcs)</label>
                <input
                  id="milk-quantity"
                  type="number"
                  className="checkup-field-input"
                  value={milkQuantity}
                  min="0"
                  step="1"
                  placeholder="e.g. 1"
                  onChange={(e) => updateField('milkQuantity')(e.target.value)}
                />
              </div>

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
                  {fhrWarning && <li>{fhrWarning}</li>}
                  {growthWarning && <li>{growthWarning}</li>}
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
    </section>
  );
}
