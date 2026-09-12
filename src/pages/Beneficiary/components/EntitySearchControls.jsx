import React from 'react';
import { SearchIcon } from '../BeneficiaryIcons';

export default function EntitySearchControls({
  selectedEntityFilter,
  query,
  onEntityToggle,
  onEntityChange,
  onQueryChange,
}) {
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
