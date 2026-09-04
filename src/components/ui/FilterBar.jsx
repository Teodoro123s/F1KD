import React from 'react';

export default function FilterBar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [],
  onApply,
  onClear,
  applyLabel = 'Apply',
  clearLabel = 'Clear',
}) {
  return (
    <section className="view-filter-bar">
      <input
        type="text"
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder={searchPlaceholder}
        className="view-filter-bar__search"
        aria-label="Search"
      />

      {filters.map((filter) => (
        <div key={filter.key} className="view-filter-field">
          {filter.label && <label className="view-filter-field__label">{filter.label}</label>}
          <select
            value={filter.value}
            onChange={(event) => filter.onChange?.(event.target.value)}
            className="view-filter-bar__select"
            aria-label={filter.label || filter.key}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="view-filter-bar__actions">
        <button type="button" className="view-btn view-btn--secondary" onClick={onClear}>
          {clearLabel}
        </button>
        <button type="button" className="view-btn view-btn--primary" onClick={onApply}>
          {applyLabel}
        </button>
      </div>
    </section>
  );
}
