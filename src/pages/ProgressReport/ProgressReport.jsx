import React, { useEffect, useMemo, useState } from 'react';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import { apiRecordReportDownload } from '../../api/notifications';
import { apiGetPrograms } from '../../api/programs';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';
import { notifyAction } from '../../components/ActionFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useStepNavigation } from '../../utils/navigation/useStepNavigation';
import { StepNavigationStatus } from '../../components/ui/StepNavigationButton';
import { ReportTabBar } from './components/ReportTabBar';
import { CommunitySelectionStep } from './components/CommunitySelectionStep';
import { ReportFocusStep } from './components/ReportFocusStep';
import { GrowthMetricsStep } from './components/GrowthMetricsStep';
import { ResultsPanel } from './components/ResultsPanel';
import { getLatestResultsTableData } from './components/ResultsTable';
import {
  EMPTY_SELECTIONS,
  REPORT_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  GROWTH_METRICS,
  INTERPRETATION_METRICS,
  MOTHER_GROWTH_METRICS,
  NUMERIC_GROWTH_METRICS,
  PROFILE_METRICS,
  CHILD_PROFILE_METRICS,
  MOTHER_PROFILE_METRICS,
  CHILD_PROFILE_FIELD_SECTIONS,
  PROFILE_SECTION_LABELS,
  MOTHER_PROFILE_FIELD_SECTIONS,
  MOTHER_PROFILE_SECTION_LABELS,
  PROFILE_GRAPH_FIELDS,
  PRESENCE_PROFILE_FIELDS,
  PROGRAM_METRICS,
  REPORT_TABS,
  formatCellValue,
  getPointValue,
  getPointInterpretation,
} from './progressReportConfig';
import { buildProgressReportCsv } from './utils/csvIdentity.mjs';
import { buildMonitoringAverageRow } from './utils/monitoringAverages.mjs';
import { buildProgressReportParams } from './utils/apiUtils';
import { matchesProgramBeneficiaryType } from './utils/programEligibility';
import {
  GROWTH_TABLE_FIELDS,
  MONITORING_HISTORY_EXCLUDED_FIELDS,
  growthTableFieldsForMetric,
  withoutGrowthScores,
  pointValueForTableField,
  filterInterpretationFields,
} from './utils/reportTableUtils';

