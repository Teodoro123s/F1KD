import React from 'react';

export function ReportFocusStep({
  reportCategory,
  selectReportCategory,
  programName,
  setProgramName,
  programs,
  benefitPeriod,
  setBenefitPeriod,
  benefitMonth,
  setBenefitMonth,
  beneficiaryType,
  setBeneficiaryType,
  setActiveTab,
}) {
  return (
    <div className="progress-report-tab-panel">
      <h1>II. Report Focus</h1>
      <fieldset className="progress-report-report-category">
        <legend>Report category</legend>
        <label className={reportCategory === 'profile' ? 'selected' : ''}>
          <input type="radio" name="report-category" value="profile" checked={reportCategory === 'profile'} onChange={() => selectReportCategory('profile')} />Profile Report
        </label>
        <label className={reportCategory === 'monitor' ? 'selected' : ''}>
          <input type="radio" name="report-category" value="monitor" checked={reportCategory === 'monitor'} onChange={() => selectReportCategory('monitor')} />Monitor Report
        </label>
        <label className={reportCategory === 'program' ? 'selected' : ''}>
          <input type="radio" name="report-category" value="program" checked={reportCategory === 'program'} onChange={() => selectReportCategory('program')} />Program Report
        </label>
      </fieldset>
      <p className="progress-report-note">Monitor Report is selected by default and uses details from the Monitor module.</p>
      {reportCategory === 'program' ? (
        <fieldset className="progress-report-beneficiary-type">
          <legend>Program Name</legend>
          <div className="program-report-controls">
            <label>
              <span>Program</span>
              <select value={programName} onChange={(event) => setProgramName(event.target.value)}>
                <option value="">Select program</option>
                {programs.map((program) => <option key={program.id} value={program.name}>{program.name}</option>)}
              </select>
            </label>
            <label>
              <span>Benefit period</span>
              <select value={benefitPeriod} onChange={(event) => setBenefitPeriod(event.target.value)}>
                <option value="overall">Overall</option>
                <option value="month">Monthly</option>
              </select>
            </label>
            {benefitPeriod === 'month' && (
              <label>
                <span>Month</span>
                <input type="month" value={benefitMonth} onChange={(event) => setBenefitMonth(event.target.value)} />
              </label>
            )}
          </div>
        </fieldset>
      ) : (
        <fieldset className="progress-report-beneficiary-type">
          <legend>Beneficiary type</legend>
          <label className={beneficiaryType === 'child' ? 'selected' : ''}>
            <input type="radio" name="beneficiary-type" value="child" checked={beneficiaryType === 'child'} onChange={() => setBeneficiaryType('child')} />Child
          </label>
          <label className={beneficiaryType === 'mother' ? 'selected' : ''}>
            <input type="radio" name="beneficiary-type" value="mother" checked={beneficiaryType === 'mother'} onChange={() => setBeneficiaryType('mother')} />Mother
          </label>
        </fieldset>
      )}
      <div className="progress-report-tab-actions">
        <button type="button" className="primary-btn" onClick={() => setActiveTab(3)}>
          Next: Growth Metrics →
        </button>
      </div>
    </div>
  );
}
