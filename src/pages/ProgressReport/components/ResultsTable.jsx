import React from 'react';

export function ResultsTable({
  resultsRows,
  reportFields,
  displayVisibleFields,
  displaySort,
  sortLabel,
  formatCellValue,
}) {
  return (
    <div className="results-table-wrap">
      <div className="progress-report-table-shell">
        <table className="progress-report-table">
          <thead>
            <tr>
              {reportFields.filter(([id]) => displayVisibleFields.includes(id)).map(([id, label]) => (
                <th key={id}>{sortLabel(label, id)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultsRows.map((row, index) => (
              <tr key={`${row.school || 'school'}-${row.group || 'group'}-${row.batch || 'batch'}-${row.mother || 'mother'}-${row.child || 'child'}-${index}`}>
                {reportFields.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => (
                  <td key={`${id}-${index}`}>{formatCellValue(id, row[id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
