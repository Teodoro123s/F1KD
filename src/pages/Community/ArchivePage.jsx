import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import ModuleSelectionHint from '../../components/ui/ModuleSelectionHint';
import { hasRole, isCommunityCoordinatorRole, ROLES } from '../../utils/permissions';
import ArchiveRecordsPanel from './ArchiveRecordsPanel';

export default function ArchivePage() {
  const { currentUser } = useAuth();
  const [view, setView] = useState(null);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const hasAssignedSchool = Number(currentUser?.school_id ?? currentUser?.schoolId) > 0;
  const types = isSuperAdmin ? ['school', 'user'] : ['group', 'batch', 'mother', 'child', 'user'];

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
              ]}
            />
          </div>
          {view && <ArchiveRecordsPanel types={types} view={view} />}
          {!view && <ModuleSelectionHint />}
        </>
      )}
    </div>
  );
}
