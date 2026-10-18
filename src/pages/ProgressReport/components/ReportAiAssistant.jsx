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
  "Show each child's check-up date, weight, height, and BMI.",
  "Show each mother's check-up date, weight, height, BMI, and BMI interpretation.",
  'Prepare a profile report with prenatal details.',
  'Summarize program benefit receipts.',
];

const FIELD_LABELS = new Map(REPORT_FIELDS.map(([id, label]) => [id, label]));
FIELD_LABELS.set('hospitalReferral', 'Referral to Hospital');

export function ReportAiAssistant({ scopeLabel, onApply }) {
  const [availability, setAvailability] = useState('checking');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

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

  const requestProposal = async (request) => {
    setLoading(true);
    setError('');
    try {
      setProposal(await apiCreateProgressReportAiProposal(request));
      setClarificationAnswer('');
    } catch (proposalError) {
      setError(proposalError.message || 'Unable to prepare a report proposal.');
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async (event) => {
    event.preventDefault();
    const request = prompt.trim();
    setOriginalPrompt(request);
    setProposal(null);
    await requestProposal(request);
  };

  const answerClarification = async (event) => {
    event.preventDefault();
    const answer = clarificationAnswer.trim();
    const request = `${originalPrompt}\nClarification: ${answer}`;
    if (!answer || request.length > 1000) {
      setError('Please provide a shorter clarification so the full request stays within 1,000 characters.');
      return;
    }
    setOriginalPrompt(request);
    await requestProposal(request);
  };

  return (
    <section className="progress-report-ai-card" aria-labelledby="progress-report-ai-title">
      <div className="progress-report-ai-heading">
        <div>
          <h2 id="progress-report-ai-title">AI report builder</h2>
          <p>Describe the report you need. AI will choose matching report settings for your review; beneficiary data stays in the app.</p>
        </div>
        <div className="progress-report-ai-heading-actions">
          <button
            type="button"
            className="progress-report-ai-toggle"
            aria-expanded={expanded}
            aria-controls="progress-report-ai-content"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div id="progress-report-ai-content" className="progress-report-ai-content" hidden={!expanded}>
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
        proposal?.needsClarification ? (
          <form onSubmit={answerClarification}>
            <p className="progress-report-ai-message">{proposal.question}</p>
            <div className="progress-report-ai-suggestions" aria-label="Clarification options">
              {proposal.options.map((option) => (
                <button key={option} type="button" onClick={() => setClarificationAnswer(option)}>
                  {option}
                </button>
              ))}
            </div>
            <label className="progress-report-ai-prompt-label" htmlFor="progress-report-ai-clarification">
              Choose an option or clarify in your own words
            </label>
            <textarea
              id="progress-report-ai-clarification"
              value={clarificationAnswer}
              onChange={(event) => setClarificationAnswer(event.target.value)}
              maxLength={Math.max(0, 1000 - originalPrompt.length - 16)}
              rows={2}
              required
            />
            <div className="progress-report-ai-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setProposal(null);
                  setOriginalPrompt('');
                  setClarificationAnswer('');
                  setError('');
                }}
              >
                Start over
              </button>
              <button type="submit" className="primary-btn" disabled={loading || !clarificationAnswer.trim()}>
                {loading ? 'Preparing…' : 'Continue'}
              </button>
            </div>
          </form>
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
              placeholder="Example: Show each mother's check-up date, height, weight, and BMI."
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
        )
      )}

      {error && availability === 'ready' && <p className="progress-report-ai-message" role="alert">{error}</p>}

      {proposal && !proposal.needsClarification && (
        <div className="progress-report-ai-proposal" aria-live="polite">
          <h3>Review suggested settings</h3>
          <dl>
            <div><dt>Report</dt><dd>{proposal.reportCategory === 'monitor' && proposal.profileMetricIds?.length ? 'Combined profile + monitoring report' : REPORT_CATEGORY_LABELS[proposal.reportCategory]}</dd></div>
            <div><dt>Beneficiaries</dt><dd>{BENEFICIARY_TYPE_LABELS[proposal.beneficiaryType]}</dd></div>
            {proposal.profileMetricIds?.length > 0 && (
              <div>
                <dt>Profile fields</dt>
                <dd>{proposal.profileMetricIds.map((id) => FIELD_LABELS.get(id) || id).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt>Fields / metrics</dt>
              <dd>{proposal.metricIds.map((id) => FIELD_LABELS.get(id) || id).join(', ')}</dd>
            </div>
            {proposal.explanation && <div><dt>Why</dt><dd>{proposal.explanation}</dd></div>}
          </dl>
          <p className="progress-report-ai-message">
            The AI does not receive beneficiary records or choose a school, group, or batch. The app loads records within your current selection and permissions.
            {proposal.reportCategory === 'monitor' ? ' Beneficiary name and check-up date are shown in the monitoring history.' : ''}
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
      </div>
    </section>
  );
}
