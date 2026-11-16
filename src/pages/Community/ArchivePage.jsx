import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import ModuleSelectionHint from '../../components/ui/ModuleSelectionHint';
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
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const hasAssignedSchool = Number(currentUser?.school_id ?? currentUser?.schoolId) > 0;
  const types = isSuperAdmin ? ['user', 'school'] : ['group', 'batch', 'mother', 'child', 'user'];

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
          <div data-guide="archive-summary">
            <ModuleSummaryCards
              selected={view}
              toggleOnSelect
              onSelect={setView}
              cards={[
                {
                  key: 'records',
                  label: 'Archived records',
                  description: 'Show archived records',
                  selectedDescription: 'Hide archived records',
                },
                {
                  key: 'activity',
                  label: 'Archive activity',
                  description: 'Show activity',
                  selectedDescription: 'Hide activity',
                },
                ...(isCommunityOrganizer ? [{
                  key: 'projects',
                  label: 'Archived projects',
                  value: projectsError ? '—' : projectsLoading ? '…' : archivedProjects.length,
                  description: 'Show projects',
                  selectedDescription: 'Hide projects',
                }] : []),
              ]}
            />
          </div>
          {view === 'records' || view === 'activity'
            ? <ArchiveRecordsPanel types={types} view={view} />
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
