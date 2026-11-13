import React, { useRef, useState } from 'react';
import { ResultsTable } from './ResultsTable';
import { ResultsGraph } from './ResultsGraph';
import Pagination from '../../../components/ui/Pagination';

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
  onGraphMetricChange,
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
  schools = [],
  onBenefitPeriodChange,
  onBenefitMonthChange,
  onReportSchoolChange,
  loadingReport = false,
}) {
  const monitoringExportHandler = useRef(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const availableBatches = [...new Map(graphBeneficiaries
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
  const graphExportRowsForView = activeBatch
    ? graphExportRows.filter((row) => String(row.batchId || row.batch || '') === activeBatch)
    : graphExportRows;
  const handleBatchChange = (batchId) => {
    setSelectedBatch(batchId);
    setSelectedGraphBeneficiary('summary');
  };
  const handleSchoolChange = (schoolId) => {
    setSelectedBatch('');
    onReportSchoolChange?.(schoolId);
  };

  return (
    <div className="progress-report-tab-panel results-tab-panel">
      <div className="progress-report-results-header">
        <div>
          <h1>IV. Report Results</h1>
        </div>

        <div className="progress-report-results-actions">
          <div className="progress-report-view-toggle" role="group" aria-label="Report display">
            <button
              type="button"
              aria-pressed={resultsView === 'graph'}
              className={resultsView === 'graph' ? 'active' : ''}
              disabled={!graphAllowed}
              onClick={() => setResultsView('graph')}
            >
              Graph view
            </button>
            <button
              type="button"
              aria-pressed={resultsView === 'table'}
              className={resultsView === 'table' ? 'active' : ''}
              onClick={() => setResultsView('table')}
            >
              Table view
            </button>
          </div>
          {resultsView === 'graph' && displayReportCategory === 'monitor' && availableBatches.length > 1 && (
            <label className="results-table-period-filter">
              Batch
              <select aria-label="Graph batch" value={activeBatch} onChange={(event) => handleBatchChange(event.target.value)}>
                <option value="">All batches</option>
                {availableBatches.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}
          {resultsView === 'graph' && graphAllowed && (
            <button
              type="button"
              className="secondary-btn"
              disabled={exportingReport}
              onClick={() => exportReport({
                rows: graphExportRowsForView,
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
      {!graphAllowed && displayReportCategory === 'profile' && (
        <p className="progress-report-note" role="status">
          School and group profile reports are shown in table view. Select a batch or generate an individual report to enable graphs.
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
          onGraphMetricChange={onGraphMetricChange}
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
          cohortSummary={selectedGraphBeneficiary === 'summary'}
          graphBeneficiaries={graphBeneficiariesForView}
          selectedGraphBeneficiary={selectedGraphBeneficiary}
          setSelectedGraphBeneficiary={setSelectedGraphBeneficiary}
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
            if (!metric) {
              setGraphMetricType('numeric');
              setGrowthMetrics([]);
              setResultsView('table');
              return;
            }
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
          schoolOptions={schools}
          onSchoolChange={handleSchoolChange}
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
          loadingReport={loadingReport}
        />
      )}
      {reportPagination && reportPagination.totalPages > 1 && (
        <Pagination
          currentPage={displayPage}
          pageCount={reportPagination.totalPages}
          onPageChange={generateReport}
          rangeStart={(displayPage - 1) * reportPagination.perPage + 1}
          rangeEnd={Math.min(displayPage * reportPagination.perPage, reportPagination.total)}
          totalItems={reportPagination.total}
          itemLabel="results"
          ariaLabel="Report pagination"
        />
      )}
    </div>
  );
}
