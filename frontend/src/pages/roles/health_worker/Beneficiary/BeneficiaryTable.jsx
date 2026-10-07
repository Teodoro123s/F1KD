import React from 'react';
import { getMotherDocumentProgress, getMotherMonitoringProgress } from '../_shared/utils/motherProgress';
import { getChildMonitoringProgress, getChildProfileProgress } from '../_shared/utils/childProgress';

export default function BeneficiaryTable({
  currentRows,
  loading = false,
  filteredDataLength,
  rangeStart,
  rangeEnd,
  perPage,
  handlePerPageChange,
  renderPaginationButtons,
  motherProgressByName,
  onSelectMother,
  onSelectChild,
  communities = [],
  groups = [],
  batches = [],
  entityFilter = 'Mother',
}) {
  const emptyColSpan = entityFilter === 'Both' ? 2 : 1;

  const getMotherStatus = (documentProgress) => {
    return documentProgress.completed >= documentProgress.total
      ? <span className="status-complete">Documents complete</span>
      : <span className="status-pending">Documents pending</span>;
  };

  const getChildStatus = (progress) => {
    return progress >= 100
      ? <span className="status-complete">Profile complete</span>
      : <span className="status-checkup">Profile incomplete</span>;
  };

  return (
    <section className="table-card beneficiary-table-card">
      <div className="table-overflow">
        <table className="data-table">
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={emptyColSpan} className="no-data">Loading beneficiaries...</td>
              </tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((row) => {
                const original = row.original || row;
                const motherDocumentProgress = getMotherDocumentProgress(original);
                const motherMonitoringProgress = getMotherMonitoringProgress(original);
                const childProgress = getChildProfileProgress(original);
                const childMonitoringProgress = getChildMonitoringProgress(original);
                const motherObj = communities.find((community) => (
                  community.name === row.community
                  || String(community.id) === String(original.community_id ?? original.communityId)
                ));
                const groupObj = groups.find((group) => (
                  String(group.id) === String(original.group_id ?? original.groupId)
                  || group.name === original.group_name
                  || group.name === original.group
                ));
                const area = motherObj?.area || original.area || '';
                
                // Lookup batch name
                const batchId = row.assignedBatchIds?.[0] || original.batch_id || original.batchId;
                const batchObj = batches.find((b) => b.id === batchId);
                const batchName = batchObj?.name || original.batch_name || original.batch || '';
                const schoolName = row.community || original.community_name || original.community || motherObj?.name || area;
                const groupName = original.group_name || original.group || row.group || groupObj?.name || '';
                const assignmentDetails = [
                  schoolName,
                  groupName,
                  batchName,
                ].filter(Boolean).join(' > ');

                if (entityFilter === 'Mother') {
                  return (
                    <tr key={row.id}>
                      <td className="mother-cell full-row-cell">
                        <button
                          type="button"
                          className="entity-card-button name-cell"
                          onClick={() => onSelectMother?.({
                            ...row,
                            motherName: row.name,
                            groupName: row.name,
                            area,
                            batchName,
                          })}
                          aria-label={`Open mother record for ${row.name}`}
                        >
                          <div className="beneficiary-cell-content">
                            <div className="beneficiary-cell-line-1">
                              <span className="beneficiary-cell-name">{row.name}</span>
                              <div className="beneficiary-progress-wrapper">
                                <div className="progress-bar" aria-hidden="true">
                                  <div className="progress-bar-fill" style={{ width: `${motherMonitoringProgress.percentage}%` }} />
                                </div>
                              </div>
                              <span className="beneficiary-cell-percent">{motherMonitoringProgress.completed}/{motherMonitoringProgress.total}</span>
                            </div>
                            <div className="beneficiary-cell-line-2">
                              {assignmentDetails && <span className="muted">{assignmentDetails}</span>}
                            </div>
                            <div className="beneficiary-cell-line-3">
                              {getMotherStatus(motherDocumentProgress)}
                            </div>
                          </div>
                        </button>
                      </td>
                    </tr>
                  );
                }

                if (entityFilter === 'Child') {
                  return (
                    <tr key={row.id}>
                      <td className="child-cell full-row-cell">
                        <button
                          type="button"
                          className="entity-card-button name-cell"
                          onClick={() => onSelectChild?.({
                            ...row,
                            childName: row.name,
                            motherName: row.community,
                            area,
                            batchName,
                          })}
                          aria-label={`Open child record for ${row.name}`}
                        >
                          <div className="beneficiary-cell-content">
                            <div className="beneficiary-cell-line-1">
                              <span className="beneficiary-cell-name">{row.name}</span>
                              <div className="beneficiary-progress-wrapper">
                                <div className="progress-bar" aria-hidden="true">
                                  <div className="progress-bar-fill child" style={{ width: `${childMonitoringProgress.percentage}%` }} />
                                </div>
                              </div>
                              <span className="beneficiary-cell-percent">{childMonitoringProgress.completed}/{childMonitoringProgress.total}</span>
                            </div>
                            <div className="beneficiary-cell-line-2">
                              {assignmentDetails && <span className="muted">{assignmentDetails}</span>}
                            </div>
                            <div className="beneficiary-cell-line-3">
                              {getChildStatus(childProgress)}
                            </div>
                          </div>
                        </button>
                      </td>
                    </tr>
                  );
                }

                // Default: both columns
                return (
                  <tr key={row.id}>
                    <td className="mother-cell">
                      {(() => {
                        return (
                          <button
                            type="button"
                            className="entity-card-button name-cell"
                            onClick={() => onSelectMother?.({
                              ...row,
                              motherName: row.name,
                              groupName: row.name,
                              area,
                              batchName,
                            })}
                            aria-label={`Open mother record for ${row.name}`}
                          >
                            <div className="beneficiary-cell-content">
                              <div className="beneficiary-cell-line-1">
                                <span className="beneficiary-cell-name">{row.name}</span>
                                <div className="beneficiary-progress-wrapper">
                                  <div className="progress-bar" aria-hidden="true">
                                    <div className="progress-bar-fill" style={{ width: `${motherMonitoringProgress.percentage}%` }} />
                                  </div>
                                </div>
                                <span className="beneficiary-cell-percent">{motherMonitoringProgress.completed}/{motherMonitoringProgress.total}</span>
                              </div>
                              <div className="beneficiary-cell-line-2">
                                {assignmentDetails && <span className="muted">{assignmentDetails}</span>}
                              </div>
                              <div className="beneficiary-cell-line-3">
                                {getMotherStatus(motherDocumentProgress)}
                              </div>
                            </div>
                          </button>
                        );
                      })()}
                    </td>
                    <td className="child-cell">
                      <button
                        type="button"
                        className="entity-card-button name-cell"
                        onClick={() => onSelectChild?.({
                          ...row,
                          childName: row.name,
                          motherName: row.community,
                          area,
                          batchName,
                        })}
                        aria-label={`Open child record for ${row.name}`}
                      >
                        <div className="beneficiary-cell-content">
                          <div className="beneficiary-cell-line-1">
                            <span className="beneficiary-cell-name">{row.name}</span>
                            <div className="beneficiary-progress-wrapper">
                              <div className="progress-bar" aria-hidden="true">
                                <div className="progress-bar-fill child" style={{ width: `${childMonitoringProgress.percentage}%` }} />
                              </div>
                            </div>
                            <span className="beneficiary-cell-percent">{childMonitoringProgress.completed}/{childMonitoringProgress.total}</span>
                          </div>
                          <div className="beneficiary-cell-line-2">
                            {assignmentDetails && <span className="muted">{assignmentDetails}</span>}
                          </div>
                          <div className="beneficiary-cell-line-3">
                            {getChildStatus(childProgress)}
                          </div>
                        </div>
                      </button>
                    </td>
                  </tr>
                );
              })
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
