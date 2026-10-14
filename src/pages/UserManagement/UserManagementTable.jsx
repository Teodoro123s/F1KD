import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVerticalIcon } from './UserManagementIcons';
import TableSearch from '../../components/ui/TableSearch';

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
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const emptyColSpan = showGroup ? 4 : 3;
  const groupNames = new Map(groups.map((group) => [String(group.id), group.name]));
  const navigate = useNavigate();

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const clickedInsideDropdown = event.target.closest('.actions-dropdown');
      const clickedToggleButton = event.target.closest('.btn-actions');

      if (!clickedInsideDropdown && !clickedToggleButton) {
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    setActiveDropdownId((current) => (current === id ? null : id));
  };

  const renderActionMenu = (row) => (
    <td className={`actions-cell${row?.role === 'Community Organizer' ? ' community-organizer-actions' : ''}`}>
      <button
        type="button"
        className="btn-actions"
        onClick={(event) => toggleDropdown(event, row.id)}
        aria-label="Actions menu"
        aria-haspopup="true"
        aria-expanded={activeDropdownId === row.id}
      >
        <MoreVerticalIcon />
      </button>
      {activeDropdownId === row.id && (
        <div className="actions-dropdown" role="menu">
          <button
            type="button"
            className="actions-dropdown-item"
            onClick={(event) => {
              event.stopPropagation();
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
                handleDeleteUser(row.id);
              }}
              role="menuitem"
              disabled={deletingId === row.id}
            >
              {deletingId === row.id ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </td>
  );

  return (
    <section className="table-card">
      {(toolbarActions || onSearchChange) && (
        <div className="user-management-table-toolbar">
          {toolbarActions}
          {onSearchChange && <TableSearch value={searchValue} onChange={onSearchChange} placeholder="Search users (case-sensitive)" />}
        </div>
      )}
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '45%' }}>Account Name</th>
              <th scope="col">Role</th>
              {showGroup && <th scope="col">Assigned Group</th>}
              <th scope="col" className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={allowProfileNavigation ? () => navigate(`/user-management/user/${row.id}`, { state: { user: row } }) : undefined}
                  style={{ cursor: allowProfileNavigation ? 'pointer' : 'default' }}
                >
                  <td>{row.name}</td>
                  <td>{row.role}</td>
                  {showGroup && <td>{groupNames.get(String(row.groupId || '')) || '—'}</td>}
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
