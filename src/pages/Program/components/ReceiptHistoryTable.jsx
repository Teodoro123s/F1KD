import React from 'react';
import AuditSignatures from '../../../components/ui/AuditSignatures';
import { formatDateForDisplay } from '../../../utils/formatting/dateFormat';
import { EvidenceImage } from '../../Community/components/BatchDocumentationPanel';
import { toDateKey } from '../utils/receiptHistoryUtils.mjs';

export default function ReceiptHistoryTable({
  rows,
  isClusterHistory,
  showAuditSignatures,
  canEditReceipts,
  canManageEvidence,
  programEnded,
  expandedEvidenceRow,
  setExpandedEvidenceRow,
  setPreviewImage,
  setPendingEvidenceDelete,
  openReceiptModal,
}) {
  return (
    <div className="program-receipt-table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
      <table className={`data-table ${isClusterHistory ? 'program-receipt-cluster-table' : 'program-receipt-beneficiary-table'}${showAuditSignatures ? ' has-audit-signatures' : ''}${canEditReceipts && !programEnded ? ' has-actions' : ''}`}>
        <thead>
          <tr>
            <th>Date</th>
            {isClusterHistory && <th>Beneficiary</th>}
            <th>Documentation</th>
            {showAuditSignatures && <th>Signatures</th>}
            {canEditReceipts && !programEnded && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => {
            const rowKey = `${row.date}-${row.program_name}-${row.beneficiary_name || row.beneficiary_id || 'entry'}`;
            const images = row.evidence_images || [];
            const isEvidenceExpanded = expandedEvidenceRow === rowKey;
            return (
              <tr key={rowKey}>
                <td title={formatDateForDisplay(toDateKey(row.date))}>{formatDateForDisplay(toDateKey(row.date))}</td>
                {isClusterHistory && (
                  <td title={row.beneficiary_name || row.beneficiary_id || 'Unknown beneficiary'}>
                    {row.beneficiary_name || row.beneficiary_id || 'Unknown beneficiary'}
                  </td>
                )}
                <td className="program-receipt-documentation-cell">
                  <button
                    type="button"
                    className="program-receipt-documentation-toggle"
                    aria-expanded={isEvidenceExpanded}
                    aria-controls={`receipt-documentation-${rowKey}`}
                    disabled={!images.length}
                    onClick={() => setExpandedEvidenceRow(isEvidenceExpanded ? null : rowKey)}
                  >
                    {images.length} {images.length === 1 ? 'image' : 'images'}
                  </button>
                  {isEvidenceExpanded && (
                    <div className="program-receipt-documentation-list" id={`receipt-documentation-${rowKey}`} aria-label="Check-in documentation images">
                      {images.map((image) => (
                        <EvidenceImage
                          key={image.id}
                          filePath={image.file_path}
                          fileName={image.file_name}
                          canManage={canManageEvidence}
                          onPreview={setPreviewImage}
                          onRemove={() => setPendingEvidenceDelete({ row, image })}
                        />
                      ))}
                    </div>
                  )}
                </td>
                {showAuditSignatures && (
                  <td>
                    <AuditSignatures
                      createdByName=""
                      createdByRole={row.created_by_role || row.monitored_by_role}
                      createdAt={row.recorded_at}
                      updatedByName=""
                      updatedByRole={row.updated_by_role || row.monitored_by_role}
                      updatedAt={row.updated_at}
                    />
                  </td>
                )}
                {canEditReceipts && !programEnded && (
                  <td>
                    <button type="button" className="view-btn view-btn--secondary" onClick={() => openReceiptModal(toDateKey(row.date), Boolean(row.monitored), [row])}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={(isClusterHistory ? 2 : 1) + 1 + (showAuditSignatures ? 1 : 0) + (canEditReceipts && !programEnded ? 1 : 0)} className="no-data">
                No receipt history found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
