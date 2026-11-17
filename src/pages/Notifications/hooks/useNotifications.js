import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiBulkSetNotificationsRead,
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiSetNotificationRead,
} from '../../../api/notifications';
import { getNotificationDestination } from '../../../utils/notificationUtils.mjs';

export default function useNotifications() {
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

  const selectedIdKeys = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedNotifications = notifications.filter((notification) => selectedIdKeys.has(String(notification.id)));
  const selectedUnreadCount = selectedNotifications.filter((notification) => !notification.isRead).length;
  const selectedReadCount = selectedNotifications.length - selectedUnreadCount;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;

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

  const updateQuery = (value) => {
    setQuery(value);
    setPage(1);
  };

  const updateReadStatus = (value) => {
    setSelectedReadStatus(value);
    setPage(1);
  };

  const updatePerPage = (value) => {
    setPerPage(Number(value));
    setPage(1);
  };

  const clearSelection = () => setSelectedIds([]);

  const openRelatedNotification = (notification) => {
    const destination = getNotificationDestination(notification);
    if (!destination) return;
    setSelectedNotification(null);
    navigate(destination);
  };

  return {
    query,
    page,
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
    markNotificationRead: (notification) => setNotificationReadState(notification, true),
    markAllNotificationsRead,
    setSelectedNotificationsReadState,
    toggleNotificationSelection,
    toggleCurrentPageSelection,
    openRelatedNotification,
    clearSelection,
  };
}
