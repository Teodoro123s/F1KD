import React from 'react';
import TableSearch from '../../components/ui/TableSearch';

export default function CommunityTable({
  columns = [],
  data = [],
  onRowClick,
  rowKey = 'id',
  emptyMessage = 'No results found matching your search.',
  tableTitle,
  searchValue = '',
  onSearchChange,
}) {
  const colSpan = Math.max(columns.length, 1);
  const hasTableToolbar = tableTitle && onSearchChange;

  return (
    <section className="table-card">
      {hasTableToolbar ? (
        <div className="community-table-toolbar">
          <div className="community-table-title">{tableTitle}</div>
          <TableSearch value={searchValue} onChange={onSearchChange} />
        </div>
      ) : (
        <>
          {tableTitle && <div className="community-table-title">{tableTitle}</div>}
          {onSearchChange && <TableSearch value={searchValue} onChange={onSearchChange} />}
        </>
      )}
      <div className="table-overflow">
        <table className="data-table">
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
              data.map((row) => (
                <tr
                  key={row[rowKey]}
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
                  className={onRowClick ? 'clickable-row' : undefined}
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
                </tr>
              ))
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
