import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/f1kd-logo.png';
import { useAuth } from '../../auth/AuthProvider';
import ActionFeedback, { notifyAction } from '../../components/ActionFeedback';
import { getLoginAttemptStatus, requestPasswordReset, resetPassword } from '../../api/auth';

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
  const [loginAttemptStatus, setLoginAttemptStatus] = useState(null);
  const [retryDeadline, setRetryDeadline] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const statusRequestId = useRef(0);

  const auth = useAuth();

  useEffect(() => {
    if (!retryDeadline) {
      setRetryCountdown(0);
      return undefined;
    }

    let intervalId;
    const updateCountdown = () => {
      const secondsRemaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000));
      setRetryCountdown(secondsRemaining);
      if (secondsRemaining === 0) {
        window.clearInterval(intervalId);
        setRetryDeadline(null);
        setLoginAttemptStatus((current) => current
          ? { ...current, remainingAttempts: current.maxAttempts }
          : current);
        setErrorMessage('');
        setStatusMessage('You can try signing in again now.');
        notifyAction('You can try signing in again now.', 'success');
      }
    };

    updateCountdown();
    intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [retryDeadline]);

  async function refreshLoginAttemptStatus(value) {
    const normalizedEmail = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return;

    const requestId = ++statusRequestId.current;
    try {
      const status = await getLoginAttemptStatus(normalizedEmail);
      if (requestId !== statusRequestId.current || normalizedEmail !== email.trim().toLowerCase()) return;
      setLoginAttemptStatus(status);
      setRetryDeadline(status.retryAfterSeconds > 0
        ? Date.now() + status.retryAfterSeconds * 1000
        : null);
      if (status.retryAfterSeconds > 0) {
        setStatusMessage('');
      }
    } catch (error) {
      if (requestId !== statusRequestId.current) return;
      console.error('Unable to load login attempt status:', error);
      setErrorMessage('Unable to check sign-in availability. You can still try to sign in.');
    }
  }

  useEffect(() => {
    const handleFocus = () => {
      if (!forgotPassword) refreshLoginAttemptStatus(email);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [email, forgotPassword]);

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setLoading(true);
    try {
      await auth.login(email, password);
      setLoginAttemptStatus(null);
      setRetryDeadline(null);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      const body = err.body || {};
      if (Number.isSafeInteger(body.maxAttempts) && Number.isSafeInteger(body.remainingAttempts)) {
        setLoginAttemptStatus(body);
      }
      if (body.retryAfterSeconds > 0) {
        const deadline = Date.now() + body.retryAfterSeconds * 1000;
        setRetryDeadline(deadline);
        setErrorMessage('');
        setStatusMessage('');
        notifyAction('Too many failed attempts. Sign-in is temporarily locked.', 'warning');
      } else {
        const notificationMessage = body.code === 'INVALID_CREDENTIALS'
          ? body.message
          : err.status === 429 && err.retryAfterSeconds
            ? 'Too many sign-in requests. Please wait before trying again.'
            : err.message || 'Login failed. Please check your credentials and try again.';
        const displayMessage = body.code === 'INVALID_CREDENTIALS'
          ? 'The email address or password is incorrect.'
          : notificationMessage;
        setErrorMessage(displayMessage);
        notifyAction(notificationMessage, body.remainingAttempts === 1 ? 'warning' : 'error');
        if (err.status === 429 && err.retryAfterSeconds) {
          setRetryDeadline(Date.now() + err.retryAfterSeconds * 1000);
        }
      }
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
    statusRequestId.current += 1;
    setForgotPassword(true);
    setResetCodeSent(false);
    setErrorMessage('');
    setStatusMessage('');
  }

  function returnToSignIn() {
    statusRequestId.current += 1;
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
                onChange={(event) => {
                  statusRequestId.current += 1;
                  setEmail(event.target.value);
                  setLoginAttemptStatus(null);
                  setRetryDeadline(null);
                  setErrorMessage('');
                  setStatusMessage('');
                }}
                onBlur={(event) => refreshLoginAttemptStatus(event.target.value)}
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

          {!forgotPassword && loginAttemptStatus && retryCountdown === 0 && (
            <p
              className={`login-attempts${loginAttemptStatus.remainingAttempts === 1 ? ' login-attempts--warning' : ''}`}
              role="status"
              aria-live="polite"
            >
              {loginAttemptStatus.remainingAttempts === 1
                ? 'Warning: Only 1 login attempt remaining before temporary lockout.'
                : `You have ${loginAttemptStatus.remainingAttempts} login attempts remaining.`}
            </p>
          )}
          {!forgotPassword && retryCountdown > 0 && (
            <div className="login-lockout" role="status" aria-live="polite">
              <strong>Too many failed attempts.</strong>
              <span>Please try again in </span>
              <time aria-live="off">
                {String(Math.floor(retryCountdown / 60)).padStart(2, '0')}:{String(retryCountdown % 60).padStart(2, '0')}
              </time>
            </div>
          )}

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

          {errorMessage && (
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
            <button type="submit" className="login-button" disabled={loading || (!forgotPassword && retryCountdown > 0)}>
              {loading
                ? (forgotPassword ? 'Please wait…' : 'Signing in…')
                : forgotPassword
                  ? resetCodeSent ? 'Reset password' : 'Send verification code'
                  : retryCountdown > 0 ? 'Please wait' : 'Sign in'}
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
