import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/f1kd-logo.png';
import { useAuth } from '../../auth/AuthProvider';
import { notifyAction } from '../../components/ActionFeedback';
import { requestPasswordReset, resetPassword } from '../../api/auth';

const TEST_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'partner', label: 'Partner' },
  { value: 'community_coordinator', label: 'Community Organizer' },
  { value: 'health_worker', label: 'Health Worker' },
];

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [testRoleLoading, setTestRoleLoading] = useState('');
  const [testMenuOpen, setTestMenuOpen] = useState(false);
  const testMenuRef = useRef(null);
  const canUseTestShortcuts = import.meta.env.DEV
    || import.meta.env.VITE_ENABLE_TEST_ROLE_SHORTCUTS === 'true'
    || window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1';

  const auth = useAuth();

  useEffect(() => {
    if (!testMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!testMenuRef.current?.contains(event.target)) setTestMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setTestMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [testMenuOpen]);

  async function handleTestRoleLogin(role) {
    setTestRoleLoading(role);
    setErrorMessage('');
    try {
      await auth.loginAsTestRole(role);
      setTestMenuOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Test role sign-in failed', err);
      const message = err.message || 'Test role sign-in failed.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setTestRoleLoading('');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      const message = err.message || 'Login failed. Please check your credentials and try again.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      if (!resetCodeSent) {
        const result = await requestPasswordReset(email);
        setResetCodeSent(true);
        setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
        return;
      }
      const result = await resetPassword(email, passcode, newPassword, confirmPassword);
      setForgotPassword(false);
      setResetCodeSent(false);
      setPasscode('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setStatusMessage(result.message || 'Password reset successfully. You can now sign in.');
    } catch (err) {
      const message = err.message || 'Unable to reset password. Please try again.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resendPasswordResetCode() {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    setPasscode('');
    try {
      const result = await requestPasswordReset(email);
      setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
    } catch (err) {
      const message = err.message || 'Unable to send another verification code.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openPasswordReset() {
    setForgotPassword(true);
    setResetCodeSent(false);
    setErrorMessage('');
    setStatusMessage('');
  }

  function returnToSignIn() {
    setForgotPassword(false);
    setResetCodeSent(false);
    setPasscode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setStatusMessage('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {!forgotPassword && canUseTestShortcuts && (
          <div className="login-test-menu" ref={testMenuRef}>
            <button
              type="button"
              className="login-test-menu-toggle"
              aria-label="Open test sign-in options"
              aria-haspopup="menu"
              aria-expanded={testMenuOpen}
              onClick={() => setTestMenuOpen((open) => !open)}
              disabled={loading || Boolean(testRoleLoading)}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3h6M10 3v6l-5.2 8.4A2.4 2.4 0 0 0 6.9 21h10.2a2.4 2.4 0 0 0 2.1-3.6L14 9V3" />
                <path d="M8 14h8" />
              </svg>
              <span>Test sign-in</span>
            </button>
            {testMenuOpen && (
              <div className="login-test-menu-panel" role="menu" aria-label="Testing sign-in">
                <span className="login-test-menu-heading">Sign in as</span>
                {TEST_ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className="login-test-menu-item"
                    role="menuitem"
                    onClick={() => handleTestRoleLogin(role.value)}
                    disabled={loading || Boolean(testRoleLoading)}
                  >
                    {testRoleLoading === role.value ? 'Signing in…' : role.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="login-kicker">
          <img src={logo} alt="F1KD logo" className="login-logo" />
        </div>
        <h1 className="login-title">{forgotPassword ? 'Reset password' : 'Welcome back'}</h1>

        <form className="login-form" onSubmit={forgotPassword ? handlePasswordReset : handleLogin} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              readOnly={forgotPassword && resetCodeSent}
              onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); setStatusMessage(''); }}
              placeholder="Enter email"
              autoComplete="username"
              required
            />
          </div>

          {!forgotPassword && <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="btn-icon"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>}

          {forgotPassword && resetCodeSent && (
            <>
              <div className="login-field">
                <label htmlFor="reset-passcode">Verification code</label>
                <input
                  id="reset-passcode"
                  name="passcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={passcode}
                  onChange={(event) => { setPasscode(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrorMessage(''); }}
                  placeholder="Enter the six-digit code"
                  required
                />
              </div>
              <div className="login-field">
                <label htmlFor="reset-new-password">New password</label>
                <input
                  id="reset-new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => { setNewPassword(event.target.value); setErrorMessage(''); }}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="login-field">
                <label htmlFor="reset-confirm-password">Confirm new password</label>
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => { setConfirmPassword(event.target.value); setErrorMessage(''); }}
                  placeholder="Re-enter your new password"
                  required
                />
              </div>
            </>
          )}

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          {statusMessage && <p className="login-status" role="status">{statusMessage}</p>}

          <div className="login-actions">
            <button type="submit" className="login-button" disabled={loading || Boolean(testRoleLoading)}>
              {loading
                ? (forgotPassword ? 'Please wait…' : 'Signing in…')
                : forgotPassword
                  ? resetCodeSent ? 'Reset password' : 'Send verification code'
                  : 'Sign in'}
            </button>
          </div>
          <button
            type="button"
            className="login-text-button"
            onClick={forgotPassword ? returnToSignIn : openPasswordReset}
            disabled={loading}
          >
            {forgotPassword ? 'Back to sign in' : 'Forgot password?'}
          </button>
          {forgotPassword && resetCodeSent && (
            <button
              type="button"
              className="login-text-button"
              onClick={resendPasswordResetCode}
              disabled={loading}
            >
              Send a new code
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
