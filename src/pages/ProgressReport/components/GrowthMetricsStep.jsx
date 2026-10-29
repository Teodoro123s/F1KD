import React from 'react';
import { StepNavigationButton } from '../../../components/ui/StepNavigationButton';

export function GrowthMetricsStep({
  reportCategory,
  availableProfileMetrics,
  profileMetrics,
  programMetrics,
  selectedProgramMetrics,
  toggleProgramMetric,
  beneficiaryType,
  availableGrowthMetrics,
  growthMetrics,
  selectGrowthMetric,
  setActiveTab,
  generateReport,
  runStepNavigation,
  isNavigating = false,
  navigationDirection = '',
  profileFieldSections = {},
  profileSectionLabels = {},
  setProfileSection,
  toggleProfileSection,
  selectedMonitorFields = [],
  availableMonitorFields = [],
  toggleMonitorField,
}) {
  const hasProfilePages = reportCategory === 'profile' && Object.keys(profileFieldSections).length > 0;
  const profileSections = Object.entries(profileSectionLabels).filter(([value]) => value !== 'all');
  return (
    <div className="progress-report-tab-panel">
      <h1>III. Growth Metrics</h1>
      {reportCategory === 'profile' ? (
        <>
          <p>Choose which profile sections to include in the report:</p>
          {hasProfilePages && (
            <div className="profile-report-section-cards" aria-label="Profile report sections">
              {profileSections.map(([value, label]) => {
                const sectionFieldIds = availableProfileMetrics
                  .filter(([id]) => profileFieldSections[id] === value)
                  .map(([id]) => id);
                const selectedCount = sectionFieldIds.filter((id) => profileMetrics.includes(id)).length;
                const isSelected = selectedCount === sectionFieldIds.length;
                const isPartiallySelected = selectedCount > 0 && !isSelected;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    className={`${isSelected ? 'selected' : ''} ${isPartiallySelected ? 'partially-selected' : ''}`.trim()}
                    onClick={() => {
                      setProfileSection?.(value);
                      toggleProfileSection?.(value);
                    }}
                  >
                    <strong>{label}</strong>
                    <span>{isSelected ? 'Included' : isPartiallySelected ? 'Partially included' : 'Not included'}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="progress-report-note">Profile values come from the Beneficiary module. Child baselines use birth weight and birth length; mother baselines use prenatal weight and height.</p>
        </>
      ) : reportCategory === 'program' ? (
        <>
          <p>Choose the project progress fields to include in the report:</p>
          <div className="growth-metric-cards profile-metric-cards">
            {programMetrics.map(([id, label, description]) => (
              <label key={id} className={selectedProgramMetrics.includes(id) ? 'selected' : ''}>
                <input type="checkbox" name="program-metric" checked={selectedProgramMetrics.includes(id)} onChange={() => toggleProgramMetric(id)} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <p className="progress-report-note">Project values come from Projects and monitoring activity records for the selected community scope.</p>
        </>
      ) : (
        <>
          <p>{beneficiaryType === 'mother' ? 'Choose one monitoring metric to review.' : 'Choose one child growth indicator to display and export:'}</p>
          <div className="growth-metric-cards">
            {availableGrowthMetrics.map(([id, label, description]) => (
              <label key={id} className={growthMetrics.includes(id) ? 'selected' : ''}>
                <input
                  type="radio"
                  name="growth-metric"
                  checked={growthMetrics.includes(id)}
                  onChange={() => selectGrowthMetric(id)}
                />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <h2>Check-up details</h2>
          <p>Select the recorded check-up fields to include in the monitoring history table and CSV export.</p>
          <div className="growth-metric-cards profile-metric-cards checkup-detail-cards">
            {availableMonitorFields.map(([id, label, description]) => (
              <label key={id} className={selectedMonitorFields.some(([fieldId]) => fieldId === id) ? 'selected' : ''}>
                <input
                  type="checkbox"
                  name="monitor-detail"
                  checked={selectedMonitorFields.some(([fieldId]) => fieldId === id)}
                  onChange={() => toggleMonitorField?.(id)}
                />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          {beneficiaryType === 'child' && (
            <p className="progress-report-note">
              Graphs show measured weight or length/height over time with labeled units. WHO scores are used to calculate interpretations but are not displayed.
            </p>
          )}
          {selectedMonitorFields.length > 0 && (
            <p className="progress-report-note">
              Selected check-up details are included in the monitoring history and CSV export. Beneficiary name is included automatically.
            </p>
          )}
        </>
      )}
      <div className="progress-report-tab-actions">
        <StepNavigationButton
          className="primary-btn"
          onClick={() => runStepNavigation(() => generateReport?.(), 'next')}
          disabled={isNavigating}
          loading={navigationDirection === 'next'}
          loadingLabel="Generating..."
        >
          Next: Results →
        </StepNavigationButton>
      </div>
    </div>
  );
}
