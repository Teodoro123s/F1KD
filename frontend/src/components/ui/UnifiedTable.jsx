import React from 'react';

export default function UnifiedTable({
  columns = [],
  rows = [],
  rowKey = (row, index) => row.id ?? index,
  emptyMessage = 'No records found',
  actions = null,
}) {
  return (
    <div className="view-table-card">
      <div className="view-table-wrap">
        <table className="view-table">
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="view-table__empty">
                  {emptyMessage}
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
