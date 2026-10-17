import React, { useMemo, useState } from 'react';
import { apiCreateAdminAssistantIntent } from '../api/progressReport';
import { filterAdminAssistantRecords, summarizeAdminAssistantRecords } from './readOnlyAdminAssistantUtils.mjs';
import './read-only-admin-assistant.css';

export default function ReadOnlyAdminAssistant({ audience, records }) {
  const [prompt, setPrompt] = useState('');
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredRecords = useMemo(() => {
    return filterAdminAssistantRecords(records, intent);
  }, [intent, records]);

  const summary = useMemo(() => {
    if (intent?.mode !== 'summary') return [];
    return summarizeAdminAssistantRecords(filteredRecords, intent.groupBy);
  }, [filteredRecords, intent]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setIntent(null);
    try {
      const response = await apiCreateAdminAssistantIntent(audience, prompt);
      setIntent(response);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to prepare the read-only assistant request.');
    } finally {
      setLoading(false);
    }
  };

  const isCommunity = audience === 'community';
  const heading = isCommunity ? 'Community Organizer Assistant' : 'User Management Assistant';
  const help = isCommunity
    ? 'Ask for a community, group, or batch lookup or summary, or request setup guidance.'
    : 'Ask for account lookups or read-only summaries by role, status, or community.';

  return (
    <section className="read-only-admin-assistant" aria-labelledby={`assistant-heading-${audience}`}>
      <div className="read-only-admin-assistant__header">
        <div>
          <h2 id={`assistant-heading-${audience}`}>{heading}</h2>
          <p>{help}</p>
        </div>
        <span className="read-only-admin-assistant__badge">Read only</span>
      </div>
      <form className="read-only-admin-assistant__form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor={`assistant-prompt-${audience}`}>Ask the assistant</label>
        <input
          id={`assistant-prompt-${audience}`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={500}
          minLength={3}
          required
          placeholder={isCommunity ? 'e.g. Summarize active groups by community' : 'e.g. Find active Community Organizers'}
        />
        <button type="submit" disabled={loading || prompt.trim().length < 3}>
          {loading ? 'Working…' : 'Ask'}
        </button>
      </form>
      <p className="read-only-admin-assistant__privacy">
        Records stay in this application. The AI receives your request and generic instructions only; it cannot access or change records.
      </p>
      {error && <p className="read-only-admin-assistant__error" role="alert">{error}</p>}
      {intent?.mode === 'setup' && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <h3>Setup guidance</h3>
          <p>{intent.guidance || 'Ask a more specific setup question for community, group, or batch guidance.'}</p>
        </div>
      )}
      {intent && intent.mode !== 'setup' && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <h3>{intent.mode === 'summary' ? 'Summary' : 'Matching records'} <span>({filteredRecords.length})</span></h3>
          {intent.mode === 'summary' ? (
            summary.length ? (
              <ul className="read-only-admin-assistant__summary-list">
                {summary.map(([label, count]) => <li key={label}><span>{label}</span><strong>{count}</strong></li>)}
              </ul>
            ) : <p>No matching records are available in your authorized view.</p>
          ) : (
            filteredRecords.length ? (
              <ul className="read-only-admin-assistant__record-list">
                {filteredRecords.slice(0, 20).map((record) => (
                  <li key={`${record.entityType}-${record.id}`}>
                    <strong>{record.name || 'Unnamed record'}</strong>
                    <span>{[record.entityType, record.role, record.status, record.community, record.group, record.area].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p>No matching records are available in your authorized view.</p>
          )}
        </div>
      )}
    </section>
  );
}
