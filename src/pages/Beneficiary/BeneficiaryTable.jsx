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
  const emptyColSpan = 2;

  return (
    <section className="table-card beneficiary-table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" className="name-column group-header">Mother</th>
              <th scope="col" className="name-column group-header">Child</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => {
                const motherProgress = motherProgressByName?.[row.community] ?? 0;
                const childProgress = row.childProgress != null ? row.childProgress : 0;

                return (
                  <tr key={row.id}>
                    <td className="mother-cell">
                      <button
                        type="button"
                        className="entity-card-button name-cell"
                        onClick={onCommunityRowClick ? () => onCommunityRowClick(row, 'mother') : undefined}
                        aria-label={`Open mother persona for ${row.community}`}
                      >
                        <span className="community-title-text" title={row.community}>{row.community}</span>
                        <div className="progress-cell-inner">
                          <div className="progress-bar" aria-hidden="true">
                            <div className="progress-bar-fill" style={{ width: `${motherProgress}%` }} />
                          </div>
                          <span className="progress-value mother">{motherProgress}%</span>
                        </div>
                      </button>
                    </td>
                    <td className="child-cell">
                      <button
                        type="button"
                        className="entity-card-button name-cell"
                        onClick={onCommunityRowClick ? () => onCommunityRowClick(row, 'child') : undefined}
                        aria-label={`Open child persona for ${row.name}`}
                      >
                        <span className="community-title-text" title={row.name}>{row.name}</span>
                        <div className="progress-cell-inner">
                          <div className="progress-bar" aria-hidden="true">
                            <div className="progress-bar-fill child" style={{ width: `${childProgress}%` }} />
                          </div>
                          <span className="progress-value child">{childProgress}%</span>
                        </div>
                      </button>
                    </td>
                  </tr>
                );
              })
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
