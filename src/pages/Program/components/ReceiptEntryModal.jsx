import React from 'react';
import { createPortal } from 'react-dom';
import { formFieldClasses } from '../../../utils/formFieldClasses';
import { getModalBackdropClasses, getModalSurfaceClasses, modalHeaderClasses, modalCloseClasses } from '../../../components/ui/modalClasses';
import DateInput from '../../../components/ui/DateInput';
import { SelectedImagePreview } from '../../Community/components/BatchDocumentationPanel';
import { formatImageSize } from '../utils/receiptHistoryUtils.mjs';

export default function ReceiptEntryModal({
  receiptModal,
  setReceiptModal,
  savingReceipt,
  saveReceipt,
  isClusterHistory,
  clusterType,
  clusterRecipients,
  recipientsLoading,
  selectedRecipientKeys,
  setSelectedRecipientKeys,
  getRecipientKey,
  canManageEvidence,
  evidenceImages,
  handleEvidenceSelection,
  setPreviewImage,
  setEvidenceImages,
  error,
}) {
  if (!receiptModal) return null;

  return createPortal(
    <div className={`modal-backdrop ${getModalBackdropClasses()}`} role="presentation" onClick={() => !savingReceipt && setReceiptModal(null)}>
      <div
        className={`program-receipt-modal ${getModalSurfaceClasses()}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`program-receipt-modal-header ${modalHeaderClasses}`}>
          <h3 id="receipt-modal-title">Record project receipt</h3>
          <button type="button" className={`document-preview-close ${modalCloseClasses}`} onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Close</button>
        </div>
        <form onSubmit={saveReceipt}>
          <label htmlFor="receipt-date">
            Date
            <DateInput
              id="receipt-date"
              className={`${formFieldClasses} form-input`}
              value={receiptModal.date}
              onChange={(value) => setReceiptModal((current) => ({ ...current, date: value }))}
              required
              disabled={savingReceipt}
              ariaLabel="Receipt date"
            />
          </label>
          {isClusterHistory && (
            <fieldset className="receipt-beneficiary-selection" disabled={savingReceipt || recipientsLoading}>
              <legend>Beneficiaries ({selectedRecipientKeys.length}/{clusterRecipients.length})</legend>
              <label className="receipt-beneficiary-select-all">
                <input
                  type="checkbox"
                  checked={clusterRecipients.length > 0 && selectedRecipientKeys.length === clusterRecipients.length}
                  onChange={(event) => setSelectedRecipientKeys(event.target.checked ? clusterRecipients.map(getRecipientKey) : [])}
                />
                <span>Select all in this {clusterType}</span>
              </label>
              <div className="receipt-beneficiary-list">
                {clusterRecipients.length ? clusterRecipients.map((recipient) => {
                  const key = getRecipientKey(recipient);
                  return (
                    <label key={key} className="receipt-beneficiary-option">
                      <input
                        type="checkbox"
                        checked={selectedRecipientKeys.includes(key)}
                        onChange={(event) => setSelectedRecipientKeys((current) => (
                          event.target.checked ? [...current, key] : current.filter((value) => value !== key)
                        ))}
                      />
                      <span>{recipient.name || `${recipient.type} ${recipient.id}`}</span>
                    </label>
                  );
                }) : <p className="receipt-beneficiary-empty">No beneficiaries found in this {clusterType}.</p>}
              </div>
            </fieldset>
          )}
          <label>
            Received this project item?
            <select
              value={receiptModal.monitored ? 'yes' : 'no'}
              onChange={(event) => setReceiptModal((current) => ({ ...current, monitored: event.target.value === 'yes' }))}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          {canManageEvidence ? (
            <section className="program-receipt-evidence-upload" aria-label="Program check-in photo documentation">
              <label>
                Optional photos for this check-in
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleEvidenceSelection}
                  disabled={savingReceipt}
                />
              </label>
              <p>
                {evidenceImages.length
                  ? `${evidenceImages.length} selected · ${formatImageSize(evidenceImages.reduce((total, image) => total + image.size, 0))} of 25 MB · shared across ${isClusterHistory ? selectedRecipientKeys.length : 1} check-in${(isClusterHistory ? selectedRecipientKeys.length : 1) === 1 ? '' : 's'}`
                  : 'Optional · select 3–10 JPG, PNG, or WEBP photos (5 MB each, 25 MB total). One set is shared across selected beneficiaries.'}
              </p>
              {evidenceImages.length > 0 && (
                <ul className="batch-documentation-selected-files" aria-label="Selected check-in photos">
                  {evidenceImages.map((image, index) => (
                    <li key={`${image.name}-${image.size}-${image.lastModified}-${index}`}>
                      <SelectedImagePreview image={image} onPreview={setPreviewImage} />
                      <span className="batch-documentation-selected-file-info">
                        <span className="batch-documentation-selected-file-name" title={image.name}>{image.name}</span>
                        <small>{formatImageSize(image.size)}</small>
                      </span>
                      <button
                        type="button"
                        className="batch-documentation-remove-file"
                        onClick={() => setEvidenceImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={savingReceipt}
                        aria-label={`Remove ${image.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <p className="program-receipt-evidence-readonly">Photo evidence can be viewed and downloaded. Community Organizers manage photo uploads and removals.</p>
          )}
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="program-receipt-modal-actions">
            <button type="button" className="view-btn view-btn--secondary" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Cancel</button>
            <button type="submit" className="view-btn view-btn--primary" disabled={savingReceipt || (isClusterHistory && recipientsLoading)}>
              {savingReceipt ? 'Saving...' : 'Save status'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
