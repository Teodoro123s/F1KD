import React, { useEffect, useState } from 'react';
import { apiCreateProgressReportAiProposal, apiGetProgressReportAiStatus } from '../../../api/progressReport';
import { REPORT_FIELDS } from '../progressReportConfig';

const REPORT_CATEGORY_LABELS = {
  profile: 'Profile report',
  monitor: 'Monitor report',
  program: 'Program report',
};

const BENEFICIARY_TYPE_LABELS = {
  child: 'Children',
  mother: 'Mothers',
};

const SUGGESTED_PROMPTS = [
  'Review child growth measurements.',
  'Show maternal monitoring and hospital referrals.',
  'Prepare a profile report with prenatal details.',
  'Summarize program benefit receipts.',
];

const FIELD_LABELS = new Map(REPORT_FIELDS.map(([id, label]) => [id, label]));
FIELD_LABELS.set('hospitalReferral', 'Referral to Hospital');

export function ReportAiAssistant({ scopeLabel, onApply }) {
  const [availability, setAvailability] = useState('checking');
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    apiGetProgressReportAiStatus()
      .then((status) => {
        if (active) setAvailability(status?.available ? 'ready' : 'unavailable');
      })
      .catch((statusError) => {
        if (active) {
          setAvailability('error');
          setError(statusError.message || 'Unable to check the private AI service.');
        }
      });
    return () => { active = false; };
  }, []);

  const createProposal = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setProposal(null);
    try {
      setProposal(await apiCreateProgressReportAiProposal(prompt));
    } catch (proposalError) {
      setError(proposalError.message || 'Unable to prepare a report proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="progress-report-ai-card" aria-labelledby="progress-report-ai-title">
      <div className="progress-report-ai-heading">
        <div>
          <h2 id="progress-report-ai-title">Ask AI to configure this report</h2>
          <p>Describe the report you need. Review the suggested settings before applying them.</p>
        </div>
        <span className="progress-report-ai-badge">Private model</span>
      </div>

      <p className="progress-report-ai-scope">
        <strong>Scope stays fixed:</strong> {scopeLabel || 'your current report selection'}
      </p>

      {availability === 'unavailable' ? (
        <p className="progress-report-ai-message" role="status">
          The private AI service is not configured. Ask your administrator to connect an approved self-hosted model.
        </p>
      ) : availability === 'checking' ? (
        <p className="progress-report-ai-message" role="status">Checking private AI availability…</p>
      ) : availability === 'error' ? (
        <p className="progress-report-ai-message" role="alert">{error}</p>
      ) : (
        <form onSubmit={createProposal}>
          <label className="progress-report-ai-prompt-label" htmlFor="progress-report-ai-prompt">
            What would you like to report?
          </label>
          <textarea
            id="progress-report-ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Example: Review child growth measurements."
            required
          />
          <div className="progress-report-ai-suggestions" aria-label="Suggested requests">
            {SUGGESTED_PROMPTS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <div className="progress-report-ai-actions">
            <span>{prompt.length}/1000</span>
            <button type="submit" className="primary-btn" disabled={loading || prompt.trim().length < 3}>
              {loading ? 'Preparing…' : 'Suggest report settings'}
            </button>
          </div>
        </form>
      )}

      {error && availability === 'ready' && <p className="progress-report-ai-message" role="alert">{error}</p>}

      {proposal && (
        <div className="progress-report-ai-proposal" aria-live="polite">
          <h3>Review suggested settings</h3>
          <dl>
            <div><dt>Report</dt><dd>{REPORT_CATEGORY_LABELS[proposal.reportCategory]}</dd></div>
            <div><dt>Beneficiaries</dt><dd>{BENEFICIARY_TYPE_LABELS[proposal.beneficiaryType]}</dd></div>
            <div>
              <dt>Fields / metrics</dt>
              <dd>{proposal.metricIds.map((id) => FIELD_LABELS.get(id) || id).join(', ')}</dd>
            </div>
            {proposal.explanation && <div><dt>Why</dt><dd>{proposal.explanation}</dd></div>}
          </dl>
          <p className="progress-report-ai-message">
            The assistant does not choose a school, group, or batch. Those remain under your current selection and permissions.
            {proposal.reportCategory === 'program' ? ' Select the program manually after applying.' : ''}
          </p>
          <div className="progress-report-ai-actions">
            <button type="button" className="secondary-btn" onClick={() => setProposal(null)}>Discard</button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onApply(proposal);
                setProposal(null);
              }}
            >
              Apply settings
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
