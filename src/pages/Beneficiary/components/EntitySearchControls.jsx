import React from 'react';
export default function EntitySearchControls({
  selectedEntityFilter,
  communities = [],
  selectedCommunity = '',
  onCommunityChange,
  query,
  onEntityToggle,
  onEntityChange,
  showEntityFilter = true,
  showSearch = true,
  onQueryChange,
}) {
  return (
    <div className="beneficiary-search-controls">
      {showEntityFilter && (
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
      )}
      {communities.length > 0 && onCommunityChange && (
        <select
          className="entity-filter-btn"
          value={selectedCommunity}
          onChange={(event) => onCommunityChange(event.target.value)}
          aria-label="Filter beneficiaries by community"
        >
          <option value="">All communities</option>
          {communities.map((community) => <option key={community.id || community.name} value={community.name}>{community.name}</option>)}
        </select>
      )}
      {showSearch && onQueryChange && (
        <div className="search-container">
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
      )}
    </div>
  );
}
