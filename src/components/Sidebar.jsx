import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/f1kd-logo.png';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole, isCommunityCoordinatorRole } from '../utils/permissions';
import { ActivityIcon, BatchesIcon, BuildingIcon, GroupsIcon, UsersIcon } from '../pages/Community/CommunityIcons';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: ActivityIcon },
  { to: '/community', label: 'Community', icon: BuildingIcon },
  { to: '/beneficiary', label: 'Beneficiary', icon: UsersIcon },
  { to: '/monitoring', label: 'Monitor', icon: ActivityIcon },
  { to: '/program', label: 'Program', icon: GroupsIcon },
  { to: '/progress-report', label: 'Progress Report', icon: BatchesIcon },
  { to: '/user-management', label: 'User Management', icon: UsersIcon },
];

function NotificationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </svg>
  );
}

export default function Sidebar() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 720px)').matches
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mobileViewport = window.matchMedia('(max-width: 720px)');
    const updateCollapsedState = (event) => setCollapsed(event.matches);
    mobileViewport.addEventListener('change', updateCollapsedState);
    return () => mobileViewport.removeEventListener('change', updateCollapsedState);
  }, []);

  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const notificationsItem = { to: '/notifications', label: 'Notifications', icon: NotificationIcon };
  const visibleItems = isSuperAdmin
    ? [...items.filter((item) => ['/dashboard', '/community', '/user-management'].includes(item.to)), {
      to: '/reports',
      label: 'Reports',
      icon: ReportsIcon,
    }, notificationsItem]
    : isCommunityOrganizer
      ? [...items.filter((item) => item.to !== '/user-management'), {
        to: '/user-management',
        label: 'User Management',
        icon: UsersIcon,
      }, notificationsItem]
    : [...items.filter((item) => item.to !== '/user-management'), notificationsItem];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        {!collapsed && <img src={logo} alt="F1KD logo" className="logo" />}
        {!collapsed && <div className="brand">F1KD</div>}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16m4-8h4m-2-2 2 2-2 2" />
            </svg>
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/dashboard'}
            className={({isActive}) => 'sidebar-link' + (isActive ? ' active' : '')}
            data-label={it.label}
            title={it.label}
          >
            <span className="icon" aria-hidden="true"><it.icon /></span>
            <span className="label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
