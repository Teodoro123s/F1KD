import React from 'react';

export function GrowthMetricsStep({
  reportCategory,
  availableProfileMetrics,
  profileMetrics,
  toggleProfileMetric,
  programMetrics,
  toggleProgramMetric,
  beneficiaryType,
  availableGrowthMetrics,
  growthMetrics,
  selectGrowthMetric,
  setActiveTab,
  generateReport,
}) {
  return (
    <div className="progress-report-tab-panel">
      <h1>III. Growth Metrics</h1>
      {reportCategory === 'profile' ? (
        <>
          <p>Choose the beneficiary profile fields to include in the report:</p>
          <div className="growth-metric-cards profile-metric-cards">
            {availableProfileMetrics.map(([id, label, description]) => (
              <label key={id} className={profileMetrics.includes(id) ? 'selected' : ''}>
                <input type="checkbox" name="profile-metric" checked={profileMetrics.includes(id)} onChange={() => toggleProfileMetric(id)} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <p className="progress-report-note">Profile values come from the Beneficiary module. Child baselines use birth weight and birth length; mother baselines use prenatal weight and height.</p>
        </>
      ) : reportCategory === 'program' ? (
        <>
          <p>Choose the program progress fields to include in the report:</p>
          <div className="growth-metric-cards profile-metric-cards">
            {programMetrics.map(([id, label, description]) => (
              <label key={id} className={programMetrics.includes(id) ? 'selected' : ''}>
                <input type="checkbox" name="program-metric" checked={programMetrics.includes(id)} onChange={() => toggleProgramMetric(id)} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <p className="progress-report-note">Program values come from the Program and monitoring activity records for the selected community scope.</p>
        </>
      ) : (
        <>
          <p>{beneficiaryType === 'mother' ? 'Review mother BMI from Mother Monitoring.' : 'Choose one child growth indicator to display and export:'}</p>
          <div className="growth-metric-cards">
            {availableGrowthMetrics.map(([id, label, description]) => (
              <label key={id} className={growthMetrics.includes(id) ? 'selected' : ''}>
                <input type="radio" name="growth-metric" checked={growthMetrics.includes(id)} onChange={() => selectGrowthMetric(id)} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
        </>
      )}
      <div className="progress-report-tab-actions">
        <button type="button" className="primary-btn" onClick={() => {
          setActiveTab(4);
          if (generateReport) generateReport();
        }}>
          Next: Results →
        </button>
      </div>
    </div>
  );
}
