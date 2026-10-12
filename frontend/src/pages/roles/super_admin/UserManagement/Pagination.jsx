import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './UserManagementIcons';

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
    <footer className="user-management-pagination">
      <div className="user-management-pagination__entries">
        <span>Show</span>
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(event.target.value)}
          className="user-management-pagination__select"
          aria-label="Entries per page"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span>entries</span>
      </div>

      <div className="user-management-pagination__navigation" aria-label="Pagination navigation">
        <button
          type="button"
          className="user-management-pagination__button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </button>

        <input
          type="number"
          min={1}
          max={pageCount}
          value={currentPage}
          className="user-management-pagination__page"
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
          className="user-management-pagination__button"
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage === pageCount}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="user-management-pagination__range" role="status" aria-live="polite">
        {rangeStart}–{rangeEnd} of {totalItems}
      </div>
    </footer>
  );
}
