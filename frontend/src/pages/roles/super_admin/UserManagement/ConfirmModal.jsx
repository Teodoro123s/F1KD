import React from 'react';

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
  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={() => { if (!isLoading) onCancel(); }}>
      <div className={`modal-content ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header-section">
          <h3>{title}</h3>
          <button className="btn-close-modal" onClick={onCancel} aria-label="Close confirmation" disabled={isLoading}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
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
