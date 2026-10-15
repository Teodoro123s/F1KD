import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/nameFormat';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole } from '../utils/permissions';
import { apiGetNotifications, apiMarkNotificationRead } from '../api/notifications';
import NotificationDetailsModal from './ui/NotificationDetailsModal';

export default function Topbar() {
  const navigate = useNavigate();
  const auth = useAuth();
  const current = auth?.currentUser;
  const user = current ? { name: current.name, email: current.email, role: current.role } : null;
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
  const [signingOut, setSigningOut] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
      if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

  useEffect(() => {
    if (!showSignOutModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !signingOut) setShowSignOutModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showSignOutModal, signingOut]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setShowSignOutModal(false);
      setOpenUser(false);
      setSigningOut(true);
      await Promise.resolve();
      auth.logout();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed', error);
    } finally {
      setSigningOut(false);
    }
  };

  const openNotificationDetails = (notification) => {
    setSelectedNotification(notification);
    setNotificationDetailsError('');
    setOpenNotif(false);
  };

  const markNotificationRead = async (notification) => {
    if (notification.isRead || markingNotificationId === notification.id) return;
    setMarkingNotificationId(notification.id);
    try {
      await apiMarkNotificationRead(notification.id);
      setSelectedNotification((current) => current?.id === notification.id
        ? { ...current, isRead: true }
        : current);
      setNotificationCount((count) => Math.max(0, count - 1));
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )));
      setNotificationDetailsError('');
    } catch (error) {
      setNotificationDetailsError(error.message || 'Unable to mark notification as read.');
      setNotificationsError(error.message || 'Unable to mark notification as read.');
    } finally {
      setMarkingNotificationId(null);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <span className="action-wrapper" ref={notifRef}>
          <button
            className="icon-button notification-button"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} available` : ''}`}
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
          {openNotif && (
            <div className="dropdown notifications-dropdown" role="menu" aria-label="Recent notifications">
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
                >
                  View all
                </button>
              )}
            </div>
          )}
        </span>

        <span className="action-wrapper user-profile" ref={userRef}>
          <button
            className="user-button"
            aria-label={`Account menu for ${user ? user.name : 'Account'}`}
            onClick={() => { if (signingOut) return; setOpenUser((s) => !s); setOpenNotif(false); }}
            title={user ? user.name : 'Account'}
            disabled={signingOut}
          >
            <span className="avatar">{getInitials(user ? user.name : 'Account')}</span>
          </button>
          {openUser && (
            <div className="dropdown user-dropdown" role="menu" aria-label="User menu" aria-busy={signingOut}>
              {user ? (
                <>
                  <div className="dropdown-item">{user.name}</div>
                  <div className="dropdown-separator" />
                  <div className="dropdown-item" role="button" onClick={() => { setOpenUser(false); navigate('/profile'); }}>Profile</div>
                  <div className="dropdown-item" role="button" onClick={() => { setOpenUser(false); navigate('/settings'); }}>Settings</div>
                  <div
                    className="dropdown-item"
                    onClick={() => { if (!signingOut) setShowSignOutModal(true); }}
                    aria-busy={signingOut}
                    role="button"
                    style={{ opacity: signingOut ? 0.6 : 1, pointerEvents: signingOut ? 'none' : 'auto' }}
                  >
                    {signingOut ? '⏳ Signing out...' : 'Sign out'}
                  </div>
                </>
              ) : (
                <>
                  <div className="dropdown-item">Not signed in</div>
                  <div className="dropdown-item" onClick={() => navigate('/login')}>Sign in</div>
                </>
              )}
            </div>
          )}
        </span>
      </div>

      {showSignOutModal && createPortal((
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !signingOut) setShowSignOutModal(false);
          }}
        >
          <div
            className="modal-content signout-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header-section">
              <h3 id="signout-confirm-title">Sign out?</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowSignOutModal(false)}
                aria-label="Close sign-out confirmation"
                disabled={signingOut}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to sign out of your account?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowSignOutModal(false)} disabled={signingOut}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
      <NotificationDetailsModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={markNotificationRead}
        markingRead={markingNotificationId === selectedNotification?.id}
        error={notificationDetailsError}
      />
    </header>
  );
}
