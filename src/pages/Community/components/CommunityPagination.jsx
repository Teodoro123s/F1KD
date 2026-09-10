import React from 'react';

export default function CommunityPagination({
  currentPage,
  pageCount,
  onPageChange,
  perPage,
  onPerPageChange,
  rangeStart,
  rangeEnd,
  totalItems,
}) {
  const pageButtons = [];

  if (pageCount <= 5) {
    for (let i = 1; i <= pageCount; i += 1) {
      pageButtons.push(
        <button
          key={i}
          type="button"
          className={`community-pagination-page-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
          aria-label={`Go to page ${i}`}
        >
          {i}
        </button>
      );
    }
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 3; i += 1) {
      pageButtons.push(
        <button
          key={i}
          type="button"
          className={`community-pagination-page-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
          aria-label={`Go to page ${i}`}
        >
          {i}
        </button>
      );
    }
    pageButtons.push(
      <span key="ellipsis-1" className="community-pagination-ellipsis">
        ...
      </span>
    );
    pageButtons.push(
      <button
        key={pageCount}
        type="button"
        className={`community-pagination-page-btn${currentPage === pageCount ? ' active' : ''}`}
        onClick={() => onPageChange(pageCount)}
        aria-label={`Go to page ${pageCount}`}
      >
        {pageCount}
      </button>
    );
  } else if (currentPage >= pageCount - 2) {
    pageButtons.push(
      <button
        key={1}
        type="button"
        className={`community-pagination-page-btn${currentPage === 1 ? ' active' : ''}`}
        onClick={() => onPageChange(1)}
        aria-label="Go to page 1"
      >
        1
      </button>
    );
    pageButtons.push(
      <span key="ellipsis-2" className="community-pagination-ellipsis">
        ...
      </span>
    );
    for (let i = pageCount - 2; i <= pageCount; i += 1) {
      pageButtons.push(
        <button
          key={i}
          type="button"
          className={`community-pagination-page-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
          aria-label={`Go to page ${i}`}
        >
          {i}
        </button>
      );
    }
  } else {
    pageButtons.push(
      <button
        key={1}
        type="button"
        className={`community-pagination-page-btn${currentPage === 1 ? ' active' : ''}`}
        onClick={() => onPageChange(1)}
        aria-label="Go to page 1"
      >
        1
      </button>
    );
    pageButtons.push(
      <span key="ellipsis-3" className="community-pagination-ellipsis">
        ...
      </span>
    );
    pageButtons.push(
      <button
        key={currentPage}
        type="button"
        className="community-pagination-page-btn active"
        aria-label={`Current page ${currentPage}`}
        disabled
      >
        {currentPage}
      </button>
    );
    pageButtons.push(
      <span key="ellipsis-4" className="community-pagination-ellipsis">
        ...
      </span>
    );
    pageButtons.push(
      <button
        key={pageCount}
        type="button"
        className={`community-pagination-page-btn${currentPage === pageCount ? ' active' : ''}`}
        onClick={() => onPageChange(pageCount)}
        aria-label={`Go to page ${pageCount}`}
      >
        {pageCount}
      </button>
    );
  }

  return (
    <footer className="community-pagination">
      <div className="community-pagination-left">
        <span>Show</span>
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(event.target.value)}
          className="community-select-entries"
          aria-label="Entries per page"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span>entries</span>
      </div>

      <div className="community-pagination-right" aria-label="Pagination navigation">
        <button
          type="button"
          className="community-pagination-nav"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        <div className="community-pagination-pages">{pageButtons}</div>

        <button
          type="button"
          className="community-pagination-nav"
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage === pageCount}
          aria-label="Next page"
        >
          ›
        </button>
      </div>

      <div className="community-pagination-summary" role="status" aria-live="polite">
        {rangeStart}–{rangeEnd} of {totalItems}
      </div>
    </footer>
  );
}
