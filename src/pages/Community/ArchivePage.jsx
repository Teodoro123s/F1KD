import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import { hasRole, isCommunityCoordinatorRole, ROLES } from '../../utils/permissions';
import ArchiveRecordsPanel from './ArchiveRecordsPanel';

export default function ArchivePage() {
  const { currentUser } = useAuth();
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const hasAssignedSchool = Number(currentUser?.school_id ?? currentUser?.schoolId) > 0;
  const types = isSuperAdmin ? ['school'] : ['group', 'batch', 'mother', 'child'];

  return (
    <div className="community-page archive-page">
      <PageHeader title="Archive" />
      {isCommunityOrganizer && !hasAssignedSchool ? (
        <p className="error-message" role="alert">
          Your account must be assigned to a school before you can access archived groups and batches.
        </p>
      ) : (
        <ArchiveRecordsPanel types={types} />
      )}
    </div>
  );
}
