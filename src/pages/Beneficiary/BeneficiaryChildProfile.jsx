import React from 'react';

const PEDIATRIC_CHECKPOINTS = ['Birth / 0 Weeks', '6 Weeks', '3 Months', '6 Months', '9 Months', '12 Months (48 Weeks)'];
const DEFAULT_PEDIA_CHECKUPS = Array(PEDIATRIC_CHECKPOINTS.length).fill(null);

const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const getFirstIncompletePediaCheckup = (checkups = DEFAULT_PEDIA_CHECKUPS) => {
  for (let i = 0; i < PEDIATRIC_CHECKPOINTS.length; i += 1) {
    if (!checkups[i]?.completed) {
      return i + 1;
    }
  }
  return null;
};

const getPediaStepStatus = (child, stepIdx) => {
  if (!child) return 'locked';
  const checkups = child.childCheckups || DEFAULT_PEDIA_CHECKUPS;
  if (checkups[stepIdx]?.completed) return 'completed';
  const firstIncomplete = getFirstIncompletePediaCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete === stepIdx + 1) return 'active';
  return 'locked';
};

const getPediaBmiStatus = (bmi) => {
  const value = parseFloat(bmi);
  if (Number.isNaN(value)) return '';
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Overweight';
  return 'Obese';
};

