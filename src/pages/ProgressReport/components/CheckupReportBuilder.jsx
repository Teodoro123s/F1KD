import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetChildren } from '../../../api/children';
import { apiGetMothers } from '../../../api/mothers';
import { apiCreateMonitoringReportIntent } from '../../../api/progressReport';
import FieldInfoTooltip from '../../../components/ui/FieldInfoTooltip';
import { downloadContent, generateCsvContent } from '../utils/exportUtils';
import {
  escapeMonitoringReportCsvValue,
  filterMonitoringReportCheckups,
  getFirstMonitoringReportCheckup,
  getLatestMonitoringReportCheckup,
  getMonitoringReportCheckups,
  getMonitoringReportValue,
  MONITORING_REPORT_FIELD_LABELS,
} from '../../Monitoring/monitoringReportUtils.mjs';

const MONITORING_SCOPE_FIELDS = [
  { id: 'school', label: 'School', terms: ['school', 'schools'], keys: ['school', 'schoolName', 'school_name', 'community', 'communityName', 'community_name'] },
  { id: 'community', label: 'Community', terms: ['community', 'communities'], keys: ['community', 'communityName', 'community_name', 'area'] },
  { id: 'group', label: 'Group', terms: ['group', 'groups'], keys: ['group', 'groupName', 'group_name'] },
  { id: 'batch', label: 'Batch', terms: ['batch', 'batches'], keys: ['batch', 'batchName', 'batch_name', 'batchCode', 'batch_code'] },
];

function getBeneficiaryId(beneficiary, type) {
  return String(type === 'Mother'
    ? beneficiary?.id ?? beneficiary?.motherId ?? beneficiary?.mother_id ?? beneficiary?.motherCode ?? beneficiary?.mother_code ?? ''
    : beneficiary?.id ?? beneficiary?.childId ?? beneficiary?.child_id ?? beneficiary?.childCode ?? beneficiary?.child_code ?? '');
}

