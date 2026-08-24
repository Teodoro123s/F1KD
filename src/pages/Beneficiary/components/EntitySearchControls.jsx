import React from 'react';
import { SearchIcon, FilterIcon } from '../BeneficiaryIcons';

export default function EntitySearchControls({
  selectedEntityFilter,
  query,
  onEntityToggle,
  onQueryChange,
}) {
  return (
    <div className="search-container">
      <button
        type="button"
        className="entity-filter-btn"
        onClick={onEntityToggle}
        aria-label="Toggle search scope"
      >
        <FilterIcon />
        <span className="filter-label">{selectedEntityFilter}</span>
        <span className="caret">▾</span>
      </button>
      <div className="search-field-container">
        <SearchIcon />
        <input
          type="text"
          className="search-input-field"
          placeholder={selectedEntityFilter === 'Mother' ? 'Search mother/community...' : 'Search child name...'}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Search items"
        />
      </div>
    </div>
  );
}
