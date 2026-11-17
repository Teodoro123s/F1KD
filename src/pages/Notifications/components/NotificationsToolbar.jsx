import React from 'react';
import { searchContainerClasses, searchInputClasses } from '../../../utils/formFieldClasses';
import { SearchIcon } from '../../Community/CommunityIcons';

export default function NotificationsToolbar({
  selectedIds,
  selectedUnreadCount,
  selectedReadCount,
  selectedReadStatus,
  counts,
  query,
  bulkActionLoading,
  markingNotificationIds,
  onMarkAllRead,
  onSetSelectedReadState,
  onClearSelection,
  onReadStatusChange,
  onQueryChange,
}) {
  return (
    <div className="notifications-table-title">
      <div className="notifications-timeline-heading">
        <h2>Notifications timeline</h2>
        {counts.unread > 0 && (
          <button
            type="button"
            className="notification-bulk-button notification-bulk-button--primary"
            onClick={onMarkAllRead}
            disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0}
          >
            {bulkActionLoading === 'all' ? 'Marking all...' : 'Mark all as read'}
          </button>
        )}
      </div>
      <section className="subheader-row notifications-filter-row" data-guide="notifications-filters">
        <div className="subheader-left">
          <label className="notification-status-filter">
            <span>Status</span>
            <select
              value={selectedReadStatus}
              onChange={(event) => onReadStatusChange(event.target.value)}
              aria-label="Filter notifications by read status"
            >
              <option value="all">All ({counts.all})</option>
              <option value="unread">Unread ({counts.unread})</option>
              <option value="read">Read ({counts.read})</option>
            </select>
          </label>
        </div>
        <div className="subheader-right">
          <div className={`search-container ${searchContainerClasses}`}>
            <SearchIcon />
            <div className="search-field-container">
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search notifications..."
                className={`search-input-field ${searchInputClasses}`}
                aria-label="Search notifications"
              />
            </div>
          </div>
        </div>
      </section>
      {selectedIds.length > 0 && (
        <div className="notification-bulk-toolbar" role="group" aria-label="Bulk notification actions">
          <span>
            {selectedIds.length} selected
            <small className="notification-selection-summary">
              {selectedUnreadCount} unread · {selectedReadCount} read on this page
            </small>
          </span>
          <button
            type="button"
            className="notification-bulk-button notification-bulk-button--primary"
            onClick={() => onSetSelectedReadState(true)}
            disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0 || selectedUnreadCount === 0}
          >
            {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as read'}
          </button>
          <button
            type="button"
            className="notification-bulk-button"
            onClick={() => onSetSelectedReadState(false)}
            disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0 || selectedReadCount === 0}
          >
            {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as unread'}
          </button>
          <button
            type="button"
            className="notification-bulk-button"
            onClick={onClearSelection}
            disabled={Boolean(bulkActionLoading)}
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
