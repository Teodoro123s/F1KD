import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import useModalAccessibility from './useModalAccessibility';

export default function ConfirmDialog({
  open,
  title,
  description,
  variant = 'destructive',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loadingLabel = 'Working...',
  loading = false,
  confirmDisabled = false,
  summary = [],
  error = '',
  className = '',
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  useModalAccessibility({
    open,
    onClose: onCancel,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    closeDisabled: loading,
  });

  if (!open) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !loading) onCancel?.();
  };

  return createPortal((
    <div className="modal-backdrop confirm-dialog-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        ref={dialogRef}
        className={`modal-content confirm-dialog confirm-dialog--${variant} ${className}`.trim()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__header">
          <span className="confirm-dialog__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {variant === 'destructive' ? (
                <>
                  <path d="M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4m0 4h.01" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5m0-8h.01" />
                </>
              )}
            </svg>
          </span>
          <div className="confirm-dialog__title-wrap">
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button
            type="button"
            variant="icon"
            size="small"
            className="btn-close-modal confirm-dialog__close"
            onClick={onCancel}
            aria-label="Close confirmation"
            disabled={loading}
          >
            ✕
          </Button>
        </div>
        <div className="confirm-dialog__body">
          <p id={descriptionId}>{description}</p>
          {summary.length > 0 && (
            <dl className="confirm-dialog__summary" aria-label="Affected records">
              {summary.map(({ label, value }) => (
                <div className="confirm-dialog__summary-item" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {error && <p className="confirm-dialog__error" role="alert">{error}</p>}
        </div>
        <div className="confirm-dialog__footer">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            loading={loading}
            loadingLabel={loadingLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  ), document.body);
}
