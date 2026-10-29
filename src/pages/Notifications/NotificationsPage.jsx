import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { SearchIcon } from '../Community/CommunityIcons';
import {
  apiBulkSetNotificationsRead,
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiSetNotificationRead,
} from '../../api/notifications';
import NotificationDetailsModal from '../../components/ui/NotificationDetailsModal';

function notificationDateGroup(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startOfToday - startOfDate) / 86400000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  return 'Earlier';
}

function formatRelativeTimestamp(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const unit = units.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return relativeTime.format(seconds, 'second');
  return relativeTime.format(Math.round(seconds / unit[1]), unit[0]);
}

function getNotificationDestination(notification) {
  const destination = String(notification.linkTo || '').trim();
  if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) return '';
  return destination === '/notifications' ? '' : destination;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedReadStatus, setSelectedReadStatus] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [markingNotificationIds, setMarkingNotificationIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState('');
  const actionLocks = useRef(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetNotifications({
      page,
      perPage,
      search: query,
      readStatus: selectedReadStatus || 'all',
    })
      .then((response) => {
        if (!active) return;
        setNotifications(response.notifications || []);
        setSelectedIds([]);
        setTotal(Number(response.total) || 0);
        setCounts({
          all: Number(response.counts?.all) || 0,
          read: Number(response.counts?.read) || 0,
          unread: Number(response.counts?.unread) || 0,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setNotifications([]);
        setTotal(0);
        setCounts({ all: 0, read: 0, unread: 0 });
        setError(requestError.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, perPage, query, selectedReadStatus, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const selectedIdKeys = new Set(selectedIds.map(String));
  const selectedNotifications = notifications.filter((notification) => selectedIdKeys.has(String(notification.id)));
  const selectedUnreadCount = selectedNotifications.filter((notification) => !notification.isRead).length;
  const selectedReadCount = selectedNotifications.length - selectedUnreadCount;

  const openNotification = async (notification) => {
    setError('');
    if (!notification.isRead && !(await setNotificationReadState(notification, true))) {
      setSelectedNotification(notification);
      return;
    }
    const destination = getNotificationDestination(notification);
    if (destination) {
      navigate(destination);
      return;
    }
    setSelectedNotification(notification);
  };

  const setNotificationReadState = async (notification, isRead) => {
    if (notification.isRead === isRead) return true;
    if (actionLocks.current.has('bulk') || actionLocks.current.has(`notification-${notification.id}`)) return false;
    actionLocks.current.add(`notification-${notification.id}`);
    setMarkingNotificationIds((ids) => [...ids, notification.id]);
    setError('');
    try {
      const response = await apiSetNotificationRead(notification.id, isRead);
      const changed = Number(response.changed) || 0;
      setNotifications((current) => current.map((item) => (
        String(item.id) === String(notification.id) ? { ...item, isRead } : item
      )));
      setSelectedNotification((current) => String(current?.id) === String(notification.id)
        ? { ...current, isRead }
        : current);
      if (changed > 0) {
        setCounts((current) => ({
          ...current,
          read: Math.max(0, current.read + (isRead ? changed : -changed)),
          unread: Math.max(0, current.unread + (isRead ? -changed : changed)),
        }));
      }
      setRefreshKey((key) => key + 1);
      return true;
    } catch (requestError) {
      setError(requestError.message || 'Unable to update notification read status.');
      return false;
    } finally {
      actionLocks.current.delete(`notification-${notification.id}`);
      setMarkingNotificationIds((ids) => ids.filter((id) => id !== notification.id));
    }
  };

  const markNotificationRead = (notification) => setNotificationReadState(notification, true);

  const markAllNotificationsRead = async () => {
    if (actionLocks.current.size > 0 || counts.unread === 0) return;
    actionLocks.current.add('bulk');
    setBulkActionLoading('all');
    setError('');
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setSelectedNotification((current) => current ? { ...current, isRead: true } : current);
      setCounts((current) => ({ ...current, read: current.all, unread: 0 }));
      setSelectedIds([]);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notifications as read.');
    } finally {
      actionLocks.current.delete('bulk');
      setBulkActionLoading('');
    }
  };

  const setSelectedNotificationsReadState = async (isRead) => {
    if (actionLocks.current.size > 0 || selectedIds.length === 0) return;
    actionLocks.current.add('bulk');
    setBulkActionLoading('selection');
    setError('');
    try {
      const response = await apiBulkSetNotificationsRead(selectedIds, isRead);
      const changed = Number(response.changed) || 0;
      setNotifications((current) => current.map((item) => (
        selectedIdKeys.has(String(item.id)) ? { ...item, isRead } : item
      )));
      setSelectedNotification((current) => current && selectedIdKeys.has(String(current.id))
        ? { ...current, isRead }
        : current);
      setCounts((current) => ({
        ...current,
        read: Math.max(0, current.read + (isRead ? changed : -changed)),
        unread: Math.max(0, current.unread + (isRead ? -changed : changed)),
      }));
      setSelectedIds([]);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update selected notifications.');
    } finally {
      actionLocks.current.delete('bulk');
      setBulkActionLoading('');
    }
  };

  const toggleNotificationSelection = (id) => {
    const idKey = String(id);
    setSelectedIds((current) => current.some((selectedId) => String(selectedId) === idKey)
      ? current.filter((selectedId) => String(selectedId) !== idKey)
      : [...current, idKey]);
  };

  const toggleCurrentPageSelection = () => {
    const pageIds = notifications.map((notification) => String(notification.id));
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIdKeys.has(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !pageIds.includes(String(id)))
      : [...new Set([...current, ...pageIds])]);
  };

  const columns = [
    {
      key: 'selection',
      header: (
        <label className="notifications-select-all">
          <input
            type="checkbox"
            checked={notifications.length > 0 && notifications.every((notification) => selectedIdKeys.has(String(notification.id)))}
            onChange={toggleCurrentPageSelection}
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
          onChange={() => toggleNotificationSelection(notification.id)}
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
    <div className="community-page">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Community', href: '/community' }, { label: 'Notifications' }]}
      />

      {error && <div role="alert" className="error-message">{error}</div>}
      <CommunityTable
        columns={columns}
        data={notifications}
        tableClassName="notifications-timeline-table"
        tableTitle={(
          <div className="notifications-table-title">
            <div className="notifications-timeline-heading">
              <h2>Notifications timeline</h2>
              {counts.unread > 0 && (
                <button
                  type="button"
                  className="notification-bulk-button notification-bulk-button--primary"
                  onClick={markAllNotificationsRead}
                  disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0}
                >
                  {bulkActionLoading === 'all' ? 'Marking all...' : 'Mark all as read'}
                </button>
              )}
            </div>
            <section className="subheader-row notifications-filter-row">
              <div className="subheader-left">
                <label className="notification-status-filter">
                  <span>Status</span>
                  <select
                    value={selectedReadStatus}
                    onChange={(event) => { setSelectedReadStatus(event.target.value); setPage(1); }}
                    aria-label="Filter notifications by read status"
                  >
                    <option value="all">All ({counts.all})</option>
                    <option value="unread">Unread ({counts.unread})</option>
                    <option value="read">Read ({counts.read})</option>
                  </select>
                </label>
              </div>
              <div className="subheader-right">
                <div className="search-container">
                  <SearchIcon />
                  <div className="search-field-container">
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                      placeholder="Search notifications..."
                      className="search-input-field"
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
                  onClick={() => setSelectedNotificationsReadState(true)}
                  disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0 || selectedUnreadCount === 0}
                >
                  {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as read'}
                </button>
                <button
                  type="button"
                  className="notification-bulk-button"
                  onClick={() => setSelectedNotificationsReadState(false)}
                  disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0 || selectedReadCount === 0}
                >
                  {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as unread'}
                </button>
                <button
                  type="button"
                  className="notification-bulk-button"
                  onClick={() => setSelectedIds([])}
                  disabled={Boolean(bulkActionLoading)}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
        onRowClick={openNotification}
        getGroupLabel={(notification) => notificationDateGroup(notification.createdAt)}
        emptyMessage={loading
          ? 'Loading notifications...'
          : query
            ? 'No notifications match your search.'
            : selectedReadStatus === 'unread' && counts.unread === 0
              ? "You're all caught up."
              : total === 0 && counts.all === 0
                ? 'No notifications yet.'
                : 'No notifications match the selected filters.'}
      />
          <CommunityPagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
            rangeStart={total ? startIndex + 1 : 0}
            rangeEnd={Math.min(startIndex + perPage, total)}
            totalItems={total}
          />
      <NotificationDetailsModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markNotificationRead}
        onToggleRead={(notification, isRead) => setNotificationReadState(notification, isRead)}
        markingRead={markingNotificationIds.some((id) => String(id) === String(selectedNotification?.id))}
        onOpenRelated={(notification) => {
          const destination = getNotificationDestination(notification);
          if (destination) {
            setSelectedNotification(null);
            navigate(destination);
          }
        }}
        error={error}
      />
    </div>
  );
}