import React from 'react';

const QUICK_ADVANCED_FILTERS = [
  { key: 'high-risk', label: 'High Risk', value: 'high risk' },
  { key: 'underweight', label: 'Underweight', value: 'underweight' },
  { key: 'missing-consent', label: 'Missing Consent', value: 'missing consent' },
  { key: 'missing-birth-cert', label: 'Missing Birth Cert', value: 'missing birth certificate' },
  { key: 'progress-low', label: 'Progress 0-25%', value: 'progress 0-25%' },
];

export default function ProgressReportFilterBar({
  activeFilterCount,
  showAllFilters,
  setShowAllFilters,
  school,
  setSchool,
  group,
  setGroup,
  batch,
  setBatch,
  schoolOptions,
  groupOptions,
  batchOptions,
  search,
  setSearch,
  searchFilters,
  beneficiaryType,
  setBeneficiaryType,
  comparisonRequest,
}) {
  const applyQuickFilter = (value) => {
    const trimmed = value.trim();
    setSearch((currentQuery) => {
      const nextQuery = (currentQuery || '').trim();
      if (!nextQuery) return trimmed;
      if (nextQuery.toLowerCase().includes(trimmed.toLowerCase())) return nextQuery;
      return `${nextQuery} ${trimmed}`.trim();
    });
  };

  return (
    <>
      <div className="progress-report-header-row">
        <div className="progress-report-title-wrap">
          <h1>Progress Report</h1>
          <p>Analytical overview of beneficiary advancement.</p>
        </div>

        <div className="progress-report-context-selectors">
          <label className="filter-select-wrap">
            <span className="filter-select-icon">📍</span>
            <select value={school} onChange={(event) => setSchool(event.target.value)} aria-label="School scope">
              {schoolOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="filter-select-wrap">
            <span className="filter-select-icon">👥</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group scope">
              {groupOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="filter-select-wrap">
            <span className="filter-select-icon">📅</span>
            <select value={batch} onChange={(event) => setBatch(event.target.value)} aria-label="Batch scope">
              {batchOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="progress-report-search-box">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by beneficiary name, ID, program, or keyword... (leave blank to see all records)"
          autoComplete="on"
          list="progress-search-suggestions"
        />
        <datalist id="progress-search-suggestions">
          <option value="High Risk" />
          <option value="Underweight" />
          <option value="Missing Consent" />
          <option value="Missing Birth Certificate" />
          <option value="Dental done" />
          <option value="Progress 0-25%" />
        </datalist>
      </div>

      <div className="progress-report-filters" aria-label="Active report filters">
        <div className="active-filters-header">
          <span className="active-filters-label">Active Filters</span>
          {activeFilterCount > 0 && (
            <button type="button" className="clear-filters-btn" onClick={() => {
              setSchool('All Schools');
              setGroup('All Groups');
              setBatch('All Batches');
              setSearch('');
            }}>
              Clear All
            </button>
          )}
        </div>

        <div className={`active-filter-strip ${showAllFilters ? 'expanded' : ''}`}>
          {comparisonRequest && (
            <span className="chip analysis-chip">
              <small>Analysis</small> Initial BMI: {comparisonRequest.group}, Batches {comparisonRequest.batches.join(' / ')}
            </span>
          )}
          {school !== 'All Schools' && (
            <button type="button" className="chip context-chip danger" onClick={() => setSchool('All Schools')}>
              <small>📍</small> School: {school} ×
            </button>
          )}
          {group !== 'All Groups' && (
            <button type="button" className="chip context-chip neutral" onClick={() => setGroup('All Groups')}>
              <small>👥</small> Group: {group} ×
            </button>
          )}
          {batch !== 'All Batches' && (
            <button type="button" className="chip context-chip neutral" onClick={() => setBatch('All Batches')}>
              <small>📅</small> Batch: {batch} ×
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
          {beneficiaryType !== 'Mothers' && (
            <span className="chip context-chip neutral">
              <small>Type</small> {beneficiaryType}
            </span>
          )}
        </div>

        <div className="advanced-filters-row">
          <button type="button" className="advanced-toggle" onClick={() => setShowAllFilters((visible) => !visible)} aria-expanded={showAllFilters}>
            {showAllFilters ? 'Advanced ▲' : 'Advanced ▼'}
          </button>
          {activeFilterCount > 3 && (
            <button type="button" className="filter-toggle" onClick={() => setShowAllFilters((visible) => !visible)} aria-expanded={showAllFilters}>
              {showAllFilters ? 'Show less' : `+${activeFilterCount - 3} more`}
            </button>
          )}
        </div>

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

        {showAllFilters && (
          <div className="advanced-filter-panel" aria-label="Advanced filters">
            {QUICK_ADVANCED_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="chip advanced-chip"
                onClick={() => applyQuickFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
