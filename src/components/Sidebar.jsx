import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole } from '../utils/permissions';

const items = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/community', label: 'Community' },
  { to: '/beneficiary', label: 'Beneficiary' },
  { to: '/monitoring', label: 'Monitor' },
  { to: '/program', label: 'Program' },
  { to: '/progress-report', label: 'Progress Report' },
  { to: '/user-management', label: 'User Management' },
];

export default function Sidebar() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = items.filter((item) => item.to !== '/user-management' || hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]));
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="logo-badge">
          <img src={logo} alt="F1KD logo" className="logo" />
        </div>
        {!collapsed && (
          <div className="brand" aria-label="F1KD Digital Health Monitoring System">
            <span className="brand-line brand-line-primary">F1KD</span>
            <span className="brand-line">Digital Health</span>
            <span className="brand-line">Monitoring System</span>
          </div>
        )}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({isActive}) => 'sidebar-link' + (isActive ? ' active' : '')}
            data-label={it.label}
          >
            <span className="label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
