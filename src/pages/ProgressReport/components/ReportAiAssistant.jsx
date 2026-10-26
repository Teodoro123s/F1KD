import React, { useEffect, useRef, useState } from 'react';
import { apiCreateProgressReportAiProposal, apiGetProgressReportAiStatus } from '../../../api/progressReport';
import FieldInfoTooltip from '../../../components/ui/FieldInfoTooltip';
import { REPORT_FIELDS } from '../progressReportConfig';
import { getMotherCheckupSlot, isLatestCheckupRequest } from '../utils/aiReportCsv.mjs';
import { matchesProgramBeneficiaryType } from '../utils/programEligibility';
import {
  buildReportClarificationRequest,
  getReportClarificationMaxLength,
} from '../utils/reportAiPrompt.mjs';

const FIELD_LABELS = new Map(REPORT_FIELDS.map(([id, label]) => [id, label]));
FIELD_LABELS.set('hospitalReferral', 'Referral to Hospital');
const REPORT_CATEGORY_LABELS = {
  profile: 'Beneficiary',
  monitor: 'Monitor',
  program: 'Program',
};
const RETRYABLE_PROPOSAL_ERRORS = new Set([
  'The private AI service returned an invalid report proposal.',
  'The private AI service returned an unsupported report configuration.',
  'The private AI service returned unsupported report fields.',
]);

