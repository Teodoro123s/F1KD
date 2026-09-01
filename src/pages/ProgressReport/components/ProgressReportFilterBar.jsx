import React from 'react';

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
  return (
    <>
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
        {activeFilterCount === 0 && (
          <span className="active-filters-empty">No active filters. Use the search bar or dropdowns to narrow results.</span>
        )}
        <div className={`active-filter-strip ${showAllFilters ? 'expanded' : ''}`}>
          {comparisonRequest && (
            <span className="chip analysis-chip">
              <small>Analysis</small> Initial BMI: {comparisonRequest.group}, Batches {comparisonRequest.batches.join(' / ')}
            </span>
          )}
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
          {beneficiaryType !== 'Mothers' && (
            <span className="chip context-chip neutral">
              <small>Toggle</small> Type: {beneficiaryType}
            </span>
          )}
        </div>
        {activeFilterCount > 3 && (
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowAllFilters((visible) => !visible)}
            aria-expanded={showAllFilters}
          >
            {showAllFilters ? 'Show less' : `+${activeFilterCount - 3} more`}
          </button>
        )}
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
    </>
  );
}