export default function BeneficiaryChildProfile({
  selectedGroup,
  showChildCheckup,
  activePediaStep,
  openPediaCheckup,
  handleCancelCheckup,
  onClearPediaCheckupForm,
  onSavePediaCheckup,
  setActivePediaStep,
  setShowChildCheckup,
  navigate,
  pediaCheckupDate,
  setPediaCheckupDate,
  pediaAgeMonths,
  setPediaAgeMonths,
  pediaServiceProvider,
  setPediaServiceProvider,
  pediaWeight,
  setPediaWeight,
  pediaHeight,
  setPediaHeight,
  pediaHeadCircumference,
  setPediaHeadCircumference,
  pediaFeeding,
  setPediaFeeding,
  pediaVaccinesGiven,
  setPediaVaccinesGiven,
  pediaLabRequest,
  setPediaLabRequest,
  pediaAmount,
  setPediaAmount,
  pediaSourceOfFunds,
  setPediaSourceOfFunds,
  pediaFacilityType,
  setPediaFacilityType,
  pediaDevelopmentNotes,
  setPediaDevelopmentNotes,
  pediaNotes,
  setPediaNotes,
}) {
  if (!selectedGroup) return null;

  const checkups = selectedGroup.childCheckups || DEFAULT_PEDIA_CHECKUPS;
  const completedCount = checkups.filter((item) => item?.completed).length;
  const allCompleted = completedCount === PEDIATRIC_CHECKPOINTS.length;

  return (
    <div className="mother-profile-card">
      <div className="profile-card-header">
        <div className="profile-header-main">
          <div className="profile-title-row">
            <h2>{selectedGroup.name}</h2>
            <span className="program-badge">Pediatric Monitoring</span>
          </div>
          <div className="profile-subtitle">
            <span>{selectedGroup.community || 'Unknown community'}</span>
            <span className="separator">•</span>
            <span>{selectedGroup.status || 'Active'}</span>
          </div>
        </div>
        <div className="profile-actions">
          {showChildCheckup ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowChildCheckup(false);
                setActivePediaStep(null);
                navigate(`/beneficiary/group/${selectedGroup.id}`);
              }}
            >
              Close Checkups
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary btn-checkups"
              onClick={() => {
                const firstIncomplete = getFirstIncompletePediaCheckup(selectedGroup.childCheckups);
                if (firstIncomplete) {
                  openPediaCheckup(firstIncomplete);
                  return;
                }
                setShowChildCheckup(true);
                setActivePediaStep(null);
                navigate(`/beneficiary/group/${selectedGroup.id}?pedia=1`);
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
        {showChildCheckup ? (
          <div className="mother-checkup-body">
            <div className="trimester-stepper pediatric-stepper">
              {PEDIATRIC_CHECKPOINTS.map((label, index) => {
                const step = index + 1;
                const status = getPediaStepStatus(selectedGroup, index);
                const completed = status === 'completed';
                const isActive = activePediaStep === step;
                const isLocked = status === 'locked';
                let circleContent = step;
                if (completed) circleContent = '✓';
                else if (isActive) circleContent = '🔄';
                return (
                  <div key={label} className={`step ${completed ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => !isLocked && openPediaCheckup(step)}
                      disabled={isLocked}
                      aria-label={`Open pediatric checkup ${step}`}
                    >
                      <div className="step-circle">{circleContent}</div>
                    </button>
                    <div className="step-label">{label}</div>
                  </div>
                );
              })}
            </div>

            {activePediaStep ? (
              <div className="checkup-form-card" style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--burgundy)' }}>
                    Pediatric Checkup: {PEDIATRIC_CHECKPOINTS[activePediaStep - 1]}
                  </h3>
                  {selectedGroup.childCheckups?.[activePediaStep - 1]?.completed && (
                    <span className="status-badge complete" style={{ fontSize: '12px', background: '#DEF7EC', color: '#03543F', padding: '2px 8px', borderRadius: '4px' }}>
                      ✔ Saved / Completed
                    </span>
                  )}
                </div>

                <div className="form-row-3 full-width">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-checkup-date">Checkup Date *</label>
                    <input
                      id="pedia-checkup-date"
                      type="date"
                      className="form-input"
                      value={pediaCheckupDate}
                      onChange={(e) => setPediaCheckupDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-age-months">Age in Months</label>
                    <input
                      id="pedia-age-months"
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 3"
                      value={pediaAgeMonths}
                      onChange={(e) => setPediaAgeMonths(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-service-provider">Service Provider</label>
                    <input
                      id="pedia-service-provider"
                      type="text"
                      className="form-input"
                      placeholder="Health worker name"
                      value={pediaServiceProvider}
                      onChange={(e) => setPediaServiceProvider(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-4 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-weight">Weight (kg) *</label>
                    <input
                      id="pedia-weight"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 5.5"
                      value={pediaWeight}
                      onChange={(e) => setPediaWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-height">Height (cm) *</label>
                    <input
                      id="pedia-height"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 60"
                      value={pediaHeight}
                      onChange={(e) => setPediaHeight(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-head-circumference">Head Circumference (cm)</label>
                    <input
                      id="pedia-head-circumference"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 38"
                      value={pediaHeadCircumference}
                      onChange={(e) => setPediaHeadCircumference(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-feeding">Exclusive Breastfeeding</label>
                    <select
                      id="pedia-feeding"
                      className="form-select"
                      value={pediaFeeding}
                      onChange={(e) => setPediaFeeding(e.target.value)}
                    >
                      <option value="Exclusive Breastfeeding">Yes</option>
                      <option value="Mixed Feeding">No</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-3 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-bmi">BMI</label>
                    <input
                      id="pedia-bmi"
                      type="text"
                      className="form-input"
                      readOnly
                      value={calculateBmi(pediaWeight, pediaHeight)}
                      placeholder="Auto-calculated"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-bmi-status">BMI Status</label>
                    <input
                      id="pedia-bmi-status"
                      type="text"
                      className="form-input"
                      readOnly
                      value={getPediaBmiStatus(calculateBmi(pediaWeight, pediaHeight))}
                      placeholder="Auto-calculated"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-vaccines-given">Vaccines Given</label>
                    <input
                      id="pedia-vaccines-given"
                      type="text"
                      className="form-input"
                      placeholder="e.g. BCG, OPV"
                      value={pediaVaccinesGiven}
                      onChange={(e) => setPediaVaccinesGiven(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-4 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-lab-request">Laboratory Request</label>
                    <select
                      id="pedia-lab-request"
                      className="form-select"
                      value={pediaLabRequest ? 'Yes' : 'No'}
                      onChange={(e) => setPediaLabRequest(e.target.value === 'Yes')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-amount">Amount</label>
                    <input
                      id="pedia-amount"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 150"
                      value={pediaAmount}
                      onChange={(e) => setPediaAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-source-of-funds">Source of Funds</label>
                    <input
                      id="pedia-source-of-funds"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Municipal Fund"
                      value={pediaSourceOfFunds}
                      onChange={(e) => setPediaSourceOfFunds(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-facility-type">Facility Type</label>
                    <select
                      id="pedia-facility-type"
                      className="form-select"
                      value={pediaFacilityType}
                      onChange={(e) => setPediaFacilityType(e.target.value)}
                    >
                      <option value="Govt">Govt</option>
                      <option value="Private">Private</option>
                      <option value="Partner Org">Partner Org</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2 full-width" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-development-notes">Development Notes</label>
                    <textarea
                      id="pedia-development-notes"
                      className="form-input"
                      rows="3"
                      placeholder="Growth, milestones, feeding, or referral notes"
                      value={pediaDevelopmentNotes}
                      onChange={(e) => setPediaDevelopmentNotes(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pedia-notes">Notes</label>
                    <textarea
                      id="pedia-notes"
                      className="form-input"
                      rows="3"
                      placeholder="Additional observations or actions"
                      value={pediaNotes}
                      onChange={(e) => setPediaNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={onClearPediaCheckupForm}>Clear Fields</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setActivePediaStep(null);
                      setShowChildCheckup(false);
                      navigate(`/beneficiary/group/${selectedGroup.id}`);
                    }}
                  >
                    Close Form
                  </button>
                  <button type="button" className="btn-primary" style={{ background: '#4F46E5' }} onClick={onSavePediaCheckup}>
                    Save Checkup
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {allCompleted ? (
                  <div className="delivery-card" style={{ marginTop: '20px', padding: '20px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: 0, color: '#166534', fontWeight: '600', fontSize: '18px' }}>
                      🎉 Pediatric Monitoring Complete
                    </h3>
                    <p style={{ margin: '10px 0 0', color: '#1F2937', fontSize: '14px' }}>
                      All {PEDIATRIC_CHECKPOINTS.length} pediatric milestones have been recorded for this child.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', fontSize: '13px' }}>
                      <div>Total Completed: <strong>{completedCount}</strong></div>
                      <div>Progress: <strong>{selectedGroup.progress ?? 0}%</strong></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '8px', marginTop: '20px', border: '1px dotted #CBD5E1' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
                    <div style={{ fontWeight: '600', color: '#475569' }}>Pediatric milestone steps are unlocked in sequence</div>
                    <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0' }}>
                      Click the current active step (🔄) or any completed milestone (✓) to record the child checkup details.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">First Name</span>
                <span className="stat-value">{selectedGroup.firstName || selectedGroup.name || '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Middle Name</span>
                <span className="stat-value">{selectedGroup.middleName || '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Surname</span>
                <span className="stat-value">{selectedGroup.lastName || '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Suffix</span>
                <span className="stat-value">{selectedGroup.suffix || '—'}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Sex</span>
                <span className="stat-value">{selectedGroup.gender || '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Birth Date</span>
                <span className="stat-value">{selectedGroup.birthDate ? new Date(selectedGroup.birthDate).toLocaleDateString() : '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Birth Weight</span>
                <span className="stat-value">{selectedGroup.birthWeight ? `${selectedGroup.birthWeight} kg` : '—'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Birth Length</span>
                <span className="stat-value">{selectedGroup.birthLength ? `${selectedGroup.birthLength} cm` : '—'}</span>
              </div>
            </div>

            <div className="details-section full-width-col" style={{ marginTop: '18px' }}>
              <h3>Residential Address</h3>
              <div className="details-list">
                <div className="detail-row flex-column">
                  <span>{selectedGroup.address || selectedGroup.residentialAddress || 'Full residential address not recorded'}</span>
                </div>
              </div>
            </div>

            <div className="profile-details-grid" style={{ marginTop: '18px' }}>
              <div className="details-section">
                <h3>Child Information</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span>Delivery Type</span>
                    <strong>{selectedGroup.deliveryType || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Health Status</span>
                    <strong>{selectedGroup.healthStatus || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Place of Birth</span>
                    <strong>{selectedGroup.birthPlace || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Feeding Type</span>
                    <strong>{selectedGroup.feedingType || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Apgar Score</span>
                    <strong>{selectedGroup.apgarScore || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Program Summary</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span>Community</span>
                    <strong>{selectedGroup.community || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Care Leader</span>
                    <strong>{selectedGroup.leader || '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Assigned Batches</span>
                    <strong>{(selectedGroup.assignedBatchIds || []).length}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Progress</span>
                    <strong>{selectedGroup.progress ?? 0}%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="details-section full-width-col" style={{ marginTop: '18px' }}>
              <h3>Vaccine Record</h3>
              <div className="vaccine-form-table-wrapper">
                <table className="vaccine-form-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Vaccine</th>
                      <th style={{ width: '32%' }}>Date Given</th>
                      <th style={{ width: '33%' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'bcg', label: 'BCG' },
                      { key: 'hepb', label: 'Hepatitis B' },
                      { key: 'opv', label: 'OPV' },
                      { key: 'dpt', label: 'DPT' },
                      { key: 'mmr', label: 'MMR' },
                    ].map(({ key, label }) => (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{selectedGroup[`${key}Date`] ? new Date(selectedGroup[`${key}Date`]).toLocaleDateString() : '—'}</td>
                        <td>{selectedGroup[`${key}Remarks`] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
