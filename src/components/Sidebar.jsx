import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  User as UserIcon,
  Settings,
  LogOut,
  Shield,
  Mail,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import logo from '../assets/f1kd-logo.png';
import { useAuth } from '../auth/AuthProvider';
import { ROLES, hasRole, isCommunityCoordinatorRole, formatRoleName } from '../utils/permissions';
import { getInitials } from '../utils/formatting/nameFormat';
import ConfirmDialog from './ui/ConfirmDialog';
import { ActivityIcon, BatchesIcon, BuildingIcon, GroupsIcon, UsersIcon } from '../pages/Community/CommunityIcons';

function DashboardGridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function NotificationBellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16l1 4H3l1-4Z" />
      <path d="M4 8v12h16V8M9 12h6" />
    </svg>
  );
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 768px)').matches
  ));
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    const updateCollapsedState = (event) => setCollapsed(event.matches);
    mobileViewport.addEventListener('change', updateCollapsedState);
    return () => mobileViewport.removeEventListener('change', updateCollapsedState);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+S to focus search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 's')) {
        event.preventDefault();
        if (collapsed) setCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  // Click outside listener for user menu
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);

  // Single unified navigation list for all users in one continuous line
  const allNavItems = isSuperAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: DashboardGridIcon },
        { to: '/community', label: 'Community', icon: BuildingIcon },
        { to: '/user-management', label: 'User Management', icon: UsersIcon },
        { to: '/archive', label: 'Archive', icon: ArchiveIcon },
        { to: '/reports', label: 'Reports', icon: ReportsIcon },
        { to: '/notifications', label: 'Notifications', icon: NotificationBellIcon },
      ]
    : isCommunityOrganizer
      ? [
          { to: '/dashboard', label: 'Dashboard', icon: DashboardGridIcon },
          { to: '/community', label: 'Community', icon: BuildingIcon },
          { to: '/beneficiary', label: 'Beneficiary', icon: UsersIcon },
          { to: '/monitoring', label: 'Monitor', icon: ActivityIcon },
          { to: '/program', label: 'Projects', icon: GroupsIcon },
          { to: '/progress-report', label: 'Progress Report', icon: BatchesIcon },
          { to: '/archive', label: 'Archive', icon: ArchiveIcon },
          { to: '/user-management', label: 'User Management', icon: UsersIcon },
          { to: '/notifications', label: 'Notifications', icon: NotificationBellIcon },
        ]
      : [
          { to: '/dashboard', label: 'Dashboard', icon: DashboardGridIcon },
          { to: '/community', label: 'Community', icon: BuildingIcon },
          { to: '/beneficiary', label: 'Beneficiary', icon: UsersIcon },
          { to: '/monitoring', label: 'Monitor', icon: ActivityIcon },
          { to: '/program', label: 'Projects', icon: GroupsIcon },
          { to: '/progress-report', label: 'Progress Report', icon: BatchesIcon },
          { to: '/notifications', label: 'Notifications', icon: NotificationBellIcon },
        ];

  // Search filtering
  const query = searchQuery.trim().toLowerCase();
  const filteredNavItems = query
    ? allNavItems.filter((item) => item.label.toLowerCase().includes(query))
    : allNavItems;

  const handleSignOut = () => {
    setSigningOut(true);
    logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    hideTooltip();
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      onCloseMobile?.();
    }
  };

  // On mobile overlay mode, we show the full sidebar (not collapsed icons)
  const isEffectivelyCollapsed = collapsed && !mobileOpen;

  const showTooltip = (event, label) => {
    if (!isEffectivelyCollapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredFlyout({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const hideTooltip = () => {
    setHoveredFlyout(null);
  };

  // Dismiss tooltip on scroll or route change
  useEffect(() => {
    if (!isEffectivelyCollapsed) return undefined;
    const handleScroll = () => setHoveredFlyout(null);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isEffectivelyCollapsed]);

  return (
    <aside
      className={`sidebar ${isEffectivelyCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Edge toggle button (< / >) - hidden on mobile screens */}
      <button
        type="button"
        className="sidebar-edge-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar (Ctrl+K)' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
        )}
      </button>

      {/* Top Section: Brand + Close (X) on mobile + Search */}
      <div className="sidebar-top-section">
        <div className="sidebar-brand-row">
          <div className="sidebar-logo-mark">
            <img src={logo} alt="MCHMS" className="sidebar-logo" />
          </div>
          {!isEffectivelyCollapsed && (
            <div className="sidebar-brand-info">
              <span className="sidebar-brand-title">MCHMS</span>
              <span className="sidebar-brand-subtitle">Health System</span>
            </div>
          )}
          {/* Mobile Close Button (X) */}
          {onCloseMobile && (
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation sidebar"
              title="Close sidebar"
            >
              <X size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Search Bar / Icon */}
        <div className="sidebar-search-wrap">
          {isEffectivelyCollapsed ? (
            <button
              type="button"
              className="sidebar-search-icon-btn"
              onClick={() => {
                setCollapsed(false);
                setTimeout(() => searchInputRef.current?.focus(), 80);
              }}
              onMouseEnter={(e) => showTooltip(e, 'Search (Ctrl+K)')}
              onMouseLeave={hideTooltip}
              onFocus={(e) => showTooltip(e, 'Search (Ctrl+K)')}
              onBlur={hideTooltip}
              aria-label="Search navigation"
            >
              <Search size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : (
            <div className="sidebar-search-box">
              <Search size={15} strokeWidth={2} className="sidebar-search-lens" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search navigation"
                className="sidebar-search-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="sidebar-search-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : (
                <span className="sidebar-search-kbd" title="Shortcut: Ctrl+K / Cmd+S">
                  <span className="kbd-symbol">⌘</span> S
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Single Unified Navigation List in One Continuous Line */}
      <nav className="sidebar-nav-scroll">
        <div className="sidebar-nav-list">
          {filteredNavItems.map((item) => (
            <div
              key={item.to}
              className="sidebar-item-group"
              onMouseEnter={(e) => showTooltip(e, item.label)}
              onMouseLeave={hideTooltip}
            >
              <NavLink
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={handleLinkClick}
                onFocus={(e) => showTooltip(e, item.label)}
                onBlur={hideTooltip}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                data-label={item.label}
                aria-label={isEffectivelyCollapsed ? item.label : undefined}
              >
                <span className="sidebar-icon-wrap" aria-hidden="true">
                  <item.icon />
                </span>
                {!isEffectivelyCollapsed && <span className="sidebar-link-label">{item.label}</span>}
              </NavLink>
            </div>
          ))}

          {filteredNavItems.length === 0 && (
            <div className="sidebar-empty-search">
              No matching pages
            </div>
          )}
        </div>
      </nav>

      {/* Bottom User Profile Card */}
      <div className="sidebar-footer" ref={userMenuRef}>
        <button
          type="button"
          className={`sidebar-user-card ${userMenuOpen ? 'is-active' : ''}`}
          onClick={() => setUserMenuOpen((open) => !open)}
          onMouseEnter={(e) => isEffectivelyCollapsed && showTooltip(e, currentUser?.name || 'User Account')}
          onMouseLeave={hideTooltip}
          onFocus={(e) => isEffectivelyCollapsed && showTooltip(e, currentUser?.name || 'User Account')}
          onBlur={hideTooltip}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          title={!isEffectivelyCollapsed ? (currentUser?.name || 'User Account') : undefined}
        >
          <div className="sidebar-user-avatar">
            {getInitials(currentUser?.name || 'User')}
          </div>
          {!isEffectivelyCollapsed && (
            <>
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{currentUser?.name || 'User Account'}</span>
                <span className="sidebar-user-role">{formatRoleName(currentUser?.role)}</span>
              </div>
              <ChevronDown
                size={15}
                className={`sidebar-user-chevron ${userMenuOpen ? 'open' : ''}`}
                aria-hidden="true"
              />
            </>
          )}
        </button>

        {/* User Account Popover */}
        {userMenuOpen && (
          <div className={`sidebar-user-popover ${isEffectivelyCollapsed ? 'is-collapsed' : ''}`} role="menu">
            <div className="sidebar-user-popover-header">
              <span className="sidebar-popover-user-name">{currentUser?.name || 'Account'}</span>
              {currentUser?.email && (
                <span className="sidebar-popover-user-email">
                  <Mail size={12} aria-hidden="true" />
                  <span>{currentUser.email}</span>
                </span>
              )}
              <span className="sidebar-popover-role-badge">
                <Shield size={11} aria-hidden="true" />
                <span>{formatRoleName(currentUser?.role)}</span>
              </span>
            </div>
            <div className="sidebar-user-popover-divider" />
            <button
              type="button"
              className="sidebar-user-popover-item"
              onClick={() => { setUserMenuOpen(false); navigate('/profile'); handleLinkClick(); }}
              role="menuitem"
            >
              <UserIcon size={16} className="sidebar-popover-item-icon" aria-hidden="true" />
              <span className="sidebar-popover-item-label">Profile</span>
              <ChevronRight size={13} className="sidebar-popover-chevron" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sidebar-user-popover-item"
              onClick={() => { setUserMenuOpen(false); navigate('/settings'); handleLinkClick(); }}
              role="menuitem"
            >
              <Settings size={16} className="sidebar-popover-item-icon" aria-hidden="true" />
              <span className="sidebar-popover-item-label">Settings</span>
              <ChevronRight size={13} className="sidebar-popover-chevron" aria-hidden="true" />
            </button>
            <div className="sidebar-user-popover-divider" />
            <button
              type="button"
              className="sidebar-user-popover-item is-signout"
              onClick={() => { setUserMenuOpen(false); setShowSignOutModal(true); }}
              role="menuitem"
            >
              <LogOut size={16} className="sidebar-popover-item-icon" aria-hidden="true" />
              <span className="sidebar-popover-item-label">Sign out</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showSignOutModal}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        variant="destructive"
        confirmLabel="Sign out"
        loadingLabel="Signing out..."
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />

      {/* Floating Tooltip Indicator rendered into body to escape all container overflow */}
      {isEffectivelyCollapsed && hoveredFlyout && typeof document !== 'undefined' && createPortal(
        <div
          className="sidebar-floating-tooltip"
          style={{
            top: `${hoveredFlyout.top}px`,
            left: `${hoveredFlyout.left}px`,
          }}
          role="tooltip"
        >
          <div className="sidebar-tooltip-indicator" aria-hidden="true" />
          <span className="sidebar-tooltip-dot" aria-hidden="true" />
          <span className="sidebar-tooltip-text">{hoveredFlyout.label}</span>
        </div>,
        document.body
      )}
    </aside>
  );
}
