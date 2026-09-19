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
  ['pediatricAgeWeeks', 'Pedia Age (weeks)', 'Identity'],
  ['gender', 'Sex', 'Identity'],
  ['dateOfBirth', 'Date of Birth', 'Identity'],
  ['contact', 'Contact Number', 'Identity'],
  ['status', 'Status', 'Health & Status'],
  ['risk', 'Risk Level', 'Health & Status'],
  ['program', 'Program', 'Health & Status'],
  ['deliveryType', 'Delivery Type', 'Health & Status'],
  ['weightForAge', 'Weight (kg)', 'Growth & Monitoring'],
  ['heightForAge', 'Height (cm)', 'Growth & Monitoring'],
  ['bmiForAge', 'BMI', 'Growth & Monitoring'],
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
  ['measurementDate', 'Measurement Date', 'Monitoring'],
];
const DEFAULT_VISIBLE_FIELDS = ['school', 'group', 'batch', 'mother', 'child', 'pediatricAgeWeeks', 'weightForAge', 'heightForAge', 'bmiForAge', 'activitiesCompleted', 'totalActivities', 'progress'];
const GROWTH_METRICS = [
  ['weightForAge', 'Weight (kg)', 'Latest weight recorded by Child Monitoring.'],
  ['heightForAge', 'Height (cm)', 'Latest height recorded by Child Monitoring.'],
  ['bmiForAge', 'BMI', 'Calculated from the latest monitored weight and height.'],
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
  if (['dateOfBirth', 'lastActivityDate', 'nextCheckupDate', 'measurementDate'].includes(field)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }
  return String(value);
};

const chartDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

const getPointValue = (point, metric) => {
  const direct = point?.[metric];
  if (Number.isFinite(Number(direct))) return Number(direct);
  const aliases = {
    weightForAge: point?.weight,
    heightForAge: point?.height,
    bmiForAge: point?.bmi,
  };
  const aliasValue = aliases[metric];
  return Number.isFinite(Number(aliasValue)) ? Number(aliasValue) : null;
};

