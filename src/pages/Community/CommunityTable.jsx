import React from 'react';
import { MoreVerticalIcon } from './CommunityIcons';

export default function CommunityTable({
  activeTab,
  currentRows,
  filteredDataLength,
  rangeStart,
  rangeEnd,
  perPage,
  handlePerPageChange,
  activeDropdownId,
  toggleDropdown,
  openEditModal,
  handleDeleteCommunity,
  handleDeleteGroup,
  handleDeleteBatch,
  renderPaginationButtons,
  onCommunityRowClick,
}) {
  const emptyColSpan = activeTab === 'groups' ? 3 : activeTab === 'communities' ? 4 : activeTab === 'mothers' ? 3 : 5;

  return (
    <section className="table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            {activeTab === 'communities' ? (
              <tr>
                <th scope="col" style={{ width: '48%' }}>School Name</th>
                <th scope="col" className="small-column"><span className="stacked-label">Total<br />Batches</span></th>
                <th scope="col" className="small-column"><span className="stacked-label">Total<br />Groups</span></th>
                <th scope="col" className="actions-cell batch-actions-cell">Actions</th>
              </tr>
            ) : activeTab === 'groups' ? (
              <tr>
                <th scope="col" style={{ width: '60%' }}>Group Name</th>
                <th scope="col" className="small-column"><span className="stacked-label">Total<br />Batches</span></th>
                <th scope="col" className="actions-cell batch-actions-cell">Actions</th>
              </tr>
            ) : activeTab === 'mothers' ? (
              <tr>
                <th scope="col" style={{ width: '70%' }}>Mother Name</th>
                <th scope="col" className="status-column">Progress (%)</th>
                <th scope="col" className="actions-cell batch-actions-cell">Actions</th>
              </tr>
            ) : (
              <tr>
                <th scope="col" style={{ width: '42%' }}>Batch Name</th>
                <th scope="col" style={{ width: '32%' }}>Community</th>
                <th scope="col" className="compact-column">Total Mothers</th>
                <th scope="col" className="status-column">Progress (%)</th>
                <th scope="col" className="actions-cell batch-actions-cell">Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onCommunityRowClick ? () => onCommunityRowClick(row) : undefined}
                  role={onCommunityRowClick ? 'button' : undefined}
                  tabIndex={onCommunityRowClick ? 0 : undefined}
                  onKeyDown={onCommunityRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCommunityRowClick(row);
                    }
                  } : undefined}
                  className={onCommunityRowClick ? 'clickable-row' : undefined}
                >
                  {activeTab === 'communities' ? (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text" title={row.name}>{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">{row.batches}</td>
                      <td className="small-column">{Math.max(0, row.batches - 1)}</td>
                    </>
                  ) : activeTab === 'groups' ? (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text">{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">{row.assignedBatchIds?.length ?? row.batches ?? 0}</td>
                    </>
                  ) : activeTab === 'mothers' ? (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text">{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="status-column">{`${row.visits ?? 0}%`}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text">{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="community-column">{row.community}</td>
                      <td className="compact-column">{row.records}</td>
                      <td className="status-column">{row.progress ?? 0}%</td>
                    </>
                  )}
                  <td className={activeTab === 'batches' ? 'actions-cell batch-actions-cell' : 'actions-cell'}>
                    {activeTab !== 'mothers' ? (
                      <>
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
                                openEditModal(row);
                              }}
                              role="menuitem"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="actions-dropdown-item delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab === 'communities') {
                                  handleDeleteCommunity(row.id);
                                } else if (activeTab === 'groups') {
                                  handleDeleteGroup(row.id);
                                } else {
                                  handleDeleteBatch(row.id);
                                }
                              }}
                              role="menuitem"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="no-actions">—</span>
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
