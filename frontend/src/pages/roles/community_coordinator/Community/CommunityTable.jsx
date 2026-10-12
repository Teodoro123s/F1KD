import React from 'react';

export default function CommunityTable({
  columns = [],
  data = [],
  onRowClick,
  rowKey = 'id',
  emptyMessage = 'No results found matching your search.',
  tableTitle,
  tableControls,
  tableFooter,
  minRows = 0,
}) {
  const colSpan = Math.max(columns.length, 1);
  const renderedRowCount = data.length || 1;
  const fillerRowCount = Math.max(0, minRows - renderedRowCount);

  return (
    <section className="table-card">
      {(tableTitle || tableControls) && (
        <div className="community-table-header">
          {tableTitle && <div className="community-table-title">{tableTitle}</div>}
          {tableControls}
        </div>
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
            {Array.from({ length: fillerRowCount }, (_, index) => (
              <tr key={`empty-row-${index}`} aria-hidden="true" className="community-table-filler-row">
                <td colSpan={colSpan} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableFooter}
    </section>
  );
}
