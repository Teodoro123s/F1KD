import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!loading) onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = event.currentTarget.querySelector('[role="dialog"]');
      const focusable = Array.from(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [loading, onCancel, open]);

  if (!open) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !loading) onCancel?.();
  };

  return createPortal((
    <div className="modal-backdrop confirm-dialog-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        className={`modal-content confirm-dialog confirm-dialog--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__header">
          <span className="confirm-dialog__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4m0 4h.01" />
            </svg>
          </span>
          <div className="confirm-dialog__title-wrap">
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="btn-close-modal confirm-dialog__close"
            onClick={onCancel}
            aria-label="Close confirmation"
            disabled={loading}
          >
            ✕
          </button>
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
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={variant === 'destructive' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading && <span className="confirm-dialog__spinner" aria-hidden="true" />}
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  ), document.body);
}
