import React, { useMemo, useState } from 'react';

const TABLE_DATA = [
  { id: 'INF-1042', name: 'Marial Santos', trimester: '2nd Trimester', assessment: 'Oct 12, 2023', progress: 75, trend: 'up' },
  { id: 'INF-1018', name: 'Elena Reyes', trimester: '3rd Trimester', assessment: 'Oct 12, 2023', progress: 15, trend: 'down' },
  { id: 'INF-1102', name: 'Juana Diaz Cruz', trimester: '1st Trimester', assessment: 'Oct 12, 2023', progress: 45, trend: 'up' },
  { id: 'INF-1145', name: 'Carren Garcia', trimester: '2nd Trimester', assessment: 'Oct 14, 2023', progress: 82, trend: 'up' },
];

const REPORT_TABS = ['Master List', 'Ranked List', 'Graph View'];
const ADVANCED_FILTERS = [
  { id: 'risk', label: 'Risk: High' },
  { id: 'trimester', label: 'Trimester: 2nd' },
  { id: 'progress', label: 'Progress: 0-25%' },
  { id: 'assessment', label: 'Assessment: Overdue' },
];

export default function ProgressReport() {
  const [activeTab, setActiveTab] = useState('Master List');
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('School A');
  const [group, setGroup] = useState('Group All');
  const [batch, setBatch] = useState('Batch All');
  const [beneficiaryType, setBeneficiaryType] = useState('Mothers');
  const [removedFilters, setRemovedFilters] = useState([]);
  const [showAllFilters, setShowAllFilters] = useState(false);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return TABLE_DATA;

    return TABLE_DATA.filter((row) =>
      [row.name, row.id, row.trimester, row.assessment].join(' ').toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel">
        <div className="progress-report-header-row">
          <div className="progress-report-title-wrap">
            <h1>Progress Report</h1>
            <p>Analytical overview of beneficiary advancement.</p>
          </div>

          <div className="progress-report-context-selectors">
            <select value={school} onChange={(event) => { setSchool(event.target.value); setRemovedFilters((filters) => filters.filter((id) => id !== 'school')); }} aria-label="School scope">
              <option>School</option>
              <option>School A</option>
              <option>School B</option>
            </select>
            <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group scope">
              <option>Group</option>
              <option>Group All</option>
              <option>Group 1</option>
            </select>
            <select value={batch} onChange={(event) => { setBatch(event.target.value); setRemovedFilters((filters) => filters.filter((id) => id !== 'batch')); }} aria-label="Batch scope">
              <option>Batch</option>
              <option>Batch All</option>
              <option>Batch 1</option>
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
            <button type="button" className="ghost-btn">Compare</button>
            <button type="button" className="primary-btn">Download</button>
          </div>
        </div>

        <div className="progress-report-search-box">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setRemovedFilters((filters) => filters.filter((id) => id !== 'search')); }}
            placeholder="Search by beneficiary name or ID..."
          />
        </div>

        <div className="progress-report-filters" aria-label="Active report filters">
          <span className="active-filters-label">Active Filters:</span>
          <div className={`active-filter-strip ${showAllFilters ? 'expanded' : ''}`}>
            {!removedFilters.includes('school') && school !== 'School' && (
              <button type="button" className="chip danger" onClick={() => { setSchool('School'); setRemovedFilters((filters) => [...filters, 'school']); }}>
                <small>Dropdown</small> School: {school.replace('School ', '')} ×
              </button>
            )}
            {!removedFilters.includes('batch') && batch !== 'Batch' && batch !== 'Batch All' && (
              <button type="button" className="chip neutral" onClick={() => { setBatch('Batch'); setRemovedFilters((filters) => [...filters, 'batch']); }}>
                <small>Dropdown</small> Batch: {batch.replace('Batch ', '')} ×
              </button>
            )}
            {!removedFilters.includes('search') && search.trim() && (
              <button type="button" className="chip search-chip" onClick={() => setSearch('')}>
                <small>Search</small> “{search.trim()}” ×
              </button>
            )}
            {ADVANCED_FILTERS.map((filter) => !removedFilters.includes(filter.id) && (
              <button key={filter.id} type="button" className="chip advanced" onClick={() => setRemovedFilters((filters) => [...filters, filter.id])}>
                <small>Advanced</small> {filter.label} ×
              </button>
            ))}
          </div>
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowAllFilters((visible) => !visible)}
            aria-expanded={showAllFilters}
          >
            {showAllFilters ? 'Show less' : 'Show all filters'}
          </button>
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
            <span>Table (Mothers/Children)</span>
            <button type="button" className="manage-columns-btn">Manage Columns</button>
          </div>

          <table className="progress-report-table">
            <thead>
              <tr>
                <th>Beneficiary Name</th>
                <th>ID</th>
                <th>Trimester</th>
                <th>Last Assessment</th>
                <th>Progress %</th>
                <th>Trend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="beneficiary-cell">
                    <span className="avatar-dot" aria-hidden="true" />
                    <span>{row.name}</span>
                  </td>
                  <td>{row.id}</td>
                  <td>{row.trimester}</td>
                  <td>{row.assessment}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="mini-progress-track"><span style={{ width: `${row.progress}%` }} /></div>
                      <strong>{row.progress}%</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`trend-badge ${row.trend === 'up' ? 'up' : 'down'}`}>
                      {row.trend === 'up' ? '↗' : '↘'}
                    </span>
                  </td>
                  <td className="action-cell">⋮</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
