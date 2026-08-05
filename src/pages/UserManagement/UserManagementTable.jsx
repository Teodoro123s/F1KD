import React from 'react';
import { MoreVerticalIcon } from './UserManagementIcons';

export default function UserManagementTable({
  currentRows,
  filteredDataLength,
  rangeStart,
  rangeEnd,
  perPage,
  handlePerPageChange,
  renderPaginationButtons,
  activeDropdownId,
  toggleDropdown,
  openEditUser,
  handleSuspendUser,
  handleDeleteUser,
}) {
  const emptyColSpan = 3;

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
                <tr key={row.id}>
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

      <footer className="pagination-container">
        <div className="pagination-left" aria-label="Pagination navigation">
          {renderPaginationButtons()}
        </div>
        <div className="pagination-center">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="select-entries"
            aria-label="Entries per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="pagination-right" role="status" aria-live="polite">
          {rangeStart}–{rangeEnd} of {filteredDataLength}
        </div>
      </footer>
    </section>
  );
}
