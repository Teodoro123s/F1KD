import React from 'react';

function getPageItems(currentPage, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
  if (currentPage >= pageCount - 3) {
    return [1, 'start-ellipsis', ...Array.from({ length: 5 }, (_, index) => pageCount - 4 + index)];
  }
  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', pageCount];
}

export default function Pagination({
  currentPage = 1,
  pageCount = 1,
  onPageChange,
  perPage,
  onPerPageChange,
  pageSizeOptions = [10, 20, 50],
  rangeStart = 0,
  rangeEnd = 0,
  totalItems = 0,
  itemLabel = 'entries',
  ariaLabel = 'Pagination',
}) {
  const safePageCount = Math.max(1, Number(pageCount) || 1);
  const safeCurrentPage = Math.min(safePageCount, Math.max(1, Number(currentPage) || 1));
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const showPageSize = perPage !== undefined && typeof onPerPageChange === 'function';
  const pageItems = getPageItems(safeCurrentPage, safePageCount);

  return (
    <footer className={`app-pagination${showPageSize ? ' app-pagination--with-size' : ''}`} aria-label={ariaLabel}>
      {showPageSize && (
        <label className="app-pagination-size">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(event.target.value)}
            aria-label="Entries per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span>entries</span>
        </label>
      )}

      <nav className="app-pagination-nav" aria-label="Pagination navigation">
        <button
          type="button"
          className="app-pagination-button app-pagination-step"
          onClick={() => onPageChange?.(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Previous page"
        >
          <span aria-hidden="true">‹</span>
        </button>
        {pageItems.map((item) => typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            className={`app-pagination-button app-pagination-page${item === safeCurrentPage ? ' is-active' : ''}`}
            onClick={() => onPageChange?.(item)}
            aria-label={`Page ${item}`}
            aria-current={item === safeCurrentPage ? 'page' : undefined}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="app-pagination-ellipsis" aria-hidden="true">…</span>
        ))}
        <button
          type="button"
          className="app-pagination-button app-pagination-step"
          onClick={() => onPageChange?.(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safePageCount}
          aria-label="Next page"
        >
          <span aria-hidden="true">›</span>
        </button>
      </nav>

      <span className="app-pagination-summary" role="status" aria-live="polite">
        Showing {Math.max(0, Number(rangeStart) || 0)} to {Math.max(0, Number(rangeEnd) || 0)} of {safeTotal} {itemLabel}
      </span>
    </footer>
  );
}
