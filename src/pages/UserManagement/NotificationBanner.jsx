import React from 'react';

export default function NotificationBanner({ message }) {
  if (!message) return null;

  return <div className="notification-banner">{message}</div>;
}
