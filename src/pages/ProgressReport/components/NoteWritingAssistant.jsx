import React, { useEffect, useState } from 'react';
import {
  apiCreateProgressReportAiEntryAssist,
  apiGetProgressReportAiStatus,
} from '../../../api/progressReport';

export function NoteWritingAssistant({ fields, onApply }) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [fieldId, setFieldId] = useState(fields[0]?.id || '');
  const [draft, setDraft] = useState(fields[0]?.value || '');
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let active = true;
    apiGetProgressReportAiStatus()
      .then((status) => {
        if (active) setAvailable(Boolean(status?.available));
      })
      .catch((statusError) => {
        if (active) setError(statusError.message || 'Unable to check the private AI service.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  const prepareDraft = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuggestion('');
    try {
      const result = await apiCreateProgressReportAiEntryAssist(fieldId, draft);
      setSuggestion(result.draft);
    } catch (assistError) {
      setError(assistError.message || 'Unable to prepare a revised draft.');
    } finally {
      setLoading(false);
    }
  };

  if (!fields.length) return null;

  return (
    <section className="progress-report-ai-card note-writing-assistant" aria-labelledby="note-writing-assistant-title">
      <div className="progress-report-ai-heading">
        <div>
          <h2 id="note-writing-assistant-title">AI note-writing help</h2>
          <p>Improve clarity and grammar while preserving your meaning. Nothing is saved until you review and save the form.</p>
        </div>
        <div className="progress-report-ai-heading-actions">
          <button
            type="button"
            className="progress-report-ai-toggle"
            aria-expanded={expanded}
            aria-controls="note-writing-assistant-content"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      <div id="note-writing-assistant-content" className="progress-report-ai-content" hidden={!expanded}>
      {checking ? (
        <p className="progress-report-ai-message" role="status">Checking private AI availability…</p>
      ) : !available ? (
        <p className="progress-report-ai-message" role="status">The private AI service is not available. Your draft remains unchanged.</p>
      ) : (
        <form onSubmit={prepareDraft}>
          <label className="progress-report-ai-prompt-label" htmlFor="note-writing-assistant-field">Notes field</label>
          <select
            id="note-writing-assistant-field"
            value={fieldId}
            onChange={(event) => {
              const nextField = fields.find((field) => field.id === event.target.value);
              setFieldId(event.target.value);
              setDraft(nextField?.value || '');
              setSuggestion('');
            }}
          >
            {fields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
          </select>
          <label className="progress-report-ai-prompt-label" htmlFor="note-writing-assistant-draft">Draft</label>
          <textarea
            id="note-writing-assistant-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={3}
            required
          />
          <p className="progress-report-ai-message">Avoid names, beneficiary IDs, or other identifying details. Your draft is sent to the AI endpoint configured by your administrator. Review the result; it will not be saved automatically.</p>
          <div className="progress-report-ai-actions">
            <span>{draft.length}/2000</span>
            <button type="submit" className="primary-btn" disabled={loading || !draft.trim()}>
              {loading ? 'Preparing…' : 'Prepare a revised draft'}
            </button>
          </div>
        </form>
      )}
      {error && <p className="progress-report-ai-message" role="alert">{error}</p>}
      {suggestion && (
        <div className="progress-report-ai-proposal" aria-live="polite">
          <h3>Review revised draft</h3>
          <p>{suggestion}</p>
          <div className="progress-report-ai-actions">
            <button type="button" className="secondary-btn" onClick={() => setSuggestion('')}>Discard</button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onApply(fieldId, suggestion);
                setDraft(suggestion);
                setSuggestion('');
              }}
            >
              Use in form
            </button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
