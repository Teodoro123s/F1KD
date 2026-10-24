import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { PageSkeleton } from '../../components/LoadingSkeleton';
import { useAuth } from '../../auth/AuthProvider';
import { getSummary } from '../Community/communityService';
import { isCommunityCoordinatorRole, isHealthWorkerRole, normalizeRole, ROLES } from '../../utils/permissions';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { apiUpdateUser } from '../../api/users';
import { notifyAction } from '../../components/ActionFeedback';

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.currentUser;
  const [assignedSchoolName, setAssignedSchoolName] = useState('');
  const [assignedGroupName, setAssignedGroupName] = useState('');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const canEditProfile = normalizeRole(user?.role) === ROLES.SUPER_ADMIN;

  const firstName = user?.first_name || user?.firstName || '';
  const middleInitial = user?.middle_initial || user?.middleInitial || '';
  const surname = user?.last_name || user?.lastName || '';

  const displayName = useMemo(() => {
    const parts = [firstName, middleInitial, surname].filter(Boolean);
    return parts.length ? parts.join(' ') : 'My Profile';
  }, [firstName, middleInitial, surname]);

  const openEditDrawer = () => {
    setProfileForm({
      firstName,
      middleInitial: middleInitial.trim().charAt(0).toUpperCase(),
      lastName: surname,
      contactNumber: user?.contact_number || user?.contact || '',
    });
    setEditDrawerOpen(true);
  };

  const closeEditDrawer = () => {
    if (savingProfile) return;
    setEditDrawerOpen(false);
  };

  useEffect(() => {
    if (!editDrawerOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !confirmSaveOpen) closeEditDrawer();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('profile-edit-drawer-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('profile-edit-drawer-open');
    };
  }, [editDrawerOpen, savingProfile, confirmSaveOpen]);

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const requestProfileSave = (event) => {
    event.preventDefault();
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      notifyAction('Unable to identify your account. Please sign in again.', 'error');
      return;
    }
    setConfirmSaveOpen(true);
  };

  const saveProfile = async () => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      setConfirmSaveOpen(false);
      notifyAction('Unable to identify your account. Please sign in again.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedUser = await apiUpdateUser(userId, {
        firstName: profileForm.firstName.trim(),
        middleInitial: profileForm.middleInitial.trim(),
        lastName: profileForm.lastName.trim(),
        contactNumber: profileForm.contactNumber.trim(),
      });
      auth.updateCurrentUser(updatedUser);
      setConfirmSaveOpen(false);
      setEditDrawerOpen(false);
      notifyAction('Profile updated successfully.');
    } catch (error) {
      setConfirmSaveOpen(false);
      notifyAction(error.message || 'Unable to update your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    let active = true;

    if (!user?.school_id && !user?.schoolId) {
      setAssignedSchoolName('Not assigned');
      setAssignedGroupName('Not assigned');
      return undefined;
    }

    getSummary()
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
              <div className="profile-card-header profile-page-card-header">
                <div className="checkup-section-title">Profile</div>
                {canEditProfile && (
                  <Button type="button" variant="secondary" onClick={openEditDrawer}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M13.6 3.4a1.8 1.8 0 0 1 2.5 2.5l-8.7 8.7-3.3.8.8-3.3 8.7-8.7Z" />
                      <path d="m12.4 4.6 3 3" />
                    </svg>
                    Edit profile
                  </Button>
                )}
              </div>

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
          <div style={{ marginTop: '1rem' }}>
            <ChangePasswordForm />
          </div>
          {editDrawerOpen && profileForm && (
            <div
              className="profile-edit-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeEditDrawer();
              }}
            >
              <aside
                className="profile-edit-drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-edit-title"
              >
                <header className="profile-edit-drawer__header">
                  <div>
                    <h2 id="profile-edit-title">Edit profile</h2>
                    <p>Update your personal information.</p>
                  </div>
                  <Button
                    type="button"
                    variant="icon"
                    className="profile-edit-drawer__close"
                    onClick={closeEditDrawer}
                    disabled={savingProfile}
                    aria-label="Close edit profile"
                  >
                    ×
                  </Button>
                </header>
                <form className="profile-edit-drawer__form" onSubmit={requestProfileSave}>
                  <div className="profile-edit-drawer__fields">
                    <div className="form-group">
                      <label className="checkup-field-label" htmlFor="profile-edit-first-name">First Name</label>
                      <input
                        id="profile-edit-first-name"
                        className="checkup-field-input"
                        value={profileForm.firstName}
                        onChange={(event) => updateProfileField('firstName', event.target.value)}
                        autoComplete="given-name"
                        required
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="form-group">
                      <label className="checkup-field-label" htmlFor="profile-edit-middle-initial">Middle Initial</label>
                      <input
                        id="profile-edit-middle-initial"
                        className="checkup-field-input"
                        value={profileForm.middleInitial}
                        onChange={(event) => updateProfileField('middleInitial', event.target.value.toUpperCase().slice(0, 1))}
                        autoComplete="additional-name"
                        maxLength={1}
                        aria-label="Middle Initial"
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="form-group">
                      <label className="checkup-field-label" htmlFor="profile-edit-surname">Surname</label>
                      <input
                        id="profile-edit-surname"
                        className="checkup-field-input"
                        value={profileForm.lastName}
                        onChange={(event) => updateProfileField('lastName', event.target.value)}
                        autoComplete="family-name"
                        required
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="form-group">
                      <label className="checkup-field-label" htmlFor="profile-edit-contact">Contact Number</label>
                      <input
                        id="profile-edit-contact"
                        className="checkup-field-input"
                        type="tel"
                        value={profileForm.contactNumber}
                        onChange={(event) => updateProfileField('contactNumber', event.target.value)}
                        autoComplete="tel"
                        disabled={savingProfile}
                      />
                    </div>
                  </div>
                  <footer className="profile-edit-drawer__actions">
                    <Button type="button" variant="secondary" onClick={closeEditDrawer} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={savingProfile} loadingLabel="Saving..." disabled={savingProfile}>
                      Save changes
                    </Button>
                  </footer>
                </form>
              </aside>
              <ConfirmDialog
                open={confirmSaveOpen}
                title="Save profile changes?"
                description="Are you sure you want to save the updated profile information?"
                variant="primary"
                confirmLabel="Save changes"
                loadingLabel="Saving..."
                loading={savingProfile}
                onConfirm={saveProfile}
                onCancel={() => setConfirmSaveOpen(false)}
              />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
