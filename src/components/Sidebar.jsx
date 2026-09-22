import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/Logo (2).png';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole } from '../utils/permissions';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/community', label: 'Community', icon: '👥' },
  { to: '/beneficiary', label: 'Beneficiary', icon: '🎯' },
  { to: '/monitoring', label: 'Monitor', icon: '📈' },
  { to: '/program', label: 'Program', icon: '📚' },
  { to: '/progress-report', label: 'Progress Report', icon: '📝' },
  { to: '/user-management', label: 'User Management', icon: '🔧' },
];

export default function Sidebar() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isHealthWorker = ['health worker', 'healthworker']
    .includes(String(currentUser?.role || '').trim().toLowerCase());
  const visibleItems = isSuperAdmin
    ? items.filter((item) => ['/dashboard', '/user-management'].includes(item.to))
    : items.filter((item) => item.to !== '/user-management' && (!isHealthWorker || item.to !== '/user-management'));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="logo-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img src={logo} alt="F1KD logo" className="logo" />
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
          >
            <span className="icon">{it.icon}</span>
            <span className="label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
