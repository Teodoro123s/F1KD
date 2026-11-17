import React from 'react';
import {
  checkupFieldLayoutClasses,
  fieldValidationClasses,
  formLabelClasses,
} from '../../../utils/formFieldClasses';
import { CONTACT_NUMBER_POLICY } from '../../../utils/validation/contactNumber';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

export default function ProfileEditDrawer({
  profileForm,
  profileContactError,
  savingProfile,
  confirmSaveOpen,
  onClose,
  onFieldChange,
  onContactBlur,
  onContactInvalid,
  onSubmit,
  onConfirmSave,
  onCancelSave,
}) {
  return (
    <div
      className="profile-edit-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
            onClick={onClose}
            disabled={savingProfile}
            aria-label="Close edit profile"
          >
            ×
          </Button>
        </header>
        <form className="profile-edit-drawer__form" onSubmit={onSubmit}>
          <div className="profile-edit-drawer__fields">
            <div className="form-group">
              <label className={`${formLabelClasses} checkup-field-label`} htmlFor="profile-edit-first-name">First Name</label>
              <input
                id="profile-edit-first-name"
                className={`${checkupFieldLayoutClasses} checkup-field-input`}
                value={profileForm.firstName}
                onChange={(event) => onFieldChange('firstName', event.target.value)}
                autoComplete="given-name"
                required
                disabled={savingProfile}
              />
            </div>
            <div className="form-group">
              <label className={`${formLabelClasses} checkup-field-label`} htmlFor="profile-edit-middle-initial">Middle Initial</label>
              <input
                id="profile-edit-middle-initial"
                className={`${checkupFieldLayoutClasses} checkup-field-input`}
                value={profileForm.middleInitial}
                onChange={(event) => onFieldChange('middleInitial', event.target.value.toUpperCase().slice(0, 1))}
                autoComplete="additional-name"
                maxLength={1}
                aria-label="Middle Initial"
                disabled={savingProfile}
              />
            </div>
            <div className="form-group">
              <label className={`${formLabelClasses} checkup-field-label`} htmlFor="profile-edit-surname">Surname</label>
              <input
                id="profile-edit-surname"
                className={`${checkupFieldLayoutClasses} checkup-field-input`}
                value={profileForm.lastName}
                onChange={(event) => onFieldChange('lastName', event.target.value)}
                autoComplete="family-name"
                required
                disabled={savingProfile}
              />
            </div>
            <div className="form-group">
              <label className={`${formLabelClasses} checkup-field-label`} htmlFor="profile-edit-contact">Contact Number</label>
              <input
                id="profile-edit-contact"
                className={`${checkupFieldLayoutClasses} checkup-field-input`}
                type="tel"
                value={profileForm.contactNumber}
                onChange={(event) => onFieldChange('contactNumber', event.target.value)}
                onBlur={(event) => onContactBlur(event.target.value)}
                onInvalid={onContactInvalid}
                inputMode="numeric"
                maxLength={20}
                pattern="09[0-9]{9}"
                autoComplete="tel"
                disabled={savingProfile}
                aria-invalid={Boolean(profileContactError)}
                aria-describedby={profileContactError ? 'profile-edit-contact-error' : 'profile-edit-contact-hint'}
              />
              <small
                id={profileContactError ? 'profile-edit-contact-error' : 'profile-edit-contact-hint'}
                className={profileContactError ? `field-validation-error ${fieldValidationClasses}` : undefined}
                role={profileContactError ? 'alert' : undefined}
              >
                {profileContactError || CONTACT_NUMBER_POLICY}
              </small>
            </div>
          </div>
          <footer className="profile-edit-drawer__actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={savingProfile}>
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
        onConfirm={onConfirmSave}
        onCancel={onCancelSave}
      />
    </div>
  );
}
