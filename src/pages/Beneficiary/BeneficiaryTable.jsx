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
    if (progress < 60) {
      return <span className="status-missing">🔴 Missing: PSA, Consent Form</span>;
    } else if (progress < 90) {
      return <span className="status-pending">🟡 Pending: Consent Form</span>;
    } else {
      return <span className="status-complete">🟢 Completed Checklist</span>;
    }
  };

  const getChildStatus = (progress) => {
    if (progress < 60) {
      return <span className="status-missing">🔴 Missing: Consent Form</span>;
    } else if (progress < 90) {
      return <span className="status-checkup">🟡 Checkup: Aug 10</span>;
    } else {
      return <span className="status-complete">🟢 Completed Checklist</span>;
    }
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
                const motherProgress = motherProgressByName?.[row.community] ?? 0;
                const childProgress = row.childProgress != null ? row.childProgress : 0;

                // Lookup mother's school/area
                const motherObj = communities.find((c) => c.name === row.community);
                const area = motherObj?.area || 'Poblacion';
                
                // Lookup batch name
                const batchId = row.assignedBatchIds?.[0];
                const batchObj = batches.find((b) => b.id === batchId);
                const batchName = batchObj?.name || 'Health Visit 1';

                const motherBreadcrumb = `${area} School > ${row.name} > ${batchName}`;

                // Calculate child's grade and section
                const idNum = parseInt(String(row.id || '').split('-')[1] || '0', 10);
                const grade = (idNum % 6) + 1;
                const section = String.fromCharCode(65 + (idNum % 4));
                const childBreadcrumb = `Grade ${grade} > Section ${section}`;

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