export function ReportAiAssistant({
  scopeLabel,
  contextKey,
  programs = [],
  initialProgramName,
  initialBenefitPeriod,
  initialBenefitMonth,
  onBuildPreview,
  onExport,
}) {
  const [availability, setAvailability] = useState('checking');
  const [prompt, setPrompt] = useState('');
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [proposal, setProposal] = useState(null);
  const [reportProposal, setReportProposal] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const [aiProgramName, setAiProgramName] = useState(initialProgramName);
  const [aiBenefitPeriod, setAiBenefitPeriod] = useState(initialBenefitPeriod);
  const [aiBenefitMonth, setAiBenefitMonth] = useState(initialBenefitMonth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const requestVersion = useRef(0);

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

  useEffect(() => {
    requestVersion.current += 1;
    setLoading(false);
    setProposal(null);
    setReportProposal(null);
    setReportPreview(null);
    setError('');
    setAiProgramName(initialProgramName);
    setAiBenefitPeriod(initialBenefitPeriod);
    setAiBenefitMonth(initialBenefitMonth);
  }, [contextKey, initialBenefitMonth, initialBenefitPeriod, initialProgramName]);

  const buildPreview = async (nextProposal, filters) => {
    const requestId = requestVersion.current + 1;
    requestVersion.current = requestId;
    setLoading(true);
    setError('');
    try {
      const nextPreview = await onBuildPreview(nextProposal, filters);
      if (requestId === requestVersion.current) setReportPreview(nextPreview);
    } catch (previewError) {
      if (requestId === requestVersion.current) {
        setError(previewError.message || 'Unable to prepare the report preview.');
      }
    } finally {
      if (requestId === requestVersion.current) setLoading(false);
    }
  };

  const requestProposal = async (request) => {
    const requestId = requestVersion.current + 1;
    requestVersion.current = requestId;
    setLoading(true);
    setError('');
    setReportProposal(null);
    setReportPreview(null);
    try {
      let nextProposal;
      try {
        nextProposal = await apiCreateProgressReportAiProposal(request);
      } catch (proposalError) {
        if (!RETRYABLE_PROPOSAL_ERRORS.has(proposalError.message)) throw proposalError;
        if (requestId !== requestVersion.current) return;
        setError('The AI response was incomplete. Retrying once…');
        nextProposal = await apiCreateProgressReportAiProposal(request);
      }
      if (requestId !== requestVersion.current) return;
      setError('');
      if (nextProposal.needsClarification) {
        setProposal(nextProposal);
      } else {
        setProposal(null);
        setReportProposal(nextProposal);
        const eligiblePrograms = programs.filter((program) => matchesProgramBeneficiaryType(program, nextProposal.beneficiaryType));
        const selectedProgramAvailable = eligiblePrograms.some((program) => (
          String(program.name).trim().toLowerCase() === String(aiProgramName).trim().toLowerCase()
        ));
        if (nextProposal.reportCategory !== 'program' || selectedProgramAvailable) {
          const nextPreview = await onBuildPreview(nextProposal, {
            programName: aiProgramName,
            benefitPeriod: aiBenefitPeriod,
            benefitMonth: aiBenefitMonth,
            latestCheckupOnly: nextProposal.reportCategory === 'monitor' && isLatestCheckupRequest(request),
            motherCheckupSlot: nextProposal.reportCategory === 'monitor'
              && nextProposal.beneficiaryType === 'mother'
              ? getMotherCheckupSlot(request)
              : null,
          });
          if (requestId !== requestVersion.current) return;
          setReportPreview(nextPreview);
        }
      }
      setClarificationAnswer('');
    } catch (proposalError) {
      if (requestId === requestVersion.current) {
        setError(proposalError.message || 'Unable to prepare a report proposal.');
      }
    } finally {
      if (requestId === requestVersion.current) setLoading(false);
    }
  };

  const createProposal = async (event) => {
    event.preventDefault();
    const request = prompt.trim();
    setProposal(null);
    setReportProposal(null);
    setReportPreview(null);
    setError('');
    await requestProposal(request);
  };

  const answerClarification = async (event) => {
    event.preventDefault();
    const answer = clarificationAnswer.trim();
    const request = buildReportClarificationRequest(prompt, answer);
    if (!answer || request.length > 1000) {
      setError('Please provide a shorter clarification so the full request stays within 1,000 characters.');
      return;
    }
    await requestProposal(request);
  };

  const maxClarificationLength = getReportClarificationMaxLength(prompt);

  const eligibleAiPrograms = reportProposal?.reportCategory === 'program'
    ? programs.filter((program) => matchesProgramBeneficiaryType(program, reportProposal.beneficiaryType))
    : [];
  const aiProgramIsEligible = eligibleAiPrograms.some((program) => (
    String(program.name).trim().toLowerCase() === String(aiProgramName).trim().toLowerCase()
  ));

  return (
    <section className="progress-report-ai-card" aria-labelledby="progress-report-ai-title">
      <div className="progress-report-ai-heading">
        <div>
          <div className="progress-report-ai-title">
            <h2 id="progress-report-ai-title">AI report builder</h2>
            <FieldInfoTooltip content={`Scope stays fixed: ${scopeLabel || 'your current report selection'}`} />
          </div>
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
        {availability === 'unavailable' ? (
          <p className="progress-report-ai-message" role="status">
            The private AI service is not configured. Ask your administrator to connect an approved self-hosted model.
          </p>
        ) : availability === 'checking' ? (
          <p className="progress-report-ai-message" role="status">Checking private AI availability…</p>
        ) : availability === 'error' ? (
          <p className="progress-report-ai-message" role="alert">{error}</p>
        ) : proposal?.needsClarification ? (
          <form onSubmit={answerClarification}>
            <p className="progress-report-ai-message">{proposal.question}</p>
            <div className="progress-report-ai-suggestions" aria-label="Clarification options">
              {proposal.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={option.length > maxClarificationLength}
                  onClick={() => setClarificationAnswer(option)}
                >
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
              maxLength={maxClarificationLength}
              rows={2}
              required
            />
            {proposal.options.every((option) => option.length > maxClarificationLength) && (
              <p className="progress-report-ai-message" role="status">
                This request is too long to fit a suggested answer. Start over with a shorter report description.
              </p>
            )}
            <div className="progress-report-ai-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setProposal(null);
                  setClarificationAnswer('');
                  setReportProposal(null);
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
              <span>What should this report show?</span>
              <FieldInfoTooltip content="Format: [type]: [fields]. Examples: Child check-up: date; Weight-for-Age, Length-for-Age, or Weight-for-Length interpretation or Z-score. Child BMI is not a check-up field. Child profile: general details; medical/dental history; vaccine doses and dates. Mother profile: general details; prenatal/OB history; medical/dental history; vaccine doses and dates. Program: benefits received; average per month; documentation. School, Group, and Batch scope stays fixed. Choose a program and period after the preview." />
            </label>
            <textarea
              id="progress-report-ai-prompt"
              value={prompt}
              onChange={(event) => {
                requestVersion.current += 1;
                setPrompt(event.target.value);
                setLoading(false);
                setProposal(null);
                setReportProposal(null);
                setReportPreview(null);
                setError('');
              }}
              maxLength={1000}
              rows={3}
              required
            />
            <div className="progress-report-ai-actions">
              <span>{prompt.length}/1000</span>
              <button type="submit" className="primary-btn" disabled={loading || prompt.trim().length < 3}>
                {loading ? 'Building preview…' : 'Create report preview'}
              </button>
            </div>
          </form>
        )}

        {error && availability === 'ready' && <p className="progress-report-ai-message" role="alert">{error}</p>}
        {loading && <p className="progress-report-ai-message" role="status">Building your report preview…</p>}

        {reportProposal?.reportCategory === 'program' && !reportPreview && (
          <div className="progress-report-ai-program-filters">
            <label>
              Program
              <select
                value={aiProgramIsEligible ? aiProgramName : ''}
                onChange={(event) => {
                  setAiProgramName(event.target.value);
                  setReportPreview(null);
                  setError('');
                }}
              >
                <option value="">Select program</option>
                {eligibleAiPrograms.map((program) => <option key={program.id} value={program.name}>{program.name}</option>)}
              </select>
            </label>
            <label>
              Benefit period
              <select value={aiBenefitPeriod} onChange={(event) => {
                setAiBenefitPeriod(event.target.value);
                setError('');
              }}>
                <option value="overall">Overall</option>
                <option value="month">Monthly</option>
              </select>
            </label>
            {aiBenefitPeriod === 'month' && (
              <label>
                Month
                <input type="month" value={aiBenefitMonth} onChange={(event) => {
                  setAiBenefitMonth(event.target.value);
                  setError('');
                }} />
              </label>
            )}
            {!eligibleAiPrograms.length && (
              <p className="progress-report-ai-message" role="alert">No programs are available for this beneficiary type.</p>
            )}
            <button
              type="button"
              className="primary-btn"
              disabled={loading || !aiProgramIsEligible || (aiBenefitPeriod === 'month' && !aiBenefitMonth)}
              onClick={() => buildPreview(reportProposal, {
                programName: aiProgramName,
                benefitPeriod: aiBenefitPeriod,
                benefitMonth: aiBenefitMonth,
              })}
            >
              {loading ? 'Building preview…' : 'Build program report'}
            </button>
          </div>
        )}

        {reportPreview && (
          <div className="progress-report-ai-proposal">
            <div className="progress-report-ai-preview-header">
              <div>
                <h3>Report preview</h3>
                <p>
                  Showing {reportPreview.previewRows.length} of {reportPreview.rowCount} rows.
                  {' '}Export downloads the complete CSV.
                </p>
              </div>
              <button type="button" className="primary-btn" onClick={() => onExport(reportPreview)}>
                Export CSV
              </button>
            </div>
            {reportProposal && (
              <details className="progress-report-ai-understanding">
                <summary>What I understood from your request</summary>
                <dl>
                  <div>
                    <dt>Report</dt>
                    <dd>{REPORT_CATEGORY_LABELS[reportProposal.reportCategory] || reportProposal.reportCategory}</dd>
                  </div>
                  <div>
                    <dt>Beneficiary type</dt>
                    <dd>{reportProposal.beneficiaryType}</dd>
                  </div>
                  <div>
                    <dt>Fields</dt>
                    <dd>
                      {[...(reportProposal.profileMetricIds || []), ...reportProposal.metricIds]
                        .map((id) => FIELD_LABELS.get(id) || id)
                        .join(', ')}
                    </dd>
                  </div>
                  {reportProposal.explanation && (
                    <div>
                      <dt>Summary</dt>
                      <dd>{reportProposal.explanation}</dd>
                    </div>
                  )}
                </dl>
              </details>
            )}
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
              <button type="button" className="secondary-btn" onClick={() => setReportPreview(null)}>
                Create another report
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
