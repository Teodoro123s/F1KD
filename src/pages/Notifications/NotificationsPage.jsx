import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { SearchIcon } from '../Community/CommunityIcons';
import {
  apiBulkSetNotificationsRead,
  apiGetNotifications,
  apiGetNotificationPreferences,
  apiMarkAllNotificationsRead,
  apiSaveNotificationPreferences,
  apiSetNotificationRead,
} from '../../api/notifications';
import NotificationDetailsModal from '../../components/ui/NotificationDetailsModal';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';

const CATEGORIES = ['All', 'Beneficiaries', 'Monitoring', 'Programs', 'Downloads', 'Community', 'User Management'];

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
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const categories = isHealthWorker
    ? ['All', 'Monitoring', 'Beneficiaries']
    : isSuperAdmin
      ? ['All', 'Community', 'User Management']
      : CATEGORIES.filter((item) => item !== 'User Management');
  const preferenceCategories = categories.filter((item) => item !== 'All');
  const preferenceCategoryKey = preferenceCategories.join('|');
  const [category, setCategory] = useState('All');
  const selectedCategory = categories.includes(category) ? category : categories[0];
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
  const [notificationPreferences, setNotificationPreferences] = useState({});
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesLoadKey, setPreferencesLoadKey] = useState(0);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const actionLocks = useRef(new Set());

  useEffect(() => {
    let active = true;
    setPreferencesLoading(true);
    setPreferencesError('');
    apiGetNotificationPreferences()
      .then((response) => {
        if (!active) return;
        setNotificationPreferences(Object.fromEntries(
          (response.preferences || []).map(({ category: item, enabled }) => [item, enabled]),
        ));
      })
      .catch((requestError) => {
        if (active) setPreferencesError(requestError.message || 'Unable to load notification preferences.');
      })
      .finally(() => {
        if (active) setPreferencesLoading(false);
      });
    return () => { active = false; };
  }, [currentUser?.id, preferenceCategoryKey, preferencesLoadKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetNotifications({
      page,
      perPage,
      search: query,
      category: selectedCategory,
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
  }, [page, perPage, query, selectedCategory, selectedReadStatus, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;

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
        item.id === notification.id ? { ...item, isRead } : item
      )));
      setSelectedNotification((current) => current?.id === notification.id
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
        selectedIds.includes(item.id) ? { ...item, isRead } : item
      )));
      setSelectedNotification((current) => current && selectedIds.includes(current.id)
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

  const savePreferences = async () => {
    if (preferencesLoading || preferencesSaving || preferencesError) return;
    setPreferencesSaving(true);
    setPreferencesError('');
    setPreferencesMessage('');
    try {
      const preferences = preferenceCategories.map((item) => ({
        category: item,
        enabled: notificationPreferences[item] !== false,
      }));
      await apiSaveNotificationPreferences(preferences);
      setPreferencesMessage('Notification preferences saved.');
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setPreferencesError(requestError.message || 'Unable to save notification preferences.');
    } finally {
      setPreferencesSaving(false);
    }
  };

  const toggleNotificationSelection = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleCurrentPageSelection = () => {
    const pageIds = notifications.map((notification) => notification.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !pageIds.includes(id))
      : [...new Set([...current, ...pageIds])]);
  };

  const columns = [
    {
      key: 'selection',
      header: (
        <input
          type="checkbox"
          checked={notifications.length > 0 && notifications.every((notification) => selectedIds.includes(notification.id))}
          onChange={toggleCurrentPageSelection}
          aria-label="Select all notifications on this page"
          disabled={Boolean(bulkActionLoading) || loading || notifications.length === 0}
        />
      ),
      className: 'notifications-timeline-selection',
      renderCell: (notification) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(notification.id)}
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
          <span>{notification.message}</span>
          {notification.actorName && (
            <small className="notification-actor">
              By {notification.actorName}{notification.actorRole ? ` · ${notification.actorRole}` : ''}
            </small>
          )}
        </>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'notifications-timeline-category',
      renderCell: (notification) => (
        <span className="badge notifications-timeline-badge" style={{ background: '#F1F5F9', color: '#334155' }}>
          {notification.category}
        </span>
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
    {
      key: 'readStatus',
      header: 'Status',
      className: 'notifications-timeline-status',
      renderCell: (notification) => (
        <span
          className="badge notifications-timeline-badge"
          style={notification.isRead
            ? { background: '#F1F5F9', color: '#475569' }
            : { background: '#DBEAFE', color: '#1D4ED8' }}
        >
          {notification.isRead ? 'Read' : 'Unread'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'notifications-timeline-action',
      renderCell: (notification) => (
        <div className="notification-row-actions">
          <button
            type="button"
            className="notification-mark-read-button"
            onClick={(event) => {
              event.stopPropagation();
              setNotificationReadState(notification, !notification.isRead);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            disabled={markingNotificationIds.includes(notification.id) || Boolean(bulkActionLoading)}
            aria-label={`Mark "${notification.title}" as ${notification.isRead ? 'unread' : 'read'}`}
          >
            {markingNotificationIds.includes(notification.id)
              ? 'Saving...'
              : notification.isRead ? 'Mark unread' : 'Mark as read'}
          </button>
          <button
            type="button"
            className="notification-view-button"
            onClick={(event) => {
              event.stopPropagation();
              openNotification(notification);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={`View "${notification.title}"`}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
              <path d="M1.75 10s2.9-5 8.25-5 8.25 5 8.25 5-2.9 5-8.25 5-8.25-5-8.25-5Z" />
              <circle cx="10" cy="10" r="2.25" />
            </svg>
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="community-page">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Community', href: '/community' }, { label: 'Notifications' }]}
      />

      <ModuleSummaryCards
        selected={selectedReadStatus}
        onSelect={(key) => {
          setSelectedReadStatus(key || 'all');
          setPage(1);
        }}
        cards={[
          { key: 'all', label: 'All Notifications', value: counts.all, description: 'View all notifications' },
          { key: 'unread', label: 'Unread', value: counts.unread, description: 'View unread notifications' },
          { key: 'read', label: 'Read', value: counts.read, description: 'View read notifications' },
        ]}
      />

      {selectedReadStatus && (
        <>
          {error && <div role="alert" className="error-message">{error}</div>}
          <details className="notification-preferences">
            <summary>Notification preferences</summary>
            <p>Turn categories off to hide them from your timeline and unread count. Notifications remain stored and can be shown again later.</p>
            {preferencesError && (
              <div role="alert" className="error-message">
                {preferencesError}
                <button
                  type="button"
                  onClick={() => setPreferencesLoadKey((key) => key + 1)}
                  disabled={preferencesLoading}
                >
                  Retry
                </button>
              </div>
            )}
            <div className="notification-preferences-options">
              {preferenceCategories.map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={notificationPreferences[item] !== false}
                    onChange={(event) => {
                      setNotificationPreferences((current) => ({ ...current, [item]: event.target.checked }));
                      setPreferencesMessage('');
                    }}
                    disabled={preferencesLoading || preferencesSaving || Boolean(preferencesError)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className="notification-preferences-actions">
              <button
                type="button"
                className="notification-bulk-button notification-bulk-button--primary"
                onClick={savePreferences}
                disabled={preferencesLoading || preferencesSaving || Boolean(preferencesError)}
              >
                {preferencesLoading ? 'Loading...' : preferencesSaving ? 'Saving...' : 'Save preferences'}
              </button>
              {preferencesMessage && <span role="status">{preferencesMessage}</span>}
            </div>
          </details>
          <section className="subheader-row" style={{ alignItems: 'center', gap: '1rem' }}>
            <div className="subheader-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="status-toggle-group" role="group" aria-label="Filter notifications by read status">
                {['all', 'unread', 'read'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`status-toggle-btn${selectedReadStatus === status ? ' active' : ''}`}
                    aria-pressed={selectedReadStatus === status}
                    onClick={() => { setSelectedReadStatus(status); setPage(1); }}
                  >
                    {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}
                  </button>
                ))}
              </div>
              <label className="notification-category-filter">
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter notifications by category"
                >
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>
              <span role="status" aria-live="polite" style={{ fontSize: '0.9rem', color: '#64748B' }}>
                {total} {total === 1 ? 'notification' : 'notifications'}
              </span>
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
              <span>{selectedIds.length} selected</span>
              <button
                type="button"
                className="notification-bulk-button notification-bulk-button--primary"
                onClick={() => setSelectedNotificationsReadState(true)}
                disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0}
              >
                {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as read'}
              </button>
              <button
                type="button"
                className="notification-bulk-button"
                onClick={() => setSelectedNotificationsReadState(false)}
                disabled={Boolean(bulkActionLoading) || markingNotificationIds.length > 0}
              >
                {bulkActionLoading === 'selection' ? 'Saving...' : 'Mark selected as unread'}
              </button>
              <button type="button" className="notification-bulk-button" onClick={() => setSelectedIds([])} disabled={Boolean(bulkActionLoading)}>
                Clear selection
              </button>
            </div>
          )}

          <CommunityTable
            columns={columns}
            data={notifications}
            tableClassName="notifications-timeline-table"
            tableTitle={(
              <div className="notifications-timeline-heading">
                <div>
                  <h2>Notifications timeline</h2>
                  <span>{total} {total === 1 ? 'notification' : 'notifications'} · {counts.unread} unread</span>
                </div>
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
        </>
      )}
      <NotificationDetailsModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markNotificationRead}
        onToggleRead={(notification, isRead) => setNotificationReadState(notification, isRead)}
        markingRead={markingNotificationIds.includes(selectedNotification?.id)}
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