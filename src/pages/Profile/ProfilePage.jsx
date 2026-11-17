import React from 'react';
import { checkupCardBodyClasses, formErrorClasses } from '../../utils/formFieldClasses';
import PageHeader from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/LoadingSkeleton';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import ProfileDetails from './components/ProfileDetails';
import ProfileEditDrawer from './components/ProfileEditDrawer';
import useProfile from './hooks/useProfile';

export default function ProfilePage() {
  const profile = useProfile();

  if (profile.loading) return <PageSkeleton rows={5} />;

  return (
    <div className="community-page">
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'Profile' }]}
      />

      {!profile.user ? (
        <main style={{ padding: '1rem' }}>
          <div className="checkup-card" data-guide="profile-details">
            <div className={`checkup-card-body ${checkupCardBodyClasses}`}>
              <p className={`form-error ${formErrorClasses}`}>No user information available.</p>
            </div>
          </div>
        </main>
      ) : (
        <main style={{ padding: '1rem' }}>
          <ProfileDetails
            user={profile.user}
            firstName={profile.firstName}
            middleInitial={profile.middleInitial}
            surname={profile.surname}
            assignedSchoolName={profile.assignedSchoolName}
            assignedGroupName={profile.assignedGroupName}
            canEditProfile={profile.canEditProfile}
            isHealthWorker={profile.isHealthWorker}
            requiresSchoolAssignment={profile.requiresSchoolAssignment}
            onEdit={profile.openEditDrawer}
          />
          <div style={{ marginTop: '1rem' }}>
            <ChangePasswordForm />
          </div>
          {profile.editDrawerOpen && profile.profileForm && (
            <ProfileEditDrawer
              profileForm={profile.profileForm}
              profileContactError={profile.profileContactError}
              savingProfile={profile.savingProfile}
              confirmSaveOpen={profile.confirmSaveOpen}
              onClose={profile.closeEditDrawer}
              onFieldChange={profile.updateProfileField}
              onContactBlur={(value) => {
                profile.updateProfileField('contactNumber', value);
                profile.setProfileContactTouched(true);
              }}
              onContactInvalid={() => profile.setProfileContactTouched(true)}
              onSubmit={profile.requestProfileSave}
              onConfirmSave={profile.saveProfile}
              onCancelSave={() => profile.setConfirmSaveOpen(false)}
            />
          )}
        </main>
      )}
    </div>
  );
}
