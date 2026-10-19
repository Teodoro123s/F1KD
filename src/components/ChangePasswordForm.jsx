import React, { useState } from 'react';
import { notifyAction } from './ActionFeedback';
import { changePassword } from '../api/auth';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordForm() {
  const [passwordForm, setPasswordForm] = useState(EMPTY_FORM);
  const [changingPassword, setChangingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const updatePasswordField = (field, value) => {
    setPasswordForm((form) => ({ ...form, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((visible) => ({ ...visible, [field]: !visible[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notifyAction('New passwords do not match.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordForm(EMPTY_FORM);
      setVisiblePasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
      notifyAction('Password changed successfully.');
    } catch (error) {
      notifyAction(error.message || 'Unable to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const fields = [
    { key: 'currentPassword', label: 'Current password', autocomplete: 'current-password' },
    { key: 'newPassword', label: 'New password', autocomplete: 'new-password', minLength: 8 },
    { key: 'confirmPassword', label: 'Confirm new password', autocomplete: 'new-password', minLength: 8 },
  ];

  return (
    <div className="checkup-card">
      <div className="checkup-card-body">
        <div className="checkup-section-title">Change password</div>
        <form className="settings-password-form" onSubmit={handleSubmit}>
          <div className="checkup-grid user-profile-grid">
            {fields.map(({ key, label, autocomplete, minLength }) => {
              const fieldId = `change-password-${key}`;
              return (
                <div className="form-group" key={key}>
                  <label className="checkup-field-label" htmlFor={fieldId}>{label}</label>
                  <span className="password-input-wrap">
                    <input
                      id={fieldId}
                      className="checkup-field-input"
                      type={visiblePasswords[key] ? 'text' : 'password'}
                      value={passwordForm[key]}
                      onChange={(event) => updatePasswordField(key, event.target.value)}
                      autoComplete={autocomplete}
                      minLength={minLength}
                      required
                    />
                    <button
                      type="button"
                      className="password-visibility-button"
                      aria-label={`${visiblePasswords[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                      onClick={() => togglePasswordVisibility(key)}
                    >
                      {visiblePasswords[key] ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="settings-password-actions">
            <button type="submit" className="btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
