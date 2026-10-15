import React from 'react';
import { createPortal } from 'react-dom';
import UnifiedModal from './UnifiedModal';

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

export default function NotificationDetailsModal({
  notification,
  onClose,
  onMarkAsRead,
  markingRead = false,
  error = '',
}) {
  if (!notification) return null;

  return createPortal((
    <UnifiedModal
      isOpen
      title={notification.title || notification.category || 'Notification details'}
      size="md"
      className="notification-details-modal"
      backdropClassName="notification-details-backdrop"
      onClose={onClose}
      footer={(
        <>
          {!notification.isRead && onMarkAsRead && (
            <button
              type="button"
              className="view-btn view-btn--primary notification-details-mark-read"
              onClick={() => onMarkAsRead(notification)}
              disabled={markingRead}
            >
              {markingRead ? 'Marking...' : 'Mark as read'}
            </button>
          )}
          <button type="button" className="view-btn view-btn--primary notification-details-close" onClick={onClose}>
            Close
          </button>
        </>
      )}
    >
      {error && <div role="alert" className="error-message">{error}</div>}
      <div className="notification-details">
        <p className="notification-details__message">{notification.message || 'No additional details provided.'}</p>
        <dl className="notification-details__metadata">
          <div>
            <dt>Category</dt>
            <dd>{notification.category || '—'}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>
              <time dateTime={notification.createdAt || undefined}>
                {formatTimestamp(notification.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{notification.isRead ? 'Read' : 'Unread'}</dd>
          </div>
          {notification.actorName && (
            <div>
              <dt>Performed by</dt>
              <dd>{notification.actorName}{notification.actorRole ? ` · ${notification.actorRole}` : ''}</dd>
            </div>
          )}
          {notification.entityType && (
            <div>
              <dt>Related record</dt>
              <dd>{notification.entityType}{notification.entityId ? ` · ${notification.entityId}` : ''}</dd>
            </div>
          )}
        </dl>
      </div>
      <style>{`
        .notification-details-backdrop { z-index: 2100; padding: 1rem; box-sizing: border-box; }
        .notification-details-modal { box-sizing: border-box; width: min(560px, calc(100vw - 2rem)); max-width: 100%; max-height: calc(100vh - 2rem); }
        @supports (height: 100dvh) { .notification-details-modal { max-height: calc(100dvh - 2rem); } }
        .notification-details-modal .view-modal__header { flex: 0 0 auto; min-height: 60px; padding: 0.85rem 1.1rem; }
        .notification-details-modal .view-modal__title { min-width: 0; margin-right: 0.75rem; font-size: 1.15rem; line-height: 1.4; overflow-wrap: anywhere; }
        .notification-details-modal .view-modal__body { flex: 1 1 auto; min-height: 0; max-height: none; gap: 0; padding: 1rem 1.1rem; overflow-y: auto; }
        .notification-details-modal .view-modal__footer { flex: 0 0 auto; min-height: 64px; padding: 0.75rem 1.1rem; }
        .notification-details-modal .notification-details-close { min-width: 80px; height: 38px; background: #15803d !important; border: 1px solid #15803d !important; color: #fff !important; opacity: 1 !important; font-weight: 600; }
        .notification-details-modal .notification-details-close:hover { background: #166534 !important; border-color: #166534 !important; }
        .notification-details-modal .notification-details-mark-read { min-width: 120px; height: 38px; background: #fff !important; border: 1px solid #15803d !important; color: #15803d !important; opacity: 1 !important; font-weight: 600; }
        .notification-details-modal .notification-details-mark-read:hover { background: #f0fdf4 !important; }
        .notification-details__message { margin: 0 0 1.25rem; color: #334155; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
        .notification-details__metadata { display: grid; gap: 0; margin: 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
        .notification-details__metadata > div { display: grid; grid-template-columns: minmax(110px, 0.7fr) minmax(0, 1.3fr); gap: 0.75rem; padding: 0.75rem 0.9rem; border-bottom: 1px solid #e2e8f0; }
        .notification-details__metadata > div:last-child { border-bottom: 0; }
        .notification-details__metadata dt { color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .notification-details__metadata dd { margin: 0; color: #0f172a; overflow-wrap: anywhere; }
        @media (max-width: 480px) { .notification-details__metadata > div { grid-template-columns: 1fr; gap: 0.25rem; } }
      `}</style>
    </UnifiedModal>
  ), document.body);
}
