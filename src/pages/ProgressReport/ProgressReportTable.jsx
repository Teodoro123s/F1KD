import React from 'react';
import { REPORT_COLUMNS } from './progressReportUtils';

const DATE_COLUMNS = new Set([
  'dob', 'lmpDate', 'eddDate', 'prenatalRegDate',
  'tt1Date', 'tt2Date', 'tt3Date', 'tt4Date', 'tt5Date',
  'dentalCheckupDate', 'latestCheckupDate', 'createdAt',
  'bcgDate', 'opvDate', 'dptDate',
]);

function formatReportDate(value) {
  if (!value) return value;
  const datePart = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart.replace(/-/g, '/') : value;
}

export default function ProgressReportTable({
  activeTab,
  displayedRows,
  visibleColumns,
  columns,
}) {
  return (
    <table className="progress-report-table">
      <thead>
        <tr>
          {activeTab === 'Ranked by' ? (
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
          const rowKey = `${row.type}-${row.id || row.name || index}`;

          return (
            <tr key={`${row.type}-${row.id || row.name || index}`}>

              {activeTab === 'Ranked by' ? (
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
                          : DATE_COLUMNS.has(column.id)
                            ? formatReportDate(row[column.id])
                            : row[column.id]}
                  </td>
                ))
              )}

              <td className="action-cell">
                ⋮
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
