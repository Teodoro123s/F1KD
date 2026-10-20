import React from 'react';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingSpinner from './LoadingSpinner';

export default function UnifiedTable({
  columns = [],
  rows = [],
  rowKey = (row, index) => row.id ?? index,
  emptyMessage = 'No records found',
  loading = false,
  error = '',
  onRetry,
  actions = null,
}) {
  const totalColumns = Math.max(columns.length + (actions ? 1 : 0), 1);

  return (
    <div className="view-table-card">
      <div className="view-table-wrap">
        <table className="view-table" aria-busy={loading}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                  {column.label}
                </th>
              ))}
              {actions && <th className="view-table__actions">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="view-table__empty">
                  <LoadingSpinner label="Loading records..." />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={totalColumns} className="view-table__empty">
                  <ErrorState message={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="view-table__empty">
                  <EmptyState title={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={rowKey(row, index)}>
                  {columns.map((column) => (
                    <td key={`${rowKey(row, index)}-${column.key}`}>
                      {typeof column.render === 'function'
                        ? column.render(row[column.key], row)
                        : row[column.key] ?? '—'}
                    </td>
                  ))}
                  {actions && (
                    <td className="view-table__actions">
                      <select
                        className="view-table__action-select"
                        aria-label="Actions"
                        defaultValue=""
                        onChange={(event) => {
                          const selected = actions[Number(event.target.value)];
                          if (selected) selected.onClick(row);
                          event.target.value = '';
                        }}
                      >
                        <option value="">⋯</option>
                        {actions.map((action, actionIndex) => (
                          <option key={`${rowKey(row, index)}-${action.label}-${actionIndex}`} value={actionIndex}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
