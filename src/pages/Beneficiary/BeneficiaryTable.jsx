import React from 'react';

export default function BeneficiaryTable({
  currentRows,
  filteredDataLength,
  rangeStart,
  rangeEnd,
  perPage,
  handlePerPageChange,
  renderPaginationButtons,
  onCommunityRowClick,
  motherProgressByName,
}) {
  const emptyColSpan = 4;

  return (
    <section className="table-card beneficiary-table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" colSpan={2} className="group-header">Mother</th>
              <th scope="col" colSpan={2} className="group-header">Child</th>
            </tr>
            <tr>
              <th scope="col" className="name-column">Mother Name</th>
              <th scope="col" className="progress-column">Progress (%)</th>
              <th scope="col" className="name-column">Child Name</th>
              <th scope="col" className="progress-column">Progress (%)</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr key={row.id}>
                  <td className="mother-name-cell">
                    <button
                      type="button"
                      className="group-clickable-cell name-cell"
                      onClick={onCommunityRowClick ? () => onCommunityRowClick(row) : undefined}
                      aria-label={`Open record for ${row.community}`}
                    >
                      <div className="group-cell-container name-cell-container">
                        <span className="community-title-text" title={row.community}>{row.community}</span>
                      </div>
                    </button>
                  </td>
                  <td className="mother-progress-cell">
                      <div className="group-cell-container progress-cell-container">
                        <span className="group-progress">{`${motherProgressByName?.[row.community] ?? 0}%`}</span>
                      </div>
                  </td>
                  <td className="child-name-cell">
                    <button
                      type="button"
                      className="group-clickable-cell name-cell"
                      onClick={onCommunityRowClick ? () => onCommunityRowClick(row) : undefined}
                      aria-label={`Open record for ${row.name}`}
                    >
                      <div className="group-cell-container name-cell-container">
                        <span className="community-title-text" title={row.name}>{row.name}</span>
                      </div>
                    </button>
                  </td>
                  <td className="child-progress-cell">
                      <div className="group-cell-container progress-cell-container">
                        <span className="group-progress">{row.childProgress != null ? `${row.childProgress}%` : ''}</span>
                      </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={emptyColSpan} className="no-data">
                  No results found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="pagination-container">
        <div className="pagination-left" aria-label="Pagination navigation">
          {renderPaginationButtons()}
        </div>
        <div className="pagination-center">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="select-entries"
            aria-label="Entries per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="pagination-right" role="status" aria-live="polite">
          {rangeStart}–{rangeEnd} of {filteredDataLength}
        </div>
      </footer>
    </section>
  );
}
