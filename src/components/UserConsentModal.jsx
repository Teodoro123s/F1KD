import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Button from './ui/Button';
import UnifiedModal from './ui/UnifiedModal';

export default function UserConsentModal() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setSaving(true);
    setError('');
    try {
      await auth.acceptConsent();
    } catch (requestError) {
      setError(requestError.message || 'Unable to record your consent. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <UnifiedModal
      isOpen
      title="F1KD User Consent"
      size="md"
      closeDisabled
      showCloseButton={false}
      className="user-consent-modal"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={handleSignOut} disabled={saving}>
            Sign out
          </Button>
          <Button type="button" onClick={handleAccept} disabled={!agreed || saving} loading={saving}>
            Agree and continue
          </Button>
        </>
      )}
    >
      <div className="user-consent-copy">
        <p>
          F1KD contains sensitive project and beneficiary information. Use it only for authorized work,
          protect your account credentials, and follow your organization&apos;s privacy and data-handling policies.
        </p>
        <label className="user-consent-checkbox">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={saving}
          />
          <span>I agree to use F1KD in accordance with these responsibilities.</span>
        </label>
        <p className="user-consent-note">You must agree before you can continue using F1KD.</p>
        {error && <p className="user-consent-error" role="alert">{error}</p>}
      </div>
    </UnifiedModal>
  );
}
