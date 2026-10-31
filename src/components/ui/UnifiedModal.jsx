import React, { useId, useRef } from 'react';
import Button from './Button';
import useModalAccessibility from './useModalAccessibility';
import usePresence from './usePresence';

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
  className = '',
  backdropClassName = '',
  closeDisabled = false,
  showCloseButton = true,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const isPresent = usePresence(isOpen, '--motion-modal-duration');
  useModalAccessibility({
    open: isPresent,
    onClose,
    dialogRef,
    closeDisabled: closeDisabled || !isOpen,
  });

  if (!isPresent) return null;

  const closeFromBackdrop = (event) => {
    if (isOpen && event.target === event.currentTarget) onClose?.();
  };

  return (
    <div
      className={`view-modal-backdrop${!isOpen ? ' motion-exiting' : ''} ${backdropClassName}`.trim()}
      role="presentation"
      onMouseDown={closeFromBackdrop}
    >
      <div
        ref={dialogRef}
        className={`view-modal ${sizeMap[size] || sizeMap.md}${!isOpen ? ' motion-exiting' : ''} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        inert={!isOpen}
      >
        <div className="view-modal__header">
          <h2 id={titleId} className="view-modal__title">{title}</h2>
          {showCloseButton && (
            <Button type="button" variant="icon" className="view-modal__close" onClick={onClose} aria-label="Close dialog">
              ×
            </Button>
          )}
        </div>

        <div className="view-modal__body">{children}</div>

        {footer !== undefined ? (
          <div className="view-modal__footer">{footer}</div>
        ) : (
          <div className="view-modal__footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={onSave}>
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