const batchAvailableForGroup = (batch, groupId, mothers) => {
  const linkedGroupIds = String(batch.groupIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (linkedGroupIds.includes(String(groupId))) return true;
  if (mothers.some((mother) => String(mother.groupId) === String(groupId) && String(mother.batchId) === String(batch.id))) return true;
  return false;
};

const CHILD_NUMERIC_METRIC_BY_INTERPRETATION = {
  weightForAgeInterpretation: 'weightForAge',
  lengthForAgeInterpretation: 'heightForAge',
  weightForLengthInterpretation: 'heightForAge',
};

export default function ProgressReport() {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canRecordReportDownload = hasRole(currentUser?.role, [
    ROLES.ADMIN,
    ROLES.COMMUNITY_COORDINATOR,
    ROLES.PARTNER,
    ROLES.HEALTH_WORKER,
  ]);
  const isSchoolAssignedUser = isHealthWorker || isCommunityOrganizer;
  const [options, setOptions] = useState({ schools: [], groups: [], batches: [], mothers: [] });
  const assignedSchoolId = currentUser?.school_id ?? currentUser?.schoolId ?? '';
  const assignedSchool = options.schools.find((item) => String(item.id) === String(assignedSchoolId));
  const [programs, setPrograms] = useState([]);
  const [selection, setSelection] = useState(EMPTY_SELECTIONS);
  const [granularity, setGranularity] = useState('child');
  const [visibleFields, setVisibleFields] = useState(DEFAULT_VISIBLE_FIELDS);
  const [report, setReport] = useState(null);
  const [graphReportRows, setGraphReportRows] = useState(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState(null);
  const [sort, setSort] = useState({ key: 'school', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const { navigationDirection, navigationError, isNavigating, runStepNavigation } = useStepNavigation();
  const [reportCategory, setReportCategory] = useState('monitor');
  const [beneficiaryType, setBeneficiaryType] = useState('child');
  const [growthMetrics, setGrowthMetrics] = useState(['lengthForAgeInterpretation']);
  const [monitorTableMetrics, setMonitorTableMetrics] = useState([]);
  const [graphMetricType, setGraphMetricType] = useState('numeric');
  const [numericGraphMetric, setNumericGraphMetric] = useState('heightForAge');
  const [profileMetrics, setProfileMetrics] = useState(CHILD_PROFILE_METRICS.map(([id]) => id));
  const [profileSection, setProfileSection] = useState('general');
  const [programMetrics, setProgramMetrics] = useState(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth', 'programDocumentation']);
  const [resultsView, setResultsView] = useState('graph');
  const [selectedGraphBeneficiary, setSelectedGraphBeneficiary] = useState('');
  const [includeInterpretationColumns, setIncludeInterpretationColumns] = useState(true);
  const [resultPeriod, setResultPeriod] = useState('all');
  const [displayWeeks, setDisplayWeeks] = useState('all');
  const [profileGraphColumn, setProfileGraphColumn] = useState('gender');
  const [programName, setProgramName] = useState('');
  const [benefitPeriod, setBenefitPeriod] = useState('overall');
  const [benefitMonth, setBenefitMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    apiGetProgressReportOptions()
      .then(setOptions)
      .catch((loadError) => notifyAction(loadError.message || 'Unable to load report options.', 'error'))
      .finally(() => setLoadingOptions(false));
    apiGetPrograms()
      .then((result) => setPrograms(result?.programs || []))
      .catch((loadError) => notifyAction(loadError.message || 'Unable to load available projects.', 'error'));
  }, []);

  useEffect(() => {
    if (!isSchoolAssignedUser) return;
    const assignedGroupId = currentUser.group_id ?? currentUser.groupId;
    const school = options.schools.find((item) => String(item.id) === String(assignedSchoolId));
    const group = isHealthWorker ? options.groups.find((item) => String(item.id) === String(assignedGroupId)) : null;
    if (!school || (isHealthWorker && !group)) return;

    setSelection((current) => {
      const groupId = isHealthWorker ? String(group.id) : '';
      if (String(current.schoolId) === String(school.id) && String(current.groupId) === groupId) return current;
      return { ...current, schoolId: String(school.id), groupId, batchId: '' };
    });
  }, [currentUser, isHealthWorker, isSchoolAssignedUser, options.groups, options.schools]);

  const displaySelection = finalizedSnapshot?.selection ?? selection;
  const displayGranularity = finalizedSnapshot?.granularity ?? granularity;
  const displaySort = finalizedSnapshot?.sort ?? sort;
  const displayPage = finalizedSnapshot?.page ?? page;
  const activeReport = finalizedSnapshot?.report ?? report;
  const activeReportRowCount = Number(activeReport?.pagination?.total ?? activeReport?.rows?.length ?? 0);
  const displayReportCategory = finalizedSnapshot?.reportCategory ?? reportCategory;
  const graphAllowed = displayReportCategory === 'program'
    ? activeReportRowCount > 0
    : displayReportCategory === 'monitor'
      ? activeReportRowCount > 0
      : Boolean(displaySelection.batchId) || activeReportRowCount <= 1;
  const baseDisplayVisibleFields = withoutGrowthScores(finalizedSnapshot?.visibleFields ?? visibleFields);
  const displayBeneficiaryType = finalizedSnapshot?.beneficiaryType ?? beneficiaryType;
  const normalizeProgramName = (value) => String(value ?? '').trim().toLowerCase();
  const eligiblePrograms = useMemo(
    () => programs.filter((program) => matchesProgramBeneficiaryType(program, displayBeneficiaryType)),
    [displayBeneficiaryType, programs],
  );
  useEffect(() => {
    if (!programName) return;
    if (!eligiblePrograms.some((program) => normalizeProgramName(program.name) === normalizeProgramName(programName))) {
      setProgramName('');
    }
  }, [eligiblePrograms, programName]);
  const availableGrowthMetrics = displayBeneficiaryType === 'mother' ? MOTHER_GROWTH_METRICS : GROWTH_METRICS;
  const availableNumericGrowthMetrics = NUMERIC_GROWTH_METRICS(displayBeneficiaryType);
  const availableProfileMetrics = displayBeneficiaryType === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS;
  const activeProfileFieldSections = displayBeneficiaryType === 'mother' ? MOTHER_PROFILE_FIELD_SECTIONS : CHILD_PROFILE_FIELD_SECTIONS;
  const activeProfileSectionLabels = displayBeneficiaryType === 'mother' ? MOTHER_PROFILE_SECTION_LABELS : PROFILE_SECTION_LABELS;
  const graphMetricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
  const selectedGraphMetric = graphMetricType === 'numeric'
    ? numericGraphMetric || graphMetricOptions[0]?.[0] || ''
    : growthMetrics[0] || graphMetricOptions[0]?.[0] || '';
  const graphMetricHasData = (row, metric = selectedGraphMetric) => (
    INTERPRETATION_METRICS.has(metric)
      ? row.growthSeries?.some((point) => getPointInterpretation(point, metric))
      : row.growthSeries?.some((point) => Number.isFinite(getPointValue(point, metric)))
        || Number.isFinite(Number(row[metric]))
  );
  const selectedTableGrowthMetric = availableGrowthMetrics.some(([id]) => id === growthMetrics[0])
    ? growthMetrics[0]
    : availableGrowthMetrics[0]?.[0] || '';
  const selectedTableGrowthFields = growthTableFieldsForMetric(selectedTableGrowthMetric)
    .filter((field) => GROWTH_TABLE_FIELDS.has(field));
  const tableBaseFields = baseDisplayVisibleFields.filter((field) => !GROWTH_TABLE_FIELDS.has(field));
  const monitoringHierarchyFields = new Set([
    ...(displaySelection.schoolId ? ['school'] : []),
    ...(displaySelection.groupId ? ['group'] : []),
    ...(displaySelection.batchId ? ['batch'] : []),
  ]);
  const monitoringTableBaseFields = tableBaseFields.filter((field) => (
    !MONITORING_HISTORY_EXCLUDED_FIELDS.has(field) && !monitoringHierarchyFields.has(field)
  ));
  const displayVisibleFields = displayReportCategory === 'monitor'
    ? withoutGrowthScores([...tableBaseFields, ...selectedTableGrowthFields])
    : baseDisplayVisibleFields;
  const syncVisibleFieldsForGrowthMetric = (nextGrowthMetrics = growthMetrics) => {
    setVisibleFields((current) => withoutGrowthScores([
      ...new Set([
        ...current.filter((field) => !GROWTH_METRICS.some(([id]) => id === field) && !GROWTH_TABLE_FIELDS.has(field)),
        ...nextGrowthMetrics,
      ]),
    ]));
  };

  const groups = useMemo(() => options.groups.filter((item) => !selection.schoolId || String(item.schoolId) === String(selection.schoolId)), [options.groups, selection.schoolId]);
  const batches = useMemo(() => options.batches.filter((item) => {
    const matchesSchool = !selection.schoolId || String(item.schoolId) === String(selection.schoolId);
    if (!matchesSchool || !selection.groupId) return matchesSchool;
    return batchAvailableForGroup(item, selection.groupId, options.mothers);
  }), [options.batches, options.mothers, selection.groupId, selection.schoolId]);
  const normalizeSelectionHierarchy = (nextSelection) => {
    const normalized = {
      schoolId: nextSelection.schoolId ? String(nextSelection.schoolId) : '',
      groupId: nextSelection.groupId ? String(nextSelection.groupId) : '',
      batchId: nextSelection.batchId ? String(nextSelection.batchId) : '',
    };
    if (!normalized.schoolId) {
      normalized.groupId = '';
      normalized.batchId = '';
      return normalized;
    }
    const validGroupIds = new Set(options.groups
      .filter((item) => String(item.schoolId) === String(normalized.schoolId))
      .map((item) => String(item.id)));
    if (normalized.groupId && !validGroupIds.has(normalized.groupId)) {
      normalized.groupId = '';
      normalized.batchId = '';
      return normalized;
    }
    if (normalized.batchId && (!normalized.groupId || !options.batches.some((item) =>
      String(item.id) === String(normalized.batchId)
      && String(item.schoolId) === String(normalized.schoolId)
      && batchAvailableForGroup(item, normalized.groupId, options.mothers)
    ))) {
      normalized.batchId = '';
    }
    return normalized;
  };
  const updateSelection = (key, value) => {
    setPage(1);
    setError('');
    const nextSelection = (() => {
      if (key === 'schoolId') {
        return { ...selection, schoolId: value, groupId: '', batchId: '' };
      }
      if (key === 'groupId') {
        return { ...selection, groupId: value, batchId: '' };
      }
      return { ...selection, [key]: value };
    })();
    const normalized = normalizeSelectionHierarchy(nextSelection);
    setSelection(normalized);
    setReport(null);
    setGraphReportRows(null);
    setFinalizedSnapshot(null);
    setActiveTab(1);
    setError('');
  };

  const generateReport = async (nextPage = 1, programFilterOverrides = {}) => {
    const safeSelection = normalizeSelectionHierarchy(programFilterOverrides.selection || selection);
    const nextProgramName = programName;
    const nextBenefitPeriod = programFilterOverrides.benefitPeriod ?? benefitPeriod;
    const nextBenefitMonth = programFilterOverrides.benefitMonth ?? benefitMonth;
    if (reportCategory === 'program' && !eligiblePrograms.some((program) => normalizeProgramName(program.name) === normalizeProgramName(nextProgramName))) {
      notifyAction('Select a project before generating a project report.', 'error');
      return;
    }
    if (reportCategory === 'program' && !programMetrics.length) {
      notifyAction('Select at least one project metric.', 'error');
      return;
    }
    if (reportCategory === 'program' && nextBenefitPeriod === 'month' && !/^(?:1\d{3}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(nextBenefitMonth)) {
      notifyAction('Select a valid month for the project report.', 'error');
      return;
    }
    if (reportCategory === 'profile' && !profileMetrics.length) {
      notifyAction('Select at least one profile field.', 'error');
      return;
    }
    setSelection(safeSelection);
    setLoadingReport(true);
    if (nextPage === 1) setGraphReportRows(null);
    try {
      const selectedProgram = programs.find((program) => normalizeProgramName(program.name) === normalizeProgramName(nextProgramName));
      if (reportCategory === 'program') {
        setGrowthMetrics(['receivedBenefitAveragePerMonth']);
        setDisplayWeeks('receivedBenefitAveragePerMonth');
      }
      const requestParams = buildProgressReportParams({
        selection: safeSelection,
        reportCategory,
        beneficiaryType,
        selectedProgram,
        programName: nextProgramName,
        benefitPeriod: nextBenefitPeriod,
        benefitMonth: nextBenefitMonth,
        page: nextPage,
        perPage: 50,
      });
      const result = await apiGetProgressReport(requestParams);
      const reportRowCount = Number(result.pagination?.total ?? result.rows?.length ?? 0);
      const defaultToGraph = reportCategory !== 'program'
        && (Boolean(safeSelection.batchId) || reportRowCount <= 1);
      const nextResultsView = programFilterOverrides.resultsView || (
        reportCategory !== 'monitor' || monitorTableMetrics.length
          ? 'table'
          : defaultToGraph ? 'graph' : 'table'
      );
      if (nextPage === 1) setSelectedGraphBeneficiary(safeSelection.batchId ? 'all' : '');
      let completeGraphRows = result.rows || [];
      const requiresCompleteRows = reportCategory === 'monitor' || reportCategory === 'program';
      if (nextPage > 1 && finalizedSnapshot?.requestParams) {
        completeGraphRows = finalizedSnapshot.allRows || completeGraphRows;
      } else if (requiresCompleteRows && reportRowCount > completeGraphRows.length) {
        const completeResult = await apiGetProgressReport({
          ...requestParams,
          page: 1,
          export: 1,
        });
        if (!Array.isArray(completeResult.rows) || completeResult.rows.length !== reportRowCount) {
          throw new Error('The report could not load every matching beneficiary. Please try again.');
        }
        completeGraphRows = completeResult.rows;
      }
      if (nextPage === 1) setGraphReportRows(requiresCompleteRows ? completeGraphRows : null);
      setReport(result);
      setResultsView(nextResultsView);
      setFinalizedSnapshot({
        report: result,
        selection: { ...safeSelection },
        visibleFields: reportCategory === 'profile'
          ? [...new Set([...DEFAULT_VISIBLE_FIELDS.filter((field) => ['school', 'group', 'batch', 'mother', 'child', 'gender', 'dateOfBirth'].includes(field)), ...profileMetrics])]
          : reportCategory === 'program'
            ? [...new Set([...DEFAULT_VISIBLE_FIELDS.filter((field) => ['school', 'group', 'batch', 'mother', 'child'].includes(field)), ...programMetrics])]
          : [...new Set([...visibleFields.filter((field) => !GROWTH_METRICS.some(([id]) => id === field)), ...growthMetrics])],
        granularity: requestParams.granularity,
        sort: { ...sort },
        page: nextPage,
        reportCategory,
        beneficiaryType: requestParams.granularity,
        requestParams,
        allRows: completeGraphRows,
        growthMetrics: [...growthMetrics],
        profileMetrics: [...profileMetrics],
        profileGraphColumn,
        programName: nextProgramName,
        benefitPeriod: nextBenefitPeriod,
        benefitMonth: nextBenefitMonth,
      });
      setPage(nextPage);
      setActiveTab(3);
      if (nextPage === 1) {
        notifyAction(reportRowCount
          ? `Report generated successfully. ${reportRowCount} beneficiary record${reportRowCount === 1 ? '' : 's'} found.`
          : 'Report generated successfully. No records matched the selected scope.');
      }
    } catch (reportError) {
      notifyAction(reportError.message || 'Unable to generate report.', 'error');
      if (nextPage === 1) {
        setReport(null);
        setFinalizedSnapshot(null);
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const activeRange = String(displayWeeks || '').startsWith('range:') ? String(displayWeeks).slice(6).split(':') : null;

  const filterRowsBySelectedRange = (rows) => {
    if (!activeRange || !activeRange[0] || !activeRange[1]) return rows;
    return rows.filter((row) => {
      const growthSeries = Array.isArray(row.growthSeries) ? row.growthSeries : [];
      if (!growthSeries.length) return true;
      return growthSeries.some((point) => {
        const dateValue = point?.date || point?.measurementDate;
        if (!dateValue) return false;
        const monthKey = String(dateValue).slice(0, 7);
        return monthKey >= activeRange[0] && monthKey <= activeRange[1];
      });
    });
  };

  const resultsSourceRows = activeReport?.rows || [];
  const sortedRows = useMemo(() => {
    const sourceRows = filterRowsBySelectedRange(resultsSourceRows);
    return [...sourceRows].sort((left, right) => {
      const a = left[displaySort.key] ?? '';
      const b = right[displaySort.key] ?? '';
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return displaySort.direction === 'asc' ? result : -result;
    });
  }, [resultsSourceRows, displaySort]);

  const breadcrumb = [
    'Home',
    displaySelection.schoolId ? options.schools.find((item) => String(item.id) === String(displaySelection.schoolId))?.name : 'Select School',
    displaySelection.schoolId ? (displaySelection.groupId ? groups.find((item) => String(item.id) === String(displaySelection.groupId))?.name : 'All Groups') : null,
    displaySelection.groupId ? (displaySelection.batchId ? batches.find((item) => String(item.id) === String(displaySelection.batchId))?.name : 'All Batches') : null,
  ].filter(Boolean);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortLabel = (label, key) => <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>{label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}</button>;
  const updateProgramParameter = (setter) => (value) => {
    setter(value);
    setReport(null);
    setFinalizedSnapshot(null);
  };

  const exportReport = async ({
    rows = [],
    fields = [],
    view = 'table',
    tableMode = 'general',
    historyView = 'individual',
    selectedBeneficiary = '',
    selectedMonth = '',
    selectedSchool = '',
    selectedGroup = '',
    selectedBatch = '',
    selectedGraphBeneficiary = '',
    averageFields = [],
    averageLabelField = '',
  } = {}) => {
    if (!finalizedSnapshot?.requestParams || !fields.length) {
      notifyAction('Generate a report before exporting data.', 'error');
      return;
    }
    setExportingReport(true);
    try {
      const fullResult = await apiGetProgressReport({
        ...finalizedSnapshot.requestParams,
        page: 1,
        export: 1,
      });
      const allRows = fullResult.rows;
      const expectedRows = Number(finalizedSnapshot.report?.pagination?.total ?? allRows?.length ?? 0);
      if (!Array.isArray(allRows) || allRows.length !== expectedRows) {
        throw new Error('The CSV could not include every matching record. Please retry the export.');
      }

      const identityType = finalizedSnapshot.beneficiaryType;
      let exportRows = allRows;
      let exportFields = fields;

      if (displayReportCategory === 'monitor' && view === 'graph') {
        const graphSource = allRows
          .filter((row) => !selectedBatch || String(row.batchId || row.batch || '') === String(selectedBatch))
          .filter((row) => !selectedGraphBeneficiary
            || selectedGraphBeneficiary === 'all'
            || graphBeneficiaryKey(row) === String(selectedGraphBeneficiary))
          .map((row) => ({
          ...row,
          growthSeries: (row.growthSeries || []).filter((point) => {
            if (!activeRange) return true;
            const monthKey = String(point.date || point.measurementDate || '').slice(0, 7);
            return monthKey >= activeRange[0] && monthKey <= activeRange[1];
          }),
        }));
        exportRows = graphSource.flatMap((row) => {
          const series = (row.growthSeries || []).filter((point) => {
            return growthMetrics.some((metric) => (
              INTERPRETATION_METRICS.has(metric)
                ? Boolean(getPointInterpretation(point, metric))
                : Number.isFinite(getPointValue(point, metric))
            ));
          });
          return series.length
            ? series.map((point) => ({
              ...row,
              ...point,
              measurementDate: point.date || point.measurementDate || '',
              ...Object.fromEntries(selectedTableGrowthFields.map((field) => [
                field,
                pointValueForTableField(point, field),
              ])),
            }))
            : [row];
        });
      } else if (displayReportCategory === 'monitor' && view === 'table' && tableMode === 'monitoring-dates') {
        exportRows = allRows.flatMap((row, index) => (row.growthSeries || [])
          .filter((point) => {
            const dateValue = String(point.date || point.measurementDate || '');
            if (activeRange && dateValue) {
              const monthKey = dateValue.slice(0, 7);
              if (monthKey < activeRange[0] || monthKey > activeRange[1]) return false;
            }
            if (selectedSchool && row.school !== selectedSchool) return false;
            if (selectedGroup && row.group !== selectedGroup) return false;
            if (selectedBatch && String(row.batchId || row.batch || '') !== String(selectedBatch)) return false;
            if (selectedBatch && String(row.batchId || row.batch || '') !== String(selectedBatch)) return false;
            if (historyView === 'individual') {
              const beneficiaryId = String(row.childId || row.motherId || row.child || row.mother || '');
              if (beneficiaryId !== String(selectedBeneficiary)) return false;
            }
            return historyView !== 'monthly' || !selectedMonth || dateValue.startsWith(selectedMonth);
          })
          .map((point, pointIndex) => ({
            ...row,
            measurementDate: point.date || point.measurementDate || '',
            ...Object.fromEntries(selectedTableGrowthFields.map((field) => [
              field,
              pointValueForTableField(point, field),
            ])),
            historyRowKey: `${row.childId || row.motherId || index}-${point.date || point.measurementDate || pointIndex}`,
          })));
        const averageRow = buildMonitoringAverageRow(exportRows, averageFields, averageLabelField);
        if (averageRow) {
          if (historyView === 'individual') {
            const firstRow = exportRows[0] || {};
            ['child', 'mother', 'age', 'gender', 'dateOfBirth'].forEach((field) => {
              if (firstRow[field] !== undefined) averageRow[field] = firstRow[field];
            });
          } else {
            averageRow[identityType] = 'Average';
            averageRow.beneficiaryName = 'Average';
          }
          exportRows = [...exportRows, averageRow];
        }
      } else if (displayReportCategory === 'monitor' && view === 'table') {
        const rowsInRange = activeRange
          ? allRows.map((row) => ({
            ...row,
            growthSeries: (row.growthSeries || []).filter((point) => {
              const monthKey = String(point.date || point.measurementDate || '').slice(0, 7);
              return monthKey >= activeRange[0] && monthKey <= activeRange[1];
            }),
          }))
          : allRows;
        const measuredRows = rowsInRange.flatMap((row) => (row.growthSeries || []).map((point) => ({
          ...row,
          measurementDate: point.date || point.measurementDate || '',
          bmiForAge: point.bmi ?? row.bmiForAge,
          growthSeries: [point],
        })));
        const datedIds = new Set(measuredRows.map((row) => String(row.childId || row.motherId || row.child || row.mother || '')));
        const latestRows = [...new Map([...measuredRows]
          .sort((left, right) => String(right.measurementDate).localeCompare(String(left.measurementDate)))
          .map((row) => [String(row.childId || row.motherId || row.child || row.mother || ''), row])).values()];
        const undatedRows = rowsInRange.filter((row) => !datedIds.has(String(row.childId || row.motherId || row.child || row.mother || '')));
        const periodRows = resultPeriod === 'latest'
          ? [...latestRows, ...undatedRows]
          : [...measuredRows, ...undatedRows];
        const summaryData = getLatestResultsTableData(
          periodRows,
          finalizedSnapshot.beneficiaryType,
          resultPeriod,
          finalizedSnapshot.selection,
          includeInterpretationColumns,
        );
        exportRows = summaryData.rows;
        exportFields = summaryData.fields;
      } else {
        exportRows = allRows;
      }

      if (!exportRows.length) {
        notifyAction('No records match the current report view; no CSV was downloaded.', 'error');
        return;
      }
      const csv = buildProgressReportCsv(
        exportRows,
        exportFields,
        identityType,
        formatCellValue,
      );
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      const reportView = view === 'table' && displayReportCategory === 'monitor'
        ? tableMode
        : view;
      const fileName = `progress-report-${displayReportCategory}-${identityType}-${reportView}.csv`;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      notifyAction(`CSV downloaded with ${exportRows.length} row${exportRows.length === 1 ? '' : 's'}.`);
      if (canRecordReportDownload) {
        apiRecordReportDownload(fileName).catch((downloadError) => {
          console.error('Unable to record report download notification:', downloadError);
        });
      }
    } catch (exportError) {
      notifyAction(exportError.message || 'Unable to prepare the complete report CSV.', 'error');
    } finally {
      setExportingReport(false);
    }
  };

  const resultsRows = sortedRows;
  const monitoringTableRows = useMemo(() => {
    if (displayReportCategory !== 'monitor') return resultsRows;
    return (activeReport?.rows || []).flatMap((row, index) => (row.growthSeries || [])
      .filter((point) => {
        const dateValue = point.date || point.measurementDate || '';
        if (!dateValue || !activeRange) return true;
        const monthKey = String(dateValue).slice(0, 7);
        return monthKey >= activeRange[0] && monthKey <= activeRange[1];
      })
      .map((point, pointIndex) => ({
        ...row,
        measurementDate: point.date || point.measurementDate || '',
        ...Object.fromEntries(selectedTableGrowthFields.map((field) => [field, pointValueForTableField(point, field)])),
        historyRowKey: `${row.childId || row.motherId || row.child || row.mother || index}-${point.date || point.measurementDate || pointIndex}`,
      })));
  }, [activeReport, activeRange, displayReportCategory, resultsRows, selectedTableGrowthFields]);
  const tableRows = displayReportCategory === 'monitor' ? monitoringTableRows : resultsRows;
  const tableVisibleFields = displayReportCategory === 'monitor'
    ? withoutGrowthScores([...monitoringTableBaseFields, 'measurementDate', ...selectedTableGrowthFields])
    : displayVisibleFields;
  const reportTableVisibleFields = displayReportCategory === 'monitor' && !includeInterpretationColumns
    ? filterInterpretationFields(tableVisibleFields)
    : tableVisibleFields;
  const graphSourceRows = displayReportCategory === 'monitor' || displayReportCategory === 'program'
    ? filterRowsBySelectedRange(finalizedSnapshot?.allRows ?? graphReportRows ?? activeReport?.rows ?? [])
    : resultsRows;
  const filterGraphRowsByRange = (rows) => {
    if (!activeRange || !activeRange[0] || !activeRange[1]) return rows;
    const [startMonth, endMonth] = activeRange;
    return rows
      .map((row) => ({
        ...row,
        growthSeries: (row.growthSeries || []).filter((point) => {
          const dateValue = point?.date || point?.measurementDate;
          if (!dateValue) return false;
          const monthKey = String(dateValue).slice(0, 7);
          return monthKey >= startMonth && monthKey <= endMonth;
        }),
      }))
      .filter((row) => row.growthSeries?.length || (row[displayBeneficiaryType === 'mother' ? 'bmiForAge' : 'weightForAge'] !== undefined && row[displayBeneficiaryType === 'mother' ? 'bmiForAge' : 'weightForAge'] !== null));
  };
  const filteredGraphSourceRows = displayReportCategory === 'program'
    ? graphSourceRows
    : filterGraphRowsByRange(graphSourceRows.filter((row) => graphMetricHasData(row)));
  const graphBeneficiaryKey = (row) => String(row.childId || row.motherId || row.child || row.mother || '');
  const graphBeneficiaries = displayReportCategory === 'monitor'
    ? [...new Map(graphSourceRows.map((row) => [graphBeneficiaryKey(row), row])).entries()]
      .filter(([id]) => id)
      .map(([id, row]) => ({
        id,
        name: row.child || row.mother || 'Beneficiary',
        batchId: row.batchId || row.batch || '',
        batch: row.batch || '',
      }))
    : [];
  const selectedGraphBeneficiaryId = selectedGraphBeneficiary === 'all' || graphBeneficiaries.some(({ id }) => id === selectedGraphBeneficiary)
    ? selectedGraphBeneficiary
    : displaySelection.batchId
      ? 'all'
      : graphBeneficiaries[0]?.id || '';
  const graphRows = displayReportCategory === 'monitor' && selectedGraphBeneficiaryId && selectedGraphBeneficiaryId !== 'all'
    ? filteredGraphSourceRows.filter((row) => graphBeneficiaryKey(row) === selectedGraphBeneficiaryId)
    : filteredGraphSourceRows;
  const selectedGraphRangeRows = displayReportCategory === 'monitor' && selectedGraphBeneficiaryId && selectedGraphBeneficiaryId !== 'all'
    ? graphSourceRows.filter((row) => graphBeneficiaryKey(row) === selectedGraphBeneficiaryId)
    : graphSourceRows;
  const graphExportFields = REPORT_FIELDS.filter(([id]) => (
    displayVisibleFields.includes(id)
    || (displayReportCategory === 'program' && id === displayWeeks)
    || (displayReportCategory === 'monitor' && ['measurementDate', ...selectedTableGrowthFields].includes(id))
  ));
  const graphExportRows = displayReportCategory === 'monitor'
    ? graphRows.flatMap((row) => {
      const series = (row.growthSeries || []).filter((point) => graphMetricHasData({
        ...row,
        growthSeries: [point],
      }));
      return series.length
        ? series.map((point) => ({
          ...row,
          ...point,
          measurementDate: point.date || point.measurementDate || '',
          ...Object.fromEntries(selectedTableGrowthFields.map((field) => [field, pointValueForTableField(point, field)])),
        }))
        : [row];
    })
    : resultsRows;
  const averageMetric = (field, rows = resultsRows) => {
    if (INTERPRETATION_METRICS.has(field)) return rows.map((row) => row[field]).find(Boolean) || '—';
    const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value));
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
  };
  const completedPercent = resultsRows.length
    ? Math.round(resultsRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / resultsRows.length)
    : 0;
  const canOpenTab = (tab) => tab === 1 || tab === 2 || (tab === 3 && Boolean(activeReport));
  const goToTab = (tab, direction) => {
    return runStepNavigation(() => {
      if (!canOpenTab(tab)) return false;
      setActiveTab(tab);
      return true;
    }, direction || (tab >= activeTab ? 'next' : 'previous'));
  };
  const resetSetup = () => {
    setSelection(isSchoolAssignedUser
      ? {
        schoolId: currentUser.school_id ?? currentUser.schoolId ?? '',
        groupId: isHealthWorker ? currentUser.group_id ?? currentUser.groupId ?? '' : '',
        batchId: '',
      }
      : EMPTY_SELECTIONS);
    setReport(null);
    setGraphReportRows(null);
    setFinalizedSnapshot(null);
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
    setGrowthMetrics(['lengthForAgeInterpretation']);
    setMonitorTableMetrics([]);
    setProfileMetrics(CHILD_PROFILE_METRICS.map(([id]) => id));
    setProfileSection('general');
    setProgramMetrics(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth', 'programDocumentation']);
    setReportCategory('monitor');
    setBeneficiaryType('child');
    setGraphMetricType('numeric');
    setNumericGraphMetric('heightForAge');
    setResultsView('graph');
    setIncludeInterpretationColumns(true);
    setResultPeriod('all');
    setDisplayWeeks('all');
    setProfileGraphColumn('gender');
    setProgramName('');
    setBenefitPeriod('overall');
    setBenefitMonth(new Date().toISOString().slice(0, 7));
    setActiveTab(1);
    setPage(1);
    setError('');
    setShowResetConfirm(false);
    notifyAction('Progress report setup reset.');
  };
  const selectGrowthMetric = (id) => {
    if (beneficiaryType === 'child') {
      const nextGrowthMetrics = [id];
      setGraphMetricType('numeric');
      setNumericGraphMetric(CHILD_NUMERIC_METRIC_BY_INTERPRETATION[id] || 'weightForAge');
      setGrowthMetrics(nextGrowthMetrics);
      setMonitorTableMetrics([]);
      syncVisibleFieldsForGrowthMetric(nextGrowthMetrics);
      setResultsView('table');
      setReport(null);
      setFinalizedSnapshot(null);
      return;
    }

    setMonitorTableMetrics([]);
    const nextType = INTERPRETATION_METRICS.has(id) || id === 'hospitalReferral' ? 'interpretation' : 'numeric';
    setGraphMetricType(nextType);
    if (nextType === 'numeric') setNumericGraphMetric(id);
    setGrowthMetrics([id]);
    syncVisibleFieldsForGrowthMetric([id]);
    setReport(null);
    setFinalizedSnapshot(null);
  };
  const toggleProfileSection = (section) => {
    const sectionFields = availableProfileMetrics
      .filter(([id]) => activeProfileFieldSections[id] === section)
      .map(([id]) => id);
    if (!sectionFields.length) return;

    const isFullySelected = sectionFields.every((field) => profileMetrics.includes(field));
    const nextProfileMetrics = isFullySelected
      ? profileMetrics.filter((field) => !sectionFields.includes(field))
      : [...new Set([...profileMetrics, ...sectionFields])];
    setProfileMetrics(nextProfileMetrics);
    const nextDisplaySection = isFullySelected && section === profileSection
      ? Object.keys(activeProfileSectionLabels).find((candidate) => candidate !== 'all' && availableProfileMetrics.some(
        ([id]) => activeProfileFieldSections[id] === candidate && nextProfileMetrics.includes(id),
      )) || section
      : section;
    setProfileSection(nextDisplaySection);
    setReport(null);
    setFinalizedSnapshot(null);
  };
  const toggleProgramMetric = (id) => {
    setProgramMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
    setReport(null);
    setFinalizedSnapshot(null);
  };
  const selectBeneficiaryType = (type) => {
    setBeneficiaryType(type);
    setProfileSection('general');
    setProfileMetrics((type === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS).map(([id]) => id));
    setProfileGraphColumn(type === 'mother' ? 'bmiInterpretation' : 'gender');
    const initialMetric = type === 'mother' ? 'bmiForAge' : 'lengthForAgeInterpretation';
    setGraphMetricType('numeric');
    setNumericGraphMetric(type === 'mother' ? 'bmiForAge' : 'heightForAge');
    setGrowthMetrics([initialMetric]);
    setMonitorTableMetrics([]);
    syncVisibleFieldsForGrowthMetric([initialMetric]);
    setFinalizedSnapshot(null);
    setReport(null);
  };
  const selectReportCategory = (category) => {
    setMonitorTableMetrics([]);
    setReportCategory(category);
    setReport(null);
    setFinalizedSnapshot(null);
    if (category === 'program') {
      setProgramMetrics(['receivedBenefitAveragePerMonth', 'programDocumentation']);
      setGrowthMetrics(['receivedBenefitAveragePerMonth']);
      syncVisibleFieldsForGrowthMetric(['receivedBenefitAveragePerMonth']);
      setDisplayWeeks('receivedBenefitAveragePerMonth');
      setResultsView('table');
    }
    if (category === 'profile') setResultsView('table');
  };
  useEffect(() => {
    if (reportCategory === 'program' && PROGRAM_METRICS.some(([id]) => id === displayWeeks) && growthMetrics[0] !== displayWeeks) {
      setGrowthMetrics([displayWeeks]);
    }
  }, [displayWeeks, growthMetrics, reportCategory]);

  useEffect(() => {
    if (reportCategory === 'program') return;
    const metricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
    if (graphMetricType === 'interpretation' && !metricOptions.some(([id]) => id === growthMetrics[0])) {
      const nextMetric = metricOptions[0]?.[0] || '';
      setGrowthMetrics([nextMetric]);
      if (nextMetric) syncVisibleFieldsForGrowthMetric([nextMetric]);
    }
    if (graphMetricType === 'numeric' && !metricOptions.some(([id]) => id === numericGraphMetric)) {
      setNumericGraphMetric(metricOptions[0]?.[0] || '');
    }
  }, [availableGrowthMetrics, availableNumericGrowthMetrics, graphMetricType, growthMetrics, numericGraphMetric, reportCategory]);

  useEffect(() => {
    if (activeTab !== 3 || resultsView !== 'graph') return undefined;
    const heading = document.querySelector('.growth-report-single-card h3');
    const subtitle = document.querySelector('.growth-report-single-card > p');
    if (heading && displayReportCategory === 'monitor' && beneficiaryType === 'mother') heading.textContent = '📈 BMI';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'mother') subtitle.textContent = 'Latest mother BMI measurements · values are plotted by month';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'child') {
      subtitle.textContent = graphMetricType === 'numeric'
        ? 'Raw weight and length/height measurements over time'
        : 'WHO growth interpretations over time';
    }
    if (heading && displayReportCategory === 'monitor' && beneficiaryType === 'child') {
      const metricOptions = graphMetricType === 'numeric' ? availableNumericGrowthMetrics : availableGrowthMetrics;
      const metricText = (metricOptions.find(([id]) => id === selectedGraphMetric)?.[1] || 'Weight-for-Age')
        .replace(/\s+Z-Score$/i, '')
        .replace(/\s+Interpretation$/i, '');
      heading.textContent = metricText;
    }
    if (displayReportCategory === 'program') {
      const selectedMetric = PROGRAM_METRICS.find(([id]) => id === displayWeeks);
      const selectedMetricLabel = selectedMetric?.[1] || 'Project Benefits';
      if (heading) heading.textContent = selectedMetricLabel;
      if (subtitle) subtitle.textContent = `${selectedMetricLabel} by beneficiary`;
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.textContent = averageMetric(displayWeeks, graphRows);
      if (value) value.style.display = 'none';
    } else {
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.style.display = '';
    }
    return undefined;
  }, [
    activeTab,
    availableGrowthMetrics,
    availableNumericGrowthMetrics,
    beneficiaryType,
    displayReportCategory,
    displayWeeks,
    graphMetricType,
    graphRows,
    resultsView,
    selectedGraphMetric,
  ]);

  return (
    <div className="community-page progress-report-shell">
      <div className="progress-report-panel hierarchical-progress-report">
        <PageHeader title="Progress Report" breadcrumbs={[{ label: 'Reports' }, { label: 'Progress Report' }]} actions={<button type="button" className="secondary-btn" onClick={() => setShowResetConfirm(true)} disabled={isNavigating || loadingReport}>Reset Setup</button>} />
        <ReportTabBar tabs={REPORT_TABS} activeTab={activeTab} canOpenTab={canOpenTab} goToTab={goToTab} isNavigating={isNavigating} />
        <StepNavigationStatus direction={navigationDirection} error={navigationError} />

        <section className="progress-report-config" aria-label="Report parameters">
          {activeTab === 1 && (
            <CommunitySelectionStep
              isCommunityOrganizer={isCommunityOrganizer}
              assignedSchool={assignedSchool}
              selection={selection}
              groups={groups}
              batches={batches}
              isHealthWorker={isHealthWorker}
              options={options}
              loadingOptions={loadingOptions}
              updateSelection={updateSelection}
              reportCategoryStep={(
                <ReportFocusStep
                  reportCategory={reportCategory}
                  selectReportCategory={selectReportCategory}
                    programName={programName}
                    setProgramName={updateProgramParameter(setProgramName)}
                    programs={programs}
                    beneficiaryType={beneficiaryType}
                  setBeneficiaryType={selectBeneficiaryType}
                  setActiveTab={goToTab}
                  isNavigating={isNavigating}
                  navigationDirection={navigationDirection}
                />
              )}
            />
          )}

          {activeTab === 2 && (
            <GrowthMetricsStep
              reportCategory={reportCategory}
              availableProfileMetrics={availableProfileMetrics}
              profileMetrics={profileMetrics}
              programMetrics={PROGRAM_METRICS}
              selectedProgramMetrics={programMetrics}
              toggleProgramMetric={toggleProgramMetric}
              beneficiaryType={beneficiaryType}
              availableGrowthMetrics={availableGrowthMetrics}
              growthMetrics={growthMetrics}
              selectGrowthMetric={selectGrowthMetric}
              setActiveTab={goToTab}
              generateReport={generateReport}
              runStepNavigation={runStepNavigation}
              isNavigating={isNavigating}
              navigationDirection={navigationDirection}
              profileFieldSections={activeProfileFieldSections}
              profileSectionLabels={activeProfileSectionLabels}
              setProfileSection={setProfileSection}
              toggleProfileSection={toggleProfileSection}
              selectedMonitorFields={monitorTableMetrics.map((id) => [
                id,
                REPORT_FIELDS.find(([fieldId]) => fieldId === id)?.[1] || id,
              ])}
            />
          )}

          {activeTab === 3 && (loadingReport || activeReport) && (
            loadingReport ? (
              <div className="progress-report-tab-panel results-tab-panel">
                <div className="progress-report-empty">Generating report…</div>
              </div>
            ) : (
              <ResultsPanel
                selection={displaySelection}
                isHealthWorker={isHealthWorker}
                isCommunityOrganizer={isCommunityOrganizer}
                exportReport={exportReport}
                exportingReport={exportingReport}
                includeInterpretationColumns={includeInterpretationColumns}
                setIncludeInterpretationColumns={setIncludeInterpretationColumns}
                graphExportRows={graphExportRows}
                graphExportFields={graphExportFields}
                resultsView={resultsView}
                setResultsView={setResultsView}
                graphAllowed={graphAllowed}
                graphBeneficiaries={graphBeneficiaries}
                selectedGraphBeneficiary={selectedGraphBeneficiaryId}
                setSelectedGraphBeneficiary={setSelectedGraphBeneficiary}
                tableRows={tableRows}
                tableVisibleFields={reportTableVisibleFields}
                showProfileFilter={displayReportCategory === 'profile'}
                profileFieldSections={activeProfileFieldSections}
                profileSectionLabels={activeProfileSectionLabels}
                profileSection={profileSection}
                setProfileSection={setProfileSection}
                displayPage={displayPage}
                reportPagination={activeReport?.pagination}
                generateReport={generateReport}
                displayReportCategory={displayReportCategory}
                profileGraphColumn={profileGraphColumn}
                setProfileGraphColumn={setProfileGraphColumn}
                graphMetricType={graphMetricType}
                setGraphMetricType={setGraphMetricType}
                setNumericGraphMetric={setNumericGraphMetric}
                availableGrowthMetrics={availableGrowthMetrics}
                availableNumericGrowthMetrics={availableNumericGrowthMetrics}
                selectedGraphMetric={selectedGraphMetric}
                onGraphMetricChange={(metric) => {
                  if (availableGrowthMetrics.some(([id]) => id === metric)) {
                    setGraphMetricType('interpretation');
                    setGrowthMetrics([metric]);
                  } else if (availableNumericGrowthMetrics.some(([id]) => id === metric)) {
                    setGraphMetricType('numeric');
                    setNumericGraphMetric(metric);
                  }
                }}
                selectedTableGrowthMetric={selectedTableGrowthMetric}
                setGrowthMetrics={(metrics) => { setGrowthMetrics(metrics); setMonitorTableMetrics([]); }}
                displayWeeks={displayWeeks}
                setDisplayWeeks={setDisplayWeeks}
                rangeRows={displayReportCategory === 'monitor' ? selectedGraphRangeRows : resultsRows}
                averageMetric={averageMetric}
                graphRows={graphRows}
                resultsRows={resultsRows}
                reportFields={REPORT_FIELDS}
                displayVisibleFields={displayVisibleFields}
                displaySort={displaySort}
                changeSort={changeSort}
                formatCellValue={formatCellValue}
                displayBeneficiaryType={displayBeneficiaryType}
                profileGraphFields={PROFILE_GRAPH_FIELDS}
                interpretationMetrics={INTERPRETATION_METRICS}
                programMetrics={PROGRAM_METRICS}
                benefitPeriod={benefitPeriod}
                benefitMonth={benefitMonth}
                schools={options.schools}
                onBenefitPeriodChange={(value) => {
                  setBenefitPeriod(value);
                  void generateReport(1, { benefitPeriod: value, resultsView });
                }}
                onBenefitMonthChange={(value) => {
                  setBenefitMonth(value);
                  void generateReport(1, { benefitMonth: value, resultsView });
                }}
                onReportSchoolChange={(schoolId) => {
                  const nextSelection = normalizeSelectionHierarchy({
                    ...displaySelection,
                    schoolId,
                    groupId: '',
                    batchId: '',
                  });
                  setSelection(nextSelection);
                  void generateReport(1, { selection: nextSelection, resultsView });
                }}
                loadingReport={loadingReport}
              />
            )
          )}
        </section>
      </div>
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset report setup?"
        description="This clears the current report results and restores the report selections to their defaults."
        variant="info"
        confirmLabel="Reset setup"
        onConfirm={resetSetup}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
