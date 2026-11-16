import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import ModuleSelectionHint from '../../components/ui/ModuleSelectionHint';
import { apiGetArchivedRecords } from '../../api/archives';
import { apiGetPrograms } from '../../api/programs';
import { notifyAction } from '../../components/ActionFeedback';
import { hasRole, isCommunityCoordinatorRole, ROLES } from '../../utils/permissions';
import ArchivedProjectsPanel from './ArchivedProjectsPanel';
import ArchiveRecordsPanel from './ArchiveRecordsPanel';

export default function ArchivePage() {
  const { currentUser } = useAuth();
  const [view, setView] = useState(null);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [archivedRecordCount, setArchivedRecordCount] = useState(null);
  const [archiveCountsLoading, setArchiveCountsLoading] = useState(true);
  const [archiveCountsRefresh, setArchiveCountsRefresh] = useState(0);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const hasAssignedSchool = Number(currentUser?.school_id ?? currentUser?.schoolId) > 0;
  const types = isSuperAdmin ? ['user', 'school'] : ['group', 'batch', 'mother', 'child', 'user'];

  useEffect(() => {
    if (isCommunityOrganizer && !hasAssignedSchool) {
      setArchiveCountsLoading(false);
      return undefined;
    }

    let active = true;
    setArchiveCountsLoading(true);
    Promise.all(types.map((type) => apiGetArchivedRecords(type, { limit: 1 })))
      .then((recordResponses) => {
        if (!active) return;
        setArchivedRecordCount(
          recordResponses.reduce((total, response) => total + Number(response.total || 0), 0),
        );
      })
      .catch((error) => {
        if (!active) return;
        setArchivedRecordCount(null);
        notifyAction(error?.message || 'Unable to load archive counts.', 'error');
      })
      .finally(() => {
        if (active) setArchiveCountsLoading(false);
      });
    return () => { active = false; };
  }, [archiveCountsRefresh, hasAssignedSchool, isCommunityOrganizer, isSuperAdmin]);

  useEffect(() => {
    if (!isCommunityOrganizer || !hasAssignedSchool) return undefined;
    let active = true;
    setProjectsLoading(true);
    setProjectsError('');
    apiGetPrograms({ archived: true })
      .then((response) => {
        if (active) setArchivedProjects(response.programs || []);
      })
      .catch((error) => {
        if (active) {
          const message = error?.message || 'Unable to load archived projects.';
          setProjectsError(message);
          notifyAction(message, 'error');
        }
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => { active = false; };
  }, [hasAssignedSchool, isCommunityOrganizer]);

  return (
    <div className="community-page archive-page">
      <PageHeader title="Archive" />
      {isCommunityOrganizer && !hasAssignedSchool ? (
        <p className="error-message" role="alert">
          Your account must be assigned to a school before you can access archived records and Health Worker accounts.
        </p>
      ) : (
        <>
          <div
            className="archive-summary"
            data-guide="archive-summary"
          >
            <ModuleSummaryCards
              selected={view}
              toggleOnSelect
              onSelect={setView}
              cards={[
                {
                  key: 'records',
                  label: 'Archived records',
                  value: archiveCountsLoading ? '…' : archivedRecordCount ?? 'Unavailable',
                  description: 'Show archived records',
                  selectedDescription: 'Hide archived records',
                },
                ...(isCommunityOrganizer ? [{
                  key: 'projects',
                  label: 'Archived projects',
                  value: projectsError ? '—' : projectsLoading ? '…' : archivedProjects.length,
                  description: 'Show archived projects',
                  selectedDescription: 'Hide archived projects',
                }] : []),
              ]}
            />
          </div>
          {view === 'records' || view === 'activity'
            ? <ArchiveRecordsPanel
              types={types}
              view={view}
              onChanged={() => setArchiveCountsRefresh((current) => current + 1)}
            />
            : view === 'projects'
              ? <ArchivedProjectsPanel
                projects={archivedProjects}
                loading={projectsLoading}
                error={projectsError}
                onRestored={(projectId) => setArchivedProjects((current) => current.filter((project) => String(project.id) !== String(projectId)))}
              />
              : null}
          {!view && <ModuleSelectionHint />}
        </>
      )}
    </div>
  );
}
