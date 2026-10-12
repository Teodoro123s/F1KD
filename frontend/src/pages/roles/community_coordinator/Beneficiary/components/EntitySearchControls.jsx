import React, { useEffect, useRef, useState } from 'react';
import { FilterIcon, SearchIcon } from '../BeneficiaryIcons';

export default function EntitySearchControls({
  selectedEntityFilter,
  query,
  onEntityToggle,
  onEntityChange,
  onQueryChange,
  groups = [],
  batches = [],
  selectedGroupId = '',
  selectedBatchId = '',
  onGroupChange,
  onBatchChange,
}) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const filterMenuRef = useRef(null);

  useEffect(() => {
    if (!moreFiltersOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!filterMenuRef.current?.contains(event.target)) {
        setMoreFiltersOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMoreFiltersOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreFiltersOpen]);

  const hasMoreFilters = Boolean(selectedGroupId || selectedBatchId);
  const activeFilterCount = Number(Boolean(selectedGroupId)) + Number(Boolean(selectedBatchId));

  return (
    <div className="beneficiary-search-controls">
      <select
        className="entity-filter-btn"
        value={selectedEntityFilter}
        onChange={(event) => {
          if (onEntityChange) onEntityChange(event.target.value);
          else if (onEntityToggle) onEntityToggle();
        }}
        aria-label="Filter beneficiaries by type"
      >
        <option value="Mother">Mother</option>
        <option value="Child">Child</option>
      </select>
      <div className="beneficiary-more-filters" ref={filterMenuRef}>
        <button
          type="button"
          className={`beneficiary-more-filters__toggle${hasMoreFilters ? ' is-active' : ''}`}
          aria-expanded={moreFiltersOpen}
          aria-controls="beneficiary-more-filters-panel"
          onClick={() => setMoreFiltersOpen((open) => !open)}
        >
          <FilterIcon />
          <span>More filters</span>
          {hasMoreFilters && <span className="beneficiary-more-filters__count">{activeFilterCount}</span>}
        </button>
        {moreFiltersOpen && (
          <div className="beneficiary-more-filters__panel" id="beneficiary-more-filters-panel">
            <label className="beneficiary-more-filters__field">
              <span>Group</span>
              <select
                className="entity-filter-btn"
                value={selectedGroupId}
                onChange={(event) => onGroupChange?.(event.target.value)}
                aria-label="Filter beneficiaries by group"
              >
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <label className="beneficiary-more-filters__field">
              <span>Batch</span>
              <select
                className="entity-filter-btn"
                value={selectedBatchId}
                onChange={(event) => onBatchChange?.(event.target.value)}
                aria-label="Filter beneficiaries by batch"
                disabled={!selectedGroupId}
              >
                <option value="">{selectedGroupId ? 'All batches' : 'Select group first'}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
      <div className="search-container">
        <div className="search-field-container">
          <SearchIcon />
          <input
            id="beneficiary-search"
            name="beneficiarySearch"
            type="text"
            className="search-input-field"
            placeholder={selectedEntityFilter === 'Mother' ? 'Search mother/community...' : 'Search child name...'}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search items"
          />
        </div>
      </div>
    </div>
  );
}
