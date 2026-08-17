import React from 'react';

export default function NotificationBanner({ message, actionLabel, onAction }) {
  if (!message) return null;

  return (
    <div className="notification-banner">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="notification-action" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
