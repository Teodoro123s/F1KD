import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import lightLogo from '../assets/f1kd-logo.png';
import darkLogo from '../assets/F1KD-bg-transparent.png';

export default function ConsentPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleContinue(event) {
    event.preventDefault();
    if (!agreed) {
      auth.logout();
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await auth.acceptConsent();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to record your consent. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card consent-card" aria-labelledby="consent-title">
        <div className="login-kicker">
          <img src={lightLogo} alt="F1KD logo" className="login-logo theme-logo theme-logo--light" />
          <img src={darkLogo} alt="" aria-hidden="true" className="login-logo theme-logo theme-logo--dark" />
        </div>
        <h1 className="login-title" id="consent-title">User consent</h1>
        <p className="consent-copy">
          F1KD contains sensitive program and beneficiary information. Use it only for authorized work,
          protect your account credentials, and follow your organization&apos;s privacy and data-handling policies.
        </p>
        <form className="consent-form" onSubmit={handleContinue}>
          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>I agree</span>
          </label>
          <p className="consent-note">You must agree to continue. If you do not agree, selecting Continue will sign you out.</p>
          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Recording consent…' : 'Continue'}
          </button>
        </form>
      </section>
    </div>
  );
}
