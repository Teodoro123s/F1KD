import React from 'react';

const DEFAULT_CHECKUPS = [[null, null, null], [null, null, null], [null, null, null]];

const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const getStepStatus = (mother, tIdx, stepIdx) => {
  if (!mother) return 'locked';
  const checkups = mother.checkups || DEFAULT_CHECKUPS;
  if (checkups[tIdx]?.[stepIdx]?.completed) return 'completed';

  const firstIncomplete = getFirstIncompleteCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete.trimester === tIdx + 1 && firstIncomplete.step === stepIdx + 1) {
    return 'active';
  }

  return 'locked';
};

const getFirstIncompleteCheckup = (checkups = DEFAULT_CHECKUPS) => {
  for (let t = 0; t < 3; t += 1) {
    for (let s = 0; s < 3; s += 1) {
      if (!checkups[t]?.[s]?.completed) {
        return { trimester: t + 1, step: s + 1 };
      }
    }
  }
  return null;
};

export default function BeneficiaryMotherProfile({
  selectedSchool,
  showMotherCheckup,
  activeTrimester,
  activeStep,
  openEditMother,
  openCheckup,
  handleCancelCheckup,
  onClearCheckupForm,
  onSaveCheckup,
  onSaveDelivery,
  deliveryDate,
  setDeliveryDate,
  deliveryType,
  deliveryOutcome,
  deliveryBirthWeight,
  deliveryBirthLength,
  deliveryBabyGender,
  deliveryBabyName,
  setActiveTrimester,
  setActiveStep,
  setShowMotherCheckup,
  navigate,
  checkupDate,
  setCheckupDate,
  checkupServiceProvider,
  setCheckupServiceProvider,
  checkupNextDate,
  setCheckupNextDate,
  checkupBp,
  setCheckupBp,
  checkupWeight,
  setCheckupWeight,
  checkupHeight,
  setCheckupHeight,
  checkupNutrition,
  setCheckupNutrition,
  checkupFundalHeight,
  setCheckupFundalHeight,
  checkupFhr,
  setCheckupFhr,
  checkupReferral,
  setCheckupReferral,
  checkupLabAssistance,
  setCheckupLabAssistance,
  checkupAssistanceAmount,
  setCheckupAssistanceAmount,
  checkupAssistanceSource,
  setCheckupAssistanceSource,
  checkupMaternityType,
  setCheckupMaternityType,
  checkupMilkDate,
  setCheckupMilkDate,
  checkupMilkQuantity,
  setCheckupMilkQuantity,
  checkupNotes,
  setCheckupNotes,
}) {
  if (!selectedSchool) return null;

  const checkups = selectedSchool.checkups || DEFAULT_CHECKUPS;
  const firstIncomplete = getFirstIncompleteCheckup(checkups);

  return (
    <div className="mother-profile-card">
      <div className="profile-card-header">
        <div className="profile-header-main">
          <div className="profile-title-row">
            <h2>{selectedSchool.name}</h2>
            {selectedSchool.isHighRisk === 'Yes' && (
              <span className="risk-badge high-risk">⚠️ High Risk</span>
            )}
            <span className="program-badge">{selectedSchool.programType || 'Maternal Health Program'}</span>
          </div>
          <div className="profile-subtitle">
            <span>{'\u00A0'}</span>
            <span className="separator">{'\u00A0'}</span>
            <span>{'\u00A0'}</span>
          </div>
        </div>
        <div className="profile-actions">
          {showMotherCheckup ? (
            <button type="button" className="btn-primary" onClick={() => openEditMother(selectedSchool)}>
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary btn-checkups"
              onClick={() => {
                if (firstIncomplete) {
                  openCheckup(firstIncomplete.trimester, firstIncomplete.step);
                  return;
                }
                setShowMotherCheckup(true);
                setActiveTrimester(null);
                setActiveStep(null);
                navigate(`/beneficiary/school/${selectedSchool.id}?checkup=1`);
              }}
            >
              Checkups
            </button>
          )}
          <button type="button" className="btn-close-profile" onClick={() => navigate('/beneficiary')} aria-label="Close profile">
            ✕
          </button>
        </div>
      </div>

      <div className="profile-card-body">
        {showMotherCheckup ? (
          <div className="mother-checkup-body">
            <div className="trimester-stepper">
              {['1st Trimester', '2nd Trimester', '3rd Trimester'].map((trim, tIdx) => {
                return (
                  <div key={trim} className="trimester">
                    <div className="trimester-title">{trim}</div>
                    <div className="trimester-steps">
                      {[1, 2, 3].map((step) => {
                        const status = getStepStatus(selectedSchool, tIdx, step - 1);
                        const completed = status === 'completed';
                        const isActive = activeTrimester === tIdx + 1 && activeStep === step;
                        const isLocked = status === 'locked';
                        let circleContent = step;
                        if (completed) circleContent = '✓';
                        else if (isActive) circleContent = '🔄';

                        return (
                          <div key={step} className={`step ${completed ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                            <button
                              type="button"
                              className="step-btn"
                              onClick={() => !isLocked && openCheckup(tIdx + 1, step)}
                              disabled={isLocked}
                              aria-label={`Open ${trim} checkup ${step}`}
                            >
                              <div className="step-circle">{circleContent}</div>
                            </button>
                            <div className="step-label">Checkup {step}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeTrimester && activeStep ? (
              <div className="checkup-form-card" style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--burgundy)' }}>
                    Encode Data: Trimester {activeTrimester} - Checkup {activeStep}
                  </h3>
                  {selectedSchool.checkups?.[activeTrimester - 1]?.[activeStep - 1]?.completed && (
                    <span className="status-badge complete" style={{ fontSize: '12px', background: '#DEF7EC', color: '#03543F', padding: '2px 8px', borderRadius: '4px' }}>
                      ✔ Saved / Completed
                    </span>
                  )}
                </div>

                <div className="form-row-3 full-width">
                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-date">Checkup Date *</label>
                    <input
                      id="checkup-date"
                      type="date"
                      className="form-input"
                      value={checkupDate}
                      onChange={(e) => setCheckupDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-service-provider">Service Provider</label>
                    <input
                      id="checkup-service-provider"
                      type="text"
                      className="form-input"
                      placeholder="Health worker name"
                      value={checkupServiceProvider}
                      onChange={(e) => setCheckupServiceProvider(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-next-date">Next Checkup Date</label>
                    <input
                      id="checkup-next-date"
                      type="date"
                      className="form-input"
                      value={checkupNextDate}
                      onChange={(e) => setCheckupNextDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-4 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-bp">Blood Pressure (BP) *</label>
                    <input
                      id="checkup-bp"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 120/80"
                      value={checkupBp}
                      onChange={(e) => setCheckupBp(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-weight">Weight (kg) *</label>
                    <input
                      id="checkup-weight"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 55"
                      value={checkupWeight}
                      onChange={(e) => setCheckupWeight(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-height">Height (cm)</label>
                    <input
                      id="checkup-height"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 150"
                      value={checkupHeight}
                      onChange={(e) => setCheckupHeight(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-bmi">BMI</label>
                    <input
                      id="checkup-bmi"
                      type="text"
                      className="form-input"
                      readOnly
                      value={calculateBmi(checkupWeight, checkupHeight)}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                <div className="form-row-3 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-nutrition">Nutritional Status</label>
                    <select
                      id="checkup-nutrition"
                      className="form-select"
                      value={checkupNutrition}
                      onChange={(e) => setCheckupNutrition(e.target.value)}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Underweight">Underweight</option>
                      <option value="Overweight">Overweight</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-fh">Fundal Height (cm) *</label>
                    <input
                      id="checkup-fh"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 20"
                      value={checkupFundalHeight}
                      onChange={(e) => setCheckupFundalHeight(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-fhr">Fetal Heart Rate (FHR) (bpm) *</label>
                    <input
                      id="checkup-fhr"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 140"
                      value={checkupFhr}
                      onChange={(e) => setCheckupFhr(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group narrow-field">
                    <label className="form-label" htmlFor="checkup-referral">Referral to Hospital</label>
                    <select
                      id="checkup-referral"
                      className="form-select"
                      value={checkupReferral ? 'Yes' : 'No'}
                      onChange={(e) => setCheckupReferral(e.target.value === 'Yes')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-notes">Remarks / Notes</label>
                    <textarea
                      id="checkup-notes"
                      className="form-input"
                      rows="2"
                      placeholder="Enter observations, referrals, or complications"
                      value={checkupNotes}
                      onChange={(e) => setCheckupNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-3 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-lab-assistance">Lab Assistance Provided</label>
                    <select
                      id="checkup-lab-assistance"
                      className="form-select"
                      value={checkupLabAssistance ? 'Yes' : 'No'}
                      onChange={(e) => setCheckupLabAssistance(e.target.value === 'Yes')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-assistance-amount">Amount</label>
                    <input
                      id="checkup-assistance-amount"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 500"
                      value={checkupAssistanceAmount}
                      onChange={(e) => setCheckupAssistanceAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-assistance-source">Source of Funds</label>
                    <input
                      id="checkup-assistance-source"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Municipal Fund"
                      value={checkupAssistanceSource}
                      onChange={(e) => setCheckupAssistanceSource(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-3 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-maternity-type">Maternity Type</label>
                    <select
                      id="checkup-maternity-type"
                      className="form-select"
                      value={checkupMaternityType}
                      onChange={(e) => setCheckupMaternityType(e.target.value)}
                    >
                      <option value="Govt">Govt</option>
                      <option value="Private">Private</option>
                      <option value="Public Org">Public Org</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-milk-date">Milk Subsidy Date</label>
                    <input
                      id="checkup-milk-date"
                      type="date"
                      className="form-input"
                      value={checkupMilkDate}
                      onChange={(e) => setCheckupMilkDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="checkup-milk-quantity">Number of Pieces</label>
                    <input
                      id="checkup-milk-quantity"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 2"
                      value={checkupMilkQuantity}
                      onChange={(e) => setCheckupMilkQuantity(e.target.value)}
                    />
                  </div>
                </div>

                {(() => {
                  const bpWarning = (() => {
                    if (!checkupBp) return null;
                    const parts = checkupBp.split('/');
                    if (parts.length === 2) {
                      const sys = parseInt(parts[0], 10);
                      const dia = parseInt(parts[1], 10);
                      if (!Number.isNaN(sys) && !Number.isNaN(dia)) {
                        if (sys >= 140 || dia >= 90) {
                          return "High Blood Pressure Alert: BP is >= 140/90 mmHg. High risk of gestational hypertension/preeclampsia. Monitor closely.";
                        }
                      }
                    }
                    return null;
                  })();

                  const fhrWarning = (() => {
                    if (!checkupFhr) return null;
                    const rate = parseInt(checkupFhr, 10);
                    if (!Number.isNaN(rate)) {
                      if (rate < 110 || rate > 160) {
                        return `Abnormal Fetal Heart Rate Alert: FHR is ${rate} bpm. Normal range is 110-160 bpm.`;
                      }
                    }
                    return null;
                  })();

                  const growthWarning = (() => {
                    if (!checkupFundalHeight) return null;
                    const gaWeeks = selectedSchool.lmpDate
                      ? Math.max(0, Math.floor((new Date() - new Date(selectedSchool.lmpDate)) / (1000 * 60 * 60 * 24 * 7)))
                      : parseInt(selectedSchool.gestationalAge, 10);
                    const fh = parseInt(checkupFundalHeight, 10);
                    if (!Number.isNaN(fh) && !Number.isNaN(gaWeeks) && gaWeeks >= 20) {
                      if (Math.abs(fh - gaWeeks) > 3) {
                        return `Abnormal Growth Alert: Fundal height (${fh} cm) deviates from Gestational Age (${gaWeeks} weeks) by more than 3 cm.`;
                      }
                    }
                    return null;
                  })();

                  if (bpWarning || fhrWarning || growthWarning) {
                    return (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '6px', color: '#92400E', fontSize: '13px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>⚠️ Clinical Warnings:</div>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {bpWarning && <li>{bpWarning}</li>}
                          {fhrWarning && <li>{fhrWarning}</li>}
                          {growthWarning && <li>{growthWarning}</li>}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={onClearCheckupForm}>Clear Fields</button>
                  <button type="button" className="btn-secondary" onClick={() => { setActiveTrimester(null); setActiveStep(null); }}>Close Form</button>
                  <button type="button" className="btn-primary" style={{ background: '#4F46E5' }} onClick={onSaveCheckup}>Save Check-up</button>
                </div>
              </div>
            ) : (() => {
              let compCount = 0;
              for (let t = 0; t < 3; t += 1) {
                for (let s = 0; s < 3; s += 1) {
                  if (checkups[t]?.[s]?.completed) compCount += 1;
                }
              }
              const allCheckupsCompleted = compCount === 9;
              if (allCheckupsCompleted) {
                return (
                  <div className="delivery-card" style={{ marginTop: '20px', padding: '20px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    {selectedSchool.delivered ? (
                      <div>
                        <h3 style={{ margin: 0, color: '#166534', fontWeight: '600', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🎉 Maternal Care Completed & Delivered!
                        </h3>
                        <p style={{ color: '#1F2937', margin: '8px 0', fontSize: '14px' }}>
                          This maternal flow has been completed and delivery details are recorded. The baby is registered in Child Monitoring.
                        </p>
                        <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginTop: '12px', border: '1px solid #DCFCE7' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#15803D' }}>Delivery Summary:</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                            <div>Date of Delivery: <strong>{deliveryDate ? new Date(deliveryDate).toLocaleDateString() : 'N/A'}</strong></div>
                            <div>Delivery Type: <strong>{deliveryType}</strong></div>
                            <div>Outcome: <strong>{deliveryOutcome}</strong></div>
                            <div>Baby Name: <strong>{deliveryBabyName}</strong></div>
                            <div>Gender: <strong>{deliveryBabyGender}</strong></div>
                            <div>Birth Weight/Length: <strong>{deliveryBirthWeight} kg / {deliveryBirthLength} cm</strong></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ marginTop: '16px', background: '#16A34A', border: 'none' }}
                          onClick={() => {
                            setActiveTrimester(null);
                            setActiveStep(null);
                            setShowMotherCheckup(false);
                            navigate('/beneficiary');
                          }}
                        >
                          View Child in Monitoring
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={onSaveDelivery}>
                        <h3 style={{ margin: 0, color: '#166534', fontWeight: '600', fontSize: '18px' }}>
                          🎉 All Prenatal Check-ups Complete! Encode Delivery Details
                        </h3>
                        <p style={{ color: '#1F2937', margin: '4px 0 16px 0', fontSize: '13px' }}>
                          All 9 prenatal checks are recorded. Complete the delivery information below to transition to Child monitoring.
                        </p>

                        <div className="form-row-3 full-width">
                          <div className="form-group">
                            <label className="form-label" htmlFor="del-date">Delivery Date *</label>
                            <input
                              id="del-date"
                              type="date"
                              className="form-input"
                              value={deliveryDate}
                              onChange={(e) => setDeliveryDate(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="del-type">Delivery Type *</label>
                            <select
                              id="del-type"
                              className="form-select"
                              value={deliveryType}
                              onChange={(e) => setDeliveryType(e.target.value)}
                              required
                            >
                              <option value="Vaginal">Normal Vaginal Delivery</option>
                              <option value="Cesarean">Caesarean Section</option>
                              <option value="Assisted">Assisted Vaginal Delivery</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="del-outcome">Delivery Outcome *</label>
                            <select
                              id="del-outcome"
                              className="form-select"
                              value={deliveryOutcome}
                              onChange={(e) => setDeliveryOutcome(e.target.value)}
                              required
                            >
                              <option value="Single Healthy Birth">Single Healthy Birth</option>
                              <option value="Multiple Births">Multiple Births (e.g. Twins)</option>
                              <option value="Complications - Referred">Complications / Referred</option>
                            </select>
                          </div>
                        </div>

                        <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#166534', borderBottom: '1px solid #BBF7D0', paddingBottom: '4px' }}>
                          Newborn Details
                        </h4>

                        <div className="form-row-4 full-width name-row">
                          <div className="form-group">
                            <label className="form-label" htmlFor="del-baby-name">Baby's Name *</label>
                            <input
                              id="del-baby-name"
                              type="text"
                              className="form-input"
                              placeholder="First and Surname"
                              value={deliveryBabyName}
                              onChange={(e) => setDeliveryBabyName(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="del-gender">Gender *</label>
                            <select
                              id="del-gender"
                              className="form-select"
                              value={deliveryBabyGender}
                              onChange={(e) => setDeliveryBabyGender(e.target.value)}
                              required
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="del-weight">Birth Weight (kg) *</label>
                            <input
                              id="del-weight"
                              type="text"
                              className="form-input"
                              placeholder="e.g. 3.2"
                              value={deliveryBirthWeight}
                              onChange={(e) => setDeliveryBirthWeight(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="del-length">Birth Length (cm) *</label>
                            <input
                              id="del-length"
                              type="text"
                              className="form-input"
                              placeholder="e.g. 50"
                              value={deliveryBirthLength}
                              onChange={(e) => setDeliveryBirthLength(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                          <button type="button" className="btn-secondary" onClick={handleCancelCheckup}>Cancel</button>
                          <button type="submit" className="btn-primary" style={{ background: '#16A34A', border: 'none' }}>
                            Save Delivery & Register Child
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              }

              return (
                <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '8px', marginTop: '20px', border: '1px dotted #CBD5E1' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
                  <div style={{ fontWeight: '600', color: '#475569' }}>Linear Step Checkups Progress</div>
                  <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0' }}>
                    Click on the pulsing active step (🔄) or any completed step (✓) above to encode medical records or view timeline history.
                  </p>
                </div>
              );
            })()}

            <div className="checkup-footer-actions" style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelCheckup}>Cancel / Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">First Name</span>
                <span className="stat-value">{selectedSchool.firstName || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Middle Name</span>
                <span className="stat-value">{selectedSchool.middleName || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Surname</span>
                <span className="stat-value">{selectedSchool.lastName || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Suffix</span>
                <span className="stat-value">{selectedSchool.suffix || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Mother ID</span>
                <span className="stat-value">{selectedSchool.motherId || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Batch</span>
                <span className="stat-value">{selectedSchool.batch || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Group</span>
                <span className="stat-value">{selectedSchool.group || 'N/A'}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Date of Birth</span>
                <span className="stat-value">{selectedSchool.dob ? new Date(selectedSchool.dob).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Contact Number</span>
                <span className="stat-value">{selectedSchool.contactNumber || 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">LMP Date</span>
                <span className="stat-value">{selectedSchool.lmpDate ? new Date(selectedSchool.lmpDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">EDD Date</span>
                <span className="stat-value">{selectedSchool.eddDate ? new Date(selectedSchool.eddDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Weight / Height</span>
                <span className="stat-value">{selectedSchool.weight ? `${selectedSchool.weight} kg` : 'N/A'} / {selectedSchool.height ? `${selectedSchool.height} cm` : 'N/A'}</span>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="details-section">
                <h3>Emergency & Spouse Details</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span>Emergency Contact:</span>
                    <strong>{selectedSchool.emergencyName || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Emergency Relationship:</span>
                    <strong>{selectedSchool.emergencyRelationship || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Emergency Number:</span>
                    <strong>{selectedSchool.emergencyContact || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Spouse Name:</span>
                    <strong>{selectedSchool.spouseName || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Address:</span>
                    <strong>{selectedSchool.address || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Initial Prenatal Assessment</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span>Prenatal Reg Date:</span>
                    <strong>{selectedSchool.prenatalRegDate ? new Date(selectedSchool.prenatalRegDate).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Trimester / Gest. Age:</span>
                    <strong>{selectedSchool.trimester || 'N/A'} ({selectedSchool.gestationalAge || 'N/A'} weeks)</strong>
                  </div>
                  <div className="detail-row">
                    <span>Blood Pressure (BP):</span>
                    <strong>{selectedSchool.prenatalBp || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Fundal Height / FHR:</span>
                    <strong>{selectedSchool.fundalHeight ? `${selectedSchool.fundalHeight} cm` : 'N/A'} / {selectedSchool.fhr ? `${selectedSchool.fhr} bpm` : 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Weight / Height at Reg:</span>
                    <strong>{selectedSchool.prenatalWeight ? `${selectedSchool.prenatalWeight} kg` : 'N/A'} / {selectedSchool.prenatalHeight ? `${selectedSchool.prenatalHeight} cm` : 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="details-section full-width-col">
                <h3>Obstetric History & Pregnancies</h3>
                <div className="ob-stats-row">
                  <div className="ob-stat">Gravida: <strong>{selectedSchool.gravida || '0'}</strong></div>
                  <div className="ob-stat">Para: <strong>{selectedSchool.para || '0'}</strong></div>
                  <div className="ob-stat">Abortion: <strong>{selectedSchool.abortion || '0'}</strong></div>
                  <div className="ob-stat">Stillbirth: <strong>{selectedSchool.stillbirth || '0'}</strong></div>
                </div>
              </div>

              <div className="details-section">
                <h3>Medical Conditions History</h3>
                <div className="medical-conditions-tags">
                  {selectedSchool.medicalConditions && Object.entries(selectedSchool.medicalConditions).map(([key, val]) => (
                    val ? (
                      <span key={key} className="medical-tag" style={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                    ) : null
                  ))}
                  {(!selectedSchool.medicalConditions || !Object.values(selectedSchool.medicalConditions).some(Boolean)) && (
                    <span className="no-conditions-text">No medical conditions reported.</span>
                  )}
                </div>
                {selectedSchool.otherMedicalHistory && (
                  <div className="other-medical-notes">
                    <strong>Other Notes:</strong>
                    <p>{selectedSchool.otherMedicalHistory}</p>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h3>Dental Health Record</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span>Check-up Date:</span>
                    <strong>{selectedSchool.dentalCheckupDate ? new Date(selectedSchool.dentalCheckupDate).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Facility / Dentist:</span>
                    <strong>{selectedSchool.dentalFacility || 'N/A'} ({selectedSchool.dentistInCharge || 'N/A'})</strong>
                  </div>
                  <div className="detail-row">
                    <span>Dentist License / Contact:</span>
                    <strong>{selectedSchool.dentistLicense || 'N/A'} / {selectedSchool.dentistContact || 'N/A'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Teeth Count / Findings:</span>
                    <strong>{selectedSchool.teethCount || 'N/A'} teeth / {selectedSchool.dentalFindings || 'N/A'}</strong>
                  </div>
                  <div className="detail-row flex-column">
                    <span>Work Done:</span>
                    <div className="dental-work-tags">
                      {selectedSchool.dentalWork && Object.entries(selectedSchool.dentalWork).map(([key, val]) => (
                        val ? (
                          <span key={key} className="dental-tag" style={{ textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                        ) : null
                      ))}
                      {(!selectedSchool.dentalWork || !Object.values(selectedSchool.dentalWork).some(Boolean)) && (
                        <span className="no-work-text">No dental work recorded.</span>
                      )}
                    </div>
                  </div>
                  {selectedSchool.dentalRemarks && (
                    <div className="dental-remarks-box">
                      <strong>Dentist Recommendations:</strong>
                      <p>{selectedSchool.dentalRemarks}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="details-section full-width-col">
                <h3>Tetanus Toxoid (TT) Vaccine Record</h3>
                <div className="vaccines-display-grid">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const dateVal = selectedSchool[`tt${num}Date`];
                    const remarkVal = selectedSchool[`tt${num}Remarks`];
                    return (
                      <div key={num} className={`vaccine-card-item ${dateVal ? 'vaccinated' : 'pending'}`}>
                        <div className="vaccine-title">TT{num}</div>
                        <div className="vaccine-date">{dateVal ? new Date(dateVal).toLocaleDateString() : 'Not Given'}</div>
                        {remarkVal && <div className="vaccine-remarks">{remarkVal}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
