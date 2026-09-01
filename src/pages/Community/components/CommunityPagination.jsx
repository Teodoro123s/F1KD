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
  const buttons = [];

  buttons.push(
    <button
      key="first"
      type="button"
      className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
      onClick={() => onPageChange(1)}
      disabled={currentPage === 1}
      aria-label="First page"
    >
      «
    </button>
  );

  const maxVisible = 5;
  if (pageCount <= maxVisible) {
    for (let i = 1; i <= pageCount; i += 1) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`pagination-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 3; i += 1) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`pagination-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }
    buttons.push(<span key="el-1" className="pagination-btn ellipsis">...</span>);
    buttons.push(
      <button
        key={pageCount}
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
        onClick={() => onPageChange(pageCount)}
      >
        {pageCount}
      </button>
    );
  } else if (currentPage >= pageCount - 2) {
    buttons.push(
      <button
        key={1}
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
        onClick={() => onPageChange(1)}
      >
        1
      </button>
    );
    buttons.push(<span key="el-2" className="pagination-btn ellipsis">...</span>);
    for (let i = pageCount - 2; i <= pageCount; i += 1) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`pagination-btn${currentPage === i ? ' active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }
  } else {
    buttons.push(
      <button
        key={1}
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
        onClick={() => onPageChange(1)}
      >
        1
      </button>
    );
    buttons.push(<span key="el-3" className="pagination-btn ellipsis">...</span>);
    buttons.push(
      <button key={currentPage} type="button" className="pagination-btn active">
        {currentPage}
      </button>
    );
    buttons.push(<span key="el-4" className="pagination-btn ellipsis">...</span>);
    buttons.push(
      <button
        key={pageCount}
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
        onClick={() => onPageChange(pageCount)}
      >
        {pageCount}
      </button>
    );
  }

  buttons.push(
    <button
      key="last"
      type="button"
      className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
      onClick={() => onPageChange(pageCount)}
      disabled={currentPage === pageCount}
      aria-label="Last page"
    >
      »
    </button>
  );

  return (
    <footer className="pagination-container">
      <div className="pagination-left" aria-label="Pagination navigation">
        {buttons}
      </div>
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
      <div className="pagination-right" role="status" aria-live="polite">
        {rangeStart}–{rangeEnd} of {totalItems}
      </div>
    </footer>
  );
}
