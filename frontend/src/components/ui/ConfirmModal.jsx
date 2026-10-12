import React, { useId } from 'react';

export default function ConfirmModal({
  show,
  message,
  onConfirm,
  onCancel,
  className = '',
  title = 'Confirm action',
  confirmLabel = 'Confirm',
  isLoading = false,
}) {
  const titleId = useId();
  if (!show) return null;

  const handleCancel = () => {
    if (!isLoading) onCancel();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleCancel}>
      <div
        className={`modal-content ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header-section">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-close-modal" onClick={handleCancel} aria-label="Close confirmation" disabled={isLoading}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
