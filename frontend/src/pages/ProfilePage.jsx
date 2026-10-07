import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { useAuth } from '../auth/AuthProvider';
import { fetchWithAuth } from '../api/authHeader';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../utils/permissions';

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.currentUser;
  const [assignedSchoolName, setAssignedSchoolName] = useState('');
  const [assignedGroupName, setAssignedGroupName] = useState('');

  const firstName = user?.first_name || user?.firstName || '';
  const middleInitial = user?.middle_initial || user?.middleInitial || '';
  const surname = user?.last_name || user?.lastName || '';

  const displayName = useMemo(() => {
    const parts = [firstName, middleInitial, surname].filter(Boolean);
    return parts.length ? parts.join(' ') : 'My Profile';
  }, [firstName, middleInitial, surname]);

  useEffect(() => {
    let active = true;

    if (!user?.school_id && !user?.schoolId) {
      setAssignedSchoolName('Not assigned');
      setAssignedGroupName('Not assigned');
      return undefined;
    }

    fetchWithAuth('/api/community/summary')
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load assigned community (${response.status})`);
        return response.json();
      })
      .then((summary) => {
        if (!active) return;
        const schoolId = user.school_id ?? user.schoolId;
        const school = (summary.communities || []).find((item) => String(item.id) === String(schoolId));
        setAssignedSchoolName(school?.name || `School ID ${schoolId}`);

        const groupId = user.group_id ?? user.groupId;
        const group = (summary.groups || []).find((item) => String(item.id) === String(groupId));
        setAssignedGroupName(group?.name || (groupId ? `Group ID ${groupId}` : 'Not assigned'));
      })
      .catch(() => {
        if (!active) return;
        setAssignedSchoolName(user?.school_id || user?.schoolId ? `School ID ${user.school_id ?? user.schoolId}` : 'Not assigned');
        setAssignedGroupName('Not assigned');
      });

    return () => { active = false; };
  }, [user]);

  if (auth.loading) return <PageSkeleton rows={5} />;

  const isCommunityOrganizer = isCommunityCoordinatorRole(user?.role);
  const isHealthWorker = isHealthWorkerRole(user?.role);
  const requiresSchoolAssignment = isCommunityOrganizer || isHealthWorker;

  return (
    <div className="community-page">
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'Profile' }]}
      />

      {!user ? (
        <main style={{ padding: '1rem' }}>
          <div className="checkup-card">
            <div className="checkup-card-body">
              <p className="form-error">No user information available.</p>
            </div>
          </div>
        </main>
      ) : (
        <main style={{ padding: '1rem' }}>
          <div className="checkup-card">
            <div className="checkup-card-body">
              <div className="checkup-section-title">Profile</div>

              <div className="checkup-grid user-profile-grid">
                <div className="form-group">
                  <label className="checkup-field-label">First Name</label>
                  <input className="checkup-field-input" value={firstName || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Middle Initial</label>
                  <input className="checkup-field-input" value={middleInitial || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Surname</label>
                  <input className="checkup-field-input" value={surname || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Email</label>
                  <input className="checkup-field-input" value={user.email || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Role</label>
                  <input className="checkup-field-input" value={user.role || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Status</label>
                  <input className="checkup-field-input" value={user.status || 'Active'} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Contact Number</label>
                  <input className="checkup-field-input" value={user.contact_number || user.contact || '—'} readOnly />
                </div>

                {requiresSchoolAssignment && (
                  <>
                    <div className="form-group">
                      <label className="checkup-field-label">School</label>
                      <input className="checkup-field-input" value={assignedSchoolName || 'Not assigned'} readOnly />
                    </div>
                    {isHealthWorker && (
                      <div className="form-group">
                        <label className="checkup-field-label">Group</label>
                        <input className="checkup-field-input" value={assignedGroupName || 'Not assigned'} readOnly />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
