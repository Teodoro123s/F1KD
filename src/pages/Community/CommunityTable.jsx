import React from 'react';
import { MoreVerticalIcon } from './CommunityIcons';

export default function CommunityTable({
  activeTab,
  currentRows,
  groups,
  activeDropdownId,
  toggleDropdown,
  openEditModal,
  handleDeleteCommunity,
  handleDeleteGroup,
  handleDeleteBatch,
  onCommunityRowClick,
  onMotherRowClick,
  canManage = false,
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
                  onClick={onCommunityRowClick ? () => onCommunityRowClick(row) : (onMotherRowClick ? () => onMotherRowClick(row) : undefined)}
                  role={onCommunityRowClick || onMotherRowClick ? 'button' : undefined}
                  tabIndex={onCommunityRowClick || onMotherRowClick ? 0 : undefined}
                  onKeyDown={onCommunityRowClick || onMotherRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onCommunityRowClick) onCommunityRowClick(row);
                      else onMotherRowClick(row);
                    }
                  } : undefined}
                  className={onCommunityRowClick || onMotherRowClick ? 'clickable-row' : undefined}
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
                      <td className="small-column">{groups.filter((group) => group.community === row.name).length}</td>
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
                    {activeTab !== 'mothers' && canManage ? (
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

    </section>
  );
}
