import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.svg';

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
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <img src={logo} alt="logo" className="logo" />
        {!collapsed && <div className="brand">Sample Logo</div>}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map((it) => (
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
