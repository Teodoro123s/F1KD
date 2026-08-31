import React, { useEffect, useMemo, useState } from 'react';
import { useMothers } from '../../context/MothersContext';
import { apiGetChildren } from '../../api/children';

const REPORT_COLUMNS = [
  { id: 'name', label: 'Beneficiary Name' },
  { id: 'id', label: 'ID' },
  { id: 'trimester', label: 'Trimester' },
  { id: 'assessment', label: 'Last Assessment' },
  { id: 'progress', label: 'Progress %' },
  { id: 'trend', label: 'Trend' },
];

const REPORT_TABS = ['Master List', 'Ranked List', 'Graph View'];
const SEARCH_FILTER_RULES = [
  { id: 'risk', pattern: /\bhigh risk\b/i, label: 'Risk: High' },
  { id: 'trimester', pattern: /\b(1st|2nd|3rd) trimester\b/i, getLabel: (match) => `Trimester: ${match[1]}` },
  { id: 'progress', pattern: /\bprogress\s+(0\s*[-to]+\s*25|26\s*[-to]+\s*50|51\s*[-to]+\s*75|76\s*[-to]+\s*100)\s*%?/i, getLabel: (match) => `Progress: ${match[1].replace(/\s+/g, '')}%` },
  { id: 'bmi', pattern: /\b(underweight|normal|overweight|obese)\b/i, getLabel: (match) => `BMI: ${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}` },
  { id: 'birth-cert', pattern: /\bmissing birth cert(?:ificate)?\b/i, label: 'Missing: Birth Cert' },
  { id: 'consent', pattern: /\bmissing consent\b/i, label: 'Missing: Consent' },
  { id: 'vaccine', pattern: /\bmissing (TT[1-5])\b/i, getLabel: (match) => `Vaccine: ${match[1].toUpperCase()} Missing` },
  { id: 'dental', pattern: /\bdental done\b/i, label: 'Dental: Completed' },
  { id: 'gpa', pattern: /\bprimigravida\b/i, label: 'Gravida: 1' },
];

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
const formatDelta = (current, previous) => {
  const delta = Number(current) - Number(previous);
  return Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${delta}%` : 'No comparable value';
};
const fullName = (item) => item.name || [item.firstName || item.first_name, item.middleName || item.middle_name, item.lastName || item.last_name].filter(Boolean).join(' ') || 'Unnamed beneficiary';
const hasValue = (value) => value !== undefined && value !== null && value !== '';

function normalizeMother(mother) {
  const completed = Array.isArray(mother.checkups) ? mother.checkups.flat().filter(Boolean).length : 0;
  const progress = Number.isFinite(Number(mother.progress)) ? Number(mother.progress) : Math.round((completed / 9) * 100);
  return { id: mother.motherId || mother.id, name: fullName(mother), trimester: mother.trimester || 'Not recorded', assessment: formatDate(mother.prenatalRegDate || mother.createdAt), progress, trend: progress >= 50 ? 'up' : 'down', school: mother.community || mother.area || '', group: mother.group || '', batch: mother.batch || '', risk: mother.isHighRisk === 'Yes', bmi: mother.bmi || '', birthCert: hasValue(mother.birthCertificateDocumentName), consent: hasValue(mother.consentDocumentName), dental: hasValue(mother.dentalCheckupDate), tt: [mother.tt1Date, mother.tt2Date, mother.tt3Date, mother.tt4Date, mother.tt5Date], type: 'Mothers', source: mother };
}

function normalizeChild(child) {
  const progress = Math.min(100, Math.round(((child.completedWeeks || []).length / 48) * 100));
  return { id: child.child_code || child.id, name: fullName(child), trimester: 'Pedia', assessment: formatDate(child.created_at), progress, trend: progress >= 50 ? 'up' : 'down', school: child.community_name || child.community || '', group: child.group_name || child.group || '', batch: child.batch_name || child.batch || '', risk: false, type: 'Children', source: child };
}

export default function ProgressReport() {
  const { mothers } = useMothers();
  const [activeTab, setActiveTab] = useState('Master List');
  const [search, setSearch] = useState('');
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [school, setSchool] = useState('All Schools');
  const [group, setGroup] = useState('All Groups');
  const [batch, setBatch] = useState('All Batches');
  const [beneficiaryType, setBeneficiaryType] = useState('Mothers');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState('Beneficiaries');
  const [comparison, setComparison] = useState(null);
  const [historyComparison, setHistoryComparison] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(REPORT_COLUMNS.map((column) => column.id));
  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingChildren(true);
    apiGetChildren()
      .then((payload) => { if (active) setChildren(Array.isArray(payload) ? payload : payload?.children || []); })
      .catch(() => { if (active) setChildren([]); })
      .finally(() => { if (active) setLoadingChildren(false); });
    return () => { active = false; };
  }, []);

  const allRows = useMemo(() => (beneficiaryType === 'Mothers' ? mothers.map(normalizeMother) : children.map(normalizeChild)), [beneficiaryType, children, mothers]);

  const searchFilters = useMemo(() => SEARCH_FILTER_RULES.flatMap((rule) => {
    const match = search.match(rule.pattern);
    if (!match) return [];
    return [{ id: `search-${rule.id}`, label: rule.getLabel ? rule.getLabel(match) : rule.label, pattern: rule.pattern }];
  }), [search]);

  const activeFilterCount = [
    school !== 'All Schools',
    group !== 'All Groups',
    batch !== 'All Batches',
    ...searchFilters.map(() => true),
    beneficiaryType !== 'Mothers',
  ].filter(Boolean).length;

  const filteredRows = useMemo(() => allRows.filter((row) => {
    const query = search.toLowerCase();
    const remainingQuery = SEARCH_FILTER_RULES.reduce((value, rule) => value.replace(rule.pattern, ''), query).replace(/\s{2,}/g, ' ').trim();
    const textMatch = !remainingQuery || [row.name, row.id, row.trimester, row.school, row.group, row.batch].join(' ').toLowerCase().includes(remainingQuery);
    const scopeMatch = (school === 'All Schools' || row.school === school) && (group === 'All Groups' || row.group === group) && (batch === 'All Batches' || row.batch === batch);
    const parsedMatch = searchFilters.every((filter) => {
      if (filter.id === 'search-risk') return row.risk;
      if (filter.id === 'search-trimester') return row.trimester.toLowerCase().includes(filter.label.split(': ')[1].toLowerCase());
      if (filter.id === 'search-progress') return row.progress <= 25;
      if (filter.id === 'search-bmi') return String(row.bmi).toLowerCase().includes(filter.label.split(': ')[1].toLowerCase());
      if (filter.id === 'search-birth-cert') return !row.birthCert;
      if (filter.id === 'search-consent') return !row.consent;
      if (filter.id === 'search-vaccine') return row.tt?.some((date) => !hasValue(date));
      if (filter.id === 'search-dental') return row.dental;
      if (filter.id === 'search-gpa') return Number(row.source?.gravida) === 1;
      return true;
    });
    return textMatch && scopeMatch && parsedMatch;
  }), [allRows, batch, group, school, search, searchFilters]);

  const schoolOptions = useMemo(() => ['All Schools', ...new Set(allRows.map((row) => row.school).filter(Boolean))], [allRows]);
  const schoolRows = useMemo(() => school === 'All Schools' ? allRows : allRows.filter((row) => row.school === school), [allRows, school]);
  const groupOptions = useMemo(() => ['All Groups', ...new Set(schoolRows.map((row) => row.group).filter(Boolean))], [schoolRows]);
  const groupRows = useMemo(() => group === 'All Groups' ? schoolRows : schoolRows.filter((row) => row.group === group), [group, schoolRows]);
  const batchOptions = useMemo(() => ['All Batches', ...new Set(groupRows.map((row) => row.batch).filter(Boolean))], [groupRows]);

  const rankedRows = useMemo(() => {
    const aggregate = (field, label) => Object.entries(filteredRows.reduce((groups, row) => {
      const key = row[field] || `Unassigned ${label}`;
      groups[key] = groups[key] || [];
      groups[key].push(row);
      return groups;
    }, {})).map(([name, rows]) => ({
      id: `${label}-${name}`,
      name: `${label}: ${name}`,
      idLabel: `${rows.length} beneficiaries`,
      trimester: label,
      assessment: 'Current cohort',
      progress: Math.round(rows.reduce((total, row) => total + row.progress, 0) / rows.length),
      trend: rows.filter((row) => row.trend === 'up').length >= rows.length / 2 ? 'up' : 'down',
      memberIds: rows.map((row) => row.id),
      type: label,
    }));
    return [...aggregate('group', 'Group'), ...aggregate('batch', 'Batch')];
  }, [filteredRows]);

  const compareCandidates = compareMode === 'Beneficiaries' ? filteredRows : compareMode === 'Checkups' ? filteredRows.filter((row) => row.type === 'Mothers') : rankedRows.filter((row) => row.type === (compareMode === 'Groups' ? 'Group' : 'Batch'));
  const displayedRows = activeTab === 'Ranked List' ? rankedRows : filteredRows;

  const openComparison = () => {
    if (compareMode === 'Checkups') {
      const selected = filteredRows.find((row) => compareIds.includes(row.id));
      if (selected) showHistory(selected);
      return;
    }
    const selected = compareMode === 'Beneficiaries' ? filteredRows.filter((row) => compareIds.includes(row.id)) : compareCandidates.filter((row) => compareIds.includes(row.id));
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

  useEffect(() => {
    if (!schoolOptions.includes(school)) setSchool('All Schools');
  }, [school, schoolOptions]);

  useEffect(() => {
    if (!groupOptions.includes(group)) setGroup('All Groups');
  }, [group, groupOptions]);

  useEffect(() => {
    if (!batchOptions.includes(batch)) setBatch('All Batches');
  }, [batch, batchOptions]);

  const downloadReport = () => {
    const columns = REPORT_COLUMNS.filter((column) => visibleColumns.includes(column.id));
    const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [columns.map((column) => csvValue(column.label)).join(',')];
    filteredRows.forEach((row) => lines.push(columns.map((column) => csvValue(column.id === 'progress' ? `${row.progress}%` : column.id === 'name' ? row.name : column.id === 'id' ? row.id : column.id === 'trimester' ? row.trimester : column.id === 'assessment' ? row.assessment : column.id === 'trend' ? row.trend : '')).join(',')));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    link.download = `progress-report-${beneficiaryType.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const toggleCompare = (id) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-2));

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel">
        <div className="progress-report-header-row">
          <div className="progress-report-title-wrap">
            <h1>Progress Report</h1>
            <p>Analytical overview of beneficiary advancement.</p>
          </div>

          <div className="progress-report-context-selectors">
            <select value={school} onChange={(event) => setSchool(event.target.value)} aria-label="School scope">
              {schoolOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group scope">
              {groupOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={batch} onChange={(event) => setBatch(event.target.value)} aria-label="Batch scope">
              {batchOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="progress-report-toolbar">
          <div className="progress-report-tabs" role="tablist" aria-label="Progress report views">
            {REPORT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="progress-report-toolbar-actions">
            <button type="button" className={`ghost-btn ${compareIds.length ? 'selected' : ''}`} onClick={() => { setCompareMode(activeTab === 'Ranked List' ? 'Groups' : 'Beneficiaries'); setCompareIds([]); setCompareOpen(true); }}>Compare{compareIds.length ? ` (${compareIds.length})` : ''}</button>
            <button type="button" className="primary-btn" onClick={downloadReport}>Download CSV</button>
          </div>
        </div>

        <div className="progress-report-search-box">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by beneficiary name or ID..."
          />
        </div>

        <div className="progress-report-filters" aria-label="Active report filters">
          <span className="active-filters-label">Active Filters:</span>
          {activeFilterCount === 0 && <span className="active-filters-empty">No active filters. Use the search bar or dropdowns to narrow results.</span>}
          <div className={`active-filter-strip ${showAllFilters ? 'expanded' : ''}`}>
            {school !== 'All Schools' && (
              <button type="button" className="chip context-chip danger" onClick={() => setSchool('All Schools')}>
                <small>Dropdown</small> School: {school} ×
              </button>
            )}
            {group !== 'All Groups' && (
              <button type="button" className="chip context-chip neutral" onClick={() => setGroup('All Groups')}>
                <small>Dropdown</small> Group: {group} ×
              </button>
            )}
            {batch !== 'All Batches' && (
              <button type="button" className="chip context-chip neutral" onClick={() => setBatch('All Batches')}>
                <small>Dropdown</small> Batch: {batch} ×
              </button>
            )}
            {searchFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="chip search-chip"
                onClick={() => {
                  setSearch((query) => query.replace(filter.pattern, '').replace(/\s{2,}/g, ' ').trim());
                }}
              >
                <small>Search</small> {filter.label} ×
              </button>
            ))}
            {beneficiaryType !== 'Mothers' && <span className="chip context-chip neutral"><small>Toggle</small> Type: {beneficiaryType}</span>}
          </div>
          {activeFilterCount > 3 && <button type="button" className="filter-toggle" onClick={() => setShowAllFilters((visible) => !visible)} aria-expanded={showAllFilters}>
            {showAllFilters ? 'Show less' : `+${activeFilterCount - 3} more`}
          </button>}
          <div className="beneficiary-type-toggle" role="group" aria-label="Beneficiary type">
            {['Mothers', 'Children'].map((type) => (
              <button
                key={type}
                type="button"
                className={beneficiaryType === type ? 'active' : ''}
                onClick={() => setBeneficiaryType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="progress-report-alert">
          <span className="alert-icon">!</span>
          <span><strong>Insight Alert:</strong> 12 beneficiaries stuck at 0% progress for 2 weeks. Review cases.</span>
        </div>

        <div className="progress-report-table-wrap">
          <div className="progress-report-table-header">
            <span>Table ({beneficiaryType})</span>
            <div className="table-header-actions">
              <div className="columns-control">
                <button type="button" className="manage-columns-btn" onClick={() => setShowColumns((visible) => !visible)} aria-expanded={showColumns}>Manage Columns</button>
                {showColumns && <div className="columns-menu">
                  {REPORT_COLUMNS.map((column) => <label key={column.id}><input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => setVisibleColumns((current) => current.includes(column.id) ? current.filter((id) => id !== column.id) : [...current, column.id])} /> {column.label}</label>)}
                </div>}
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
          </div> : <table className="progress-report-table">
            <thead>
              <tr>
                <th aria-label="Compare" />
                {activeTab === 'Ranked List' ? <><th>Entity</th><th>Type</th><th>Members</th><th>Progress %</th><th>Trend</th></> : REPORT_COLUMNS.filter((column) => visibleColumns.includes(column.id)).map((column) => <th key={column.id}>{column.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={compareIds.includes(row.id)} onChange={() => toggleCompare(row.id)} aria-label={`Compare ${row.name}`} /></td>
                  {activeTab === 'Ranked List' ? <><td className="beneficiary-cell">{row.name}</td><td>{row.type}</td><td>{row.idLabel}</td><td>{row.progress}%</td><td><span className={`trend-badge ${row.trend}`}>{row.trend === 'up' ? '↗' : '↘'}</span></td></> : REPORT_COLUMNS.filter((column) => visibleColumns.includes(column.id)).map((column) => <td key={column.id} className={column.id === 'name' ? 'beneficiary-cell' : ''}>
                    {column.id === 'name' && <span className="avatar-dot" aria-hidden="true" />}
                    {column.id === 'name' ? row.name : column.id === 'progress' ? <div className="progress-cell"><div className="mini-progress-track"><span style={{ width: `${row.progress}%` }} /></div><strong>{row.progress}%</strong></div> : column.id === 'trend' ? <span className={`trend-badge ${row.trend}`}>{row.trend === 'up' ? '↗' : '↘'}</span> : row[column.id]}
                  </td>)}
                  <td className="action-cell">{row.type === 'Mothers' && <button type="button" className="history-btn" onClick={() => showHistory(row)}>History</button>} ⋮</td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </div>
      {compareOpen && <div className="report-modal-backdrop" role="presentation" onClick={() => setCompareOpen(false)}>
        <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title" onClick={(event) => event.stopPropagation()}>
          <h2 id="compare-title">What would you like to compare?</h2>
          <p>Choose two items from the current report view.</p>
          <div className="compare-mode-options">{['Beneficiaries', 'Groups', 'Batches', 'Checkups'].map((mode) => <button key={mode} type="button" className={compareMode === mode ? 'active' : ''} onClick={() => { setCompareMode(mode); setCompareIds([]); }}>{mode}</button>)}</div>
          <div className="compare-candidates">{compareCandidates.map((row) => <label key={row.id}><input type="checkbox" checked={compareIds.includes(row.id)} onChange={() => toggleCompare(row.id)} /> <span>{row.name}</span><small>{row.progress}% progress</small></label>)}</div>
          {compareMode === 'Checkups' && <p className="compare-help">Select one mother, then Compare to view the two latest checkups.</p>}
          <div className="report-modal-actions"><button type="button" className="ghost-btn" onClick={() => setCompareOpen(false)}>Cancel</button><button type="button" className="primary-btn" disabled={compareMode === 'Checkups' ? compareIds.length !== 1 : compareIds.length !== 2} onClick={openComparison}>{compareMode === 'Checkups' ? 'Compare History' : 'Compare Selected'}</button></div>
        </div>
      </div>}
      {historyComparison && <div className="report-modal-backdrop" role="presentation" onClick={() => setHistoryComparison(null)}><div className="report-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Checkup History: {historyComparison.name}</h2>{historyComparison.message ? <p>{historyComparison.message}</p> : <><div className="history-comparison">{historyComparison.checkups.map((checkup) => <div key={checkup.id || checkup.checkupDate}><strong>{formatDate(checkup.checkupDate)}</strong><span>Trimester: {checkup.trimester || 'Not recorded'}</span><span>Weight: {checkup.weight || 'Not recorded'}</span><span>Blood pressure: {checkup.bp || 'Not recorded'}</span><span>BMI: {checkup.bmi || 'Not recorded'}</span></div>)}</div><p className="history-delta">BMI change: {formatDelta(historyComparison.checkups[1]?.bmi, historyComparison.checkups[0]?.bmi)}</p></>}<div className="report-modal-actions"><button type="button" className="primary-btn" onClick={() => setHistoryComparison(null)}>Close</button></div></div></div>}
    </div>
  );
}
