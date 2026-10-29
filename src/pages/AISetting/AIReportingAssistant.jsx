import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import { apiGetPrograms } from '../../api/programs';
import { apiCreateAiReportProposal } from '../../api/aiSettings';
import { apiRecordReportDownload } from '../../api/notifications';
import { notifyAction } from '../../components/ActionFeedback';
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';
import { REPORT_FIELDS, formatCellValue, getPointInterpretation } from '../ProgressReport/progressReportConfig';
import { buildProgressReportParams } from '../ProgressReport/utils/apiUtils';
import { buildAiReportCsv, downloadAiReportCsv, getAgeAtCheckupMonths, getMotherCheckupSlot, isLatestCheckupRequest } from '../ProgressReport/utils/aiReportCsv.mjs';
import { matchesProgramBeneficiaryType } from '../ProgressReport/utils/programEligibility';
import { pointValueForTableField } from '../ProgressReport/utils/reportTableUtils.js';
import { detectPotentialPii } from '../../utils/aiPiiDetection.mjs';

const MODEL_REPORT_LABELS = {
  profile: 'Beneficiary profile',
  monitor: 'Monitoring',
  program: 'Project benefits',
};
const FIELD_LABELS = new Map(REPORT_FIELDS.map(([id, label]) => [id, label]));
const getList = (result, key) => Array.isArray(result?.[key]) ? result[key] : Array.isArray(result) ? result : [];

