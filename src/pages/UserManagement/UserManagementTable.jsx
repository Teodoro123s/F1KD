import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVerticalIcon } from './UserManagementIcons';

export default function UserManagementTable({
  currentRows,
  openEditUser,
  handleSuspendUser,
  handleDeleteUser,
}) {
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const emptyColSpan = 3;
  const navigate = useNavigate();

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    setActiveDropdownId((current) => (current === id ? null : id));
  };

  return (
    <section className="table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '45%' }}>Account Name</th>
              <th scope="col">Role</th>
              <th scope="col" className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/user-management/user/${row.id}`, { state: { user: row } })}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{row.name}</td>
                    <td>{row.role}</td>
                    <td className="actions-cell">
                    <button
                      type="button"
                      className="btn-actions"
                      onClick={(e) => toggleDropdown(e, row.id)}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditUser(row);
                          }}
                          role="menuitem"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSuspendUser(row.id);
                          }}
                          role="menuitem"
                        >
                          Suspend
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-item delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(row.id);
                          }}
                          role="menuitem"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
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
