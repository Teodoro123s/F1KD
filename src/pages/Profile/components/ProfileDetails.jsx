import React from 'react';
import {
  checkupCardBodyClasses,
  checkupGridClasses,
  checkupSectionTitleClasses,
  checkupFieldLayoutClasses,
  formLabelClasses,
} from '../../../utils/formFieldClasses';
import Button from '../../../components/ui/Button';

function ProfileField({ label, value }) {
  return (
    <div className="form-group">
      <label className={`${formLabelClasses} checkup-field-label`}>{label}</label>
      <input className={`${checkupFieldLayoutClasses} checkup-field-input`} value={value || ''} readOnly />
    </div>
  );
}

export default function ProfileDetails({
  user,
  firstName,
  middleInitial,
  surname,
  assignedSchoolName,
  assignedGroupName,
  canEditProfile,
  isHealthWorker,
  requiresSchoolAssignment,
  onEdit,
}) {
  return (
    <div className="checkup-card">
      <div className={`checkup-card-body ${checkupCardBodyClasses}`}>
        <div className="profile-card-header profile-page-card-header">
          <div className={`checkup-section-title ${checkupSectionTitleClasses}`}>Profile</div>
          {canEditProfile && (
            <Button type="button" variant="secondary" onClick={onEdit}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M13.6 3.4a1.8 1.8 0 0 1 2.5 2.5l-8.7 8.7-3.3.8.8-3.3 8.7-8.7Z" />
                <path d="m12.4 4.6 3 3" />
              </svg>
              Edit profile
            </Button>
          )}
        </div>

        <div className={`checkup-grid user-profile-grid ${checkupGridClasses}`}>
          <ProfileField label="First Name" value={firstName} />
          <ProfileField label="Middle Initial" value={middleInitial} />
          <ProfileField label="Surname" value={surname} />
          <ProfileField label="Email" value={user.email} />
          <ProfileField label="Role" value={user.role} />
          <ProfileField label="Status" value={user.status || 'Active'} />
          <ProfileField label="Contact Number" value={user.contact_number || user.contact || '—'} />
          {requiresSchoolAssignment && (
            <>
              <ProfileField label="School" value={assignedSchoolName || 'Not assigned'} />
              {isHealthWorker && <ProfileField label="Group" value={assignedGroupName || 'Not assigned'} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
