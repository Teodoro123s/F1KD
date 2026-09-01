import React from 'react';
import { REPORT_COLUMNS, getRowKey } from './progressReportUtils';

export default function ProgressReportTable({
  activeTab,
  displayedRows,
  compareIds,
  toggleCompare,
  showHistory,
  visibleColumns,
  columns,
}) {
  return (
    <table className="progress-report-table">
      <thead>
        <tr>
          <th aria-label="Compare" />
          {activeTab === 'Ranked List' ? (
            <>
              <th>Entity</th>
              <th>Type</th>
              <th>Members</th>
              <th>Progress %</th>
              <th>Trend</th>
            </>
          ) : (
            columns.filter((column) => visibleColumns.includes(column.id)).map((column) => (
              <th key={column.id}>{column.label}</th>
            ))
          )}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {displayedRows.map((row, index) => {
          const rowKey = getRowKey(row, index);

          return (
            <tr key={rowKey}>
              <td>
                <input
                  type="checkbox"
                  checked={compareIds.includes(rowKey)}
                  onChange={() => toggleCompare(rowKey)}
                  aria-label={`Compare ${row.name}`}
                />
              </td>

              {activeTab === 'Ranked List' ? (
                <>
                  <td className="beneficiary-cell">{row.name}</td>
                  <td>{row.type}</td>
                  <td>{row.idLabel}</td>
                  <td>{row.progress}%</td>
                  <td>
                    <span className={`trend-badge ${row.trend}`}>{row.trend === 'up' ? '↗' : '↘'}</span>
                  </td>
                </>
              ) : (
                columns.filter((column) => visibleColumns.includes(column.id)).map((column) => (
                  <td key={`${rowKey}-${column.id}`} className={column.id === 'name' ? 'beneficiary-cell' : ''}>
                    {column.id === 'name' && <span className="avatar-dot" aria-hidden="true" />}
                    {column.id === 'name'
                      ? row.name
                      : column.id === 'progress'
                        ? (
                          <div className="progress-cell">
                            <div className="mini-progress-track">
                              <span style={{ width: `${row.progress}%` }} />
                            </div>
                            <strong>{row.progress}%</strong>
                          </div>
                        )
                        : column.id === 'trend'
                          ? <span className={`trend-badge ${row.trend}`}>{row.trend === 'up' ? '↗' : '↘'}</span>
                          : row[column.id]}
                  </td>
                ))
              )}

              <td className="action-cell">
                {row.type === 'Mothers' && (
                  <button type="button" className="history-btn" onClick={() => showHistory(row)}>
                    History
                  </button>
                )}{' '}
                ⋮
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
