import React from 'react';
import CommunityTable from '../../Community/CommunityTable';
import { formatRelativeTimestamp } from '../utils/notificationUtils';

export default function NotificationsTable({
  notifications,
  selectedIdKeys,
  onToggleSelection,
  onToggleCurrentPageSelection,
  onRowClick,
  tableTitle,
  getGroupLabel,
  emptyMessage,
  bulkActionLoading,
  loading,
}) {
  const columns = [
    {
      key: 'selection',
      header: (
        <label className="notifications-select-all">
          <input
            type="checkbox"
            checked={notifications.length > 0 && notifications.every((notification) => selectedIdKeys.has(String(notification.id)))}
            onChange={onToggleCurrentPageSelection}
            aria-label="Select all notifications on this page"
            title="Select all notifications on this page"
            disabled={Boolean(bulkActionLoading) || loading || notifications.length === 0}
          />
          <span>All</span>
        </label>
      ),
      className: 'notifications-timeline-selection',
      renderCell: (notification) => (
        <input
          type="checkbox"
          checked={selectedIdKeys.has(String(notification.id))}
          onChange={() => onToggleSelection(notification.id)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          aria-label={`Select "${notification.title}"`}
          disabled={Boolean(bulkActionLoading)}
        />
      ),
    },
    {
      key: 'title',
      header: 'Subject',
      className: 'notifications-timeline-subject',
      renderCell: (notification) => (
        <span className={`notification-subject${notification.isRead ? '' : ' is-unread'}`}>
          {!notification.isRead && <span className="notification-unread-dot" aria-label="Unread" />}
          {notification.title}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      className: 'notifications-timeline-message',
      renderCell: (notification) => (
        <>
          <span className={notification.isRead ? '' : 'notification-message-unread'}>
            {notification.message}
          </span>
          {notification.actorName && (
            <small className="notification-actor">
              By {notification.actorName}{notification.actorRole ? ` · ${notification.actorRole}` : ''}
            </small>
          )}
        </>
      ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      className: 'notifications-timeline-received',
      renderCell: (notification) => (
        <time dateTime={notification.createdAt || undefined} title={notification.createdAt ? new Date(notification.createdAt).toLocaleString() : undefined}>
          {formatRelativeTimestamp(notification.createdAt)}
        </time>
      ),
    },
  ];

  return (
    <CommunityTable
      columns={columns}
      data={notifications}
      tableClassName="notifications-timeline-table"
      tableTitle={tableTitle}
      onRowClick={onRowClick}
      getGroupLabel={getGroupLabel}
      emptyMessage={emptyMessage}
    />
  );
}
