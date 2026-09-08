/**
 * ProgressReport
 *
 * Presentation-layer component for the progress dashboard. It is intentionally
 * kept thin: view state and export orchestration live here,
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
import PageHeader from '../../components/ui/PageHeader';
import { useMothers } from '../../context/MothersContext';
import { useAuth } from '../../auth/AuthProvider';
import { AsyncContainer } from '../../components/AsyncContainer';
import ProgressReportTable from './ProgressReportTable';
import ProgressReportToolbar from './components/ProgressReportToolbar';
import ProgressReportFilterBar from './components/ProgressReportFilterBar';
import {
  REPORT_TABS,
  SEARCH_FILTER_RULES,
  formatDate,
  getDefaultVisibleColumns,
  getFieldGroups,
  getReportColumnsForEntity,
  hasValue,
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
  const [rankedBy, setRankedBy] = useState('progress');
  const [rankDirection, setRankDirection] = useState('desc');
  const [graphType, setGraphType] = useState('bars');
  const [graphGroupBy, setGraphGroupBy] = useState('progress');
  const [graphField, setGraphField] = useState('progress');

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

  const rankOptions = useMemo(() => {
    const excluded = new Set(['name', 'group', 'batch', 'community', 'trend']);
    const numericFields = new Set(['age', 'gestationalAge', 'prenatalWeight', 'prenatalHeight', 'fundalHeight', 'fhr', 'weight', 'height', 'bmi', 'gravida', 'para', 'abortion', 'stillbirth', 'pediatricWeek', 'zScore']);
    const options = currentEntityColumns.filter((column) => (
      visibleColumns.includes(column.id)
      && !excluded.has(column.id)
      && column.id !== 'progress'
      && numericFields.has(column.id)
    ));
    return [{ id: 'progress', label: 'Progress %' }, ...options.map((column) => ({ id: column.id, label: column.label }))];
  }, [currentEntityColumns, visibleColumns]);

  React.useEffect(() => {
    if (!rankOptions.some((option) => option.id === rankedBy)) setRankedBy('progress');
  }, [rankOptions, rankedBy]);

  // Data fetching
  const { allRows, rankedRows, graphRows, loadingData } = useReportData({
    beneficiaryType,
    mothers,
    refreshMothers,
    visibleColumns,
    currentEntityColumns,
    defaultVisibleColumns,
    normalizeMotherFn: normalizeMother,
    normalizeChildFn: normalizeChild,
    getFieldGroupsFn: getFieldGroups,
    rankedBy,
    rankDirection,
  });

  // Filter management
  const { school, setSchool, group, setGroup, batch, setBatch, search, setSearch, showAllFilters, setShowAllFilters, searchFilters, filteredRows, activeFilterCount, schoolOptions, groupOptions, batchOptions } = useProgressFilters({
    allRows,
    searchFilterRules: SEARCH_FILTER_RULES,
    hasValueFn: hasValue,
    beneficiaryType,
  });

  // Export management
  const { exportPreviewOpen, exportFormat, exportFilename, exportColumnsForView, exportPreviewRows, downloadReport, setExportPreviewOpen, setExportFormat, setExportFilename, setExportColumns, exportColumns } = useReportExport({
    masterRows: filteredRows,
    rankedRows,
    graphRows,
    visibleColumns,
    currentEntityColumns,
    activeTab,
    beneficiaryType,
  });

  // Computed values
  const progressOverview = useMemo(() => {
    const total = filteredRows.length;
    const average = total
      ? Math.round(filteredRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / total)
      : 0;
    return {
      total,
      average,
      complete: filteredRows.filter((row) => Number(row.progress) >= 100).length,
      inProgress: filteredRows.filter((row) => Number(row.progress) > 0 && Number(row.progress) < 100).length,
      notStarted: filteredRows.filter((row) => Number(row.progress) <= 0).length,
    };
  }, [filteredRows]);

  const graphFieldOptions = useMemo(() => {
    const available = currentEntityColumns.filter((column) => visibleColumns.includes(column.id) && column.id !== 'name');
    return available.length ? available.map((column) => ({ id: column.id, label: column.label })) : [{ id: 'progress', label: 'Progress %' }];
  }, [currentEntityColumns, visibleColumns]);

  React.useEffect(() => {
    if (!graphFieldOptions.some((option) => option.id === graphField)) setGraphField('progress');
  }, [graphField, graphFieldOptions]);

  const numericGraphFields = new Set(['age', 'gestationalAge', 'prenatalWeight', 'prenatalHeight', 'fundalHeight', 'fhr', 'weight', 'height', 'bmi', 'gravida', 'para', 'abortion', 'stillbirth', 'pediatricWeek', 'zScore', 'progress']);

  const graphSeries = useMemo(() => {
    const numericField = numericGraphFields.has(graphField);
    if (graphGroupBy === 'progress') {
      if (graphField === 'progress') return graphRows.map((item) => ({ label: item.range, value: item.count, share: item.share }));
      const values = new Map();
      filteredRows.forEach((row) => {
        const rawValue = row[graphField];
        const label = rawValue === '' || rawValue === null || rawValue === undefined ? 'Not recorded' : String(rawValue);
        const entry = values.get(label) || { label, total: 0, count: 0 };
        entry.total += Number(rawValue) || 0;
        entry.count += 1;
        values.set(label, entry);
      });
      return [...values.values()].map((entry) => ({ label: entry.label, value: numericField ? Math.round(entry.total / entry.count) : entry.count, share: (entry.count / Math.max(filteredRows.length, 1)) * 100 })).sort((a, b) => b.value - a.value).slice(0, 8);
    }
    const groups = new Map();
    filteredRows.forEach((row) => {
      const label = row[graphGroupBy] || `Unassigned ${graphGroupBy}`;
      const entry = groups.get(label) || { label, total: 0, count: 0 };
      entry.total += numericField ? Number(row[graphField] || 0) : 1;
      entry.count += 1;
      groups.set(label, entry);
    });
    return [...groups.values()]
      .map((entry) => ({ label: entry.label, value: numericField ? Math.round(entry.total / entry.count) : entry.count, share: (entry.count / Math.max(filteredRows.length, 1)) * 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredRows, graphField, graphGroupBy, graphRows]);

  const statusSeries = useMemo(() => [
    { label: 'Completed', value: progressOverview.complete, color: '#0f766e' },
    { label: 'In progress', value: progressOverview.inProgress, color: '#3b82f6' },
    { label: 'Not started', value: progressOverview.notStarted, color: '#cbd5e1' },
  ], [progressOverview]);

  const pieSeries = useMemo(() => {
    if (graphGroupBy === 'progress') return statusSeries;
    const colors = ['#0f766e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b', '#ec4899'];
    return graphSeries.map((item, index) => ({ label: item.label, value: Math.round((item.share / 100) * progressOverview.total), color: colors[index % colors.length] }));
  }, [graphGroupBy, graphSeries, progressOverview.total, statusSeries]);

  const displayedRows = activeTab === 'Ranked by' ? rankedRows : filteredRows;

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel">
        <PageHeader
          title="Progress Report"
          breadcrumbs={[{ label: 'Progress Report' }]}
        />
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
        />

        <ProgressReportToolbar
          activeTab={activeTab}
          tabs={REPORT_TABS}
          onTabChange={setActiveTab}
          onDownload={() => {
            setExportFilename(`progress-report-${beneficiaryType.toLowerCase()}`);
            setExportColumns(visibleColumns.length ? visibleColumns : exportColumnsForView.map((column) => column.id));
            setExportPreviewOpen(true);
          }}
          rankedBy={rankedBy}
          rankOptions={rankOptions}
          onRankedByChange={setRankedBy}
          rankDirection={rankDirection}
          onRankDirectionChange={setRankDirection}
        />

        <div className="progress-report-table-wrap">
          <div className="progress-report-table-header">
            <span>{activeTab === 'Graph View' ? 'Progress distribution' : `${activeTab} (${beneficiaryType})`}</span>
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
              <span className="results-count">{loadingData ? 'Loading...' : `${filteredRows.length} results`}</span>
            </div>
          </div>
          {activeTab === 'Graph View' ? (
            <AsyncContainer
              loading={loadingData}
              empty={filteredRows.length === 0 && !loadingData}
              emptyTitle="No beneficiaries match the current filters"
              emptyDescription="Try clearing a filter or adjusting the search terms to broaden the list."
            >
              <div className="progress-report-graph" aria-label="Progress distribution graph">
                <div className="progress-overview-cards">
                  <div><span>Total records</span><strong>{progressOverview.total}</strong></div>
                  <div><span>Average progress</span><strong>{progressOverview.average}%</strong></div>
                  <div><span>Completed</span><strong>{progressOverview.complete}</strong></div>
                  <div><span>In progress</span><strong>{progressOverview.inProgress}</strong></div>
                  <div><span>Not started</span><strong>{progressOverview.notStarted}</strong></div>
                </div>
                <div className="graph-controls" aria-label="Graph controls">
                  <label>Chart type<select value={graphType} onChange={(event) => setGraphType(event.target.value)}><option value="bars">Bar chart</option><option value="line">Line chart</option><option value="pie">Pie chart</option></select></label>
                  <label>Graph field<select value={graphField} onChange={(event) => setGraphField(event.target.value)}>{graphFieldOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                  <label>Group data<select value={graphGroupBy} onChange={(event) => setGraphGroupBy(event.target.value)}><option value="progress">Progress ranges</option><option value="community">Communities</option><option value="group">Groups</option><option value="batch">Batches</option></select></label>
                </div>
                {graphType === 'pie' ? (
                  <div className="pie-chart-layout">
                    <div className="progress-pie-chart" style={{ background: `conic-gradient(${pieSeries.map((item, index) => `${item.color} ${pieSeries.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) / Math.max(progressOverview.total, 1) * 100}% ${pieSeries.slice(0, index + 1).reduce((sum, previous) => sum + previous.value, 0) / Math.max(progressOverview.total, 1) * 100}%`).join(', ')})` }} aria-label="Progress grouping pie chart" />
                    <div className="graph-legend">{pieSeries.map((item) => <div key={item.label}><i style={{ background: item.color }} /> <span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
                  </div>
                ) : graphType === 'line' ? (
                  <div className="line-chart-wrap"><svg className="progress-line-chart" viewBox="0 0 760 260" role="img" aria-label="Average progress line chart"><line x1="48" y1="220" x2="740" y2="220" /><line x1="48" y1="30" x2="48" y2="220" /><polyline points={graphSeries.map((item, index) => `${48 + (index * 692 / Math.max(graphSeries.length - 1, 1))},${220 - (item.value * 1.9)}`).join(' ')} />{graphSeries.map((item, index) => { const x = 48 + (index * 692 / Math.max(graphSeries.length - 1, 1)); const y = 220 - (item.value * 1.9); return <g key={item.label}><circle cx={x} cy={y} r="5" /><text x={x} y="244" textAnchor="middle">{String(item.label).slice(0, 12)}</text><text x={x} y={y - 10} textAnchor="middle">{item.value}%</text></g>; })}</svg></div>
                ) : (
                  <div className="graph-bars" role="list" aria-label="Records by progress range">
                    {graphSeries.map((item) => <div key={item.label} className="graph-bar-row" role="listitem"><span>{item.label}</span><div className="graph-bar-track"><i style={{ width: `${numericGraphFields.has(graphField) && graphGroupBy !== 'progress' ? item.value : item.share}%` }} /></div><strong>{numericGraphFields.has(graphField) && graphGroupBy !== 'progress' ? `${item.value}%` : item.value} <small>{Math.round(item.share)}%</small></strong></div>)}
                  </div>
                )}
              </div>
            </AsyncContainer>
          ) : (
            <AsyncContainer
              loading={loadingData}
              empty={displayedRows.length === 0 && !loadingData}
              emptyTitle="No records found"
              emptyDescription="There are no matching rows for the current view. Adjust the filters or change the tab to continue."
            >
              <ProgressReportTable activeTab={activeTab} displayedRows={displayedRows} visibleColumns={visibleColumns} columns={currentEntityColumns} />
            </AsyncContainer>
          )}
        </div>
      </div>
      {exportPreviewOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={() => setExportPreviewOpen(false)}>
          <div className="report-modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="export-title">Export Preview</h2>
            <p>Review the next 20 rows for the {activeTab.toLowerCase()} view, then choose the format and finalize the export.</p>

            <div className="export-modal-grid">
              <div className="export-settings-panel">
                <label className="export-field-label">
                  File name
                  <input id="export-filename" name="exportFilename" type="text" value={exportFilename} onChange={(event) => setExportFilename(event.target.value || 'progress-report')} />
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
                          id={`export-column-${column.id}`}
                          name="exportColumns"
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
    </div>
  );
}
