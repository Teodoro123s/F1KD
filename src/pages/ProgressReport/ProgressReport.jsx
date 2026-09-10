import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';

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
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
];
const DEFAULT_VISIBLE_FIELDS = ['school', 'group', 'batch', 'mother', 'child', 'activitiesCompleted', 'totalActivities', 'progress'];
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
  const [search, setSearch] = useState('');
  const [report, setReport] = useState(null);
  const [sort, setSort] = useState({ key: 'school', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetProgressReportOptions()
      .then(setOptions)
      .catch((loadError) => setError(loadError.message || 'Unable to load report options.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const groups = useMemo(() => options.groups.filter((item) => !selection.schoolId || String(item.schoolId) === String(selection.schoolId)), [options.groups, selection.schoolId]);
  const batches = useMemo(() => options.batches.filter((item) => (!selection.schoolId || String(item.schoolId) === String(selection.schoolId)) && (!selection.groupId || options.groups.some((group) => String(group.id) === String(selection.groupId) && (String(item.schoolId) === String(group.schoolId) || !item.schoolId)))), [options.batches, options.groups, selection.groupId, selection.schoolId]);
  const updateSelection = (key, value) => {
    setPage(1);
    setReport(null);
    setError('');
    if (key === 'schoolId') setSelection({ schoolId: value, groupId: '', batchId: '' });
    else if (key === 'groupId') setSelection((current) => ({ ...current, groupId: value, batchId: '' }));
    else setSelection((current) => ({ ...current, [key]: value }));
  };

  const generateReport = async (nextPage = 1) => {
    if (!selection.schoolId) {
      setError('Please select at least a School to view the report.');
      return;
    }
    setLoadingReport(true);
    setError('');
    try {
      const result = await apiGetProgressReport({ ...selection, granularity, search, page: nextPage, perPage: 50 });
      setReport(result);
      setPage(nextPage);
    } catch (reportError) {
      setError(reportError.message || 'Unable to generate report.');
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const sortedRows = useMemo(() => {
    const rows = [...(report?.rows || [])];
    return rows.sort((left, right) => {
      const a = left[sort.key] ?? '';
      const b = right[sort.key] ?? '';
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [report?.rows, sort]);

  const breadcrumb = [
    'Home',
    selection.schoolId ? options.schools.find((item) => String(item.id) === String(selection.schoolId))?.name : 'Select School',
    selection.schoolId ? (selection.groupId ? groups.find((item) => String(item.id) === String(selection.groupId))?.name : 'All Groups') : null,
    selection.groupId ? (selection.batchId ? batches.find((item) => String(item.id) === String(selection.batchId))?.name : 'All Batches') : null,
  ].filter(Boolean);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortLabel = (label, key) => <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>{label} {sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</button>;

  const exportReport = async () => {
    if (!selection.schoolId) return;
    const result = await apiGetProgressReport({ ...selection, granularity, search, export: 1, perPage: 100 });
    const lines = [
      `# ${breadcrumb.join(' > ')}`,
      `# Generated ${new Date().toISOString()}`,
      REPORT_FIELDS.filter(([id]) => visibleFields.includes(id)).map(([, label]) => label).map(csvValue).join(','),
      ...result.rows.map((row) => REPORT_FIELDS.filter(([id]) => visibleFields.includes(id)).map(([id]) => row[id]).map(csvValue).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${granularity}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel hierarchical-progress-report">
        <PageHeader title="Progress Report" breadcrumbs={[{ label: 'Progress Report' }]} />
        <div className="progress-report-breadcrumb" aria-label="Report location">{breadcrumb.map((item, index) => <React.Fragment key={`${item}-${index}`}><span>{item}</span>{index < breadcrumb.length - 1 && <b>›</b>}</React.Fragment>)}</div>

        <section className="progress-report-config" aria-label="Report parameters">
          <div className="progress-report-config-header">
            <div><h1>Report setup</h1><p>Select a school and the fields you want to review.</p></div>
          </div>
          <div className="progress-report-step-list">
            <section className="progress-report-step">
              <div className="progress-report-step-marker">1</div>
              <div className="progress-report-step-content">
                <h2>Community</h2><p>Choose a school, group, or batch.</p>
                <div className="progress-report-config-grid">
                  <label>School<select value={selection.schoolId} onChange={(event) => updateSelection('schoolId', event.target.value)}><option value="">Select school</option>{options.schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label>Group<select value={selection.groupId} onChange={(event) => updateSelection('groupId', event.target.value)} disabled={!selection.schoolId}><option value="">All groups</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label>Batch<select value={selection.batchId} onChange={(event) => updateSelection('batchId', event.target.value)} disabled={!selection.groupId}><option value="">All batches</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                </div>
              </div>
            </section>
            <section className="progress-report-step">
              <div className="progress-report-step-marker">2</div>
              <div className="progress-report-step-content">
                <h2>Beneficiary</h2><p>Choose the report level and search if needed.</p>
                <div className="progress-report-config-row">
                  <fieldset><legend>Report level</legend><label><input type="radio" checked={granularity === 'child'} onChange={() => setGranularity('child')} /> Child level</label><label><input type="radio" checked={granularity === 'mother'} onChange={() => setGranularity('mother')} /> Mother level</label></fieldset>
                  <label className="progress-report-search-field">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Beneficiary name or ID" /></label>
                </div>
              </div>
            </section>
            <section className="progress-report-step">
              <div className="progress-report-step-marker">3</div>
              <div className="progress-report-step-content">
                <div className="progress-report-step-title-row"><div><h2>Report fields</h2><p>Choose the fields to display and export.</p></div><button type="button" className="secondary-btn" onClick={() => setVisibleFields(DEFAULT_VISIBLE_FIELDS)}>Reset columns</button></div>
                <div className="progress-report-fields-groups">{[...new Set(REPORT_FIELDS.map(([, , category]) => category))].map((category) => <div className="progress-report-field-group" key={category}><h3>{category}</h3><div className="progress-report-fields-grid">{REPORT_FIELDS.filter(([, , fieldCategory]) => fieldCategory === category).map(([id, label]) => <label key={id}><input type="checkbox" checked={visibleFields.includes(id)} onChange={() => setVisibleFields((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id])} />{label}</label>)}</div></div>)}</div>
              </div>
            </section>
          </div>
          <div className="progress-report-config-actions">
            <button type="button" className="primary-btn" onClick={() => generateReport(1)} disabled={loadingOptions || loadingReport || !selection.schoolId}>{loadingReport ? 'Generating...' : 'Generate Report'}</button>
            <button type="button" className="secondary-btn" onClick={() => { setSelection(EMPTY_SELECTIONS); setSearch(''); setReport(null); setError(''); }}>Reset Filters</button>
          </div>
          {!selection.schoolId && <p className="progress-report-helper">Please select at least a School to view the report.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>

        {report && <>
          <section className="progress-report-results">
            <div className="progress-report-results-header"><div><h2>{granularity === 'child' ? 'Child-level report' : 'Mother-level report'}</h2><p>{report.pagination.total} matching records · {breadcrumb.join(' > ')}</p></div><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div>
            {sortedRows.length ? <div className="progress-report-table-scroll"><table className="progress-report-flat-table"><thead><tr>{REPORT_FIELDS.filter(([id]) => visibleFields.includes(id)).map(([id, label]) => <th key={id}>{sortLabel(label, id)}</th>)}</tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.motherId}-${row.child || 'mother'}`}>{REPORT_FIELDS.filter(([id]) => visibleFields.includes(id)).map(([id]) => <td key={id}>{id === 'child' && granularity === 'mother' ? row.mother : id === 'progress' ? <strong>{row[id]}%</strong> : formatCellValue(id, row[id])}</td>)}</tr>)}</tbody></table></div> : <div className="progress-report-empty">No children found for the selected filters.</div>}
            <div className="progress-report-pagination"><button type="button" onClick={() => generateReport(page - 1)} disabled={page <= 1 || loadingReport}>Previous</button><span>Page {page} of {report.pagination.totalPages}</span><button type="button" onClick={() => generateReport(page + 1)} disabled={page >= report.pagination.totalPages || loadingReport}>Next</button></div>
          </section>
        </>}
      </div>
    </div>
  );
}
