import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { notifyAction } from '../components/ActionFeedback';
import { useAuth } from '../auth/AuthProvider';
import { changePassword, confirmPasswordReset, requestPasswordResetCode } from '../api/auth';
import './settings-page.css';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (password) => password.length >= 12 },
  { label: 'A lowercase letter', test: (password) => /[a-z]/.test(password) },
  { label: 'An uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'A number', test: (password) => /\d/.test(password) },
  { label: 'A symbol (for example, ! or #)', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export default function SettingsPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [temporaryPasswordForm, setTemporaryPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingTemporaryPassword, setChangingTemporaryPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ passcode: '', newPassword: '', confirmPassword: '' });
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

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

  const handleTemporaryPasswordChange = async (event) => {
    event.preventDefault();
    if (temporaryPasswordForm.newPassword !== temporaryPasswordForm.confirmPassword) {
      notifyAction('New passwords do not match.', 'error');
      return;
    }
    setChangingTemporaryPassword(true);
    try {
      await changePassword(
        temporaryPasswordForm.currentPassword,
        temporaryPasswordForm.newPassword,
        temporaryPasswordForm.confirmPassword,
      );
      notifyAction('Password changed. Sign in with your new password.');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      notifyAction(error.message || 'Unable to change password.', 'error');
    } finally {
      setChangingTemporaryPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((visible) => ({ ...visible, [field]: !visible[field] }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((form) => ({ ...form, [field]: value }));
  };
  const unmetPasswordRequirements = PASSWORD_REQUIREMENTS
    .filter(({ test }) => !test(passwordForm.newPassword))
    .map(({ label }) => label);

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <main className="settings-page__content">
        {currentUser?.must_change_password && (
          <div className="checkup-card" >
            <div className="checkup-card-body">
              <div className="checkup-section-title">Set a new password</div>
              <p>Your temporary password must be replaced before you can use the rest of the app.</p>
              <form className="settings-password-form" onSubmit={handleTemporaryPasswordChange}>
                <div className="checkup-grid user-profile-grid">
                  <div className="form-group" >
                    <label className="checkup-field-label" htmlFor="temporary-password">Temporary password</label>
                    <input
                      id="temporary-password"
                      className="checkup-field-input"
                      type="password"
                      autoComplete="current-password"
                      value={temporaryPasswordForm.currentPassword}
                      onChange={(event) => setTemporaryPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" >
                    <label className="checkup-field-label" htmlFor="temporary-new-password">New password</label>
                    <input
                      id="temporary-new-password"
                      className="checkup-field-input"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      value={temporaryPasswordForm.newPassword}
                      onChange={(event) => setTemporaryPasswordForm((form) => ({ ...form, newPassword: event.target.value }))}
                      required
                    />
                    <div >
                      Use at least 12 characters, including uppercase and lowercase letters, a number, and a symbol.
                    </div>
                  </div>
                  <div className="form-group" >
                    <label className="checkup-field-label" htmlFor="temporary-confirm-password">Confirm new password</label>
                    <input
                      id="temporary-confirm-password"
                      className="checkup-field-input"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      value={temporaryPasswordForm.confirmPassword}
                      onChange={(event) => setTemporaryPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div >
                  <button type="submit" className="btn-primary" disabled={changingTemporaryPassword}>
                    {changingTemporaryPassword ? 'Changing...' : 'Change password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {!currentUser?.must_change_password && (
        <div className="checkup-card">
          <div className="checkup-card-body">
            <div className="checkup-section-title">Reset password</div>
            <p>
              Get a one-time code at {currentUser?.email || 'your account email'} to verify your identity and set a new password.
            </p>
            <div >
              <button type="button" className="btn-secondary" onClick={handleRequestCode} disabled={sendingCode}>
                {sendingCode ? 'Sending...' : codeSent ? 'Resend verification code' : 'Email me a verification code'}
              </button>
            </div>
            <form className="settings-password-form settings-password-form--reset" onSubmit={handlePasswordReset}>
                <div className="checkup-grid user-profile-grid">
                  <div className="form-group" >
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

                  <div className="form-group" >
                    <label className="checkup-field-label">New password</label>
                    <span className="password-input-wrap" >
                      <input
                        className="checkup-field-input"
                        type={visiblePasswords.newPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                        minLength={12}
                        autoComplete="new-password"
                        aria-describedby="password-strength-guidance"
                        required
                      />
                      <button type="button" className="btn-secondary" onClick={() => togglePasswordVisibility('newPassword')}>
                        {visiblePasswords.newPassword ? 'Hide' : 'Show'}
                      </button>
                    </span>
                    <div id="password-strength-guidance"  aria-live="polite">
                      <p >
                        Use 12 or more characters with uppercase and lowercase letters, a number, and a symbol. Avoid names and reused passwords.
                      </p>
                      {unmetPasswordRequirements.length
                        ? <p >Still needed: {unmetPasswordRequirements.join(', ')}.</p>
                        : <p >Your password meets the strength requirements.</p>}
                    </div>
                  </div>

                  <div className="form-group" >
                    <label className="checkup-field-label">Confirm new password</label>
                    <span className="password-input-wrap" >
                      <input
                        className="checkup-field-input"
                        type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                        minLength={12}
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" className="btn-secondary" onClick={() => togglePasswordVisibility('confirmPassword')}>
                        {visiblePasswords.confirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </div>
                </div>

                <div >
                  <button type="submit" className="btn-primary" disabled={resettingPassword}>
                    {resettingPassword ? 'Resetting...' : 'Reset password'}
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
