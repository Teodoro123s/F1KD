import React from 'react';

export function GrowthMetricsStep({
  reportCategory,
  availableProfileMetrics,
  profileMetrics,
  toggleProfileMetric,
  programMetrics,
  selectedProgramMetrics,
  toggleProgramMetric,
  beneficiaryType,
  availableGrowthMetrics,
  growthMetrics,
  selectGrowthMetric,
  setActiveTab,
  generateReport,
  profileFieldSections = {},
  profileSectionLabels = {},
  profileSection = 'general',
  setProfileSection,
}) {
  const hasProfilePages = reportCategory === 'profile' && Object.keys(profileFieldSections).length > 0;
  const profilePageFields = availableProfileMetrics.filter(([id]) => !hasProfilePages || profileFieldSections[id] === profileSection);
  return (
    <div className="progress-report-tab-panel">
      <h1>III. Growth Metrics</h1>
      {reportCategory === 'profile' ? (
        <>
          <p>Choose the beneficiary profile fields to include in the report:</p>
          {hasProfilePages && (
            <div className="profile-report-page-tabs" role="tablist" aria-label="Profile report pages">
              {Object.entries(profileSectionLabels).filter(([value]) => value !== 'all').map(([value, label]) => (
                <button key={value} type="button" className={profileSection === value ? 'active' : ''} onClick={() => setProfileSection(value)}>{label}</button>
              ))}
            </div>
          )}
          <div className="growth-metric-cards profile-metric-cards">
            {profilePageFields.map(([id, label, description]) => (
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
              <label key={id} className={selectedProgramMetrics.includes(id) ? 'selected' : ''}>
                <input type="checkbox" name="program-metric" checked={selectedProgramMetrics.includes(id)} onChange={() => toggleProgramMetric(id)} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <p className="progress-report-note">Program values come from the Program and monitoring activity records for the selected community scope.</p>
        </>
      ) : (
        <>
          <p>{beneficiaryType === 'mother' ? 'Choose a mother monitoring metric to review.' : 'Choose one child growth indicator to display and export:'}</p>
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
        <button type="button" className="primary-btn" onClick={async () => {
          if (generateReport) await generateReport();
        }}>
          Next: Results →
        </button>
      </div>
    </div>
  );
}
