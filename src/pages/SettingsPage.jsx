import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { hasRole, ROLES } from '../utils/permissions';
import { changePassword } from '../api/auth';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('settings.emailNotifications') !== 'false');
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const handleSave = (event) => {
    event.preventDefault();
    localStorage.setItem('settings.emailNotifications', String(emailNotifications));
    setSaved(true);
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password changed successfully.');
    } catch (error) {
      setPasswordError(error.message || 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((visible) => ({ ...visible, [field]: !visible[field] }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((form) => ({ ...form, [field]: value }));
    setPasswordMessage('');
    setPasswordError('');
  };

  return (
    <div className="page settings-page">
      <h1>Settings</h1>
      <p>Manage your application preferences.</p>

      <form onSubmit={handleSave} style={{ marginTop: 20 }}>
        <h2>Account</h2>
        <label>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(event) => {
              setEmailNotifications(event.target.checked);
              setSaved(false);
            }}
          />
          Receive email notifications
        </label>
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary">Save</button>
          {saved && <span role="status" style={{ marginLeft: 12 }}>Settings saved.</span>}
        </div>
      </form>

      {hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]) && (
        <form className="settings-password-form" onSubmit={handlePasswordChange}>
          <h2>Change password</h2>
          <p>Update the password for your superadmin account.</p>
          <label>
            Current password
            <span className="password-input-wrap">
              <input
                className="form-input"
                type={visiblePasswords.currentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="password-visibility-button" onClick={() => togglePasswordVisibility('currentPassword')}>
                {visiblePasswords.currentPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label>
            New password
            <span className="password-input-wrap">
              <input
                className="form-input"
                type={visiblePasswords.newPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <button type="button" className="password-visibility-button" onClick={() => togglePasswordVisibility('newPassword')}>
                {visiblePasswords.newPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label>
            Confirm new password
            <span className="password-input-wrap">
              <input
                className="form-input"
                type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <button type="button" className="password-visibility-button" onClick={() => togglePasswordVisibility('confirmPassword')}>
                {visiblePasswords.confirmPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <div className="settings-password-actions">
            <button type="submit" className="btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change password'}
            </button>
            {passwordMessage && <span role="status">{passwordMessage}</span>}
            {passwordError && <span role="alert">{passwordError}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
