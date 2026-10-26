import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/f1kd-logo.png';
import { useAuth } from '../../auth/AuthProvider';
import ActionFeedback, { notifyAction } from '../../components/ActionFeedback';
import { requestPasswordReset, resetPassword } from '../../api/auth';

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

  const auth = useAuth();

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      const message = err.message || 'Login failed. Please check your credentials and try again.';
      const displayMessage = /invalid credentials/i.test(message)
        ? 'The email address or password is incorrect. Check both and try again.'
        : message;
      setErrorMessage('');
      notifyAction(displayMessage, 'error');
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
      <ActionFeedback />
      <div className="login-shell">
        <div className="login-kicker">
          <img src={logo} alt="F1KD logo" className="login-logo" />
        </div>
        <div className="login-card">
          <form className="login-form" onSubmit={forgotPassword ? handlePasswordReset : handleLogin} noValidate>
          {(!forgotPassword || !resetCodeSent) && (
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? 'login-error-message' : undefined}
                onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); setStatusMessage(''); }}
                placeholder="Enter email"
                autoComplete="username"
                required
              />
            </div>
          )}

          {!forgotPassword && <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? 'login-error-message' : undefined}
                onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((s) => !s)}
                className="login-password-toggle"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A11.4 11.4 0 0 1 12 5c5 0 8.5 4.2 9.5 6-.4.8-1.2 1.8-2.3 2.7" />
                      <path d="M6.2 6.2C3.8 7.7 2.7 10 2.5 11c.4.8 1.3 2.1 2.8 3.4 1.7 1.4 4 2.6 6.7 2.6 1 0 2-.2 2.9-.5" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
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

          {forgotPassword && errorMessage && (
            <div className="login-error" role="alert" aria-live="assertive">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5m0 3.5h.01" />
              </svg>
              <div>
                <strong>{forgotPassword ? 'We couldn’t complete that request' : 'We couldn’t sign you in'}</strong>
                <p id="login-error-message">{errorMessage}</p>
              </div>
            </div>
          )}
          {statusMessage && <p className="login-status" role="status">{statusMessage}</p>}

          <div className="login-actions">
            <button type="submit" className="login-button" disabled={loading}>
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
    </div>
  );
}
