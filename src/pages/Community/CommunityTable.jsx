import React from 'react';
import TableSearch from '../../components/ui/TableSearch';

export default function CommunityTable({
  columns = [],
  data = [],
  onRowClick,
  rowKey = 'id',
  tableClassName = '',
  activeRowKey = null,
  emptyMessage = 'No results found matching your search.',
  tableTitle,
  searchValue = '',
  onSearchChange,
  onBack,
  backLabel = 'Back to groups',
  getGroupLabel,
  toolbarContent,
}) {
  const colSpan = Math.max(columns.length, 1);
  const hasTableToolbar = onSearchChange && (tableTitle || toolbarContent);
  const renderedTitle = tableTitle && (
    <div className={`community-table-title${onBack ? ' has-back-action' : ''}`}>
      {onBack && (
        <button type="button" className="community-table-back-button" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
      )}
      {tableTitle}
    </div>
  );

  return (
    <section className="table-card">
      {hasTableToolbar ? (
        <div className="community-table-toolbar">
          <div className="community-table-toolbar-start">
            {renderedTitle}
            {toolbarContent}
          </div>
          <TableSearch value={searchValue} onChange={onSearchChange} />
        </div>
      ) : (
        <>
          {renderedTitle}
          {onSearchChange && <TableSearch value={searchValue} onChange={onSearchChange} />}
        </>
      )}
      <div className="table-overflow">
        <table className={`data-table ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key || column.header}
                  scope="col"
                  className={column.thClassName || column.className}
                  style={column.style}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.flatMap((row, index) => {
                const groupLabel = getGroupLabel?.(row);
                const previousGroupLabel = index > 0 ? getGroupLabel?.(data[index - 1]) : null;
                const rows = [];
                if (groupLabel && groupLabel !== previousGroupLabel) {
                  rows.push(
                    <tr key={`group-${row[rowKey]}`} className="community-table-group-row">
                      <th scope="rowgroup" colSpan={colSpan}>{groupLabel}</th>
                    </tr>,
                  );
                }
                rows.push(
                  <tr
                    key={row[rowKey]}
                    className={[
                      onRowClick ? 'clickable-row' : '',
                      activeRowKey != null && String(row[rowKey]) === String(activeRowKey) ? 'actions-row-open' : '',
                    ].filter(Boolean).join(' ') || undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((column) => {
                      const value = column.accessor ? row[column.accessor] : row[column.key];

                      return (
                        <td
                          key={`${row[rowKey]}-${column.key || column.header}`}
                          className={column.cellClassName || column.className}
                          style={column.cellStyle}
                        >
                          {column.renderCell ? column.renderCell(row, value) : value ?? '—'}
                        </td>
                      );
                    })}
                  </tr>,
                );
                return rows;
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="no-data">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
