import React from 'react';

export default function CommunityFilters({ activeTab, query, onClearQuery }) {
  const hasQuery = Boolean(String(query || '').trim());

  const tabLabel =
    activeTab === 'communities'
      ? 'School'
      : activeTab === 'groups'
        ? 'Group'
        : activeTab === 'batches'
          ? 'Batch'
          : 'Mother';

  if (!hasQuery) {
    return null;
  }

  return (
    <div className="community-active-filters" aria-label="Active community filters">
      <span className="active-filters-label">Active Filters:</span>
      <button type="button" className="chip search-chip" onClick={onClearQuery}>
        <small>Search</small> {tabLabel}: {query} ×
      </button>
    </div>
  );
}
