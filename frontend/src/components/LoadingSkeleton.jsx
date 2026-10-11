import React from 'react';

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-screen__content">
        <div className="loading-screen__spinner" aria-hidden="true" />
        <p className="loading-screen__text">{message}</p>
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = 'default', rows = 3 }) {
  const blocks = Array.from({ length: rows }, (_, index) => index + 1);

  if (variant === 'dashboard') {
    return (
      <div className="page-skeleton dashboard-skeleton" aria-live="polite" aria-busy="true">
        <div className="skeleton-header skeleton-block" />
        <div className="skeleton-tabs">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton-chip skeleton-block" />
          ))}
        </div>
        <div className="skeleton-kpis">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-card skeleton-block" />
          ))}
        </div>
        <div className="skeleton-panels">
          <div className="skeleton-panel skeleton-block" />
          <div className="skeleton-panel skeleton-block" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-skeleton" aria-live="polite" aria-busy="true">
      <div className="skeleton-header skeleton-block" />
      <div className="skeleton-card skeleton-block" />
      {blocks.map((block) => (
        <div key={block} className="skeleton-row skeleton-block" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  const skeletonRows = Array.from({ length: rows }, (_, row) => row);
  const skeletonColumns = Array.from({ length: columns }, (_, column) => column);

  return (
    <div className="table-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="table-skeleton__label">Loading table data...</span>
      <table aria-hidden="true">
        <tbody>
          {skeletonRows.map((row) => (
            <tr key={row}>
              {skeletonColumns.map((column) => (
                <td key={column}><span className="table-skeleton__cell" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeletonRows({ rows = 5, columns = 1 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={`loading-row-${row}`} className="table-skeleton__row" aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => (
        <td key={`loading-cell-${column}`}><span className="table-skeleton__cell" /></td>
      ))}
    </tr>
  ));
}
