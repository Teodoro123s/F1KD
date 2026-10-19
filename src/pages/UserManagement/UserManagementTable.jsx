import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MoreVerticalIcon } from './UserManagementIcons';
import TableSearch from '../../components/ui/TableSearch';
import FloatingLayer from '../../components/ui/FloatingLayer';

export default function UserManagementTable({
  currentRows,
  openEditUser,
  handleSuspendUser,
  handleDeleteUser,
  suspendLoadingIds = [],
  deletingId = null,
  allowDelete = true,
  allowProfileNavigation = true,
  showGroup = false,
  groups = [],
  searchValue = '',
  onSearchChange,
  toolbarActions,
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const activeDropdownTriggerRef = useRef(null);
  const emptyColSpan = showGroup ? 4 : 3;
  const groupNames = new Map(groups.map((group) => [String(group.id), group.name]));
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const toggleDropdown = (event, row) => {
    event.stopPropagation();
    activeDropdownTriggerRef.current = event.currentTarget;
    setActiveDropdown((current) => (current?.id === row.id ? null : row));
  };

  const renderActionMenu = (row) => (
    <td className={`actions-cell${row?.role === 'Community Organizer' ? ' community-organizer-actions' : ''}`}>
      <button
        type="button"
        className="btn-actions"
        ref={activeDropdown?.id === row.id ? activeDropdownTriggerRef : undefined}
        onClick={(event) => toggleDropdown(event, row)}
        aria-label="Actions menu"
        aria-haspopup="true"
        aria-expanded={activeDropdown?.id === row.id}
      >
        <MoreVerticalIcon />
      </button>
      {activeDropdown?.id === row.id && (
        <FloatingLayer
          open
          anchorRef={activeDropdownTriggerRef}
          onDismiss={() => setActiveDropdown(null)}
          className="actions-dropdown actions-dropdown-portal user-management-actions-dropdown"
          role="menu"
        >
          <button
            type="button"
            className="actions-dropdown-item"
            onClick={(event) => {
              event.stopPropagation();
              setActiveDropdown(null);
              openEditUser(row);
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
              setActiveDropdown(null);
              handleSuspendUser(row.id);
            }}
            role="menuitem"
            disabled={suspendLoadingIds.includes(row.id) || deletingId === row.id}
          >
            {suspendLoadingIds.includes(row.id)
              ? (row.status === 'Suspended' ? 'Unsuspending...' : 'Suspending...')
              : (row.status === 'Suspended' ? 'Unsuspend' : 'Suspend')}
          </button>
          {allowDelete && (
            <button
              type="button"
              className="actions-dropdown-item delete"
              onClick={(event) => {
                event.stopPropagation();
                setActiveDropdown(null);
                handleDeleteUser(row.id);
              }}
              role="menuitem"
              disabled={deletingId === row.id}
            >
              {deletingId === row.id ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </FloatingLayer>
      )}
    </td>
  );

  return (
    <section className="table-card user-management-list-card">
      {(toolbarActions || onSearchChange) && (
        <div className="user-management-table-toolbar">
          {toolbarActions}
          {onSearchChange && <TableSearch value={searchValue} onChange={onSearchChange} placeholder="Search users" />}
        </div>
      )}
      <div className="table-overflow">
        <table className={`data-table user-management-data-table${showGroup ? ' has-group-column' : ''}`}>
          <thead>
            <tr>
              <th scope="col">Account Name</th>
              <th scope="col">Role</th>
              {showGroup && <th scope="col" title="Group assigned to this user">Assigned Group</th>}
              <th scope="col" className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={allowProfileNavigation ? () => navigate(`/user-management/user/${row.id}`, { state: { user: row, returnTo } }) : undefined}
                  onKeyDown={allowProfileNavigation ? (event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      navigate(`/user-management/user/${row.id}`, { state: { user: row, returnTo } });
                    }
                  } : undefined}
                  tabIndex={allowProfileNavigation ? 0 : undefined}
                  aria-label={allowProfileNavigation ? `View profile for ${row.name}` : undefined}
                  style={{ cursor: allowProfileNavigation ? 'pointer' : 'default' }}
                >
                  <td title={row.name}>{row.name}</td>
                  <td title={row.role}>{row.role}</td>
                  {showGroup && (
                    <td title={groupNames.get(String(row.groupId || '')) || '—'}>
                      {groupNames.get(String(row.groupId || '')) || '—'}
                    </td>
                  )}
                  {renderActionMenu(row)}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={emptyColSpan} className="no-data">
                  No results found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
