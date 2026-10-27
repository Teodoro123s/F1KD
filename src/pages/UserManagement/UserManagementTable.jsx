import React, { useRef, useState } from 'react';
import { MoreVerticalIcon } from './UserManagementIcons';
import TableSearch from '../../components/ui/TableSearch';
import FloatingLayer from '../../components/ui/FloatingLayer';

export default function UserManagementTable({
  currentRows,
  onRowClick,
  openEditUser,
  handleSuspendUser,
  handleDeleteUser,
  suspendLoadingIds = [],
  deletingId = null,
  allowDelete = true,
  showGroup = false,
  groups = [],
  searchValue = '',
  onSearchChange,
  toolbarActions,
  healthWorkerManagement = false,
  statusFilter = 'All',
  onStatusFilterChange,
  onClearFilters,
  onRequestStatusChange,
  loading = false,
  loadError = '',
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const activeDropdownTriggerRef = useRef(null);
  const emptyColSpan = healthWorkerManagement ? 6 : showGroup ? 4 : 3;
  const groupNames = new Map(groups.map((group) => [String(group.id), group.name]));

  const toggleDropdown = (event, row) => {
    event.stopPropagation();
    activeDropdownTriggerRef.current = event.currentTarget;
    setActiveDropdown((current) => (current?.id === row.id ? null : row));
  };

  const formatLastLogin = (value) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
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
              if (onRequestStatusChange) onRequestStatusChange(row);
              else handleSuspendUser(row.id);
            }}
            role="menuitem"
            disabled={suspendLoadingIds.includes(row.id) || deletingId === row.id}
          >
            {suspendLoadingIds.includes(row.id)
              ? (row.status === 'Suspended' ? 'Reactivating...' : 'Suspending...')
              : healthWorkerManagement
                ? (row.status === 'Suspended' ? 'Reactivate' : 'Suspend')
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
      {healthWorkerManagement && (
        <header className="health-worker-table-heading">
          <h2>Health Worker Accounts</h2>
          <p>View and manage Health Worker accounts assigned to your community.</p>
        </header>
      )}
      {(toolbarActions || onSearchChange) && (
        <div className="user-management-table-toolbar">
          {toolbarActions}
          {healthWorkerManagement && (
            <label className="health-worker-status-filter">
              <span>Account Status</span>
              <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </label>
          )}
          {onSearchChange && (
            <TableSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder={healthWorkerManagement ? 'Search name or username' : 'Search users'}
            />
          )}
          {healthWorkerManagement && (
            <button type="button" className="health-worker-clear-filters" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
      <div className="table-overflow">
        <table className={`data-table user-management-data-table${showGroup ? ' has-group-column' : ''}${healthWorkerManagement ? ' health-worker-accounts-table' : ''}`}>
          <thead>
            <tr>
              {healthWorkerManagement ? (
                <>
                  <th scope="col">Health Worker</th>
                  <th scope="col">Username</th>
                  <th scope="col">Assigned Community</th>
                  <th scope="col">Account Status</th>
                  <th scope="col">Last Login</th>
                  <th scope="col" className="actions-cell">Actions</th>
                </>
              ) : (
                <>
                  <th scope="col">Account Name</th>
                  <th scope="col">Role</th>
                  {showGroup && <th scope="col" title="Group assigned to this user">Assigned Group</th>}
                  <th scope="col" className="actions-cell">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={emptyColSpan} className="no-data">Loading Health Worker accounts…</td></tr>
            ) : loadError ? (
              <tr><td colSpan={emptyColSpan} className="no-data" role="alert">Unable to load Health Worker accounts. Use Retry to try again.</td></tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  className={onRowClick ? 'user-management-clickable-row' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'link' : undefined}
                  aria-label={onRowClick ? `View details for ${row.name}` : undefined}
                >
                  {healthWorkerManagement ? (
                    <>
                      <td title={row.name}>{row.name}</td>
                      <td title={row.username || row.email}>{row.username || row.email || 'Not recorded'}</td>
                      <td title={row.communityName || 'Not assigned'}>{row.communityName || 'Not assigned'}</td>
                      <td>
                        <span className={`health-worker-status-badge${row.status === 'Suspended' ? ' is-suspended' : ' is-active'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{formatLastLogin(row.lastLoginAt)}</td>
                    </>
                  ) : (
                    <>
                      <td title={row.name}>{row.name}</td>
                      <td title={row.role}>{row.role}</td>
                      {showGroup && (
                        <td title={groupNames.get(String(row.groupId || '')) || '—'}>
                          {groupNames.get(String(row.groupId || '')) || '—'}
                        </td>
                      )}
                    </>
                  )}
                  {renderActionMenu(row)}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={emptyColSpan} className="no-data">
                  {healthWorkerManagement
                    ? (searchValue.trim() || statusFilter !== 'All')
                      ? 'No Health Worker accounts match these filters.'
                      : 'No Health Worker accounts are assigned to your community.'
                    : 'No results found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
