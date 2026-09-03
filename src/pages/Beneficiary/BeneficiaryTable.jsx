import React from 'react';
import { formatDateForDisplay } from '../../utils/dateFormat';

export default function BeneficiaryTable({
  currentRows,
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
  batches = [],
  entityFilter = 'Mother',
}) {
  const emptyColSpan = entityFilter === 'Both' ? 2 : 1;

  const getMotherStatus = (progress) => {
    return progress >= 100
      ? <span className="status-complete">Profile complete</span>
      : <span className="status-pending">Profile incomplete</span>;
  };

  const getMotherProfileProgress = (mother) => Math.round([
    mother?.firstName || mother?.first_name,
    mother?.lastName || mother?.last_name,
    mother?.dob,
    mother?.community || mother?.area,
    mother?.birthCertificateDocumentPath || mother?.birth_certificate_document_path,
    mother?.consentDocumentPath || mother?.consent_document_path,
  ].filter(Boolean).length * (100 / 6));

  const getChildProfileProgress = (child) => Math.round([
    child?.mother_id || child?.motherId,
    child?.name || child?.first_name || child?.firstName,
    child?.birth_date || child?.birthDate,
    child?.birthDocumentPath || child?.birth_document_path,
  ].filter(Boolean).length * 25);

  const getChildStatus = (progress) => {
    return progress >= 100
      ? <span className="status-complete">Profile complete</span>
      : <span className="status-checkup">Profile incomplete</span>;
  };

  return (
    <section className="table-card beneficiary-table-card">
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              {entityFilter === 'Child' ? (
                <th scope="col" className="name-column group-header">Child</th>
              ) : entityFilter === 'Mother' ? (
                <th scope="col" className="name-column group-header">Mother</th>
              ) : (
                <>
                  <th scope="col" className="name-column group-header">Mother</th>
                  <th scope="col" className="name-column group-header">Child</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => {
                const motherProgress = getMotherProfileProgress(row.original || row);
                const childProgress = getChildProfileProgress(row.original || row);

                // Lookup mother's school/area
                const motherObj = communities.find((c) => c.name === row.community);
                const area = motherObj?.area || row.original?.area || 'Unknown area';
                
                // Lookup batch name
                const batchId = row.assignedBatchIds?.[0] || row.original?.batch_id || row.original?.batchId;
                const batchObj = batches.find((b) => b.id === batchId);
                const batchName = batchObj?.name || row.original?.batch_name || 'Unknown batch';

                const motherBreadcrumb = `${area} > ${row.name} > ${batchName}`;
                const childGroup = row.original?.group_name || row.original?.group || 'Group not assigned';
                const childBreadcrumb = `${childGroup} > ${batchName}`;

                if (entityFilter === 'Mother') {
                  const orig = row.original || {};
                  const contact = orig.contactNumber || orig.contact || orig.contact_number || orig.phone || '';
                  const edd = orig.eddDate || orig.edd_date || orig.edd || row.eddDate || '';
                  const ga = orig.gestationalAge || orig.gestational_age || row.gestationalAge || '';
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
                                  <div className="progress-bar-fill" style={{ width: `${motherProgress}%` }} />
                                </div>
                              </div>
                              <span className="beneficiary-cell-percent">{motherProgress}%</span>
                            </div>
                            <div className="beneficiary-cell-line-2">
                              {contact && <span className="muted">{contact}</span>}
                              {(contact && (edd || ga)) && <span className="muted"> • </span>}
                              {edd ? <span className="muted">EDD: {formatDateForDisplay(edd)}</span> : (ga ? <span className="muted">GA: {ga} wk</span> : null)}
                            </div>
                            <div className="beneficiary-cell-line-3">
                              {getMotherStatus(motherProgress)}
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
                                  <div className="progress-bar-fill child" style={{ width: `${childProgress}%` }} />
                                </div>
                              </div>
                              <span className="beneficiary-cell-percent">{childProgress}%</span>
                            </div>
                            <div className="beneficiary-cell-line-2">
                              {childBreadcrumb}
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
                        const orig = row.original || {};
                        const contact = orig.contactNumber || orig.contact || orig.contact_number || orig.phone || '';
                        const edd = orig.eddDate || orig.edd_date || orig.edd || row.eddDate || '';
                        const ga = orig.gestationalAge || orig.gestational_age || row.gestationalAge || '';
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
                                    <div className="progress-bar-fill" style={{ width: `${motherProgress}%` }} />
                                  </div>
                                </div>
                                <span className="beneficiary-cell-percent">{motherProgress}%</span>
                              </div>
                              <div className="beneficiary-cell-line-2">
                                {contact && <span className="muted">{contact}</span>}
                                {(contact && (edd || ga)) && <span className="muted"> • </span>}
                                {edd ? <span className="muted">EDD: {formatDateForDisplay(edd)}</span> : (ga ? <span className="muted">GA: {ga} wk</span> : null)}
                              </div>
                              <div className="beneficiary-cell-line-3">
                                {getMotherStatus(motherProgress)}
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
                                <div className="progress-bar-fill child" style={{ width: `${childProgress}%` }} />
                              </div>
                            </div>
                            <span className="beneficiary-cell-percent">{childProgress}%</span>
                          </div>
                          <div className="beneficiary-cell-line-2">
                            {childBreadcrumb}
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
