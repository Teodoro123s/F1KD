import React from 'react';
import { BuildingIcon, GroupsIcon, BatchesIcon, MoreVerticalIcon } from './BeneficiaryIcons';

export default function BeneficiaryTable({
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
  selectedGroup,
  motherProgressByName,
}) {
  const emptyColSpan = activeTab === 'communities' ? 3 : 5;

  return (
    <section className="table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            {activeTab === 'communities' ? (
              <tr>
                <th scope="col" style={{ width: '48%' }}>Mother Name</th>
                <th scope="col" className="small-column">Progress (%)</th>
                <th scope="col" className="actions-cell">Actions</th>
              </tr>
            ) : activeTab === 'groups' ? (
              <tr>
                <th scope="col" style={{ width: '28%' }}>Mother Name</th>
                <th scope="col" className="small-column">Progress (%)</th>
                <th scope="col" style={{ width: '28%' }}>Child Name</th>
                <th scope="col" className="small-column">Progress (%)</th>
                <th scope="col" className="actions-cell">Actions</th>
              </tr>
            ) : (
              <tr>
                <th scope="col" style={{ width: '28%' }}>Mother Name</th>
                <th scope="col" className="small-column">Progress (%)</th>
                <th scope="col" style={{ width: '28%' }}>Child Name</th>
                <th scope="col" className="small-column">Progress (%)</th>
                <th scope="col" className="actions-cell">Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={activeTab !== 'batches' && onCommunityRowClick ? () => onCommunityRowClick(row) : undefined}
                  role={activeTab !== 'batches' && onCommunityRowClick ? 'button' : undefined}
                  tabIndex={activeTab !== 'batches' && onCommunityRowClick ? 0 : undefined}
                  onKeyDown={activeTab !== 'batches' && onCommunityRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCommunityRowClick(row);
                    }
                  } : undefined}
                  className={activeTab !== 'batches' && onCommunityRowClick ? 'clickable-row' : undefined}
                >
                  {activeTab === 'communities' ? (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-icon-wrapper" aria-hidden="true">
                            <BuildingIcon />
                          </div>
                          <div className="community-name-info">
                            <span className="community-title-text" title={row.name}>{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">{row.progress ?? 0}%</td>
                    </>
                  ) : activeTab === 'groups' ? (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-icon-wrapper" aria-hidden="true">
                            <BuildingIcon />
                          </div>
                          <div className="community-name-info">
                            <span className="community-title-text" title={row.community}>{row.community}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">{`${motherProgressByName?.[row.community] ?? 0}%`}</td>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text" title={row.name}>{row.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">
                        {row.childProgress != null ? `${row.childProgress}%` : ''}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-icon-wrapper" aria-hidden="true">
                            <BatchesIcon />
                          </div>
                          <div className="community-name-info">
                            <span className="community-title-text">{row.community}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">{`${motherProgressByName?.[row.community] ?? 0}%`}</td>
                      <td>
                        <div className="community-name-cell">
                          <div className="community-name-info">
                            <span className="community-title-text">{selectedGroup?.name ?? ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="small-column">
                        {selectedGroup ? `${selectedGroup.progress ?? 0}%` : ''}
                      </td>
                    </>
                  )}
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
