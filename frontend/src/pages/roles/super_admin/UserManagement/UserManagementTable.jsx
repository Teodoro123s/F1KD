import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CommunityTable from '../Community/CommunityTable';
import { MoreVerticalIcon } from './UserManagementIcons';

export default function UserManagementTable({
  currentRows,
  requestEditUser,
  requestStatusChange,
  handleDeleteUser,
  suspendLoadingIds = [],
  deletingId = null,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const clickedInsideDropdown = event.target.closest('.actions-dropdown');
      const clickedToggleButton = event.target.closest('.btn-actions');

      if (!clickedInsideDropdown && !clickedToggleButton) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useLayoutEffect(() => {
    if (!activeMenu) {
      setMenuPosition(null);
      return undefined;
    }

    const updateMenuPosition = () => {
      const anchor = activeMenu.anchor;
      const menu = menuRef.current;
      if (!anchor?.isConnected || !menu) {
        setActiveMenu(null);
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const edgePadding = 8;
      const gap = 6;
      const spaceBelow = window.innerHeight - anchorRect.bottom - gap - edgePadding;
      const spaceAbove = anchorRect.top - gap - edgePadding;
      const openAbove = spaceBelow < menuRect.height && spaceAbove > spaceBelow;
      const maxHeight = Math.max(80, openAbove ? spaceAbove : spaceBelow);
      const top = openAbove
        ? Math.max(edgePadding, anchorRect.top - Math.min(menuRect.height, maxHeight) - gap)
        : Math.min(anchorRect.bottom + gap, window.innerHeight - edgePadding - Math.min(menuRect.height, maxHeight));
      const left = Math.max(
        edgePadding,
        Math.min(anchorRect.right - menuRect.width, window.innerWidth - menuRect.width - edgePadding)
      );

      setMenuPosition({ top, left, maxHeight });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [activeMenu]);

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    const anchor = event.currentTarget;
    setActiveMenu((current) => (current?.id === id ? null : { id, anchor }));
  };

  const columns = [
    { key: 'name', header: 'Account Name' },
    { key: 'role', header: 'Role' },
    {
      key: 'actions',
      header: 'Actions',
      thClassName: 'actions-cell',
      cellClassName: 'actions-cell',
      renderCell: (row) => (
        <button
          type="button"
          className="btn-actions"
          onClick={(event) => toggleDropdown(event, row.id)}
          aria-label="Actions menu"
          aria-haspopup="true"
          aria-expanded={activeMenu?.id === row.id}
        >
          <MoreVerticalIcon />
        </button>
      ),
    },
  ];

  const activeRow = activeMenu
    ? currentRows.find((row) => row.id === activeMenu.id)
    : null;
  const actionMenu = activeRow && createPortal(
    <div
      ref={menuRef}
      className="actions-dropdown user-management-actions-menu"
      role="menu"
      style={{
        top: menuPosition?.top ?? 0,
        left: menuPosition?.left ?? 0,
        maxHeight: menuPosition?.maxHeight ?? 'min(300px, calc(100vh - 16px))',
        visibility: menuPosition ? 'visible' : 'hidden',
      }}
    >
      <button
        type="button"
        className="actions-dropdown-item"
        onClick={(event) => {
          event.stopPropagation();
          requestEditUser(activeRow);
          setActiveMenu(null);
        }}
        role="menuitem"
      >
        Edit
      </button>
      <button
        type="button"
        className="actions-dropdown-item"
        onClick={(event) => {
          event.stopPropagation();
          requestStatusChange(activeRow);
          setActiveMenu(null);
        }}
        role="menuitem"
        disabled={suspendLoadingIds.includes(activeRow.id) || deletingId === activeRow.id}
      >
        {suspendLoadingIds.includes(activeRow.id)
          ? (activeRow.status === 'Suspended' ? 'Unsuspending...' : 'Suspending...')
          : (activeRow.status === 'Suspended' ? 'Unsuspend' : 'Suspend')}
      </button>
      <button
        type="button"
        className="actions-dropdown-item delete"
        onClick={(event) => {
          event.stopPropagation();
          handleDeleteUser(activeRow.id);
          setActiveMenu(null);
        }}
        role="menuitem"
        disabled={deletingId === activeRow.id}
      >
        {deletingId === activeRow.id ? 'Deleting...' : 'Delete'}
      </button>
    </div>,
    document.body
  );

  return (
    <>
      <CommunityTable
        columns={columns}
        data={currentRows}
        onRowClick={(row) => navigate(`/user-management/user/${row.id}`, { state: { user: row } })}
      />
      {actionMenu}
    </>
  );
}
