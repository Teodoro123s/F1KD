import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useModalAccessibility from '../../components/ui/useModalAccessibility';
import { notifyAction } from '../../components/ActionFeedback';
import {
  apiGetAiConfiguration,
  apiRemoveAiConfiguration,
  apiSaveAiConfiguration,
  apiTestAiConfiguration,
} from '../../api/aiSettings';
import AIReportingAssistant from './AIReportingAssistant';

export default function AISettingPage() {
  const [configuration, setConfiguration] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('not-configured');
  const [error, setError] = useState('');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantChecking, setAssistantChecking] = useState(false);
  const [assistantCheckError, setAssistantCheckError] = useState('');
  const assistantTriggerRef = useRef(null);
  const assistantDrawerRef = useRef(null);
  const assistantCloseRef = useRef(null);

  useModalAccessibility({
    open: assistantOpen,
    onClose: () => setAssistantOpen(false),
    dialogRef: assistantDrawerRef,
    initialFocusRef: assistantCloseRef,
  });

  useEffect(() => {
    let active = true;
    apiGetAiConfiguration()
      .then((result) => {
        if (!active) return;
        setConfiguration(result);
        setConnectionStatus(result?.configured ? 'connected' : 'not-configured');
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load your AI configuration.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const testConnection = async (event) => {
    event.preventDefault();
    if (!apiKey.trim() || testing || saving) return;
    setTesting(true);
    setError('');
    setShowApiKey(false);
    setConnectionStatus('testing');
    try {
      await apiTestAiConfiguration({ apiKey });
      setConnectionStatus('connected');
      notifyAction('The configured AI provider confirmed the connection.');
    } catch (testError) {
      setConnectionStatus('connection-failed');
      setError(testError.message || 'The AI provider connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!apiKey.trim() || saving || testing) {
      setError('Enter an API key to save or replace the credential.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await apiSaveAiConfiguration({ apiKey });
      setConfiguration(saved);
      setApiKey('');
      setConnectionStatus('connected');
      notifyAction('Your AI provider configuration was saved securely.');
    } catch (saveError) {
      setConnectionStatus('connection-failed');
      setError(saveError.message || 'Unable to save the AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  const removeConfiguration = async () => {
    setRemoving(true);
    setError('');
    try {
      await apiRemoveAiConfiguration();
      setConfiguration((current) => ({ ...current, configured: false, lastTestedAt: null }));
      setApiKey('');
      setConnectionStatus('not-configured');
      setAssistantOpen(false);
      setShowRemoveDialog(false);
      notifyAction('Your saved AI configuration was removed.');
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove the AI configuration.');
    } finally {
      setRemoving(false);
    }
  };

  const openAssistantDrawer = async () => {
    setAssistantOpen(true);
    if (loading) return;
    setAssistantChecking(true);
    setAssistantCheckError('');
    try {
      const currentConfiguration = await apiGetAiConfiguration();
      setConfiguration(currentConfiguration);
      setError('');
    } catch (configurationError) {
      setAssistantCheckError(configurationError.message || 'Unable to verify your AI configuration.');
    } finally {
      setAssistantChecking(false);
    }
  };

  const connectionLabel = connectionStatus === 'testing'
    ? 'Testing Connection'
    : connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connection-failed'
        ? 'Connection Failed'
        : 'Not Configured';

  return (
    <div className="community-page ai-settings-page">
      <PageHeader
        title="AI Setting"
        actions={(
          <button
            ref={assistantTriggerRef}
            type="button"
            className="secondary-btn ai-settings-assistant-trigger"
            onClick={openAssistantDrawer}
          >
            AI Assistant
          </button>
        )}
      />
      <main className="ai-settings-content">
        <section className="ai-settings-card" aria-labelledby="ai-provider-title">
          <div className="ai-settings-section-heading">
            <div>
              <h2 id="ai-provider-title">AI Provider Configuration</h2>
              <p>Credentials belong to your account and are encrypted on the server. They are never returned to this page.</p>
            </div>
          </div>

          {loading ? (
            <p role="status">Loading your AI configuration…</p>
          ) : (
            <>
              {configuration?.secureStorageReady === false && (
                <p className="ai-settings-error" role="alert">
                  Secure credential storage is not configured. Ask the server administrator to set AI_SETTINGS_ENCRYPTION_KEY before saving an API key.
                </p>
              )}
              {configuration?.providerName && configuration?.model && (
                <p className="ai-settings-note" aria-label="Configured AI model">
                  Using {configuration.providerName} · {configuration.model}
                </p>
              )}
              <form className="ai-settings-form" onSubmit={testConnection}>
                <label>
                  API Key
                  <span className="ai-settings-key-field">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(event) => {
                        setApiKey(event.target.value);
                        setConnectionStatus('not-configured');
                        setError('');
                      }}
                      autoComplete="new-password"
                      maxLength={512}
                      placeholder="Enter your API key"
                      aria-describedby="ai-api-key-help"
                    />
                    <button
                      type="button"
                      className="ai-settings-key-toggle"
                      onClick={() => setShowApiKey((visible) => !visible)}
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      aria-pressed={showApiKey}
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </span>
                  <span id="ai-api-key-help" className="ai-settings-note">
                    Your key is encrypted on the server and will not be displayed again after saving.
                  </span>
                </label>
                <div className={`ai-settings-connection ai-settings-connection--${connectionStatus}`} role="status" aria-live="polite">
                  <span>Connection status</span>
                  <strong>{connectionLabel}</strong>
                </div>
                <div className="ai-settings-actions">
                  <button type="submit" className="secondary-btn" disabled={testing || saving || loading || !configuration?.secureStorageReady || !apiKey.trim()}>
                    {testing ? 'Testing Connection…' : 'Test Connection'}
                  </button>
                  <button type="button" className="primary-btn" onClick={saveConfiguration} disabled={saving || testing || loading || !configuration?.secureStorageReady || !apiKey.trim() || connectionStatus !== 'connected'}>
                    {saving ? 'Saving…' : configuration?.configured ? 'Update API Key' : 'Save API Key'}
                  </button>
                  {configuration?.configured && (
                    <button type="button" className="secondary-btn ai-settings-remove" onClick={() => setShowRemoveDialog(true)} disabled={saving || testing || removing}>
                      Remove API Key
                    </button>
                  )}
                </div>
                {error && <p className="ai-settings-error" role="alert">{error}</p>}
              </form>
            </>
          )}
        </section>

        <p className="ai-settings-page-note">
          The assistant is read-only. Your request is sent to the configured provider, while report records are retrieved separately through authorized services. Do not include names, IDs, or contact details in prompts.
        </p>

        {createPortal(
          <div
            className={`ai-assistant-drawer-backdrop${assistantOpen ? ' ai-assistant-drawer-backdrop--open' : ''}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAssistantOpen(false);
            }}
            aria-hidden={!assistantOpen}
          >
            <section
              ref={assistantDrawerRef}
              className="ai-assistant-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-assistant-drawer-title"
              tabIndex={-1}
            >
              <header className="ai-assistant-drawer-header">
                <div>
                  <h2 id="ai-assistant-drawer-title">AI Reporting Assistant</h2>
                  <p>Read-only operational reporting for your authorized scope.</p>
                </div>
                <button
                  ref={assistantCloseRef}
                  type="button"
                  className="ai-assistant-drawer-close"
                  onClick={() => setAssistantOpen(false)}
                  aria-label="Close AI assistant"
                >
                  ×
                </button>
              </header>
              {loading || assistantChecking ? (
                <p role="status">Checking your AI configuration…</p>
              ) : assistantCheckError ? (
                <p className="ai-settings-error" role="alert">{assistantCheckError}</p>
              ) : !configuration ? (
                <p className="ai-settings-error" role="alert">
                  {error || 'Unable to verify your AI configuration. Close this drawer and check the settings message.'}
                </p>
              ) : !configuration.configured ? (
                <p role="status">Configure and test an API key above before using the reporting assistant.</p>
              ) : !configuration.secureStorageReady ? (
                <p className="ai-settings-error" role="alert">
                  Secure credential storage is unavailable. Ask the server administrator to configure AI_SETTINGS_ENCRYPTION_KEY.
                </p>
              ) : (
                <AIReportingAssistant configured storageReady />
              )}
            </section>
          </div>,
          document.body,
        )}
      </main>
      <ConfirmDialog
        open={showRemoveDialog}
        title="Remove API key?"
        description="This permanently removes the API key saved for your account. You will need to test and save a key again before using the reporting assistant."
        confirmLabel="Remove API key"
        loadingLabel="Removing API key…"
        loading={removing}
        onConfirm={removeConfiguration}
        onCancel={() => setShowRemoveDialog(false)}
      />
    </div>
  );
}