export default function AIReportingAssistant({ configured, storageReady }) {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canRecordReportDownload = hasRole(currentUser?.role, [
    ROLES.ADMIN,
    ROLES.COMMUNITY_COORDINATOR,
    ROLES.PARTNER,
    ROLES.HEALTH_WORKER,
  ]);
  const assignedSchoolId = currentUser?.school_id ?? currentUser?.schoolId ?? '';
  const assignedGroupId = currentUser?.group_id ?? currentUser?.groupId ?? '';
  const [options, setOptions] = useState({ schools: [] });
  const [programs, setPrograms] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selection, setSelection] = useState({ schoolId: '' });
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [clarification, setClarification] = useState('');
  const [proposal, setProposal] = useState(null);
  const [report, setReport] = useState(null);
  const [messages, setMessages] = useState([{
    id: 'welcome',
    role: 'assistant',
    kind: 'text',
    content: 'Tell me what operational report you need. I can help with authorized profile, monitoring, and project-benefit reports.',
  }]);
  const [clarificationMessageId, setClarificationMessageId] = useState(null);
  const [projectMessageId, setProjectMessageId] = useState(null);
  const [reportMessageId, setReportMessageId] = useState(null);
  const [programName, setProgramName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (!configured || !storageReady) {
      setLoadingOptions(false);
      return undefined;
    }
    let active = true;
    setLoadingOptions(true);
    Promise.all([apiGetProgressReportOptions(), apiGetPrograms()])
      .then(([nextOptions, nextPrograms]) => {
        if (!active) return;
        setOptions({ schools: getList(nextOptions, 'schools') });
        setPrograms(getList(nextPrograms, 'programs'));
        setSelection({
          schoolId: assignedSchoolId ? String(assignedSchoolId) : '',
        });
      })
      .catch((optionsError) => {
        if (active) setError(optionsError.message || 'Unable to load your authorized reporting scopes.');
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => { active = false; };
  }, [assignedGroupId, assignedSchoolId, configured, storageReady]);

  const eligiblePrograms = useMemo(() => proposal?.reportCategory === 'program'
    ? programs.filter((program) => matchesProgramBeneficiaryType(program, proposal.beneficiaryType))
    : [], [programs, proposal]);

  const appendMessage = (message) => {
    const id = `ai-message-${++messageIdRef.current}`;
    setMessages((current) => [...current, { id, ...message }]);
    return id;
  };

  const createReport = async (nextProposal, sourcePrompt) => {
    setLoading(true);
    setReport(null);
    setReportMessageId(null);
    try {
      const selectedProgram = nextProposal.reportCategory === 'program'
        ? programs.find((program) => String(program.name) === String(programName))
        : undefined;
      if (nextProposal.reportCategory === 'program' && !selectedProgram) {
        setProposal(nextProposal);
        const message = 'Choose an authorized project before generating this report.';
        appendMessage({ role: 'assistant', kind: 'warning', content: message });
        return;
      }
      const safeSelection = {
        schoolId: isHealthWorker || isOrganizer ? String(assignedSchoolId || '') : selection.schoolId,
        groupId: isHealthWorker ? String(assignedGroupId || '') : '',
        batchId: '',
      };
      const params = buildProgressReportParams({
        selection: safeSelection,
        reportCategory: nextProposal.reportCategory,
        beneficiaryType: nextProposal.beneficiaryType,
        selectedProgram,
        programName: selectedProgram?.name || '',
        benefitPeriod: 'overall',
        page: 1,
        perPage: 100,
        exportAll: true,
      });
      const result = await apiGetProgressReport(params);
      const rows = result?.rows;
      const total = Number(result?.pagination?.total ?? rows?.length ?? 0);
      if (!Array.isArray(rows) || rows.length !== total) {
        throw new Error('The report did not include every matching authorized record. Try a narrower scope.');
      }
      const csvReport = buildAiReportCsv({
        rows,
        proposal: nextProposal,
        selection: safeSelection,
        fieldLabels: FIELD_LABELS,
        latestCheckupOnly: nextProposal.reportCategory === 'monitor' && isLatestCheckupRequest(sourcePrompt),
        motherCheckupSlot: nextProposal.reportCategory === 'monitor' && nextProposal.beneficiaryType === 'mother'
          ? getMotherCheckupSlot(sourcePrompt)
          : null,
        formatValue: formatCellValue,
        getValue: (row, point, field) => {
          if (!point) return row[field];
          if (field === 'measurementDate') return point.date || point.measurementDate || '';
          if (field === 'ageAtCheckupMonths') return getAgeAtCheckupMonths(row.dateOfBirth, point.date || point.measurementDate);
          if (field === 'bmiInterpretation' || field.endsWith('Interpretation')) return getPointInterpretation(point, field);
          if (field.endsWith('ZScore') || ['weightForAge', 'heightForAge', 'bmiForAge'].includes(field)) {
            return pointValueForTableField(point, field);
          }
          return point[field] ?? row[field];
        },
      });
      const completedReport = { ...csvReport, proposal: nextProposal, summary: result.summary || {} };
      setReport(completedReport);
      setProposal(nextProposal);
      setClarificationMessageId(null);
      setProjectMessageId(null);
      const reportId = appendMessage({
        role: 'assistant',
        kind: 'report',
        content: nextProposal.explanation || 'Your authorized report is ready.',
      });
      setReportMessageId(reportId);
    } catch (reportError) {
      const message = reportError.message || 'Unable to build the authorized report.';
      appendMessage({ role: 'assistant', kind: 'warning', content: message });
    } finally {
      setLoading(false);
    }
  };

  const submitPrompt = async (requestText, userMessage = requestText) => {
    if (detectPotentialPii(requestText)) {
      appendMessage({
        role: 'assistant',
        kind: 'warning',
        content: 'This request may contain a name, contact detail, or identifying number. It was not sent. Remove personal details and try again.',
      });
      return;
    }
    if (userMessage) appendMessage({ role: 'user', kind: 'text', content: userMessage });
    setLoading(true);
    setProposal(null);
    setReport(null);
    setClarificationMessageId(null);
    setProjectMessageId(null);
    setReportMessageId(null);
    setPrompt(requestText);
    try {
      const nextProposal = await apiCreateAiReportProposal(requestText);
      if (nextProposal.needsClarification) {
        setProposal(nextProposal);
        const clarificationId = appendMessage({
          role: 'assistant',
          kind: 'clarification',
          content: nextProposal.question,
        });
        setClarificationMessageId(clarificationId);
        return;
      }
      if (nextProposal.reportCategory === 'program') {
        const firstProgram = programs.find((program) => matchesProgramBeneficiaryType(program, nextProposal.beneficiaryType));
        setProgramName(firstProgram?.name || '');
        setProposal(nextProposal);
        const projectId = appendMessage({
          role: 'assistant',
          kind: firstProgram ? 'project' : 'warning',
          content: firstProgram
            ? nextProposal.explanation || 'Choose an eligible project to build this report.'
            : 'No authorized projects support this beneficiary report.',
        });
        setProjectMessageId(firstProgram ? projectId : null);
        return;
      }
      await createReport(nextProposal, requestText);
    } catch (proposalError) {
      const message = proposalError.message || 'Unable to interpret this reporting request.';
      appendMessage({
        role: 'assistant',
        kind: 'warning',
        content: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setClarification('');
    const request = draft.trim();
    submitPrompt(request);
    if (!detectPotentialPii(request)) setDraft('');
  };

  const handleClarification = (event) => {
    event.preventDefault();
    const reply = clarification.trim();
    const request = `${prompt.trim()}\nClarification: ${reply}`;
    setClarification('');
    submitPrompt(request, reply);
  };

  const exportCsv = (reportToExport = report) => {
    if (!reportToExport) return;
    downloadAiReportCsv(reportToExport.csv, reportToExport.filename);
    notifyAction(`CSV downloaded with ${reportToExport.rowCount} row${reportToExport.rowCount === 1 ? '' : 's'}.`);
    if (canRecordReportDownload) {
      apiRecordReportDownload(reportToExport.filename).catch((downloadError) => {
        console.error('Unable to record report download notification:', downloadError);
      });
    }
  };

  if (!configured || !storageReady) {
    return null;
  }

  return (
    <div className="ai-assistant-content">
      <p className="ai-assistant-intro">The provider receives your request for interpretation only. Authorized records are loaded separately through F1KD reporting services. Do not include names, contact details, or identifying numbers.</p>
      {loadingOptions ? (
        <p role="status">Loading authorized reporting scopes…</p>
      ) : (
        <>
          {error && <p className="ai-settings-error" role="alert">{error}</p>}
          <div className="ai-chat-transcript" role="log" aria-live="polite" aria-relevant="additions text">
            <section className="ai-chat-message ai-chat-message--assistant ai-chat-scope" aria-label="Authorized report scope">
              <p>Your authorized scope is applied automatically. Describe the report you need in your request.</p>
              <div className="ai-assistant-filters">
                {!isHealthWorker && !isOrganizer && (
                  <label>
                    Community
                    <select
                      value={selection.schoolId}
                      onChange={(event) => setSelection({ schoolId: event.target.value })}
                    >
                      <option value="">All accessible communities</option>
                      {options.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </section>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-chat-message ai-chat-message--${message.role}${message.kind === 'warning' ? ' ai-chat-message--warning' : ''}`}
              >
                <strong>{message.role === 'user' ? 'You' : 'AI Assistant'}</strong>
                <p>{message.content}</p>
                {message.kind === 'clarification' && message.id === clarificationMessageId && (
                  <form onSubmit={handleClarification}>
                    <label htmlFor={`ai-clarification-${message.id}`}>Your clarification</label>
                    <textarea
                      id={`ai-clarification-${message.id}`}
                      value={clarification}
                      onChange={(event) => setClarification(event.target.value)}
                      maxLength={500}
                      rows={2}
                      required
                    />
                    <button type="submit" className="primary-btn" disabled={loading || !clarification.trim()}>
                      {loading ? 'Preparing…' : 'Continue'}
                    </button>
                  </form>
                )}
                {message.kind === 'project' && message.id === projectMessageId && (
                  <div className="ai-chat-inline-controls">
                    <label htmlFor={`ai-project-${message.id}`}>Project</label>
                    <select
                      id={`ai-project-${message.id}`}
                      value={programName}
                      onChange={(event) => setProgramName(event.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select an eligible project</option>
                      {eligiblePrograms.map((program) => <option key={program.id} value={program.name}>{program.name}</option>)}
                    </select>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={loading || !programName}
                      onClick={() => createReport(proposal, prompt)}
                    >
                      {loading ? 'Preparing report…' : 'Build project report'}
                    </button>
                  </div>
                )}
                {message.kind === 'report' && message.id === reportMessageId && report && (
                  <div className="ai-report-result">
                    <div className="ai-report-result-heading">
                      <div>
                        <h3>{MODEL_REPORT_LABELS[report.proposal.reportCategory] || 'Operational report'}</h3>
                        <p>
                          {report.rowCount.toLocaleString()} records
                          {report.proposal.reportCategory === 'monitor'
                            ? ` · ${report.summary.averageProgress ?? 0}% average monitoring progress`
                            : ''}
                        </p>
                      </div>
                      <button type="button" className="primary-btn" onClick={() => exportCsv(report)}>Export CSV</button>
                    </div>
                    <div className="ai-report-table-wrap">
                      <table>
                        <thead><tr>{report.fields.map((field) => <th scope="col" key={field}>{FIELD_LABELS.get(field) || field}</th>)}</tr></thead>
                        <tbody>
                          {report.previewRows.map((row, rowIndex) => (
                            <tr key={`ai-report-${rowIndex}`}>
                              {row.map((value, fieldIndex) => <td key={`${report.fields[fieldIndex]}-${rowIndex}`}>{value}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!report.previewRows.length && <p>No records match the selected report and authorized scope.</p>}
                    </div>
                    <p className="ai-settings-note">Preview shows up to 20 rows; the CSV export includes all matching authorized rows.</p>
                  </div>
                )}
              </article>
            ))}
            {loading && (
              <article className="ai-chat-message ai-chat-message--assistant" role="status">
                <strong>AI Assistant</strong>
                <p className="ai-chat-loading"><span aria-hidden="true" /> Preparing your report…</p>
              </article>
            )}
          </div>
          <form className="ai-chat-composer" onSubmit={handleSubmit}>
            <label htmlFor="ai-report-request">Message the AI Reporting Assistant</label>
            <textarea
              id="ai-report-request"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="For example: Show mothers by trimester or summarize recent child monitoring."
              required
            />
            <div className="ai-settings-actions">
              <span>{draft.length}/1000</span>
              <button type="submit" className="primary-btn" disabled={loading || loadingOptions || draft.trim().length < 3}>
                {loading ? 'Preparing…' : 'Send request'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
