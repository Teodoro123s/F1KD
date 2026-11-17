import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuditSignatures from '../../../components/ui/AuditSignatures';
import { formatDateForDisplay } from '../../../utils/formatting/dateFormat';
import { isReceiptReceived } from '../utils/beneficiaryProgramReportUtils.mjs';

export default function BeneficiaryProgramReportTable({
  reportRows,
  visibleRows,
  showAuditSignatures,
  tableSearch,
  onSearchChange,
}) {
  const navigate = useNavigate();

  return (
    <>
      <div className="program-beneficiary-report-controls">
        <label className="program-beneficiary-report-search">
          <input
            type="search"
            value={tableSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Enter exact letter casing"
            aria-label="Search project receipt history"
          />
        </label>
      </div>
      <div className="program-receipt-table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
        <table className={`data-table program-beneficiary-report-table${showAuditSignatures ? ' has-audit-signatures' : ''}`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Project</th>
              <th>Receipt status</th>
              <th>Notes</th>
              <th>School / Community</th>
              <th>Group</th>
              <th>Batch</th>
              {showAuditSignatures && <th>Recorded by</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? visibleRows.map((row, index) => (
              <tr
                key={`${row.programId}-${row.date}-${index}`}
                className="program-clickable-row"
                role="link"
                tabIndex={0}
                aria-label={`Open ${row.programName}`}
                onClick={() => navigate(`/program/${row.programId}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/program/${row.programId}`);
                  }
                }}
              >
                <td>{formatDateForDisplay(String(row.date || '').slice(0, 10)) || '—'}</td>
                <td>{row.programName}</td>
                <td>{isReceiptReceived(row.monitored) ? 'Received' : 'Not received'}</td>
                <td>{row.notes || '—'}</td>
                <td>{row.school_name || '—'}</td>
                <td>{row.group_name || '—'}</td>
                <td>{row.batch_name || '—'}</td>
                {showAuditSignatures && (
                  <td>
                    <AuditSignatures
                      createdByName={row.created_by_name}
                      createdByRole={row.created_by_role}
                      createdAt={row.recorded_at}
                      updatedByName={row.updated_by_name}
                      updatedByRole={row.updated_by_role}
                      updatedAt={row.updated_at}
                    />
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={showAuditSignatures ? 8 : 7} className="no-data">
                  {reportRows.length
                    ? 'No receipt entries match the selected filters.'
                    : 'No project receipt history found for this beneficiary.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
