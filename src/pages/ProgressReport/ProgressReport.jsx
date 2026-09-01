/**
 * ProgressReport
 *
 * Presentation-layer component for the progress dashboard. It is intentionally
 * kept thin: view state, comparison state, and modal orchestration live here,
 * while data fetching, filtering, export generation, and column preferences are
 * delegated to dedicated hooks and pure utility modules.
 *
 * Safe refactor path:
 * 1. Week 1: extract utility functions and field sanitizers without changing behavior.
 * 2. Week 2: centralize database access in a repository layer.
 * 3. Week 3: move business logic into services for calculations and enrichment.
 * 4. Week 4: keep the page to routing/controller composition only.
 * 5. Week 5: add a query builder and NLP parser for dynamic filtering.
 *
 * This keeps the component maintainable, testable, and easy to extend without
 * changing the backend contracts or user-visible behavior.
 */
import React, { useMemo, useState } from 'react';
import { useMothers } from '../../context/MothersContext';
import { useAuth } from '../../auth/AuthProvider';
import ProgressReportTable from './ProgressReportTable';
import ProgressReportToolbar from './components/ProgressReportToolbar';
import ProgressReportFilterBar from './components/ProgressReportFilterBar';
import ProgressReportComparisonModal from './components/ProgressReportComparisonModal';
import {
  REPORT_TABS,
  SEARCH_FILTER_RULES,
  formatDate,
  formatDelta,
  getDefaultVisibleColumns,
  getFieldGroups,
  getReportColumnsForEntity,
  getRowKey,
  hasValue,
  matchesEntityToken,
  normalizeChild,
  normalizeMother,
} from './progressReportUtils';
import { useProgressFilters } from './hooks/useProgressFilters';
import { useReportData } from './hooks/useReportData';
import { useColumnPreferences } from './hooks/useColumnPreferences';
import { useReportExport } from './hooks/useReportExport';

