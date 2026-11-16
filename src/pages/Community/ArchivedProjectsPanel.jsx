import React, { useMemo, useState } from 'react';
import { apiRestoreArchivedProgram } from '../../api/programs';
import { notifyAction } from '../../components/ActionFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import TableSearch from '../../components/ui/TableSearch';
import { matchesSearch } from '../../utils/search.mjs';

export default function ArchivedProjectsPanel({ projects, loading, error, onRestored }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const filteredProjects = useMemo(() => projects.filter((project) => matchesSearch(query, [
    project.name,
    project.type,
    project.provider,
    project.community,
    project.batch,
    project.description,
    project.beneficiaryType || project.beneficiary_type,
    project.status,
  ])), [projects, query]);
  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * perPage;
  const currentProjects = filteredProjects.slice(pageStart, pageStart + perPage);

  const restoreProject = async () => {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await apiRestoreArchivedProgram(pendingRestore.id);
      onRestored?.(pendingRestore.id);
      setPendingRestore(null);
      notifyAction(`Restored ${pendingRestore.name} from archive. It remains completed.`);
    } catch (error) {
      notifyAction(error?.message || 'Unable to restore project.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <section className="table-card archive-records-panel" aria-label="Archived projects">
        <div className="archive-records-toolbar">
          <div className="community-table-title">Archived projects</div>
          <TableSearch
            value={query}
            onChange={(value) => { setQuery(value); setPage(1); }}
            placeholder="Search projects, partners, or coverage"
          />
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        {loading ? (
          <p className="archive-records-state" role="status">Loading archived projects…</p>
        ) : error ? null : (
          <div className="table-overflow" role="region" aria-label="Scrollable table" tabIndex={0}>
            <table className="data-table program-list-table">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Coverage</th>
                  <th scope="col">Eligible beneficiaries</th>
                  <th scope="col">Status</th>
                  <th scope="col">Project actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProjects.length ? currentProjects.map((project) => {
                  const clusters = project.clusters || [];
                  const coverageNames = [...new Set(clusters.map((cluster) => cluster.name).filter(Boolean))];
                  const isEnded = String(project.status || '').trim().toLowerCase() === 'ended';
                  return (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.name}</strong>
                        <span className="program-table-meta program-list-meta">
                          {[project.type, project.provider].filter(Boolean).join(' · ')}
                        </span>
                        <span className="program-table-meta program-list-meta">
                          Archived {project.archived_at ? new Date(project.archived_at).toLocaleString() : 'date unavailable'}
                          {project.archived_by ? ` by ${project.archived_by}` : ''}
                          {project.archive_reason ? ` · ${project.archive_reason}` : ''}
                        </span>
                      </td>
                      <td>
                        {clusters.length ? (
                          <>
                            <strong>{clusters.length} coverage area{clusters.length === 1 ? '' : 's'}</strong>
                            <span className="program-table-meta program-list-meta" title={coverageNames.join(', ')}>
                              {coverageNames.slice(0, 2).join(', ')}
                              {clusters.length > 2 ? ` +${clusters.length - 2}` : ''}
                            </span>
                          </>
                        ) : <span className="program-table-meta">No coverage assigned</span>}
                      </td>
                      <td><strong>{Number(project.target || 0).toLocaleString()}</strong></td>
                      <td>
                        <span className={`program-status ${isEnded ? 'ended' : 'active'}`}>
                          {isEnded ? 'Completed' : project.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn-secondary" onClick={() => setPendingRestore(project)}>
                          Restore from archive
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="5" className="no-data">No archived projects match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {!loading && !error && (
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
          rangeStart={filteredProjects.length ? pageStart + 1 : 0}
          rangeEnd={Math.min(pageStart + perPage, filteredProjects.length)}
          totalItems={filteredProjects.length}
          itemLabel="projects"
          ariaLabel="Archived projects pagination"
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title="Restore archived project?"
        description={pendingRestore
          ? `Restore ${pendingRestore.name}? Its status will remain completed, and it will return to the Completed Projects list.`
          : ''}
        variant="default"
        confirmLabel="Restore"
        loading={restoring}
        loadingLabel="Restoring…"
        onConfirm={restoreProject}
        onCancel={() => setPendingRestore(null)}
      />
    </>
  );
}
