import React from 'react';

const sizeMap = {
  sm: 'view-modal--sm',
  md: 'view-modal--md',
  lg: 'view-modal--lg',
  xl: 'view-modal--xl',
};

export default function UnifiedModal({
  isOpen,
  title,
  size = 'md',
  onClose,
  onSave,
  children,
  footer,
}) {
  if (!isOpen) return null;

  return (
    <div className="view-modal-backdrop" onClick={onClose}>
      <div
        className={`view-modal ${sizeMap[size] || sizeMap.md}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="view-modal__header">
          <h2 id="view-modal-title" className="view-modal__title">{title}</h2>
          <button type="button" className="view-modal__close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="view-modal__body">{children}</div>

        {footer !== undefined ? (
          <div className="view-modal__footer">{footer}</div>
        ) : (
          <div className="view-modal__footer">
            <button type="button" className="view-btn view-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="view-btn view-btn--primary" onClick={onSave}>
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
