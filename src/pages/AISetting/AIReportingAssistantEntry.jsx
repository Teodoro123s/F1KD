import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useModalAccessibility from '../../components/ui/useModalAccessibility';
import { apiGetAiConfiguration } from '../../api/aiSettings';
import AIReportingAssistant from './AIReportingAssistant';

export default function AIReportingAssistantEntry({
  buttonClassName = 'secondary-btn',
  label = 'AI Assistant',
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [configuration, setConfiguration] = useState(null);
  const [error, setError] = useState('');
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);

  useModalAccessibility({
    open,
    onClose: () => setOpen(false),
    dialogRef: drawerRef,
    initialFocusRef: closeRef,
  });

  const openDrawer = async () => {
    setOpen(true);
    setChecking(true);
    setError('');
    try {
      setConfiguration(await apiGetAiConfiguration());
    } catch (configurationError) {
      setError(configurationError.message || 'Unable to verify your AI configuration.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        onClick={openDrawer}
      >
        {label}
      </button>
      {createPortal(
        <div
          className={`ai-assistant-drawer-backdrop${open ? ' ai-assistant-drawer-backdrop--open' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          aria-hidden={!open}
        >
          <section
            ref={drawerRef}
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
                ref={closeRef}
                type="button"
                className="ai-assistant-drawer-close"
                onClick={() => setOpen(false)}
                aria-label="Close AI assistant"
              >
                ×
              </button>
            </header>
            {checking ? (
              <p role="status">Checking your AI configuration…</p>
            ) : error ? (
              <p className="ai-settings-error" role="alert">{error}</p>
            ) : !configuration ? (
              <p className="ai-settings-error" role="alert">Unable to verify your AI configuration.</p>
            ) : !configuration.configured ? (
              <p role="status">Configure and test an API key in AI Setting before using the reporting assistant.</p>
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
    </>
  );
}
