import React from 'react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ConfirmModal({
  show,
  message,
  onConfirm,
  onCancel,
  className = '',
  confirmLabel = 'Confirm',
  title = 'Confirm action',
  variant = 'primary',
}) {
  return (
    <ConfirmDialog
      open={show}
      title={title}
      description={message}
      confirmLabel={confirmLabel}
      variant={variant}
      className={className}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
