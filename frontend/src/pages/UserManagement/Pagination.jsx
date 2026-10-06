import React from 'react';

export default function Pagination({
  currentPage,
  pageCount,
  onPageChange,
  perPage,
  onPerPageChange,
  rangeStart,
  rangeEnd,
  totalItems,
}) {
  return (
    <footer className="pagination-container">
      <div className="pagination-center">
        <span>Show</span>
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(event.target.value)}
          className="select-entries"
          aria-label="Entries per page"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span>entries</span>
      </div>

      <div className="pagination-left" aria-label="Pagination navigation">
        <button
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        <input
          type="number"
          min={1}
          max={pageCount}
          value={currentPage}
          className="pagination-page-input"
          placeholder="Page"
          aria-label="Jump to a page"
          onChange={(event) => {
            const nextPage = Number(event.target.value);
            if (!Number.isNaN(nextPage) && nextPage >= 1 && nextPage <= pageCount) {
              onPageChange(nextPage);
            }
          }}
        />

        <button
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage === pageCount}
          aria-label="Next page"
        >
          ›
        </button>
      </div>

      <div className="pagination-right" role="status" aria-live="polite">
        {rangeStart}–{rangeEnd} of {totalItems}
      </div>
    </footer>
  );
}
