import React, { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { notifyAction } from '../components/ActionFeedback';
import { useAuth } from '../auth/AuthProvider';
import { confirmPasswordReset, requestPasswordResetCode } from '../api/auth';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('settings.darkMode') === 'true');
  const [passwordForm, setPasswordForm] = useState({ passcode: '', newPassword: '', confirmPassword: '' });
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('settings.darkMode', String(darkMode));
  }, [darkMode]);

  const handleRequestCode = async () => {
    setSendingCode(true);
    try {
      const result = await requestPasswordResetCode();
      setCodeSent(true);
      notifyAction(result.message || 'Verification code sent to your account email.');
    } catch (error) {
      notifyAction(error.message || 'Unable to send verification code.', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notifyAction('New passwords do not match.', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      const result = await confirmPasswordReset(
        passwordForm.passcode,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      );
      setPasswordForm({ passcode: '', newPassword: '', confirmPassword: '' });
      setCodeSent(false);
      notifyAction(result.message || 'Password reset successfully.');
    } catch (error) {
      notifyAction(error.message || 'Unable to reset password.', 'error');
    } finally {
      setResettingPassword(false);
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

        <div className="checkup-card" style={{ marginTop: '1rem' }}>
            <div className="checkup-card-body">
              <div className="checkup-section-title">Reset password</div>
              <p>
                Request a one-time verification code to {currentUser?.email || 'your account email'}, then choose a new password.
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={handleRequestCode} disabled={sendingCode}>
                  {sendingCode ? 'Sending...' : codeSent ? 'Resend verification code' : 'Email me a verification code'}
                </button>
              </div>
              <form className="settings-password-form" onSubmit={handlePasswordReset}>
                <div className="checkup-grid user-profile-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="checkup-field-label" htmlFor="password-reset-code">Email verification code</label>
                      <input
                        id="password-reset-code"
                        className="checkup-field-input"
                        type="text"
                        value={passwordForm.passcode}
                        onChange={(event) => updatePasswordField('passcode', event.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        required
                      />
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
                  <button type="submit" className="btn-primary" disabled={resettingPassword}>
                    {resettingPassword ? 'Resetting...' : 'Reset password'}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </main>
    </div>
  );
}
