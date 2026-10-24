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
  selectedProfileFields = [],
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
          {beneficiaryType === 'child' && (
            <p className="progress-report-note">
              WHO growth scores are calculated through 24 months using the age- and sex-specific LMS references. Weight-for-length uses recumbent length before 24 months; weight-for-height uses standing height from 24 months.
            </p>
          )}
          {selectedMonitorFields.length > 0 && (
            <p className="progress-report-note">
              AI-selected history columns: {selectedMonitorFields.map(([, label]) => label).join(', ')}. Beneficiary name is included automatically.
            </p>
          )}
          {selectedProfileFields.length > 0 && (
            <p className="progress-report-note">
              AI-selected profile fields shown alongside the monitoring history: {selectedProfileFields.map(([, label]) => label).join(', ')}.
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
