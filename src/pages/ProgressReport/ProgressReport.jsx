import React, { useEffect, useMemo, useState } from 'react';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import PageHeader from '../../components/ui/PageHeader';

const EMPTY_SELECTIONS = { schoolId: '', groupId: '', batchId: '' };
const REPORT_FIELDS = [
  ['school', 'School', 'Hierarchy'],
  ['group', 'Group', 'Hierarchy'],
  ['batch', 'Batch', 'Hierarchy'],
  ['mother', 'Mother Name', 'Identity'],
  ['child', 'Child Name', 'Identity'],
  ['age', 'Age', 'Identity'],
  ['gender', 'Sex', 'Identity'],
  ['dateOfBirth', 'Date of Birth', 'Identity'],
  ['contact', 'Contact Number', 'Identity'],
  ['status', 'Status', 'Health & Status'],
  ['risk', 'Risk Level', 'Health & Status'],
  ['program', 'Program', 'Health & Status'],
  ['deliveryType', 'Delivery Type', 'Health & Status'],
  ['weightForAge', 'Weight-for-Age', 'Growth & Monitoring'],
  ['heightForAge', 'Height-for-Age', 'Growth & Monitoring'],
  ['bmiForAge', 'BMI-for-Age', 'Growth & Monitoring'],
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
];
const DEFAULT_VISIBLE_FIELDS = ['school', 'group', 'batch', 'mother', 'child', 'weightForAge', 'heightForAge', 'bmiForAge', 'activitiesCompleted', 'totalActivities', 'progress'];
const GROWTH_METRICS = [
  ['weightForAge', 'Weight-for-Age', 'Latest recorded weight.'],
  ['heightForAge', 'Height-for-Age', 'Latest recorded height.'],
  ['bmiForAge', 'BMI-for-Age', 'Calculated from latest weight and height.'],
];
const REPORT_TABS = ['Community', 'Report Focus', 'Growth Metrics', 'Results'];
const REPORT_FOCUS_OPTIONS = [
  ['beneficiary-batch', 'Child in Batch', 'batch'],
  ['beneficiary-group', 'Child in Group', 'group'],
  ['beneficiary-school', 'Child in School', 'school'],
  ['batch-group', 'Batch in Group', 'group'],
  ['batch-school', 'Batch in School', 'school'],
  ['group-school', 'Group in School', 'school'],
];
const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const formatCellValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (['dateOfBirth', 'lastActivityDate', 'nextCheckupDate'].includes(field)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }
  return String(value);
};

