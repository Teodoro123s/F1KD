import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/nameFormat';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole } from '../utils/permissions';
import { apiGetNotifications } from '../api/notifications';

export default function Topbar() {
  const navigate = useNavigate();
  const auth = useAuth();
  const current = auth?.currentUser;
  const user = current ? { name: current.name, email: current.email, role: current.role } : null;
  const canReadNotifications = hasRole(current?.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER]);
  const [openNotif, setOpenNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
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
    if (!openNotif || !canReadNotifications) return undefined;
    let active = true;
    setNotificationsLoading(true);
    setNotificationsError('');
    apiGetNotifications({ page: 1, perPage: 5 })
      .then((response) => {
        if (active) setNotifications(response.notifications || []);
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

  const openNotificationTarget = (notification) => {
    const target = String(notification.linkTo || '');
    const isCommunityTarget = target === '/community' || target.startsWith('/community/');
    const isUserTarget = target === '/user-management' || target.startsWith('/user-management/');
    const isProgressReportTarget = target === '/progress-report' || target.startsWith('/progress-report/');
    setOpenNotif(false);
    if (isCommunityTarget || isUserTarget || isProgressReportTarget) navigate(target);
    else navigate('/notifications');
  };

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <span className="action-wrapper" ref={notifRef}>
          <button
            className="icon-button"
            aria-label="Notifications"
            aria-expanded={openNotif}
            onClick={() => { if (!signingOut) { setOpenUser(false); setOpenNotif((open) => !open); } }}
            disabled={signingOut}
          >
            🔔
          </button>
          {openNotif && (
            <div className="dropdown notifications-dropdown" role="menu" aria-label="Recent notifications">
              <div className="dropdown-header">Recent notifications</div>
              <div className="notifications-list">
                {canReadNotifications && notificationsLoading && <div className="dropdown-item muted">Loading notifications...</div>}
                {canReadNotifications && !notificationsLoading && notificationsError && <div className="dropdown-item muted">{notificationsError}</div>}
                {canReadNotifications && !notificationsLoading && !notificationsError && notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="notification-dropdown-item"
                    onClick={() => openNotificationTarget(notification)}
                    role="menuitem"
                  >
                    <span className="notification-dropdown-title">{notification.title || notification.category}</span>
                    <span className="notification-dropdown-message">{notification.message}</span>
                    {notification.actorName && (
                      <span className="notification-dropdown-category">
                        By {notification.actorName}{notification.actorRole ? ` · ${notification.actorRole}` : ''}
                      </span>
                    )}
                    <span className="notification-dropdown-category">{notification.category}</span>
                  </button>
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
                  View all notifications
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
    </header>
  );
}
