import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiCreateBeneficiaryAssistantIntent } from '../../api/progressReport';
import { filterBeneficiaryAssistantRecords, getBeneficiaryScreeningMatches } from './beneficiaryAssistantUtils.mjs';
import '../../components/read-only-admin-assistant.css';

const MODULE_DESTINATIONS = {
  monitor: {
    label: 'Open Monitor',
    path: '/monitoring',
    explanation: 'Check-up BMI requests belong in Monitor. I have not calculated or looked up a check-up BMI here.',
  },
  beneficiary: {
    label: 'Open Beneficiaries',
    path: '/beneficiary',
    explanation: 'Initial or baseline BMI requests belong in Beneficiaries. I have not calculated or looked up an initial BMI here.',
  },
  'progress-report': {
    label: 'Open Progress Report',
    path: '/progress-report',
    explanation: 'Report creation and report-summary requests belong in Progress Report. I have not generated a report here.',
  },
};

function getProfileDescription(record) {
  return [
    record.entityType,
    record.code && `Code: ${record.code}`,
    record.age && `Age: ${record.age}`,
    record.gender,
    record.community,
    record.group,
    record.batch,
  ].filter(Boolean).join(' · ');
}

export default function BeneficiaryAssistant({ records, onOpenRecord, recordsLoading = false, recordsError = '' }) {
  const [prompt, setPrompt] = useState('');
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const matches = useMemo(() => filterBeneficiaryAssistantRecords(records, intent), [records, intent]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setIntent(null);
    try {
      setIntent(await apiCreateBeneficiaryAssistantIntent(prompt));
    } catch (requestError) {
      setError(requestError?.message || 'Unable to prepare the beneficiary assistant request.');
    } finally {
      setLoading(false);
    }
  };

  const destination = intent?.mode === 'redirect' ? MODULE_DESTINATIONS[intent.targetModule] : null;
  const isScreening = intent?.mode === 'screening';

  return (
    <section className="read-only-admin-assistant beneficiary-assistant" aria-labelledby="beneficiary-assistant-heading">
      <div className="read-only-admin-assistant__header">
        <div>
          <h2 id="beneficiary-assistant-heading">Beneficiary Assistant</h2>
          <p>Find beneficiary profiles and saved developmental screening results, or open the right module for other requests.</p>
        </div>
        <span className="read-only-admin-assistant__badge">Read-only</span>
      </div>
      <form className="read-only-admin-assistant__form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="beneficiary-assistant-prompt">Ask the Beneficiary Assistant</label>
        <input
          id="beneficiary-assistant-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={500}
          minLength={3}
          required
          placeholder="e.g. Find Mary Princess or list children needing screening follow-up"
        />
        <button type="submit" disabled={loading || prompt.trim().length < 3}>
          {loading ? 'Working…' : 'Ask'}
        </button>
      </form>
      <p className="read-only-admin-assistant__privacy">
        AI receives your request and generic instructions only. Profile data and screening records stay in the app; this assistant cannot edit or save records.
      </p>
      {error && <p className="read-only-admin-assistant__error" role="alert">{error}</p>}
      {destination && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <p>{destination.explanation}</p>
          <Link className="read-only-admin-assistant__module-link" to={destination.path}>{destination.label}</Link>
        </div>
      )}
      {intent?.mode === 'profile-change' && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <p>I can’t create, edit, delete, or save beneficiary profile data. I can find the named profile and open it; use its existing profile controls to make any changes.</p>
        </div>
      )}
      {intent?.mode === 'clinical-info' && intent.clinicalTopic === 'maternal-bp-warning' && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <h3>Maternal blood-pressure warning reference</h3>
          <p>The warning threshold is systolic pressure at least 140 mmHg or diastolic pressure at least 90 mmHg (140/90 mmHg). This is a prompt to monitor for possible gestational hypertension or preeclampsia, not a diagnosis.</p>
          <p>For an individual reading or health concern, consult a qualified health professional.</p>
        </div>
      )}
      {intent && !['redirect', 'clinical-info'].includes(intent.mode) && (
        <div className="read-only-admin-assistant__result" aria-live="polite">
          <h3>{isScreening ? 'Matching screening records' : 'Matching beneficiary profiles'} <span>({matches.length})</span></h3>
          {recordsError && <p className="read-only-admin-assistant__error" role="alert">{recordsError}</p>}
          {recordsLoading && <p>Loading additional authorized beneficiary records…</p>}
          {matches.length ? (
            <ul className="read-only-admin-assistant__record-list">
              {matches.slice(0, 20).map((record) => {
                const screeningMatches = isScreening
                  ? getBeneficiaryScreeningMatches(record, intent.screeningStatus)
                  : [];
                return (
                  <li key={`${record.entityType}-${record.id}`}>
                    <strong>{record.name || 'Unnamed record'}</strong>
                    <span>{getProfileDescription(record)}</span>
                    {isScreening && (
                      <span>
                        {screeningMatches.map(({ status, date }) => `${status}${date ? ` · ${String(date).slice(0, 10)}` : ''}`).join('; ')}
                      </span>
                    )}
                    <button type="button" className="read-only-admin-assistant__toggle" onClick={() => onOpenRecord(record)}>
                      Open profile
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : recordsLoading ? (
            <p>Checking loaded beneficiary records for matches…</p>
          ) : intent.mode === 'profile-change' && !intent.searchText.trim() ? (
            <p>No beneficiary name was included, so I have not searched any profiles. Ask me to find a named beneficiary, or use Create for a new record.</p>
          ) : intent.mode === 'profile-change' ? (
            <p>No matching profile was found in your authorized view. I have not changed any records.</p>
          ) : <p>No matching records with the requested profile or saved screening information are available in your authorized view.</p>}
          {matches.length > 20 && <p>Showing the first 20 of {matches.length} matches.</p>}
        </div>
      )}
    </section>
  );
}
