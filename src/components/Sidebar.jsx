import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
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

const sidebarStyles = {
  sidebar: 'relative z-[30] box-border flex h-[calc(100vh-1.7rem)] max-h-[calc(100vh-1.7rem)] w-[260px] flex-[0_0_260px] flex-col rounded-[24px] border border-[#eef2f6] bg-white my-[0.85rem] ml-[0.85rem] shadow-[0_10px_30px_rgba(15,23,42,0.04),0_2px_6px_rgba(15,23,42,0.02)] transition-[width,flex-basis] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] max-[768px]:fixed max-[768px]:inset-y-0 max-[768px]:left-0 max-[768px]:z-[100] max-[768px]:my-0 max-[768px]:ml-0 max-[768px]:h-screen max-[768px]:max-h-screen max-[768px]:w-[280px] max-[768px]:basis-[280px] max-[768px]:rounded-r-[20px] max-[768px]:-translate-x-[110%] max-[768px]:shadow-none max-[768px]:transition-[transform,box-shadow]',
  collapsed: 'w-[76px] basis-[76px]',
  mobileOpen: 'max-[768px]:translate-x-0 max-[768px]:shadow-[0_20px_40px_rgba(15,23,42,0.25)]',
  edgeToggle: 'absolute -right-[13px] top-[22px] z-[40] flex size-[26px] items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-150 ease-out hover:scale-[1.08] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-green-700 focus-visible:outline-offset-2 max-[768px]:hidden',
  topSection: 'flex shrink-0 flex-col gap-[0.85rem] px-4 pt-5 pb-2',
  topSectionCollapsed: 'items-center px-[0.6rem]',
  brandRow: 'flex min-h-[38px] items-center gap-3',
  brandRowCollapsed: 'justify-center',
  logoMark: 'flex size-[38px] shrink-0 items-center justify-center',
  logo: 'size-8 object-contain',
  brandInfo: 'flex min-w-0 flex-col overflow-hidden',
  brandTitle: 'text-[1.1rem] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900',
  brandSubtitle: 'text-[0.725rem] font-semibold tracking-[-0.01em] text-slate-400',
  searchWrap: 'w-full',
  searchBox: 'relative box-border flex h-[38px] w-full items-center rounded-xl border border-[#eef2f6] bg-[#fafbfc] py-0 pr-2 pl-[2.1rem] transition-all duration-150 ease-out focus-within:border-green-700 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(21,128,61,0.1)]',
  searchLens: 'pointer-events-none absolute left-3 text-slate-400',
  searchInput: 'w-full !border-0 !bg-transparent !p-0 !shadow-none !outline-none text-[0.85rem] text-slate-900 placeholder:text-slate-400',
  searchKbd: 'inline-flex shrink-0 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-white px-[5px] py-0.5 text-[0.68rem] font-semibold text-slate-500',
  searchClear: 'cursor-pointer border-0 bg-transparent px-1 text-[1.1rem] leading-none text-slate-400 hover:text-slate-900',
  searchIcon: 'mx-auto flex size-[42px] items-center justify-center rounded-xl border border-[#eef2f6] bg-[#fafbfc] text-slate-500 transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white hover:text-slate-900',
  navScroll: 'flex-1 overflow-x-hidden overflow-y-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  navScrollCollapsed: 'px-[0.4rem]',
  navList: 'flex w-full flex-col gap-1',
  itemGroup: 'relative w-full',
  link: 'box-border flex w-full cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-[0.6rem] text-sm font-medium text-slate-600 no-underline transition-all duration-150 ease-out',
  linkHover: 'hover:bg-slate-50 hover:text-slate-900',
  linkActive: 'bg-[#f1fdf4] font-semibold text-green-700',
  linkCollapsed: 'justify-center rounded-xl px-0 py-[0.65rem]',
  iconWrap: 'flex size-6 shrink-0 items-center justify-center text-inherit [&_svg]:size-[19px]',
  linkLabel: 'flex-1 overflow-hidden text-ellipsis whitespace-nowrap',
  emptySearch: 'px-3 py-6 text-center text-[0.8125rem] text-slate-400',
  footer: 'relative shrink-0 border-t border-slate-100 px-[0.85rem] py-3',
  footerCollapsed: 'flex justify-center px-[0.4rem]',
  userCard: 'flex w-full items-center gap-3 rounded-[14px] border border-[#edf2f7] bg-[#fafbfc] px-[0.65rem] py-2 text-left transition-all duration-150 ease-out',
  userCardHover: 'hover:border-slate-300 hover:bg-slate-50',
  userCardCollapsed: 'w-auto border-0 bg-transparent p-1',
  userCardActive: 'border-green-700 shadow-[0_0_0_2px_rgba(21,128,61,0.12)] hover:border-green-700 hover:bg-slate-50',
  userAvatar: 'flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#15803d_0%,#22c55e_100%)] text-sm font-bold text-white shadow-[0_2px_6px_rgba(21,128,61,0.2)]',
  userDetails: 'flex min-w-0 flex-1 flex-col overflow-hidden',
  userName: 'overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold leading-[1.25] text-slate-900',
  userRole: 'overflow-hidden text-ellipsis whitespace-nowrap text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-slate-500',
  userChevron: 'shrink-0 text-slate-400 transition-transform duration-200',
  userChevronOpen: 'rotate-180',
  userPopover: 'absolute bottom-[calc(100%+8px)] left-[0.85rem] right-[0.85rem] z-[70] flex flex-col gap-0.5 rounded-[18px] border border-[#eef2f6] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.04)]',
  userPopoverCollapsed: 'bottom-3 left-[calc(100%+10px)] right-auto min-w-[230px]',
  userPopoverHeader: 'flex flex-col gap-1 px-[0.65rem] pt-2 pb-[0.65rem]',
  popoverUserName: 'overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-bold tracking-[-0.01em] text-slate-900',
  popoverEmail: 'flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[0.73rem] text-slate-500 [&_svg]:shrink-0 [&_svg]:text-slate-400 [&_span]:overflow-hidden [&_span]:text-ellipsis',
  roleBadge: 'mt-[0.15rem] inline-flex self-start items-center gap-[0.3rem] rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-[0.15rem] text-[0.68rem] font-bold tracking-[0.03em] text-green-700 [&_svg]:text-green-600',
  popoverDivider: 'my-1 h-px bg-slate-100',
  popoverItem: 'flex w-full cursor-pointer items-center gap-[0.65rem] rounded-[10px] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.825rem] font-medium text-slate-700 transition-all duration-150',
  popoverItemHover: 'hover:bg-slate-50 hover:text-slate-900',
  popoverItemIcon: 'shrink-0 text-slate-500 transition-colors duration-150 group-hover:text-green-700',
  popoverItemLabel: 'flex-1',
  popoverChevron: 'shrink-0 text-slate-300 transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-green-700',
  signoutItem: 'text-red-600 hover:bg-red-50 hover:text-red-700',
  signoutItemIcon: 'shrink-0 text-red-500 transition-colors duration-150 group-hover/signout:text-red-600',
  mobileClose: 'ml-auto hidden cursor-pointer rounded-lg border-0 bg-transparent p-[0.35rem] text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 max-[768px]:flex max-[768px]:items-center max-[768px]:justify-center',
  tooltip: 'fixed z-[99999] inline-flex -translate-y-1/2 pointer-events-none items-center gap-2 rounded-[9px] bg-slate-900 px-[0.8rem] py-[0.45rem] text-[0.78rem] font-semibold tracking-[0.01em] text-white shadow-[0_10px_25px_-3px_rgba(15,23,42,0.28),0_4px_6px_-4px_rgba(15,23,42,0.1)]',
  tooltipIndicator: 'absolute left-[-4px] top-1/2 size-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-slate-900',
  tooltipDot: 'size-1.5 shrink-0 rounded-full bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.25)]',
  tooltipText: 'leading-none',
};

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
  const canViewSchoolPerformance = hasRole(currentUser?.role, [ROLES.ADMIN, ROLES.PARTNER]);

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
          ...(canViewSchoolPerformance ? [{ to: '/school-performance', label: 'School Performance', icon: ReportsIcon }] : []),
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
      className={`${sidebarStyles.sidebar} ${isEffectivelyCollapsed ? sidebarStyles.collapsed : ''} ${mobileOpen ? sidebarStyles.mobileOpen : ''}`}
      aria-label="Main Navigation"
    >
      {/* Edge toggle button (< / >) - hidden on mobile screens */}
      <button
        type="button"
        className={sidebarStyles.edgeToggle}
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
      <div className={`${sidebarStyles.topSection} ${isEffectivelyCollapsed ? sidebarStyles.topSectionCollapsed : ''}`}>
        <div className={`${sidebarStyles.brandRow} ${isEffectivelyCollapsed ? sidebarStyles.brandRowCollapsed : ''}`}>
          <div className={sidebarStyles.logoMark}>
            <img src={logo} alt="MCHMS" className={sidebarStyles.logo} />
          </div>
          {!isEffectivelyCollapsed && (
            <div className={sidebarStyles.brandInfo}>
              <span className={sidebarStyles.brandTitle}>MCHMS</span>
              <span className={sidebarStyles.brandSubtitle}>Health System</span>
            </div>
          )}
          {/* Mobile Close Button (X) */}
          {onCloseMobile && (
            <button
              type="button"
              className={sidebarStyles.mobileClose}
              onClick={onCloseMobile}
              aria-label="Close navigation sidebar"
              title="Close sidebar"
            >
              <X size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Search Bar / Icon */}
        <div className={sidebarStyles.searchWrap}>
          {isEffectivelyCollapsed ? (
            <button
              type="button"
              className={sidebarStyles.searchIcon}
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
            <div className={sidebarStyles.searchBox}>
              <Search size={15} strokeWidth={2} className={sidebarStyles.searchLens} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search navigation"
                className={sidebarStyles.searchInput}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={sidebarStyles.searchClear}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : (
                <span className={sidebarStyles.searchKbd} title="Shortcut: Ctrl+K / Cmd+S">
                  <span className="kbd-symbol">⌘</span> S
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Single Unified Navigation List in One Continuous Line */}
      <nav className={`${sidebarStyles.navScroll} ${isEffectivelyCollapsed ? sidebarStyles.navScrollCollapsed : ''}`}>
        <div className={sidebarStyles.navList}>
          {filteredNavItems.map((item) => (
            <div
              key={item.to}
              className={sidebarStyles.itemGroup}
              onMouseEnter={(e) => showTooltip(e, item.label)}
              onMouseLeave={hideTooltip}
            >
              <NavLink
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={handleLinkClick}
                onFocus={(e) => showTooltip(e, item.label)}
                onBlur={hideTooltip}
                className={({ isActive }) => `${sidebarStyles.link} ${isActive ? sidebarStyles.linkActive : sidebarStyles.linkHover} ${isEffectivelyCollapsed ? sidebarStyles.linkCollapsed : ''}`}
                data-label={item.label}
                aria-label={isEffectivelyCollapsed ? item.label : undefined}
              >
                <span className={sidebarStyles.iconWrap} aria-hidden="true">
                  <item.icon />
                </span>
                {!isEffectivelyCollapsed && <span className={sidebarStyles.linkLabel}>{item.label}</span>}
              </NavLink>
            </div>
          ))}

          {filteredNavItems.length === 0 && (
            <div className={sidebarStyles.emptySearch}>
              No matching pages
            </div>
          )}
        </div>
      </nav>

      {/* Bottom User Profile Card */}
      <div className={`${sidebarStyles.footer} ${isEffectivelyCollapsed ? sidebarStyles.footerCollapsed : ''}`} ref={userMenuRef}>
        <button
          type="button"
          className={`${sidebarStyles.userCard} ${isEffectivelyCollapsed ? sidebarStyles.userCardCollapsed : (userMenuOpen ? sidebarStyles.userCardActive : sidebarStyles.userCardHover)}`}
          onClick={() => setUserMenuOpen((open) => !open)}
          onMouseEnter={(e) => isEffectivelyCollapsed && showTooltip(e, currentUser?.name || 'User Account')}
          onMouseLeave={hideTooltip}
          onFocus={(e) => isEffectivelyCollapsed && showTooltip(e, currentUser?.name || 'User Account')}
          onBlur={hideTooltip}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          title={!isEffectivelyCollapsed ? (currentUser?.name || 'User Account') : undefined}
        >
          <div className={sidebarStyles.userAvatar}>
            {getInitials(currentUser?.name || 'User')}
          </div>
          {!isEffectivelyCollapsed && (
            <>
              <div className={sidebarStyles.userDetails}>
                <span className={sidebarStyles.userName}>{currentUser?.name || 'User Account'}</span>
                <span className={sidebarStyles.userRole}>{formatRoleName(currentUser?.role)}</span>
              </div>
              <ChevronDown
                size={15}
                className={`${sidebarStyles.userChevron} ${userMenuOpen ? sidebarStyles.userChevronOpen : ''}`}
                aria-hidden="true"
              />
            </>
          )}
        </button>

        {/* User Account Popover */}
        {userMenuOpen && (
          <motion.div
            className={`${sidebarStyles.userPopover} ${isEffectivelyCollapsed ? sidebarStyles.userPopoverCollapsed : ''}`}
            role="menu"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={sidebarStyles.userPopoverHeader}>
              <span className={sidebarStyles.popoverUserName}>{currentUser?.name || 'Account'}</span>
              {currentUser?.email && (
                <span className={sidebarStyles.popoverEmail}>
                  <Mail size={12} aria-hidden="true" />
                  <span>{currentUser.email}</span>
                </span>
              )}
              <span className={sidebarStyles.roleBadge}>
                <Shield size={11} aria-hidden="true" />
                <span>{formatRoleName(currentUser?.role)}</span>
              </span>
            </div>
            <div className={sidebarStyles.popoverDivider} />
            <button
              type="button"
              className={`${sidebarStyles.popoverItem} ${sidebarStyles.popoverItemHover} group`}
              onClick={() => { setUserMenuOpen(false); navigate('/profile'); handleLinkClick(); }}
              role="menuitem"
            >
              <UserIcon size={16} className={sidebarStyles.popoverItemIcon} aria-hidden="true" />
              <span className={sidebarStyles.popoverItemLabel}>Profile</span>
              <ChevronRight size={13} className={sidebarStyles.popoverChevron} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${sidebarStyles.popoverItem} ${sidebarStyles.popoverItemHover} group`}
              onClick={() => { setUserMenuOpen(false); navigate('/settings'); handleLinkClick(); }}
              role="menuitem"
            >
              <Settings size={16} className={sidebarStyles.popoverItemIcon} aria-hidden="true" />
              <span className={sidebarStyles.popoverItemLabel}>Settings</span>
              <ChevronRight size={13} className={sidebarStyles.popoverChevron} aria-hidden="true" />
            </button>
            <div className={sidebarStyles.popoverDivider} />
            <button
              type="button"
              className={`${sidebarStyles.popoverItem} ${sidebarStyles.signoutItem} group/signout`}
              onClick={() => { setUserMenuOpen(false); setShowSignOutModal(true); }}
              role="menuitem"
            >
              <LogOut size={16} className={`${sidebarStyles.popoverItemIcon} ${sidebarStyles.signoutItemIcon}`} aria-hidden="true" />
              <span className={sidebarStyles.popoverItemLabel}>Sign out</span>
            </button>
          </motion.div>
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
        <motion.div
          className={sidebarStyles.tooltip}
          style={{
            top: `${hoveredFlyout.top}px`,
            left: `${hoveredFlyout.left}px`,
          }}
          role="tooltip"
          initial={{ opacity: 0, x: -4, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={sidebarStyles.tooltipIndicator} aria-hidden="true" />
          <span className={sidebarStyles.tooltipDot} aria-hidden="true" />
          <span className={sidebarStyles.tooltipText}>{hoveredFlyout.label}</span>
        </motion.div>,
        document.body
      )}
    </aside>
  );
}
