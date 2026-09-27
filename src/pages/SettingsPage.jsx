import React, { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { notifyAction } from '../components/ActionFeedback';
import { useAuth } from '../auth/AuthProvider';
import { hasRole, ROLES } from '../utils/permissions';
import { changePassword } from '../api/auth';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('settings.darkMode') === 'true');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('settings.darkMode', String(darkMode));
  }, [darkMode]);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notifyAction('New passwords do not match.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notifyAction('Password changed successfully.');
    } catch (error) {
      notifyAction(error.message || 'Unable to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((visible) => ({ ...visible, [field]: !visible[field] }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((form) => ({ ...form, [field]: value }));
  };

  return (
    <div className="community-page">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <main style={{ padding: '1rem' }}>
        <div className="checkup-card">
          <div className="checkup-card-body">
            <div className="checkup-grid user-profile-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="checkup-field-label" htmlFor="dark-mode-toggle">Appearance</label>
                <label htmlFor="dark-mode-toggle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minHeight: '2.75rem', padding: '0.75rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#0f172a', fontWeight: 600 }}>
                  <span>Dark mode</span>
                  <input
                    id="dark-mode-toggle"
                    type="checkbox"
                    checked={darkMode}
                    onChange={(event) => setDarkMode(event.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]) && (
          <div className="checkup-card" style={{ marginTop: '1rem' }}>
            <div className="checkup-card-body">
              <div className="checkup-section-title">Change password</div>
              <form className="settings-password-form" onSubmit={handlePasswordChange}>
                <div className="checkup-grid user-profile-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="checkup-field-label">Current password</label>
                    <span className="password-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        className="checkup-field-input"
                        type={visiblePasswords.currentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button type="button" className="btn-secondary" onClick={() => togglePasswordVisibility('currentPassword')}>
                        {visiblePasswords.currentPassword ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="checkup-field-label">New password</label>
                    <span className="password-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        className="checkup-field-input"
                        type={visiblePasswords.newPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" className="btn-secondary" onClick={() => togglePasswordVisibility('newPassword')}>
                        {visiblePasswords.newPassword ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="checkup-field-label">Confirm new password</label>
                    <span className="password-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        className="checkup-field-input"
                        type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" className="btn-secondary" onClick={() => togglePasswordVisibility('confirmPassword')}>
                        {visiblePasswords.confirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={changingPassword}>
                    {changingPassword ? 'Changing...' : 'Change password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
