import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/formatting/nameFormat';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole, formatRoleName } from '../utils/permissions';
import { getRouteBreadcrumbs } from '../utils/navigation/routeBreadcrumbs.mjs';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ArrowRight,
  UserCheck,
  Users,
  Activity,
  Building2,
  Menu,
  User as UserIcon,
  Settings,
  LogOut,
  LogIn,
  Shield,
  Mail,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  apiGetNotifications,
  apiSetNotificationRead,
  apiMarkAllNotificationsRead,
} from '../api/notifications';

function formatRelativeTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationCategoryIcon(category) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('user') || cat.includes('staff')) return <Users size={16} />;
  if (cat.includes('beneficiary') || cat.includes('mother') || cat.includes('child')) return <UserCheck size={16} />;
  if (cat.includes('monitor') || cat.includes('checkup') || cat.includes('screening')) return <Activity size={16} />;
  if (cat.includes('community') || cat.includes('school') || cat.includes('group') || cat.includes('batch')) return <Building2 size={16} />;
  return <Bell size={16} />;
}
import NotificationDetailsModal from './ui/NotificationDetailsModal';
import FloatingLayer from './ui/FloatingLayer';
import ConfirmDialog from './ui/ConfirmDialog';
import HelpCenter from './HelpCenter';
import AIReportingAssistantEntry from '../pages/AISetting/AIReportingAssistantEntry';

export default function Topbar({ onOpenMobile }) {
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
  const [markingAll, setMarkingAll] = useState(false);
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

  const markAllNotificationsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onOpenMobile && (
          <button
            type="button"
            className="topbar-mobile-menu-btn"
            onClick={onOpenMobile}
            aria-label="Open navigation menu"
            title="Open menu"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
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
      </div>
      <div className="topbar-actions">
        <HelpCenter currentUser={current} />
        <AIReportingAssistantEntry
          buttonClassName="topbar-ai-assistant-btn"
          label="AI Assistant"
          icon={Sparkles}
        />
        <span className="action-wrapper">
          <button
            ref={notifRef}
            className={`icon-button notification-button ${openNotif ? 'is-active' : ''}`}
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} available` : ''}`}
            aria-haspopup="menu"
            aria-expanded={openNotif}
            onClick={() => { if (!signingOut) { setOpenUser(false); setOpenNotif((open) => !open); } }}
            disabled={signingOut}
          >
            <Bell size={19} aria-hidden="true" />
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
            {/* Popover Header */}
            <div className="notif-popover-header">
              <div className="notif-popover-title-row">
                <span className="notif-popover-title">Notifications</span>
                {notificationCount > 0 && (
                  <span className="notif-unread-badge">
                    {notificationCount} new
                  </span>
                )}
              </div>
              {canReadNotifications && notificationCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all-btn"
                  onClick={markAllNotificationsRead}
                  disabled={markingAll}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="notifications-list notif-popover-list">
              {canReadNotifications && notificationsLoading && (
                <div className="notif-loading-wrap">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="notif-skeleton-item">
                      <div className="notif-skeleton-icon" />
                      <div className="notif-skeleton-content">
                        <div className="notif-skeleton-line short" />
                        <div className="notif-skeleton-line" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canReadNotifications && !notificationsLoading && notificationsError && (
                <div className="notif-error-item">{notificationsError}</div>
              )}

              {canReadNotifications && !notificationsLoading && !notificationsError && notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notif-item${notification.isRead ? '' : ' is-unread'}`}
                >
                  <button
                    type="button"
                    className="notif-item-body"
                    onClick={() => openNotificationDetails(notification)}
                    role="menuitem"
                  >
                    <div className="notif-item-icon-pill" aria-hidden="true">
                      {getNotificationCategoryIcon(notification.category)}
                    </div>
                    <div className="notif-item-text">
                      <div className="notif-item-top">
                        <span className="notif-item-title">
                          {notification.title || notification.category || 'Notification'}
                        </span>
                        {!notification.isRead && <span className="notif-item-pulse-dot" aria-hidden="true" />}
                        <span className="notif-item-time">
                          {formatRelativeTime(notification.createdAt || notification.created_at)}
                        </span>
                      </div>
                      <p className="notif-item-message" title={notification.message}>
                        {notification.message}
                      </p>
                      <div className="notif-item-meta">
                        {notification.category && (
                          <span className="notif-category-chip">{notification.category}</span>
                        )}
                        {notification.actorName && (
                          <span className="notif-actor-name">by {notification.actorName}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {!notification.isRead && (
                    <button
                      type="button"
                      className="notif-item-mark-read-btn"
                      onClick={() => markNotificationRead(notification)}
                      disabled={markingNotificationId === notification.id}
                      aria-label={`Mark "${notification.title || notification.category}" as read`}
                      title="Mark as read"
                      role="menuitem"
                    >
                      <Check size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}

              {(!canReadNotifications || (!notificationsLoading && !notificationsError && notifications.length === 0)) && (
                <div className="notif-empty-state">
                  <div className="notif-empty-icon" aria-hidden="true">
                    <BellOff size={28} />
                  </div>
                  <strong className="notif-empty-title">All caught up!</strong>
                  <p className="notif-empty-desc">No new notifications right now.</p>
                </div>
              )}
            </div>

            {/* Popover Footer */}
            {canReadNotifications && (
              <div className="notif-popover-footer">
                <button
                  type="button"
                  className="notif-view-all-btn"
                  onClick={() => { setOpenNotif(false); navigate('/notifications'); }}
                  role="menuitem"
                >
                  <span>View all notifications</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
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
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar" aria-hidden="true">
                    {getInitials(user.name || 'User')}
                  </div>
                  <div className="user-dropdown-info">
                    <span className="user-dropdown-name">{user.name}</span>
                    {user.email && (
                      <span className="user-dropdown-email">
                        <Mail size={12} aria-hidden="true" />
                        <span>{user.email}</span>
                      </span>
                    )}
                    <span className="user-dropdown-role-badge">
                      <Shield size={11} aria-hidden="true" />
                      <span>{formatRoleName(user.role)}</span>
                    </span>
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-menu">
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setOpenUser(false);
                      navigate('/profile');
                    }}
                  >
                    <UserIcon size={16} className="user-dropdown-item-icon" aria-hidden="true" />
                    <span className="user-dropdown-label">Profile</span>
                    <ChevronRight size={14} className="user-dropdown-chevron" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setOpenUser(false);
                      navigate('/settings');
                    }}
                  >
                    <Settings size={16} className="user-dropdown-item-icon" aria-hidden="true" />
                    <span className="user-dropdown-label">Settings</span>
                    <ChevronRight size={14} className="user-dropdown-chevron" aria-hidden="true" />
                  </button>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-menu">
                  <button
                    type="button"
                    className="user-dropdown-item is-danger"
                    onClick={() => {
                      setSignOutError('');
                      setOpenUser(false);
                      setShowSignOutModal(true);
                    }}
                    aria-busy={signingOut}
                    role="menuitem"
                    disabled={signingOut}
                  >
                    <LogOut size={16} className="user-dropdown-item-icon" aria-hidden="true" />
                    <span className="user-dropdown-label">{signingOut ? 'Signing out...' : 'Sign out'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-empty">Not signed in</div>
                <button
                  type="button"
                  className="user-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setOpenUser(false);
                    navigate('/login');
                  }}
                >
                  <LogIn size={16} className="user-dropdown-item-icon" aria-hidden="true" />
                  <span className="user-dropdown-label">Sign in</span>
                </button>
              </div>
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
