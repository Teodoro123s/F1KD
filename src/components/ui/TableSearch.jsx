import React from 'react';

export default function TableSearch({ value, onChange, placeholder = 'Search this table' }) {
  return (
    <div className="community-table-search">
      <div className="search-container">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="search-input-field"
          aria-label={placeholder}
        />
      </div>
    </div>
  );
}
