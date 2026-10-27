import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/formatting/nameFormat';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole } from '../utils/permissions';
import { getRouteBreadcrumbs } from '../utils/navigation/routeBreadcrumbs.mjs';
import { apiGetNotifications, apiSetNotificationRead } from '../api/notifications';
import NotificationDetailsModal from './ui/NotificationDetailsModal';
import FloatingLayer from './ui/FloatingLayer';
import ConfirmDialog from './ui/ConfirmDialog';

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const current = auth?.currentUser;
  const user = current ? { name: current.name, email: current.email, role: current.role } : null;
  const breadcrumbs = getRouteBreadcrumbs(location.pathname, location.state);
  const canReadNotifications = hasRole(current?.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER]);
  const [openNotif, setOpenNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationDetailsError, setNotificationDetailsError] = useState('');
  const [markingNotificationId, setMarkingNotificationId] = useState(null);
  const [openUser, setOpenUser] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const markingNotificationIdsRef = useRef(new Set());

  useEffect(() => {
    if (!canReadNotifications) {
      setNotificationCount(0);
      return undefined;
    }
    let active = true;
    const refreshNotificationCount = () => {
      apiGetNotifications({ page: 1, perPage: 1 })
        .then((response) => {
          if (active) setNotificationCount(Math.max(0, Number(response.counts?.unread) || 0));
        })
        .catch((error) => {
          if (active) console.error('Unable to refresh notification badge:', error);
        });
    };
    const handleReadStateChange = () => refreshNotificationCount();
    window.addEventListener('notifications:read-state-changed', handleReadStateChange);
    refreshNotificationCount();
    const interval = window.setInterval(refreshNotificationCount, 60000);
    return () => {
      active = false;
      window.removeEventListener('notifications:read-state-changed', handleReadStateChange);
      window.clearInterval(interval);
    };
  }, [canReadNotifications, current?.id]);

  useEffect(() => {
    if (!openNotif || !canReadNotifications) return undefined;
    let active = true;
    setNotificationsLoading(true);
    setNotificationsError('');
    apiGetNotifications({ page: 1, perPage: 5 })
      .then((response) => {
        if (active) {
          setNotifications(response.notifications || []);
          setNotificationCount(Math.max(0, Number(response.counts?.unread) || 0));
        }
      })
      .catch((error) => {
        if (!active) return;
        setNotifications([]);
        setNotificationsError(error.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });
    return () => { active = false; };
  }, [canReadNotifications, openNotif]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setOpenUser(false);
      setSigningOut(true);
      await Promise.resolve();
      auth.logout();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed', error);
      setSignOutError(error.message || 'Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const openNotificationDetails = (notification) => {
    setSelectedNotification(notification);
    setNotificationDetailsError('');
    setOpenNotif(false);
    if (!notification.isRead) void markNotificationRead(notification, true);
  };

  const markNotificationRead = async (notification, isRead = true) => {
    if (notification.isRead === isRead || markingNotificationIdsRef.current.has(notification.id)) return;
    markingNotificationIdsRef.current.add(notification.id);
    setMarkingNotificationId(notification.id);
    try {
      const response = await apiSetNotificationRead(notification.id, isRead);
      const changed = Number(response.changed) || 0;
      setSelectedNotification((current) => current?.id === notification.id
        ? { ...current, isRead }
        : current);
      if (changed > 0) {
        setNotificationCount((count) => Math.max(0, count + (isRead ? -changed : changed)));
      }
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, isRead } : item
      )));
      setNotificationDetailsError('');
    } catch (error) {
      setNotificationDetailsError(error.message || 'Unable to mark notification as read.');
      setNotificationsError(error.message || 'Unable to mark notification as read.');
    } finally {
      markingNotificationIdsRef.current.delete(notification.id);
      setMarkingNotificationId(null);
    }
  };

  return (
    <header className="topbar">
      <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <span className="topbar-breadcrumb-separator" aria-hidden="true">/</span>}
              {item.to && !isCurrent
                ? <Link to={item.to} className="topbar-breadcrumb-link">{item.label}</Link>
                : <span className="topbar-breadcrumb-current" aria-current={isCurrent ? 'page' : undefined}>{item.label}</span>}
            </React.Fragment>
          );
        })}
      </nav>
      <div className="topbar-actions">
        <span className="action-wrapper">
          <button
            ref={notifRef}
            className="icon-button notification-button"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} available` : ''}`}
            aria-haspopup="menu"
            aria-expanded={openNotif}
            onClick={() => { if (!signingOut) { setOpenUser(false); setOpenNotif((open) => !open); } }}
            disabled={signingOut}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            {notificationCount > 0 && (
              <span className="notification-badge" aria-hidden="true">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          <FloatingLayer
            open={openNotif}
            anchorRef={notifRef}
            onDismiss={() => setOpenNotif(false)}
            className="dropdown notifications-dropdown"
            role="menu"
            aria-label="Recent notifications"
          >
              <div className="dropdown-header">Recent</div>
              <div className="notifications-list">
                {canReadNotifications && notificationsLoading && <div className="dropdown-item muted">Loading notifications...</div>}
                {canReadNotifications && !notificationsLoading && notificationsError && <div className="dropdown-item muted">{notificationsError}</div>}
                {canReadNotifications && !notificationsLoading && notifications.map((notification) => (
                  <div key={notification.id} className={`notification-dropdown-item${notification.isRead ? '' : ' is-unread'}`}>
                    <button
                      type="button"
                      className="notification-dropdown-content"
                      onClick={() => openNotificationDetails(notification)}
                      role="menuitem"
                    >
                      <span className="notification-dropdown-title">{notification.title || notification.category}</span>
                      <span className="notification-dropdown-message" title={notification.message}>{notification.message}</span>
                      <span className="notification-dropdown-category">
                        {[notification.actorName, notification.actorRole, notification.category].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                    {!notification.isRead && (
                      <button
                        type="button"
                        className="notification-dropdown-mark-read"
                        onClick={() => markNotificationRead(notification)}
                        disabled={markingNotificationId === notification.id}
                        aria-label={`Mark "${notification.title || notification.category}" as read`}
                        role="menuitem"
                      >
                        {markingNotificationId === notification.id ? 'Marking...' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                ))}
                {(!canReadNotifications || (!notificationsLoading && !notificationsError && notifications.length === 0)) && (
                  <div className="dropdown-item muted">No notifications</div>
                )}
              </div>
              {canReadNotifications && (
                <button
                  type="button"
                  className="notification-dropdown-all"
                  onClick={() => { setOpenNotif(false); navigate('/notifications'); }}
                  role="menuitem"
                >
                  View all
                </button>
              )}
          </FloatingLayer>
        </span>

        <span className="action-wrapper user-profile">
          <button
            ref={userRef}
            className="user-button"
            aria-label={`Account menu for ${user ? user.name : 'Account'}`}
            aria-haspopup="menu"
            aria-expanded={openUser}
            onClick={() => { if (signingOut) return; setOpenUser((s) => !s); setOpenNotif(false); }}
            title={user ? user.name : 'Account'}
            disabled={signingOut}
          >
            <span className="avatar">{getInitials(user ? user.name : 'Account')}</span>
          </button>
          <FloatingLayer
            open={openUser}
            anchorRef={userRef}
            onDismiss={() => setOpenUser(false)}
            className="dropdown user-dropdown"
            role="menu"
            aria-label="User menu"
            aria-busy={signingOut}
          >
              {user ? (
                <>
                  <div className="dropdown-item">{user.name}</div>
                  <div className="dropdown-separator" />
                  <button type="button" className="dropdown-item" role="menuitem" onClick={() => { setOpenUser(false); navigate('/profile'); }}>
                    Profile
                  </button>
                  <button type="button" className="dropdown-item" role="menuitem" onClick={() => { setOpenUser(false); navigate('/settings'); }}>
                    Settings
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setSignOutError('');
                      setOpenUser(false);
                      setShowSignOutModal(true);
                    }}
                    aria-busy={signingOut}
                    role="menuitem"
                    disabled={signingOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div className="dropdown-item">Not signed in</div>
                  <button type="button" className="dropdown-item" role="menuitem" onClick={() => navigate('/login')}>
                    Sign in
                  </button>
                </>
              )}
          </FloatingLayer>
        </span>
      </div>

      <ConfirmDialog
        open={showSignOutModal}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        variant="destructive"
        confirmLabel="Sign out"
        loadingLabel="Signing out..."
        loading={signingOut}
        error={signOutError}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />
      <NotificationDetailsModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markNotificationRead}
        onToggleRead={markNotificationRead}
        onOpenRelated={(notification) => {
          const destination = String(notification.linkTo || '').trim();
          if (destination.startsWith('/') && !destination.startsWith('//') && !destination.includes('\\') && destination !== '/notifications') {
            setSelectedNotification(null);
            navigate(destination);
          }
        }}
        markingRead={markingNotificationId === selectedNotification?.id}
        error={notificationDetailsError}
      />
    </header>
  );
}
