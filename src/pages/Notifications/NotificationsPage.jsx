import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { SearchIcon } from '../Community/CommunityIcons';
import { apiGetNotifications, apiMarkNotificationRead } from '../../api/notifications';
import NotificationDetailsModal from '../../components/ui/NotificationDetailsModal';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';

const CATEGORIES = ['All', 'Beneficiaries', 'Monitoring', 'Programs', 'Downloads', 'Community', 'User Management'];

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const categories = isHealthWorker
    ? ['All', 'Monitoring', 'Beneficiaries']
    : isSuperAdmin
      ? ['All', 'Community', 'User Management']
      : CATEGORIES.filter((item) => item !== 'User Management');
  const [category, setCategory] = useState('All');
  const selectedCategory = categories.includes(category) ? category : categories[0];
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedReadStatus, setSelectedReadStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [markingNotificationId, setMarkingNotificationId] = useState(null);

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

  const openNotification = (notification) => {
    setError('');
    setSelectedNotification(notification);
  };

  const markNotificationRead = async (notification) => {
    if (notification.isRead || markingNotificationId === notification.id) return;
    setMarkingNotificationId(notification.id);
    setError('');
    try {
      await apiMarkNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )));
      setSelectedNotification((current) => current?.id === notification.id
        ? { ...current, isRead: true }
        : current);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notification as read.');
    } finally {
      setMarkingNotificationId(null);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Subject',
      style: { width: '20%' },
      renderCell: (notification) => (
        <span style={{ fontWeight: notification.isRead ? 400 : 700 }}>{notification.title}</span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      style: { width: '42%' },
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
      style: { width: '15%' },
      renderCell: (notification) => (
        <span className="badge" style={{ background: '#F1F5F9', color: '#334155' }}>
          {notification.category}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      style: { width: '12%' },
      renderCell: (notification) => new Date(notification.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      key: 'readStatus',
      header: 'Status',
      style: { width: '8%' },
      renderCell: (notification) => (
        <span
          className="badge"
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
      style: { width: '12%' },
      renderCell: (notification) => notification.isRead ? (
        <span style={{ color: '#64748B', fontSize: '0.85rem' }}>—</span>
      ) : (
        <button
          type="button"
          className="notification-mark-read-button"
          onClick={(event) => {
            event.stopPropagation();
            markNotificationRead(notification);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={markingNotificationId === notification.id}
          aria-label={`Mark "${notification.title}" as read`}
        >
          {markingNotificationId === notification.id ? 'Marking...' : 'Mark as read'}
        </button>
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
        toggleOnSelect
        onSelect={(key) => {
          setSelectedReadStatus(key);
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
          <section className="subheader-row" style={{ alignItems: 'center', gap: '1rem' }}>
            <div className="subheader-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

          <CommunityTable
            columns={columns}
            data={notifications}
            tableTitle="Notifications timeline"
            onRowClick={openNotification}
            emptyMessage={loading ? 'Loading notifications...' : 'No notifications match your search or category filter.'}
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
        markingRead={markingNotificationId === selectedNotification?.id}
        error={error}
      />
    </div>
  );
}