export default function ProgressReport() {
  const [options, setOptions] = useState({ schools: [], groups: [], batches: [], mothers: [] });
  const [selection, setSelection] = useState(EMPTY_SELECTIONS);
  const [granularity, setGranularity] = useState('child');
  const [visibleFields, setVisibleFields] = useState(DEFAULT_VISIBLE_FIELDS);
  const [report, setReport] = useState(null);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState(null);
  const [sort, setSort] = useState({ key: 'school', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [reportFocus, setReportFocus] = useState('beneficiary-batch');
  const [growthMetrics, setGrowthMetrics] = useState(['weightForAge']);
  const [resultsView, setResultsView] = useState('graph');

  useEffect(() => {
    apiGetProgressReportOptions()
      .then(setOptions)
      .catch((loadError) => setError(loadError.message || 'Unable to load report options.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const displaySelection = finalizedSnapshot?.selection ?? selection;
  const displayVisibleFields = finalizedSnapshot?.visibleFields ?? visibleFields;
  const displayGranularity = finalizedSnapshot?.granularity ?? granularity;
  const displaySort = finalizedSnapshot?.sort ?? sort;
  const displayPage = finalizedSnapshot?.page ?? page;
  const activeReport = finalizedSnapshot?.report ?? report;
  const focusScope = selection.batchId ? 'batch' : selection.groupId ? 'group' : selection.schoolId ? 'school' : '';
  const focusOptions = REPORT_FOCUS_OPTIONS.filter(([, , scope]) => scope === focusScope);

  const groups = useMemo(() => options.groups.filter((item) => !selection.schoolId || String(item.schoolId) === String(selection.schoolId)), [options.groups, selection.schoolId]);
  const batches = useMemo(() => options.batches.filter((item) => {
    const matchesSchool = !selection.schoolId || String(item.schoolId) === String(selection.schoolId);
    if (!matchesSchool || !selection.groupId) return matchesSchool;
    return options.mothers.some((mother) => String(mother.groupId) === String(selection.groupId) && String(mother.batchId) === String(item.id));
  }), [options.batches, options.mothers, selection.groupId, selection.schoolId]);
  const updateSelection = (key, value) => {
    setPage(1);
    setError('');
    if (key === 'schoolId') {
      setSelection({ schoolId: value, groupId: '', batchId: '' });
      setFinalizedSnapshot(null);
      setActiveTab(1);
      setReportFocus('beneficiary-school');
    }
    else if (key === 'groupId') {
      setSelection((current) => ({ ...current, groupId: value, batchId: '' }));
      setReportFocus(value ? 'beneficiary-group' : 'beneficiary-school');
    } else {
      setSelection((current) => ({ ...current, [key]: value }));
      setReportFocus(value ? 'beneficiary-batch' : 'beneficiary-group');
    }
  };

  useEffect(() => {
    if (focusOptions.length && !focusOptions.some(([value]) => value === reportFocus)) {
      setReportFocus(focusOptions[0][0]);
    }
  }, [focusOptions, reportFocus]);

  const generateReport = async (nextPage = 1) => {
    if (!selection.schoolId) {
      setError('Please select at least a School to view the report.');
      return;
    }
    setLoadingReport(true);
    setError('');
    try {
      const result = await apiGetProgressReport({ ...selection, granularity, page: nextPage, perPage: 50 });
      setReport(result);
      setFinalizedSnapshot({
        report: result,
        selection: { ...selection },
        visibleFields: [...new Set([...visibleFields.filter((field) => !GROWTH_METRICS.some(([id]) => id === field)), ...growthMetrics])],
        granularity,
        sort: { ...sort },
        page: nextPage,
        reportFocus,
        growthMetrics: [...growthMetrics],
      });
      setPage(nextPage);
      setActiveTab(4);
    } catch (reportError) {
      setError(reportError.message || 'Unable to generate report.');
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const sortedRows = useMemo(() => {
    const rows = [...(activeReport?.rows || [])];
    return rows.sort((left, right) => {
      const a = left[displaySort.key] ?? '';
      const b = right[displaySort.key] ?? '';
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return displaySort.direction === 'asc' ? result : -result;
    });
  }, [activeReport, displaySort]);

  const breadcrumb = [
    'Home',
    displaySelection.schoolId ? options.schools.find((item) => String(item.id) === String(displaySelection.schoolId))?.name : 'Select School',
    displaySelection.schoolId ? (displaySelection.groupId ? groups.find((item) => String(item.id) === String(displaySelection.groupId))?.name : 'All Groups') : null,
    displaySelection.groupId ? (displaySelection.batchId ? batches.find((item) => String(item.id) === String(displaySelection.batchId))?.name : 'All Batches') : null,
  ].filter(Boolean);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortLabel = (label, key) => <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>{label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}</button>;

  const exportReport = async () => {
    if (!selection.schoolId) return;
    const result = activeReport || (await apiGetProgressReport({ ...selection, granularity, export: 1, perPage: 100 }));
    const lines = [
      `# ${breadcrumb.join(' > ')}`,
      `# Generated ${new Date().toISOString()}`,
      REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([, label]) => label).map(csvValue).join(','),
      ...result.rows.map((row) => REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => row[id]).map(csvValue).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${granularity}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedSchool = options.schools.find((item) => String(item.id) === String(displaySelection.schoolId));
  const resultsRows = sortedRows;
  const averageMetric = (field) => {
    const values = resultsRows.map((row) => Number(row[field])).filter(Number.isFinite);
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
  };
  const completedPercent = resultsRows.length
    ? Math.round(resultsRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / resultsRows.length)
    : 0;
  const canOpenTab = (tab) => tab === 1 || (tab === 2 && Boolean(selection.schoolId)) || (tab === 3 && Boolean(selection.schoolId)) || (tab === 4 && Boolean(activeReport));
  const goToTab = (tab) => {
    if (canOpenTab(tab)) setActiveTab(tab);
  };
  const resetSetup = () => {
    setSelection(EMPTY_SELECTIONS);
    setReport(null);
    setFinalizedSnapshot(null);
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
    setGrowthMetrics(['weightForAge']);
    setReportFocus('beneficiary-batch');
    setResultsView('graph');
    setActiveTab(1);
    setPage(1);
    setError('');
  };
  const selectGrowthMetric = (id) => setGrowthMetrics([id]);

  return (
    <div className="community-page progress-report-shell">
      <div className="progress-report-panel hierarchical-progress-report">
        <PageHeader title="Progress Report" breadcrumbs={[{ label: 'Reports' }, { label: 'Progress Report' }]} actions={<><button type="button" className="secondary-btn" onClick={resetSetup}>Reset Setup</button><button type="button" className="secondary-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button></>} />
        <div className="progress-report-tab-bar" role="tablist" aria-label="Progress report steps">
          {REPORT_TABS.map((tab, index) => { const number = index + 1; return <button key={tab} type="button" role="tab" aria-selected={activeTab === number} disabled={!canOpenTab(number)} className={activeTab === number ? 'active' : ''} onClick={() => goToTab(number)}><span>{number}</span>{tab}</button>; })}
        </div>

        <section className="progress-report-config" aria-label="Report parameters">
          {activeTab === 1 && <div className="progress-report-tab-panel"><h1>I. Community Selection</h1><div className="progress-report-config-grid"><label>School<select value={selection.schoolId} onChange={(event) => updateSelection('schoolId', event.target.value)}><option value="">Select school</option>{options.schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Group<select value={selection.groupId} onChange={(event) => updateSelection('groupId', event.target.value)} disabled={!selection.schoolId}><option value="">All groups</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Batch<select value={selection.batchId} onChange={(event) => updateSelection('batchId', event.target.value)} disabled={!selection.groupId}><option value="">All batches</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><p className="progress-report-note">Select a School to begin. Group and Batch are optional filters.</p><div className="progress-report-tab-actions"><button type="button" className="primary-btn" disabled={!selection.schoolId} onClick={() => setActiveTab(2)}>Next: Report Focus →</button></div></div>}
          {activeTab === 2 && <div className="progress-report-tab-panel"><h1>II. Report Focus</h1><fieldset className="progress-report-beneficiary-type"><legend>Beneficiary type</legend><label className="selected"><input type="radio" name="report-beneficiary-type" checked readOnly />Child</label><label className="static-option"><input type="radio" name="report-beneficiary-type" checked={false} disabled readOnly />Mother <span>Temporarily unavailable</span></label></fieldset><div className="progress-report-focus-section"><p>Choose the aggregation level for the selected community scope:</p>{!selection.schoolId ? <p className="progress-report-note">Select a school first to see valid focus options.</p> : <fieldset className="progress-report-focus-options">{focusOptions.map(([value, label]) => <label key={value}><input type="radio" name="report-focus" value={value} checked={reportFocus === value} onChange={() => setReportFocus(value)} />{label}</label>)}</fieldset>}</div><p className="progress-report-note">Mother level is not applicable for child growth metrics.</p><div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(1)}>← Previous</button><button type="button" className="primary-btn" disabled={!selection.schoolId} onClick={() => setActiveTab(3)}>Next: Growth Metrics →</button></div></div>}
          {activeTab === 3 && <div className="progress-report-tab-panel"><h1>III. Growth Metrics</h1><p>Choose one child growth indicator to display and export:</p><div className="growth-metric-cards">{GROWTH_METRICS.map(([id, label, description]) => <label key={id} className={growthMetrics.includes(id) ? 'selected' : ''}><input type="radio" name="growth-metric" checked={growthMetrics.includes(id)} onChange={() => selectGrowthMetric(id)} /><strong>{label}</strong><span>{description}</span></label>)}</div><p className="progress-report-note warning">This field reports the latest recorded measurement. It is not an age- and sex-standardized WHO z-score.</p><div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(2)}>← Previous</button><button type="button" className="primary-btn" onClick={() => generateReport(1)} disabled={loadingOptions || loadingReport || !selection.schoolId || !growthMetrics.length}>{loadingReport ? 'Generating...' : 'Generate Report →'}</button></div></div>}
          {activeTab === 4 && activeReport && <div className="progress-report-tab-panel results-tab-panel"><div className="progress-report-results-header"><div><h1>IV. Report Results</h1><p>{selectedSchool?.name || 'School'} &gt; {selection.groupId ? groups.find((item) => String(item.id) === String(selection.groupId))?.name : 'All Groups'} &gt; {selection.batchId ? batches.find((item) => String(item.id) === String(selection.batchId))?.name : 'All Batches'}</p></div><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div><div className="results-view-toggle"><button type="button" className={resultsView === 'table' ? 'active' : ''} onClick={() => setResultsView('table')}>Table View</button><button type="button" className={resultsView === 'graph' ? 'active' : ''} onClick={() => setResultsView('graph')}>Graph View</button></div>{resultsView === 'graph' ? <div className="growth-report-graphs">{growthMetrics.map((metric) => { const info = GROWTH_METRICS.find(([id]) => id === metric); return <article key={metric} className="growth-report-card"><h3>📈 {info?.[1]}</h3><div className="growth-report-value">{averageMetric(metric)}</div><p>Latest cohort average</p><div className="growth-report-bars">{resultsRows.slice(0, 12).map((row, index) => <span key={`${metric}-${row.child || row.mother}-${index}`} style={{ height: `${Math.min(100, Math.max(6, Number(row[metric] || 0) * (metric === 'bmiForAge' ? 3 : 1)))}%` }} title={`${row.child || row.mother}: ${formatCellValue(metric, row[metric])}`} />)}</div></article>; })}<article className="growth-report-card"><h3>🍩 Check-up Progress</h3><div className="growth-report-value">{completedPercent}%</div><p>{activeReport.pagination.total} beneficiaries · 48 check-ups per child</p><div className="progress-donut" style={{ '--progress': `${completedPercent}%` }} /></article></div> : <div className="progress-report-table-scroll"><table className="progress-report-flat-table"><thead><tr>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id, label]) => <th key={id}>{sortLabel(label, id)}</th>)}</tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.motherId}-${row.child || 'mother'}`}>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => <td key={id}>{id === 'child' && displayGranularity === 'mother' ? row.mother : id === 'progress' ? <strong>{row[id]}%</strong> : formatCellValue(id, row[id])}</td>)}</tr>)}</tbody></table></div>}{resultsView === 'table' && <div className="progress-report-pagination"><button type="button" onClick={() => generateReport(displayPage - 1)} disabled={displayPage <= 1 || loadingReport}>Previous</button><span>Page {displayPage} of {activeReport.pagination.totalPages}</span><button type="button" onClick={() => generateReport(displayPage + 1)} disabled={displayPage >= activeReport.pagination.totalPages || loadingReport}>Next</button></div>}<div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(3)}>← Previous</button><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    </div>
  );
}
