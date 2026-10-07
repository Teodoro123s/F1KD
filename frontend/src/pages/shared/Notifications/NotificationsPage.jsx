import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { SearchIcon } from '../Community/CommunityIcons';
import { apiGetNotifications } from '../../../api/notifications';
import { useAuth } from '../../../auth/AuthProvider';
import { hasRole, isHealthWorkerRole, ROLES } from '../../../utils/permissions';

const CATEGORIES = ['All', 'Beneficiaries', 'Monitoring', 'Programs', 'Downloads', 'Community', 'User Management'];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const categories = isHealthWorker
    ? ['All', 'Monitoring', 'Beneficiaries']
    : isSuperAdmin
      ? ['Community', 'User Management']
      : CATEGORIES.filter((item) => item !== 'User Management');
  const [category, setCategory] = useState('All');
  const selectedCategory = categories.includes(category) ? category : categories[0];
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetNotifications({ page, perPage, search: query, category: selectedCategory })
      .then((response) => {
        if (!active) return;
        setNotifications(response.notifications || []);
        setTotal(Number(response.total) || 0);
      })
      .catch((requestError) => {
        if (!active) return;
        setNotifications([]);
        setTotal(0);
        setError(requestError.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, perPage, query, selectedCategory]);

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;

  const columns = [
    { key: 'title', header: 'Subject', style: { width: '22%' } },
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
      style: { width: '13%' },
      renderCell: (notification) => new Date(notification.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      key: 'action',
      header: 'Action',
      style: { width: '8%' },
      renderCell: (notification) => notification.linkTo && notification.linkTo !== '/notifications' ? (
        <button
          type="button"
          className="btn-secondary"
          style={{ minHeight: '30px', padding: '0.25rem 0.65rem', fontSize: '0.82rem' }}
          onClick={(event) => {
            event.stopPropagation();
            navigate(notification.linkTo);
          }}
        >
          View
        </button>
      ) : '—',
    },
  ];

  return (
    <div className="community-page">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Community', href: '/community' }, { label: 'Notifications' }]}
      />

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
        onRowClick={(row) => {
          if (row.linkTo && row.linkTo !== '/notifications') {
            navigate(row.linkTo);
          }
        }}
        emptyMessage={loading ? 'Loading notifications...' : error || 'No notifications match your search or category filter.'}
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
    </div>
  );
}