function getBeneficiaryName(beneficiary, type) {
  if (type === 'Child') return beneficiary?.name || [beneficiary?.firstName || beneficiary?.first_name, beneficiary?.middleName || beneficiary?.middle_name, beneficiary?.lastName || beneficiary?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed child';
  return beneficiary?.name || [beneficiary?.firstName || beneficiary?.first_name, beneficiary?.middleName || beneficiary?.middle_name, beneficiary?.lastName || beneficiary?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed mother';
}

function getMonitoringScopeValue(beneficiary, scope) {
  return scope.keys
    .map((key) => beneficiary?.[key])
    .find((value) => value !== undefined && value !== null && String(value).trim()) || '';
}

function normalizeMonitoringScopeValue(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function compactMonitoringScopeValue(value) {
  return normalizeMonitoringScopeValue(value).replace(/[^a-z0-9]/g, '');
}

function resolveMonitoringScopeFilters(prompt, beneficiaries) {
  const normalizedPrompt = normalizeMonitoringScopeValue(prompt);
  return MONITORING_SCOPE_FIELDS.flatMap((scope) => {
    if (!scope.terms.some((term) => new RegExp(`\\b${term}\\b`).test(normalizedPrompt))) return [];
    const values = [...new Set(beneficiaries
      .map((beneficiary) => getMonitoringScopeValue(beneficiary, scope))
      .filter(Boolean))];
    const matches = values.filter((value) => {
      const normalizedValue = normalizeMonitoringScopeValue(value);
      const compactValue = compactMonitoringScopeValue(value);
      const compactPrompt = compactMonitoringScopeValue(prompt);
      return normalizedValue.length > 1 && (
        normalizedPrompt.includes(normalizedValue)
        || (compactValue.length > 2 && compactPrompt.includes(compactValue))
      );
    });
    return matches.length ? [{ ...scope, values: matches }] : [];
  });
}

function removeKnownValues(prompt, values, replacement) {
  const uniqueValues = [...new Set(values
    .filter((value) => value && !String(value).startsWith('Unnamed '))
    .sort((left, right) => String(right).length - String(left).length))];
  return uniqueValues.reduce((safePrompt, value) => safePrompt.replace(
    new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
    replacement,
  ), prompt);
}

function matchesSelectedScope(beneficiary, selection) {
  const matches = (selectionId, keys) => !selectionId || keys.some((key) => (
    String(beneficiary?.[key] ?? '') === String(selectionId)
  ));
  return matches(selection.schoolId, ['communityId', 'community_id', 'schoolId', 'school_id'])
    && matches(selection.groupId, ['groupId', 'group_id', 'motherGroupId', 'mother_group_id'])
    && matches(selection.batchId, ['batchId', 'batch_id', 'effective_batch_id', 'motherBatchId', 'mother_batch_id']);
}

function matchesMonitoringScopeFilters(beneficiary, scopeFilters) {
  return scopeFilters.every((scope) => scope.values.some((value) => (
    normalizeMonitoringScopeValue(getMonitoringScopeValue(beneficiary, scope)) === normalizeMonitoringScopeValue(value)
  )));
}

function downloadCheckupReportCsv(report, rows) {
  const columns = [
    { id: 'beneficiaryName', label: 'Beneficiary' },
    ...report.metricIds.map((metricId) => ({
      id: metricId,
      label: MONITORING_REPORT_FIELD_LABELS[metricId],
    })),
  ];
  const csvRows = rows.map((row) => Object.fromEntries([
    ['beneficiaryName', row.beneficiaryName],
    ...report.metricIds.map((metricId) => [
      metricId,
      row.checkup ? getMonitoringReportValue(row.checkup, metricId, row.beneficiary) : 'No saved check-up records.',
    ]),
  ].map(([key, value]) => [key, escapeMonitoringReportCsvValue(value)])));
  const csv = generateCsvContent(csvRows, columns);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  downloadContent(`\uFEFF${csv}`, `monitoring-report-${report.beneficiaryType.toLowerCase()}-${date}.csv`, 'text/csv;charset=utf-8');
}

export default function CheckupReportBuilder({ selection = {}, contextKey, scopeLabel }) {
  const [prompt, setPrompt] = useState('');
  const [report, setReport] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current += 1;
    setLoading(false);
    setReport(null);
    setBeneficiaries([]);
    setError('');
  }, [contextKey]);

  const submitReport = async (event) => {
    event.preventDefault();
    const requestId = ++requestVersion.current;
    setLoading(true);
    setError('');
    setReport(null);
    setBeneficiaries([]);
    try {
      const [motherResponse, childResponse] = await Promise.all([
        apiGetMothers(),
        apiGetChildren(['checkups']),
      ]);
      if (!Array.isArray(motherResponse?.mothers) || !Array.isArray(childResponse?.children)) {
        throw new Error('Check-up records could not be loaded in the expected format. Please retry.');
      }
      if (requestId !== requestVersion.current) return;

      const scopedMothers = motherResponse.mothers.filter((item) => matchesSelectedScope(item, selection));
      const scopedChildren = childResponse.children.filter((item) => matchesSelectedScope(item, selection));
      const allScopedBeneficiaries = [...scopedMothers, ...scopedChildren];
      const scopeFilters = resolveMonitoringScopeFilters(prompt, allScopedBeneficiaries);
      const privacySafePrompt = removeKnownValues(
        removeKnownValues(prompt, [
          ...scopedMothers.map((item) => getBeneficiaryName(item, 'Mother')),
          ...scopedChildren.map((item) => getBeneficiaryName(item, 'Child')),
        ], 'the selected beneficiary'),
        scopeFilters.flatMap((scope) => scope.values),
        'the selected scope',
      );
      const intent = await apiCreateMonitoringReportIntent(privacySafePrompt);
      if (requestId !== requestVersion.current) return;
      const targetBeneficiaries = (intent.beneficiaryType === 'Mother' ? scopedMothers : scopedChildren)
        .filter((beneficiary) => matchesMonitoringScopeFilters(beneficiary, scopeFilters));
      setBeneficiaries(targetBeneficiaries);
      setReport({ ...intent, scopeFilters });
    } catch (reportError) {
      if (requestId === requestVersion.current) {
        setError(reportError.message || 'Unable to prepare the check-up report.');
      }
    } finally {
      if (requestId === requestVersion.current) setLoading(false);
    }
  };

  const rows = useMemo(() => {
    if (!report) return [];
    const type = report.beneficiaryType;
    return beneficiaries.flatMap((beneficiary) => {
      const allCheckups = getMonitoringReportCheckups(beneficiary, type);
      const hasReportFilters = report.onlyReferredToHospital
        || report.onlyNonNormalScreenings
        || report.firstCheckupOnly
        || report.latestCheckupOnly
        || report.currentMonthOnly
        || (report.developmentalStatusFilter || []).length > 0;
      const matchingCheckups = filterMonitoringReportCheckups(
        allCheckups,
        report.onlyReferredToHospital,
        report.onlyNonNormalScreenings,
        report.developmentalStatusFilter,
        report.currentMonthOnly,
      );
      const checkups = report.latestCheckupOnly || report.firstCheckupOnly
        ? (() => {
          const selectedCheckup = report.latestCheckupOnly
            ? getLatestMonitoringReportCheckup(allCheckups)
            : getFirstMonitoringReportCheckup(allCheckups);
          return selectedCheckup && filterMonitoringReportCheckups(
            [selectedCheckup],
            report.onlyReferredToHospital,
            report.onlyNonNormalScreenings,
            report.developmentalStatusFilter,
            report.currentMonthOnly,
          ).length ? [selectedCheckup] : [];
        })()
        : matchingCheckups;
      if (hasReportFilters && !checkups.length) return [];
      const records = checkups.length ? checkups : allCheckups.length ? [] : [null];
      return records.map((checkup, index) => ({
        key: `${getBeneficiaryId(beneficiary, type)}-${index}`,
        beneficiaryName: getBeneficiaryName(beneficiary, type),
        beneficiary,
        checkup,
      }));
    });
  }, [beneficiaries, report]);

  const screeningStatuses = report?.developmentalStatusFilter?.length
    ? report.developmentalStatusFilter
    : report?.onlyNonNormalScreenings ? ['Needs Follow-up', 'At Risk'] : [];
  const reportFilters = [
    ...(report?.latestCheckupOnly ? ['Latest saved check-up per beneficiary'] : []),
    ...(report?.firstCheckupOnly ? ['First saved check-up per beneficiary'] : []),
    ...(report?.currentMonthOnly ? ['Current calendar month'] : []),
    ...(screeningStatuses.length ? [`Developmental screening: ${screeningStatuses.join(' or ')}`] : []),
    ...(report?.onlyReferredToHospital ? ['Hospital referral: Yes'] : []),
    ...((report?.scopeFilters || []).map((scope) => `${scope.label}: ${scope.values.join(', ')}`)),
  ];

  return (
    <section className="progress-report-ai-checkup" aria-labelledby="progress-report-ai-checkup-title">
      <form onSubmit={submitReport}>
        <label className="progress-report-ai-prompt-label" htmlFor="progress-report-ai-checkup-prompt">
          <span id="progress-report-ai-checkup-title">
            Describe the check-up report
            <FieldInfoTooltip content="Name mothers or children and the check-up details you need. Child growth fields are Weight-for-Age, Length-for-Age, and Weight-for-Length; child BMI is not available. You can request screening status, first/latest check-ups, current month, or recorded hospital referrals for mothers. School, group, and batch scope stays fixed to the selection above." />
          </span>
          <span className="progress-report-ai-checkup-scope">Current scope: {scopeLabel || 'All accessible records'}</span>
        </label>
        <textarea
          id="progress-report-ai-checkup-prompt"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setReport(null);
            setError('');
          }}
          maxLength={500}
          rows={3}
          placeholder="For example: Show the latest child check-up date, weight, and Weight-for-Length for this group"
          required
        />
        <div className="progress-report-ai-actions">
          <span>{prompt.length}/500</span>
          <button type="submit" className="primary-btn" disabled={loading || prompt.trim().length < 3}>
            {loading ? 'Preparing…' : 'Build check-up report'}
          </button>
        </div>
      </form>

      {error && <p className="progress-report-ai-message" role="alert">{error}</p>}
      {loading && <p className="progress-report-ai-message" role="status">Loading accessible check-ups and preparing your report…</p>}
      {report && (
        <section className="monitoring-ai-report-results" aria-live="polite">
          <div className="monitoring-ai-report-heading">
            <h3>Check-up report</h3>
            <button type="button" className="secondary-btn" onClick={() => downloadCheckupReportCsv(report, rows)} disabled={!rows.length}>
              Download CSV
            </button>
          </div>
          <p>{report.explanation}</p>
          <details className="monitoring-ai-report-understanding">
            <summary>What I understood from your request</summary>
            <dl>
              <dt>Beneficiary type</dt>
              <dd>{report.beneficiaryType}</dd>
              <dt>Beneficiaries</dt>
              <dd>{scopeLabel || 'All accessible records'}</dd>
              <dt>Table columns</dt>
              <dd>{report.metricIds.map((metricId) => MONITORING_REPORT_FIELD_LABELS[metricId]).filter(Boolean).join(', ')}</dd>
              <dt>Filters</dt>
              <dd>{reportFilters.length ? reportFilters.join('; ') : 'All saved check-ups'}</dd>
            </dl>
            <p>Edit the request above and build the report again if you meant different fields or filters.</p>
          </details>
          {rows.length ? (
            <div className="monitoring-ai-report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Beneficiary</th>
                    {report.metricIds.map((metricId) => (
                      <th scope="col" key={metricId}>{MONITORING_REPORT_FIELD_LABELS[metricId]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.beneficiaryName}</th>
                      {row.checkup ? report.metricIds.map((metricId) => (
                        <td key={metricId}>{getMonitoringReportValue(row.checkup, metricId, row.beneficiary)}</td>
                      )) : <td colSpan={report.metricIds.length}>No saved check-up records.</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p role="status">No saved check-up records match the selected report criteria.</p>}
          <p className="monitoring-ai-report-note">This report shows recorded data only. It is not a diagnosis or clinical recommendation.</p>
        </section>
      )}
    </section>
  );
}