export default function ProgressReport() {
  const { mothers, refreshMothers } = useMothers();
  const { currentUser } = useAuth();
  const currentRole = currentUser?.role || 'default';

  // View/UI state
  const [activeTab, setActiveTab] = useState('Master List');
  const [beneficiaryType, setBeneficiaryType] = useState('Mothers');
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState('Beneficiaries');
  const [showAnalyzeMenu, setShowAnalyzeMenu] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [historyComparison, setHistoryComparison] = useState(null);
  const [underweightDrilldown, setUnderweightDrilldown] = useState(null);

  const currentEntityColumns = useMemo(() => getReportColumnsForEntity(beneficiaryType), [beneficiaryType]);
  const defaultVisibleColumns = useMemo(
    () => getDefaultVisibleColumns(currentRole, beneficiaryType),
    [currentRole, beneficiaryType]
  );

  // Column management
  const { visibleColumns, fieldSearch, showColumns, expandedGroups, setVisibleColumns, setFieldSearch, setShowColumns, setExpandedGroups, filteredFieldOptions } = useColumnPreferences({
    currentEntityColumns,
    defaultVisibleColumns,
    roleName: currentRole,
    beneficiaryType,
    fieldGroups: getFieldGroups(beneficiaryType),
  });

  // Data fetching
  const { allRows, rankedRows, graphRows, loadingChildren } = useReportData({
    beneficiaryType,
    mothers,
    refreshMothers,
    visibleColumns,
    currentEntityColumns,
    defaultVisibleColumns,
    normalizeMotherFn: normalizeMother,
    normalizeChildFn: normalizeChild,
    getFieldGroupsFn: getFieldGroups,
  });

  // Filter management
  const { school, setSchool, group, setGroup, batch, setBatch, search, setSearch, showAllFilters, setShowAllFilters, searchFilters, filteredRows, activeFilterCount, comparisonRequest, schoolOptions, groupOptions, batchOptions } = useProgressFilters({
    allRows,
    searchFilterRules: SEARCH_FILTER_RULES,
    hasValueFn: hasValue,
    beneficiaryType,
  });

  // Export management
  const { exportPreviewOpen, exportFormat, exportFilename, exportColumnsForView, exportPreviewRows, downloadReport, setExportPreviewOpen, setExportFormat, setExportFilename, setExportColumns, exportColumns } = useReportExport({
    masterRows: filteredRows,
    rankedRows,
    summaryRows: rankedRows,
    graphRows,
    visibleColumns,
    currentEntityColumns,
    activeTab,
    beneficiaryType,
  });

  // Computed values
  const comparisonCohorts = useMemo(() => {
    if (!comparisonRequest) return [];
    return comparisonRequest.batches.map((batchName) => {
      const members = allRows.filter((row) => matchesEntityToken(row.group, comparisonRequest.group) && matchesEntityToken(row.batch, batchName) && row.initialBmiCategory !== 'Not recorded');
      const distribution = ['Underweight', 'Normal', 'Overweight', 'Obese'].map((category) => ({ category, count: members.filter((row) => row.initialBmiCategory === category).length }));
      return { name: batchName, members, distribution, total: members.length, underweight: members.filter((row) => row.initialBmiCategory === 'Underweight').length };
    });
  }, [allRows, comparisonRequest]);

  const summaryRows = useMemo(() => rankedRows, [rankedRows]);

  const compareCandidates = compareMode === 'Beneficiaries' ? filteredRows : compareMode === 'Checkups' ? filteredRows.filter((row) => row.type === 'Mothers') : rankedRows.filter((row) => row.type === (compareMode === 'Groups' ? 'Group' : 'Batch'));
  const displayedRows = activeTab === 'Ranked List' ? rankedRows : activeTab === 'Summary View' ? summaryRows : filteredRows;

  const openComparison = () => {
    if (compareMode === 'Checkups') {
      const selected = filteredRows.find((row, index) => compareIds.includes(getRowKey(row, index)));
      if (selected) showHistory(selected);
      return;
    }
    const selected = compareMode === 'Beneficiaries'
      ? filteredRows.filter((row, index) => compareIds.includes(getRowKey(row, index)))
      : compareCandidates.filter((row, index) => compareIds.includes(getRowKey(row, index)));
    if (selected.length === 2) {
      setComparison({ mode: compareMode, rows: selected });
      setCompareOpen(false);
    }
  };

  function showHistory(row) {
    const checkups = Array.isArray(row.source?.checkups) ? row.source.checkups.flat().filter((checkup) => checkup?.checkupDate).sort((a, b) => new Date(a.checkupDate) - new Date(b.checkupDate)) : [];
    if (checkups.length < 2) {
      setHistoryComparison({ name: row.name, checkups, message: 'At least two completed checkups are needed for a history comparison.' });
      return;
    }
    setHistoryComparison({ name: row.name, checkups: checkups.slice(-2) });
  }

  const toggleCompare = (rowKey) => setCompareIds((current) => current.includes(rowKey) ? current.filter((item) => item !== rowKey) : [...current, rowKey].slice(-2));

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel">
        <ProgressReportFilterBar
          activeFilterCount={activeFilterCount}
          showAllFilters={showAllFilters}
          setShowAllFilters={setShowAllFilters}
          school={school}
          setSchool={setSchool}
          group={group}
          setGroup={setGroup}
          batch={batch}
          setBatch={setBatch}
          schoolOptions={schoolOptions}
          groupOptions={groupOptions}
          batchOptions={batchOptions}
          search={search}
          setSearch={setSearch}
          searchFilters={searchFilters}
          beneficiaryType={beneficiaryType}
          setBeneficiaryType={setBeneficiaryType}
          comparisonRequest={comparisonRequest}
        />

        <ProgressReportToolbar
          activeTab={activeTab}
          tabs={REPORT_TABS}
          compareIds={compareIds}
          onTabChange={setActiveTab}
          onCompareClick={() => {
            setCompareMode(activeTab === 'Ranked List' ? 'Groups' : 'Beneficiaries');
            setCompareIds([]);
            setCompareOpen(true);
          }}
          onDownload={() => {
            setExportFilename(`progress-report-${beneficiaryType.toLowerCase()}`);
            setExportColumns(visibleColumns.length ? visibleColumns : exportColumnsForView.map((column) => column.id));
            setExportPreviewOpen(true);
          }}
          showAnalyzeMenu={showAnalyzeMenu}
          onAnalyzeToggle={() => setShowAnalyzeMenu((visible) => !visible)}
          onGenerateCohortReport={() => {
            setActiveTab('Summary View');
            setShowAnalyzeMenu(false);
          }}
          onDownloadSummary={() => {
            setShowAnalyzeMenu(false);
            setActiveTab('Summary View');
            downloadReport({ viewMode: 'Summary View', filename: `progress-summary-${beneficiaryType.toLowerCase()}` });
          }}
        />

        {comparisonRequest && <section className="comparison-dashboard" aria-label="Initial BMI batch comparison">
          <div className="comparison-dashboard-heading">
            <div><h2>Initial BMI by Batch</h2><p>Group {comparisonRequest.group}, mothers' first recorded assessment</p></div>
            <span className="analysis-badge">Initial assessment only</span>
          </div>
          <div className="comparison-cohorts">
            {comparisonCohorts.map((cohort) => <article key={cohort.name} className="comparison-cohort">
              <h3>Batch {cohort.name}</h3><strong>{cohort.total ? Math.round((cohort.underweight / cohort.total) * 100) : 0}%</strong><span>underweight ({cohort.underweight} of {cohort.total})</span>
              <div className="distribution-chart">{cohort.distribution.map((item) => <div key={item.category} className="distribution-row"><span>{item.category}</span><div><i style={{ width: `${cohort.total ? (item.count / cohort.total) * 100 : 0}%` }} /></div><b>{item.count}</b></div>)}</div>
              <button type="button" className="drilldown-btn" onClick={() => setUnderweightDrilldown(cohort)}>View underweight mothers</button>
            </article>)}
          </div>
        </section>}

        <div className="progress-report-table-wrap">
          <div className="progress-report-table-header">
            <span>Table ({beneficiaryType})</span>
            <div className="table-header-actions">
              <div className="columns-control">
                <button type="button" className="manage-columns-btn" onClick={() => setShowColumns((visible) => !visible)} aria-expanded={showColumns}>Manage Columns</button>
                {showColumns && (
                  <div className="columns-menu" data-entity={beneficiaryType}>
                    <div className="columns-search-wrap">
                      <input
                        type="text"
                        className="columns-search"
                        placeholder="Search fields..."
                        value={fieldSearch}
                        onChange={(event) => setFieldSearch(event.target.value)}
                      />
                    </div>
                    {filteredFieldOptions.length === 0 ? (
                      <div className="columns-empty-state">No matching fields</div>
                    ) : (
                      filteredFieldOptions.map(({ group, items }) => (
                        <div key={group} className="field-group">
                          <button
                            type="button"
                            className="field-group-toggle"
                            onClick={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
                          >
                            {group} <span>{expandedGroups[group] ? '▾' : '▸'}</span>
                          </button>
                          {expandedGroups[group] && (
                            <div className="field-group-list">
                              {items.map((column) => (
                                <label key={column.id} className="field-option">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(column.id)}
                                    onChange={() => setVisibleColumns((current) => current.includes(column.id) ? current.filter((id) => id !== column.id) : [...current, column.id])}
                                  />
                                  <span>{column.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div className="columns-actions-row">
                      <button type="button" className="ghost-btn" onClick={() => setVisibleColumns([])}>Reset to default</button>
                      <button type="button" className="primary-btn" onClick={() => setShowColumns(false)}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <span className="results-count">{loadingChildren ? 'Loading...' : `${filteredRows.length} results`}</span>
            </div>
          </div>
          {comparison && <div className="comparison-result"><strong>{comparison.mode} comparison</strong>{comparison.rows.map((row) => <span key={row.id}>{row.name}: {row.progress}% progress</span>)}<strong>Delta: {formatDelta(comparison.rows[1]?.progress, comparison.rows[0]?.progress)}</strong><button type="button" onClick={() => setComparison(null)}>Dismiss</button></div>}
          {activeTab === 'Graph View' ? <div className="progress-report-graph" aria-label="Progress distribution graph">
            {['0-25%', '26-50%', '51-75%', '76-100%'].map((range, index) => {
              const count = filteredRows.filter((row) => row.progress >= index * 25 && row.progress <= (index + 1) * 25).length;
              return <div key={range} className="graph-bar-row"><span>{range}</span><div><i style={{ width: `${filteredRows.length ? (count / filteredRows.length) * 100 : 0}%` }} /></div><strong>{count}</strong></div>;
            })}
          </div> : <ProgressReportTable activeTab={activeTab} displayedRows={displayedRows} compareIds={compareIds} toggleCompare={toggleCompare} showHistory={showHistory} visibleColumns={visibleColumns} columns={currentEntityColumns} />}
        </div>
      </div>
      <ProgressReportComparisonModal
        compareMode={compareMode}
        setCompareMode={(mode) => {
          setCompareMode(mode);
          setCompareIds([]);
        }}
        compareOpen={compareOpen}
        setCompareOpen={setCompareOpen}
        compareIds={compareIds}
        compareCandidates={compareCandidates}
        getRowKey={getRowKey}
        toggleCompare={toggleCompare}
        openComparison={openComparison}
      />
      {exportPreviewOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={() => setExportPreviewOpen(false)}>
          <div className="report-modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="export-title">Export Preview</h2>
            <p>Review the next 20 rows for the {activeTab.toLowerCase()} view, then choose the format and finalize the export.</p>

            <div className="export-modal-grid">
              <div className="export-settings-panel">
                <label className="export-field-label">
                  File name
                  <input type="text" value={exportFilename} onChange={(event) => setExportFilename(event.target.value || 'progress-report')} />
                </label>

                <div className="export-format-group">
                  <span>Format</span>
                  <div className="format-toggle">
                    {['CSV', 'JSON'].map((format) => (
                      <button
                        key={format}
                        type="button"
                        className={exportFormat === format ? 'active' : ''}
                        onClick={() => setExportFormat(format)}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-column-panel">
                  <span>Visible columns</span>
                  <div className="export-columns-list">
                    {exportColumnsForView.map((column) => (
                      <label key={column.id} className="field-option">
                        <input
                          type="checkbox"
                          checked={exportColumns.includes(column.id)}
                          onChange={() => setExportColumns((current) => current.includes(column.id) ? current.filter((item) => item !== column.id) : [...current, column.id])}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="export-preview-panel">
                <div className="preview-header-row">
                  <strong>Live preview</strong>
                  <span>{exportPreviewRows.length} rows</span>
                </div>
                <div className="export-preview-table">
                  <table>
                    <thead>
                      <tr>
                        {exportColumnsForView.filter((column) => exportColumns.includes(column.id)).map((column) => (
                          <th key={column.id}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exportPreviewRows.map((row, index) => (
                        <tr key={index}>
                          {exportColumnsForView.filter((column) => exportColumns.includes(column.id)).map((column) => (
                            <td key={`${index}-${column.id}`}>
                              {column.id === 'progress' ? `${row.progress}%` : column.id === 'share' ? `${row.share}%` : row[column.id] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="report-modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setExportPreviewOpen(false)}>Cancel</button>
              <button type="button" className="ghost-btn" onClick={() => {
                setExportPreviewOpen(false);
                downloadReport({
                  viewMode: activeTab,
                  format: 'CSV',
                  filename: exportFilename || 'progress-report',
                  selectedColumns: exportColumns,
                });
              }}>Quick CSV</button>
              <button type="button" className="primary-btn" onClick={() => {
                setExportPreviewOpen(false);
                downloadReport({
                  viewMode: activeTab,
                  format: exportFormat,
                  filename: exportFilename || 'progress-report',
                  selectedColumns: exportColumns,
                });
              }}>Download</button>
            </div>
          </div>
        </div>
      )}
      {historyComparison && <div className="report-modal-backdrop" role="presentation" onClick={() => setHistoryComparison(null)}><div className="report-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Checkup History: {historyComparison.name}</h2>{historyComparison.message ? <p>{historyComparison.message}</p> : <><div className="history-comparison">{historyComparison.checkups.map((checkup) => <div key={checkup.id || checkup.checkupDate}><strong>{formatDate(checkup.checkupDate)}</strong><span>Trimester: {checkup.trimester || 'Not recorded'}</span><span>Weight: {checkup.weight || 'Not recorded'}</span><span>Blood pressure: {checkup.bp || 'Not recorded'}</span><span>BMI: {checkup.bmi || 'Not recorded'}</span></div>)}</div><p className="history-delta">BMI change: {formatDelta(historyComparison.checkups[1]?.bmi, historyComparison.checkups[0]?.bmi)}</p></>}<div className="report-modal-actions"><button type="button" className="primary-btn" onClick={() => setHistoryComparison(null)}>Close</button></div></div></div>}
      {underweightDrilldown && <div className="report-modal-backdrop" role="presentation" onClick={() => setUnderweightDrilldown(null)}><div className="report-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Underweight mothers: Batch {underweightDrilldown.name}</h2><p>Group {comparisonRequest.group}, based on the first recorded BMI assessment.</p><div className="drilldown-list">{underweightDrilldown.members.filter((row) => row.initialBmiCategory === 'Underweight').map((row) => <div key={row.id}><strong>{row.name}</strong><span>{row.id}</span><small>Initial BMI: {row.initialBmi}</small></div>)}</div><div className="report-modal-actions"><button type="button" className="primary-btn" onClick={() => setUnderweightDrilldown(null)}>Close</button></div></div></div>}
    </div>
  );
}
