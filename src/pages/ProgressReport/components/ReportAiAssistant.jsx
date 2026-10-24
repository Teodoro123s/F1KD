import React, { useEffect, useState } from 'react';
import { apiCreateProgressReportAiProposal, apiGetProgressReportAiStatus } from '../../../api/progressReport';
import { REPORT_FIELDS } from '../progressReportConfig';

const SUGGESTED_PROMPTS = [
  "Show each child's check-up date, weight, height, and BMI.",
  "Show each mother's check-up date, weight, height, BMI, and BMI interpretation.",
  'Prepare a profile report with prenatal details.',
  'Summarize program benefit receipts.',
];

const FIELD_LABELS = new Map(REPORT_FIELDS.map(([id, label]) => [id, label]));
FIELD_LABELS.set('hospitalReferral', 'Referral to Hospital');
const RETRYABLE_PROPOSAL_ERRORS = new Set([
  'The private AI service returned an invalid report proposal.',
  'The private AI service returned an unsupported report configuration.',
  'The private AI service returned unsupported report fields.',
]);

export function ReportAiAssistant({ scopeLabel, hasSchoolSelection, onBuildPreview, onExport }) {
  const [availability, setAvailability] = useState('checking');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [proposal, setProposal] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
    setReportPreview(null);
    try {
      let nextProposal;
      try {
        nextProposal = await apiCreateProgressReportAiProposal(request);
      } catch (proposalError) {
        if (!RETRYABLE_PROPOSAL_ERRORS.has(proposalError.message)) throw proposalError;
        setError('The AI response was incomplete. Retrying once…');
        nextProposal = await apiCreateProgressReportAiProposal(request);
      }
      setError('');
      if (nextProposal.needsClarification) {
        setProposal(nextProposal);
      } else {
        setProposal(null);
        setReportPreview(await onBuildPreview(nextProposal));
      }
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
    setReportPreview(null);
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
          <p>Describe the report you need. AI selects the fields, then review the matching data before exporting it.</p>
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
      <p className="progress-report-ai-message">
        AI receives only your request and the available field list; authorized report rows are fetched inside F1KD. Do not include names, IDs, contact details, or health information in your request.
      </p>
      <p className="progress-report-ai-message">
        For program reports, select the program, beneficiary type, and benefit period in Report Focus first. The builder uses those filters.
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
                  setReportPreview(null);
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
              <button
                type="submit"
                className="primary-btn"
                disabled={loading || !hasSchoolSelection || prompt.trim().length < 3}
              >
                {loading ? 'Building preview…' : 'Create report preview'}
              </button>
            </div>
            {!hasSchoolSelection && (
              <p className="progress-report-ai-message" role="status">Select a school to generate a CSV within your authorized scope.</p>
            )}
          </form>
        )
      )}

      {error && availability === 'ready' && <p className="progress-report-ai-message" role="alert">{error}</p>}

      {loading && <p className="progress-report-ai-message" role="status">Building your report preview…</p>}

      {reportPreview && (
        <div className="progress-report-ai-proposal">
          <div className="progress-report-ai-preview-header">
            <div>
              <h3>Report preview</h3>
              <p>
                Showing {reportPreview.previewRows.length} of {reportPreview.rowCount} rows.
                {' '}Export downloads the complete CSV.
              </p>
              <p>Fields: {reportPreview.fields.map((id) => FIELD_LABELS.get(id) || id).join(', ')}.</p>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onExport(reportPreview);
              }}
            >
              Export CSV
            </button>
          </div>
          <div className="progress-report-ai-preview-table progress-report-table-shell">
            <table className="progress-report-table standard-results-table">
              <thead>
                <tr>
                  {reportPreview.fields.map((field) => (
                    <th key={field} scope="col">{FIELD_LABELS.get(field) || field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportPreview.previewRows.map((row, rowIndex) => (
                  <tr key={`preview-${rowIndex}`}>
                    {row.map((value, fieldIndex) => (
                      <td key={`${reportPreview.fields[fieldIndex]}-${rowIndex}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="progress-report-ai-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setReportPreview(null);
              }}
            >
              Create another report
            </button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
