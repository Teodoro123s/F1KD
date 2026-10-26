import React, { useRef } from 'react';
import { ResultsTable } from './ResultsTable';
import { ResultsGraph } from './ResultsGraph';

export function ResultsPanel({
  selectedSchool,
  selection,
  isHealthWorker = false,
  isCommunityOrganizer = false,
  groups,
  batches,
  exportReport,
  exportingReport,
  includeInterpretationColumns,
  setIncludeInterpretationColumns,
  graphExportRows,
  graphExportFields,
  resultsView,
  setResultsView,
  graphAllowed,
  graphBeneficiaries = [],
  selectedGraphBeneficiary = '',
  setSelectedGraphBeneficiary,
  tableRows,
  tableVisibleFields,
  showProfileFilter,
  profileFieldSections,
  profileSectionLabels,
  profileSection,
  setProfileSection,
  displayPage,
  reportPagination,
  generateReport,
  displayReportCategory,
  profileGraphColumn,
  setProfileGraphColumn,
  graphMetricType,
  setGraphMetricType,
  availableGrowthMetrics,
  availableNumericGrowthMetrics,
  selectedGraphMetric,
  selectedTableGrowthMetric,
  setGrowthMetrics,
  displayWeeks,
  setDisplayWeeks,
  rangeRows,
  averageMetric,
  graphRows,
  resultsRows,
  reportFields,
  displayVisibleFields,
  displaySort,
  changeSort,
  formatCellValue,
  displayBeneficiaryType,
  profileGraphFields,
  interpretationMetrics,
  programMetrics,
}) {
  const monitoringExportHandler = useRef(null);
  const viewToggle = [
    { key: 'table', label: 'Table View' },
    { key: 'graph', label: 'Graph View', disabled: !graphAllowed },
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
          {resultsView === 'graph' && displayReportCategory === 'monitor' && graphBeneficiaries.length > 1 && (
            <label className="results-table-period-filter">
              Beneficiary
              <select
                aria-label="Graph beneficiary"
                value={selectedGraphBeneficiary}
                onChange={(event) => setSelectedGraphBeneficiary(event.target.value)}
              >
                {graphBeneficiaries.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}
          {viewToggle.map((view) => (
            <button
              key={view.key}
              type="button"
              className={`secondary-btn ${resultsView === view.key ? 'is-active' : ''}`}
              onClick={() => { if (!view.disabled) setResultsView(view.key); }}
              disabled={view.disabled}
              aria-pressed={resultsView === view.key}
              title={view.disabled ? (displayReportCategory === 'program' ? 'Graphs are unavailable for program reports.' : 'Graphs are available for individual or batch profile reports.') : undefined}
            >
              {view.label}
            </button>
          ))}
          {resultsView === 'graph' && graphAllowed && (
            <button
              type="button"
              className="secondary-btn"
              disabled={exportingReport}
              onClick={() => exportReport({ rows: graphExportRows, fields: graphExportFields, view: 'graph' })}
            >
              {exportingReport ? 'Preparing CSV…' : 'Export CSV'}
            </button>
          )}
          {resultsView === 'table' && displayReportCategory === 'monitor' && (
            <button
              type="button"
              className="secondary-btn"
              disabled={exportingReport}
              onClick={() => monitoringExportHandler.current?.()}
            >
              {exportingReport ? 'Preparing CSV…' : 'Export CSV'}
            </button>
          )}
        </div>
      </div>

      {!graphAllowed && (
        <p className="progress-report-note" role="status">
          {displayReportCategory === 'program'
            ? 'Graphs are not available for program reports.'
            : 'Graphs are available for individual or batch profile reports.'}
        </p>
      )}

      {resultsView === 'graph' && graphAllowed ? (
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
          rangeRows={rangeRows}
          displayBeneficiaryType={displayBeneficiaryType}
          averageMetric={averageMetric}
          profileGraphFields={profileGraphFields}
          interpretationMetrics={interpretationMetrics}
          programMetrics={programMetrics}
        />
      ) : (
        <ResultsTable
          resultsRows={tableRows}
          reportFields={reportFields}
          displayVisibleFields={tableVisibleFields}
          showMonitoringFilter={displayReportCategory === 'monitor'}
          showSchoolFilter={!isHealthWorker && !isCommunityOrganizer}
          showGroupFilter={!isHealthWorker}
          growthMetricOptions={availableGrowthMetrics}
          selectedGrowthMetric={selectedTableGrowthMetric}
          onGrowthMetricChange={(metric) => {
            setGraphMetricType('interpretation');
            setGrowthMetrics([metric]);
          }}
          onRegisterMonitoringExport={(handler) => { monitoringExportHandler.current = handler; }}
          communitySelection={selection}
          beneficiaryType={displayBeneficiaryType}
          showProfileFilter={showProfileFilter}
          profileFieldSections={profileFieldSections}
          profileSectionLabels={profileSectionLabels}
          profileSection={profileSection}
          setProfileSection={setProfileSection}
          onExport={exportReport}
          exportingReport={exportingReport}
          includeInterpretationColumns={includeInterpretationColumns}
          setIncludeInterpretationColumns={setIncludeInterpretationColumns}
          displaySort={displaySort}
          sortLabel={(label, key) => (
            <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>
              {label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
          )}
          formatCellValue={formatCellValue}
        />
      )}
      {reportPagination && reportPagination.totalPages > 1 && (
        <div className="progress-report-pagination" aria-label="Report pagination">
          <button type="button" className="secondary-btn" disabled={displayPage <= 1} onClick={() => generateReport(displayPage - 1)}>Previous</button>
          <span>Page {displayPage} of {reportPagination.totalPages}</span>
          <button type="button" className="secondary-btn" disabled={displayPage >= reportPagination.totalPages} onClick={() => generateReport(displayPage + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
