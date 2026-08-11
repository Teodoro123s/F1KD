import React from 'react';
import BeneficiaryTable from './BeneficiaryTable';
import { SearchIcon } from './BeneficiaryIcons';

export default function BeneficiaryListPage({
  query,
  handleSearch,
  selectedStatusFilter,
  setSelectedStatusFilter,
  STATUS_OPTIONS,
  perPage,
  handlePerPageChange,
  renderPaginationButtons,
  displayRows,
  displayLength,
  displayRangeStart,
  displayRangeEnd,
  onCommunityRowClick,
  motherProgressByName,
  communities,
  batches,
}) {
  return (
    <>
      <section className="tabs-row">
        <div className="tabs-list" role="tablist" aria-label="Beneficiary status filter">
          {STATUS_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={selectedStatusFilter === key}
              type="button"
              className={`tab-btn${selectedStatusFilter === key ? ' active' : ''}`}
              onClick={() => {
                setSelectedStatusFilter(key);
              }}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="search-container">
          <SearchIcon />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search child name..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>
      </section>

      <BeneficiaryTable
        currentRows={displayRows}
        filteredDataLength={displayLength}
        rangeStart={displayRangeStart}
        rangeEnd={displayRangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        renderPaginationButtons={renderPaginationButtons}
        onCommunityRowClick={onCommunityRowClick}
        motherProgressByName={motherProgressByName}
        communities={communities}
        batches={batches}
      />
    </>
  );
}
