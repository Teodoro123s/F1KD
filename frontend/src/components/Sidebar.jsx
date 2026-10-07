import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import lightLogo from '../assets/f1kd-logo.png';
import darkLogo from '../assets/F1KD-bg-transparent.png';
import { useAuth } from '../auth/AuthProvider';
import { canAccessModule } from '../utils/permissions';
import { ActivityIcon, BatchesIcon, BellIcon, BuildingIcon, GroupsIcon, HomeIcon, UsersIcon } from './ui/ModuleIcons';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon, module: 'dashboard' },
  { to: '/community', label: 'Community', icon: BuildingIcon, module: 'community' },
  { to: '/beneficiary', label: 'Beneficiary', icon: UsersIcon, module: 'beneficiary' },
  { to: '/monitoring', label: 'Monitoring', icon: ActivityIcon, module: 'monitoring' },
  { to: '/notifications', label: 'Notifications', icon: BellIcon, module: 'notifications' },
  { to: '/program', label: 'Program', icon: GroupsIcon, module: 'program' },
  { to: '/progress-report', label: 'Progress Report', icon: BatchesIcon, module: 'progressReport' },
  { to: '/user-management', label: 'User Management', icon: UsersIcon, module: 'userManagement' },
];

export default function Sidebar() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = items.filter((item) => canAccessModule(currentUser?.role, item.module));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="logo-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img src={lightLogo} alt="F1KD logo" className="logo theme-logo theme-logo--light" />
          <img src={darkLogo} alt="" aria-hidden="true" className="logo theme-logo theme-logo--dark" />
        </button>
        {!collapsed && <div className="brand">F1KD</div>}
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
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
