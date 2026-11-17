import React from 'react';
import PageHeader from '../../components/ui/PageHeader';
import CommunityPagination from '../Community/components/CommunityPagination';
import NotificationDetailsModal from '../../components/ui/NotificationDetailsModal';
import NotificationsTable from './components/NotificationsTable';
import NotificationsToolbar from './components/NotificationsToolbar';
import useNotifications from './hooks/useNotifications';
import { getNotificationDateGroup } from './utils/notificationUtils.mjs';

export default function NotificationsPage() {
  const notificationsState = useNotifications();
  const {
    query,
    perPage,
    selectedReadStatus,
    notifications,
    selectedIds,
    selectedIdKeys,
    total,
    counts,
    loading,
    error,
    selectedNotification,
    markingNotificationIds,
    bulkActionLoading,
    selectedUnreadCount,
    selectedReadCount,
    pageCount,
    currentPage,
    startIndex,
    setPage,
    setSelectedNotification,
    updateQuery,
    updateReadStatus,
    updatePerPage,
    openNotification,
    setNotificationReadState,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedNotificationsReadState,
    toggleNotificationSelection,
    toggleCurrentPageSelection,
    openRelatedNotification,
    clearSelection,
  } = notificationsState;

  const emptyMessage = loading
    ? 'Loading notifications...'
    : query
      ? 'No notifications match your search.'
      : selectedReadStatus === 'unread' && counts.unread === 0
        ? "You're all caught up."
        : total === 0 && counts.all === 0
          ? 'No notifications yet.'
          : 'No notifications match the selected filters.';

  return (
    <div className="community-page">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Community', href: '/community' }, { label: 'Notifications' }]}
      />

      {error && <div role="alert" className="error-message">{error}</div>}
      <NotificationsTable
        notifications={notifications}
        selectedIdKeys={selectedIdKeys}
        onToggleSelection={toggleNotificationSelection}
        onToggleCurrentPageSelection={toggleCurrentPageSelection}
        onRowClick={openNotification}
        getGroupLabel={(notification) => getNotificationDateGroup(notification.createdAt)}
        emptyMessage={emptyMessage}
        bulkActionLoading={bulkActionLoading}
        loading={loading}
        tableTitle={(
          <NotificationsToolbar
            selectedIds={selectedIds}
            selectedUnreadCount={selectedUnreadCount}
            selectedReadCount={selectedReadCount}
            selectedReadStatus={selectedReadStatus}
            counts={counts}
            query={query}
            bulkActionLoading={bulkActionLoading}
            markingNotificationIds={markingNotificationIds}
            onMarkAllRead={markAllNotificationsRead}
            onSetSelectedReadState={setSelectedNotificationsReadState}
            onClearSelection={clearSelection}
            onReadStatusChange={updateReadStatus}
            onQueryChange={updateQuery}
          />
        )}
      />
      <CommunityPagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={updatePerPage}
        rangeStart={total ? startIndex + 1 : 0}
        rangeEnd={Math.min(startIndex + perPage, total)}
        totalItems={total}
      />
      <NotificationDetailsModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markNotificationRead}
        onToggleRead={setNotificationReadState}
        markingRead={markingNotificationIds.some((id) => String(id) === String(selectedNotification?.id))}
        onOpenRelated={openRelatedNotification}
        error={error}
      />
    </div>
  );
}
