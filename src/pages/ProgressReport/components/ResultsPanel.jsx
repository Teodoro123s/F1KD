import React from 'react';
import { ResultsTable } from './ResultsTable';
import { ResultsGraph } from './ResultsGraph';

export function ResultsPanel({
  selectedSchool,
  selection,
  groups,
  batches,
  exportReport,
  resultsView,
  setResultsView,
  displayReportCategory,
  profileGraphColumn,
  setProfileGraphColumn,
  graphMetricType,
  setGraphMetricType,
  availableGrowthMetrics,
  availableNumericGrowthMetrics,
  selectedGraphMetric,
  setGrowthMetrics,
  displayWeeks,
  setDisplayWeeks,
  averageMetric,
  graphRows,
  resultsRows,
  reportFields,
  displayVisibleFields,
  displaySort,
  changeSort,
  formatCellValue,
  displayBeneficiaryType,
  displayReportFocus,
  profileGraphFields,
  interpretationMetrics,
  programMetrics,
  GrowthChart,
}) {
  const viewToggle = [
    { key: 'table', label: 'Table View' },
    { key: 'graph', label: 'Graph View' },
  ];

  return (
    <div className="progress-report-tab-panel results-tab-panel">
      <div className="progress-report-results-header">
        <div>
          <h1>IV. Report Results</h1>
          <p>
            {selectedSchool?.name || 'School'} &gt; {selection.groupId ? groups.find((item) => String(item.id) === String(selection.groupId))?.name : 'All Groups'} &gt; {selection.batchId ? batches.find((item) => String(item.id) === String(selection.batchId))?.name : 'All Batches'}
          </p>
        </div>

        <div className="results-view-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {viewToggle.map((view) => (
            <button
              key={view.key}
              type="button"
              className={`secondary-btn ${resultsView === view.key ? 'is-active' : ''}`}
              onClick={() => setResultsView(view.key)}
              aria-pressed={resultsView === view.key}
            >
              {view.label}
            </button>
          ))}
          <button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button>
        </div>
      </div>

      {resultsView === 'graph' ? (
        <ResultsGraph
          displayReportCategory={displayReportCategory}
          profileGraphColumn={profileGraphColumn}
          setProfileGraphColumn={setProfileGraphColumn}
          graphMetricType={graphMetricType}
          setGraphMetricType={setGraphMetricType}
          availableGrowthMetrics={availableGrowthMetrics}
          availableNumericGrowthMetrics={availableNumericGrowthMetrics}
          selectedGraphMetric={selectedGraphMetric}
          setGrowthMetrics={setGrowthMetrics}
          graphRows={graphRows}
          resultsRows={resultsRows}
          displayWeeks={displayWeeks}
          setDisplayWeeks={setDisplayWeeks}
          displayBeneficiaryType={displayBeneficiaryType}
          averageMetric={averageMetric}
          GrowthChart={GrowthChart}
          profileGraphFields={profileGraphFields}
          interpretationMetrics={interpretationMetrics}
          programMetrics={programMetrics}
        />
      ) : (
        <ResultsTable
          resultsRows={resultsRows}
          reportFields={reportFields}
          displayVisibleFields={displayVisibleFields}
          displaySort={displaySort}
          sortLabel={(label, key) => (
            <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>
              {label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
          )}
          formatCellValue={formatCellValue}
        />
      )}
    </div>
  );
}