function GrowthChart({ rows, metric, chartType, displayMonths = 'all' }) {
  const values = rows
    .map((row) => ({ row, value: Number(row[metric]) }))
    .filter(({ value }) => Number.isFinite(value));
  const maxValue = Math.max(...values.map(({ value }) => value), 1);
  const points = values.slice(0, 20);

  if (!points.length) return <p className="growth-report-empty">No monitored measurements available.</p>;

  if (chartType === 'pie') {
    const total = points.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
    let offset = 0;
    const segments = points.map(({ row, value }, index) => {
      const start = offset;
      offset += (Math.max(0, value) / total) * 100;
      return <span key={`${row.child || row.mother}-${index}`} className="growth-report-pie-segment" style={{ '--start': `${start}%`, '--end': `${offset}%`, '--segment-color': `hsl(${index * 47 % 360} 62% 42%)` }} title={`${row.child || row.mother}: ${value} (${chartDate(row.measurementDate)})`} />;
    });
    return <div className="growth-report-pie-wrap"><div className="growth-report-pie">{segments}</div><div className="growth-report-legend">{points.map(({ row, value }, index) => <span key={`${row.child || row.mother}-legend-${index}`}><i style={{ background: `hsl(${index * 47 % 360} 62% 42%)` }} />{row.child || row.mother}: {value} · {chartDate(row.measurementDate)}</span>)}</div></div>;
  }

  if (chartType === 'line') {
    const width = 720;
    const height = 220;
    const seriesRows = rows.filter((row) => row.growthSeries?.some((point) => Number.isFinite(getPointValue(point, metric))));
    if (!seriesRows.length) return <p className="growth-report-empty">No monitored measurements available.</p>;

    const monthKey = (dateValue) => {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return null;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    const monthLabel = (monthKeyValue) => {
      if (!monthKeyValue) return 'Unknown';
      const [year, month] = monthKeyValue.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };

    const allMonthDates = [...new Set(seriesRows.flatMap((row) => row.growthSeries
      .filter((point) => Number.isFinite(getPointValue(point, metric)))
      .map((point) => monthKey(point.date))
      .filter(Boolean)))].sort((left, right) => left.localeCompare(right));

    const normalizedDisplayMonths = String(displayMonths ?? 'all').toLowerCase();
    const requestedMonths = Number(normalizedDisplayMonths);
    const visibleMonthDates = normalizedDisplayMonths === 'all' || !Number.isFinite(requestedMonths) || requestedMonths <= 0 || requestedMonths >= allMonthDates.length
      ? allMonthDates
      : allMonthDates.slice(-requestedMonths);
    const visibleMonthSet = new Set(visibleMonthDates);
    const visibleSeriesRows = seriesRows
      .map((row) => ({ ...row, visibleGrowthSeries: row.growthSeries.filter((point) => visibleMonthSet.has(monthKey(point.date)) && Number.isFinite(getPointValue(point, metric))) }))
      .filter((row) => row.visibleGrowthSeries.length);

    const lineMax = Math.max(...visibleSeriesRows.flatMap((row) => row.visibleGrowthSeries.map((point) => getPointValue(point, metric))), 1);
    const chartPaddingX = 44;
    const xForMonth = (month) => {
      if (visibleMonthDates.length <= 1) return width / 2;
      const index = visibleMonthDates.indexOf(month);
      const usableWidth = width - (chartPaddingX * 2);
      return chartPaddingX + (index / (visibleMonthDates.length - 1)) * usableWidth;
    };
    const yForValue = (value) => height - (value / lineMax) * (height - 24) - 12;
    const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: lineMax * ratio,
      y: yForValue(lineMax * ratio),
    }));

    if (!visibleSeriesRows.length) return <p className="growth-report-empty">No monitored measurements available for the selected period.</p>;

    const periodLabel = normalizedDisplayMonths === 'all' ? 'all available months' : `the last ${requestedMonths} months`;
    const metricLabel = GROWTH_METRICS.find(([id]) => id === metric)?.[1] || metric;
    return <div className="growth-report-line-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Child growth measurements over ${periodLabel}`} preserveAspectRatio="none"><text className="growth-report-y-axis-label" x="14" y={height / 2} textAnchor="middle" transform={`rotate(-90 14 ${height / 2})`}>{metricLabel}</text>{yAxisTicks.map(({ value, y }) => <g key={value}><line className="growth-report-gridline" x1={chartPaddingX} x2={width} y1={y} y2={y} /><text className="growth-report-y-axis-tick" x={chartPaddingX - 6} y={y + 4} textAnchor="end">{value.toFixed(1)}</text></g>)}{visibleSeriesRows.map((row, rowIndex) => { const series = row.visibleGrowthSeries; const color = `hsl(${rowIndex * 67 % 360} 62% 42%)`; const linePoints = series.map((point) => { const month = monthKey(point.date); const value = getPointValue(point, metric); return `${xForMonth(month)},${yForValue(value)}`; }).join(' '); return <g key={`${row.child || row.mother}-line`}><polyline points={linePoints} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{series.map((point, pointIndex) => { const month = monthKey(point.date); const value = getPointValue(point, metric); return <circle key={`${row.child || row.mother}-point-${pointIndex}`} cx={xForMonth(month)} cy={yForValue(value)} r="4" fill="#fff" stroke={color} strokeWidth="2"><title>{row.child || row.mother}: {value} · {chartDate(point.date)}</title></circle>; })}</g>; })}</svg><div className="growth-report-line-labels">{visibleMonthDates.map((month) => <span key={month}>{monthLabel(month)}</span>)}</div><div className="growth-report-legend">{visibleSeriesRows.map((row, index) => <span key={`${row.child || row.mother}-line-legend`}><i style={{ background: `hsl(${index * 67 % 360} 62% 42%)` }} />{row.child || row.mother}</span>)}</div></div>;
  }

  return <div className="growth-report-bars growth-report-bars-chart">{points.map(({ row, value }, index) => <div className="growth-report-bar-item" key={`${row.child || row.mother}-${index}`}><strong>{value}</strong><span style={{ '--bar-height': `${Math.max(6, (value / maxValue) * 100)}%` }} title={`${row.child || row.mother}: ${value} · ${chartDate(row.measurementDate)}`} /><small>{row.child || row.mother}</small><small>{chartDate(row.measurementDate)}</small></div>)}</div>;
}

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
  const [displayMonths, setDisplayMonths] = useState('all');

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
  const graphRows = resultsRows.filter((row) => growthMetrics.some((metric) => Number.isFinite(Number(row[metric])) && Number(row[metric]) > 0));
  const averageMetric = (field, rows = resultsRows) => {
    const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value) && value > 0);
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
    setDisplayMonths('all');
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
          {activeTab === 4 && activeReport && <div className="progress-report-tab-panel results-tab-panel"><div className="progress-report-results-header"><div><h1>IV. Report Results</h1><p>{selectedSchool?.name || 'School'} &gt; {selection.groupId ? groups.find((item) => String(item.id) === String(selection.groupId))?.name : 'All Groups'} &gt; {selection.batchId ? batches.find((item) => String(item.id) === String(selection.batchId))?.name : 'All Batches'}</p></div><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div><div className="results-view-toggle"><button type="button" className={resultsView === 'table' ? 'active' : ''} onClick={() => setResultsView('table')}>Table View</button><button type="button" className={resultsView === 'graph' ? 'active' : ''} onClick={() => setResultsView('graph')}>Graph View</button>{resultsView === 'graph' && <div className="graph-controls"><label className="report-chart-select">Display<select value={displayMonths} onChange={(event) => setDisplayMonths(event.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="9">9 months</option><option value="12">12 months</option><option value="all">All months</option></select></label></div>}</div>{resultsView === 'graph' ? <article className="growth-report-card growth-report-single-card"><h3>📈 {GROWTH_METRICS.find(([id]) => id === growthMetrics[0])?.[1]}</h3><div className="growth-report-value">{averageMetric(growthMetrics[0], graphRows)}</div><p>Latest monitored measurements · line dates use check-up date</p><GrowthChart rows={graphRows} metric={growthMetrics[0]} chartType="line" displayMonths={displayMonths} /></article> : <div className="progress-report-table-scroll"><table className="progress-report-flat-table"><thead><tr>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id, label]) => <th key={id}>{sortLabel(label, id)}</th>)}</tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.motherId}-${row.child || 'mother'}`}>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => <td key={id}>{id === 'child' && displayGranularity === 'mother' ? row.mother : id === 'progress' ? <strong>{row[id]}%</strong> : formatCellValue(id, row[id])}</td>)}</tr>)}</tbody></table></div>}{resultsView === 'table' && <div className="progress-report-pagination"><button type="button" onClick={() => generateReport(displayPage - 1)} disabled={displayPage <= 1 || loadingReport}>Previous</button><span>Page {displayPage} of {activeReport.pagination.totalPages}</span><button type="button" onClick={() => generateReport(displayPage + 1)} disabled={displayPage >= activeReport.pagination.totalPages || loadingReport}>Next</button></div>}<div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(3)}>← Previous</button><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    </div>
  );
}
