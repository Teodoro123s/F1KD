import React, { useRef, useState } from 'react';
import { ResultsTable } from './ResultsTable';
import { ResultsGraph } from './ResultsGraph';

export function ResultsPanel({
  selection,
  isHealthWorker = false,
  isCommunityOrganizer = false,
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
  setNumericGraphMetric,
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
  benefitPeriod = 'overall',
  benefitMonth = '',
  onBenefitPeriodChange,
  onBenefitMonthChange,
  loadingReport = false,
}) {
  const monitoringExportHandler = useRef(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const viewToggle = [
    { key: 'table', label: 'Table View' },
    { key: 'graph', label: 'Graph View', disabled: !graphAllowed },
  ];
  const availableBatches = [...new Map(resultsRows
    .filter((row) => row.batch)
    .map((row) => [String(row.batchId || row.batch), { id: String(row.batchId || row.batch), name: row.batch }])).values()];
  const activeBatch = availableBatches.some(({ id }) => id === selectedBatch) ? selectedBatch : '';
  const graphRowsForView = activeBatch
    ? graphRows.filter((row) => String(row.batchId || row.batch || '') === activeBatch)
    : graphRows;
  const graphRangeRowsForView = activeBatch
    ? rangeRows.filter((row) => String(row.batchId || row.batch || '') === activeBatch)
    : rangeRows;
  const graphBeneficiariesForView = activeBatch
    ? graphBeneficiaries.filter(({ id }) => graphRowsForView.some((row) => String(row.childId || row.motherId || row.child || row.mother || '') === id))
    : graphBeneficiaries;
  const handleBatchChange = (batchId) => {
    setSelectedBatch(batchId);
    setSelectedGraphBeneficiary('all');
  };

  return (
    <div className="progress-report-tab-panel results-tab-panel">
      <div className="progress-report-results-header">
        <div>
          <h1>IV. Report Results</h1>
        </div>

        {(displayReportCategory !== 'profile' || graphAllowed) && (
        <div className="results-view-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {resultsView === 'graph' && displayReportCategory === 'monitor' && graphBeneficiariesForView.length > 1 && (
            <label className="results-table-period-filter">
              Beneficiary
              <select
                aria-label="Graph beneficiary"
                value={selectedGraphBeneficiary}
                onChange={(event) => setSelectedGraphBeneficiary(event.target.value)}
              >
                <option value="all">{selection.batchId || activeBatch ? 'All beneficiaries in this batch' : 'All beneficiaries'}</option>
                {graphBeneficiariesForView.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
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
              title={view.disabled ? (displayReportCategory === 'program' ? 'Graphs are unavailable for project reports.' : 'Graphs are available for individual or batch profile reports.') : undefined}
            >
              {view.label}
            </button>
          ))}
          {resultsView === 'graph' && graphAllowed && (
            <button
              type="button"
              className="secondary-btn"
              disabled={exportingReport}
              onClick={() => exportReport({
                rows: graphExportRows,
                fields: graphExportFields,
                view: 'graph',
                selectedBatch: activeBatch,
                selectedGraphBeneficiary,
              })}
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
        )}
      </div>

      {displayReportCategory === 'program' && (
        <div className="program-report-controls program-report-period-controls" aria-label="Project report filters">
          <label>
            <span>Benefit period</span>
            <select
              aria-label="Benefit period"
              value={benefitPeriod}
              onChange={(event) => onBenefitPeriodChange(event.target.value)}
              disabled={loadingReport}
            >
              <option value="overall">Overall</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          {benefitPeriod === 'month' && (
            <label>
              <span>Month</span>
              <input
                aria-label="Month"
                type="month"
                value={benefitMonth}
                onChange={(event) => onBenefitMonthChange(event.target.value)}
                disabled={loadingReport}
              />
            </label>
          )}
        </div>
      )}

      {!graphAllowed && displayReportCategory !== 'profile' && (
        <p className="progress-report-note" role="status">
          {displayReportCategory === 'program'
            ? 'Graphs are not available for project reports.'
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
          graphRows={graphRowsForView}
          resultsRows={resultsRows}
          displayWeeks={displayWeeks}
          setDisplayWeeks={setDisplayWeeks}
          rangeRows={graphRangeRowsForView}
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
            setNumericGraphMetric({
              weightForAgeInterpretation: 'weightForAge',
              lengthForAgeInterpretation: 'heightForAge',
              weightForLengthInterpretation: 'weightForLengthZScore',
            }[metric] || metric);
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
          selectedBatch={activeBatch}
          onSelectedBatchChange={handleBatchChange}
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
