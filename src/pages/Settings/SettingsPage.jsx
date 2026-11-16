import { checkupCardBodyClasses } from '../../utils/formFieldClasses';
import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { notifyAction } from '../../components/ActionFeedback';
import { useAuth } from '../../auth/AuthProvider';

const GUIDANCE_OPTIONS = [
  {
    key: 'guidedToursEnabled',
    label: 'Guided tours',
    description: 'Show the role-specific tour in the Help menu.',
  },
  {
    key: 'onboardingEnabled',
    label: 'First-time welcome',
    description: 'Show a welcome and tour invitation the first time this account opens the app.',
  },
  {
    key: 'contextualTooltipsEnabled',
    label: 'Optional contextual tooltips',
    description: 'Show optional information icons beside form labels. Essential clinical explanations remain visible.',
  },
  {
    key: 'pageExplanationsEnabled',
    label: 'Page explanations',
    description: 'Show the Explain this page guide in the Help menu.',
  },
  {
    key: 'workflowGuideEnabled',
    label: 'Role workflow guide',
    description: 'Show How it works for this account role in the Help menu.',
  },
];

export default function SettingsPage() {
  const auth = useAuth();
  const preferences = auth?.guidancePreferences;
  const [draft, setDraft] = useState(null);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [savingError, setSavingError] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    if (preferences) {
      setDraft(Object.fromEntries(GUIDANCE_OPTIONS.map(({ key }) => [key, preferences[key]])));
    }
  }, [preferences]);

  const savePreferences = async () => {
    setSavingError('');
    try {
      await auth.saveGuidancePreferences(draft);
      notifyAction('Help and guidance preferences saved.');
    } catch (error) {
      setSavingError(error.message || 'Unable to save help and guidance preferences.');
    }
  };

  const resetPreferences = async () => {
    setResetError('');
    try {
      await auth.resetGuidancePreferences();
      setResetConfirmationOpen(false);
      notifyAction('Help and guidance preferences restored to defaults.');
    } catch (error) {
      setResetError(error.message || 'Unable to reset help and guidance preferences.');
    }
  };

  const updatePreference = (key, enabled) => {
    setDraft((current) => ({ ...current, [key]: enabled }));
  };

  const hasChanges = Boolean(draft && preferences && GUIDANCE_OPTIONS.some(
    ({ key }) => draft[key] !== preferences[key],
  ));

  return (
    <div className="community-page">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <main style={{ padding: '1rem' }}>
        <section className="checkup-card settings-guidance-card" data-guide="settings-guidance" aria-labelledby="guidance-preferences-title">
          <div className={`checkup-card-body ${checkupCardBodyClasses}`}>
            <div className="settings-guidance-header">
              <div>
                <h2 id="guidance-preferences-title">Help and Guidance</h2>
                <p>Choose how much optional guidance you see. These settings apply only to your account.</p>
              </div>
            </div>
            {auth?.guidancePreferencesLoading && !preferences ? (
              <p role="status">Loading your guidance preferences...</p>
            ) : auth?.guidancePreferencesError && !preferences ? (
              <div className="settings-guidance-error" role="alert">
                <span>{auth.guidancePreferencesError}</span>
                <button type="button" className="btn-secondary" onClick={() => auth.loadGuidancePreferences(auth.currentUser)}>Try again</button>
              </div>
            ) : draft ? (
              <>
                <div className="settings-guidance-options">
                  {GUIDANCE_OPTIONS.map(({ key, label, description }) => (
                    <label className="settings-guidance-toggle" key={key}>
                      <span>
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={Boolean(draft[key])}
                        onChange={(event) => updatePreference(key, event.target.checked)}
                        disabled={auth.guidancePreferencesLoading}
                        aria-label={label}
                      />
                    </label>
                  ))}
                </div>
                <div className="settings-guidance-status" aria-live="polite">
                  <strong>Guidance status</strong>
                  <span>Onboarding: {preferences.onboardingCompleted ? (preferences.onboardingDismissed ? 'Dismissed' : 'Completed') : 'Not completed'}</span>
                  <span>Role tour: {preferences.tourStatus === 'completed'
                    ? 'Completed'
                    : preferences.tourStatus === 'in_progress'
                      ? `In progress at step ${preferences.tourStep + 1}`
                      : 'Not started'}</span>
                  <small>Resume an unfinished tour or restart a completed one from the ? Help menu.</small>
                </div>
                {(savingError || (auth.guidancePreferencesError && preferences)) && (
                  <p className="settings-guidance-error" role="alert">{savingError || auth.guidancePreferencesError}</p>
                )}
                <div className="settings-guidance-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={savePreferences}
                    disabled={!hasChanges || auth.guidancePreferencesLoading}
                  >
                    {auth.guidancePreferencesLoading ? 'Saving...' : 'Save preferences'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setResetConfirmationOpen(true)}
                    disabled={auth.guidancePreferencesLoading}
                  >
                    Reset to defaults
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>

        <div style={{ marginTop: '1rem' }}>
          <ChangePasswordForm />
        </div>
      </main>
      <ConfirmDialog
        open={resetConfirmationOpen}
        title="Reset help and guidance?"
        description="This restores all guidance switches and clears onboarding and tour progress for your account. It does not change application access or operational data."
        variant="primary"
        confirmLabel="Reset guidance"
        loading={auth?.guidancePreferencesLoading}
        onConfirm={resetPreferences}
        onCancel={() => {
          setResetConfirmationOpen(false);
          setResetError('');
        }}
        error={resetError}
      />
    </div>
  );
}
