import React, { useEffect, useMemo, useState } from 'react';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import { apiRecordReportDownload } from '../../api/notifications';
import { apiGetPrograms } from '../../api/programs';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';
import { notifyAction } from '../../components/ActionFeedback';
import { ReportTabBar } from './components/ReportTabBar';
import { CommunitySelectionStep } from './components/CommunitySelectionStep';
import { ReportFocusStep } from './components/ReportFocusStep';
import { GrowthMetricsStep } from './components/GrowthMetricsStep';
import { ResultsPanel } from './components/ResultsPanel';
import {
  EMPTY_SELECTIONS,
  REPORT_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  addGrowthScoresBeforeInterpretations,
  GROWTH_METRICS,
  WHO_NUMERIC_GROWTH_METRICS,
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
  REPORT_FOCUS_OPTIONS,
  csvValue,
  formatCellValue,
  getPointValue,
  getPointInterpretation,
} from './progressReportConfig';
import { aggregateGrowthRows, aggregateReportRows } from './utils/reportAggregation';
import { buildProgressReportParams } from './utils/apiUtils';
import { matchesProgramBeneficiaryType } from './utils/programEligibility';
import {
  GROWTH_TABLE_FIELDS,
  MONITORING_HISTORY_EXCLUDED_FIELDS,
  growthTableFieldsForMetric,
  pointValueForTableField,
} from './utils/reportTableUtils';

export default function ProgressReport() {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canRecordReportDownload = hasRole(currentUser?.role, [ROLES.ADMIN, ROLES.PARTNER]);
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
  const [finalizedSnapshot, setFinalizedSnapshot] = useState(null);
  const [sort, setSort] = useState({ key: 'school', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [reportFocus, setReportFocus] = useState('beneficiary-batch');
  const [reportCategory, setReportCategory] = useState('monitor');
  const [beneficiaryType, setBeneficiaryType] = useState('child');
  const [growthMetrics, setGrowthMetrics] = useState(['weightForAge']);
  const [graphMetricType, setGraphMetricType] = useState('interpretation');
  const [profileMetrics, setProfileMetrics] = useState(CHILD_PROFILE_METRICS.map(([id]) => id));
  const [profileSection, setProfileSection] = useState('general');
  const [programMetrics, setProgramMetrics] = useState(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth']);
  const [resultsView, setResultsView] = useState('graph');
  const [tableDisplayMode, setTableDisplayMode] = useState('general');
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
    apiGetPrograms().then((result) => setPrograms(result?.programs || [])).catch(() => setPrograms([]));
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
    setReportFocus(isHealthWorker ? 'beneficiary-group' : 'beneficiary-batch');
  }, [currentUser, isHealthWorker, isSchoolAssignedUser, options.groups, options.schools]);

  const displaySelection = finalizedSnapshot?.selection ?? selection;
  const displayGranularity = finalizedSnapshot?.granularity ?? granularity;
  const displaySort = finalizedSnapshot?.sort ?? sort;
  const displayPage = finalizedSnapshot?.page ?? page;
  const activeReport = finalizedSnapshot?.report ?? report;
  const displayReportFocus = finalizedSnapshot?.reportFocus ?? reportFocus;
  const baseDisplayVisibleFields = addGrowthScoresBeforeInterpretations((finalizedSnapshot?.visibleFields ?? visibleFields).filter((field) => (
    displayReportFocus === 'group-school'
      ? !['mother', 'child', 'group'].includes(field)
      : displayReportFocus === 'batch-group' || displayReportFocus === 'batch-school'
        ? !['mother', 'child'].includes(field)
        : true
  )));
  const displayReportCategory = finalizedSnapshot?.reportCategory ?? reportCategory;
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
  const selectedGraphMetric = growthMetrics[0] || graphMetricOptions[0]?.[0] || '';
  const selectedTableGrowthFields = growthTableFieldsForMetric(selectedGraphMetric);
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
    ? addGrowthScoresBeforeInterpretations([...tableBaseFields, ...selectedTableGrowthFields])
    : baseDisplayVisibleFields;
  const focusScope = selection.batchId ? 'batch' : selection.groupId ? 'group' : selection.schoolId ? 'school' : '';
  const focusOptions = REPORT_FOCUS_OPTIONS.filter(([, , scope]) => scope === focusScope);

  const syncVisibleFieldsForGrowthMetric = (nextGrowthMetrics = growthMetrics) => {
    setVisibleFields((current) => addGrowthScoresBeforeInterpretations([
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
    return options.mothers.some((mother) => String(mother.groupId) === String(selection.groupId) && String(mother.batchId) === String(item.id));
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
      && options.mothers.some((mother) => String(mother.groupId) === String(normalized.groupId) && String(mother.batchId) === String(item.id))
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
    setFinalizedSnapshot(null);
    setActiveTab(1);
    if (key === 'schoolId') setReportFocus('beneficiary-school');
    else if (key === 'groupId') setReportFocus(normalized.groupId ? 'beneficiary-group' : 'beneficiary-school');
    else setReportFocus(normalized.batchId ? 'beneficiary-batch' : normalized.groupId ? 'beneficiary-group' : 'beneficiary-school');
  };

  useEffect(() => {
    if (focusOptions.length && !focusOptions.some(([value]) => value === reportFocus)) {
      setReportFocus(focusOptions[0][0]);
    }
  }, [focusOptions, reportFocus]);

  const generateReport = async (nextPage = 1) => {
    const safeSelection = normalizeSelectionHierarchy(selection);
    if (!safeSelection.schoolId) {
      notifyAction('Please select at least a School to view the report.', 'error');
      return;
    }
    setSelection(safeSelection);
    setLoadingReport(true);
    if (nextPage === 1) setGraphReportRows(null);
    try {
      const selectedProgram = programs.find((program) => normalizeProgramName(program.name) === normalizeProgramName(programName));
      if (reportCategory === 'program') {
        setGrowthMetrics(['receivedBenefitAveragePerMonth']);
        setDisplayWeeks('receivedBenefitAveragePerMonth');
      }
      const requestParams = buildProgressReportParams({
        selection: safeSelection,
        reportCategory,
        beneficiaryType,
        selectedProgram,
        programName,
        benefitPeriod,
        benefitMonth,
        page: nextPage,
        perPage: 50,
      });
      const result = await apiGetProgressReport(requestParams);
      let completeGraphRows = result.rows || [];
      if (nextPage === 1 && reportCategory === 'monitor' && result.pagination?.total > completeGraphRows.length) {
        try {
          const completeResult = await apiGetProgressReport(buildProgressReportParams({
            selection: safeSelection,
            reportCategory,
            beneficiaryType,
            selectedProgram,
            programName,
            benefitPeriod,
            benefitMonth,
            page: 1,
            perPage: 50,
            exportAll: true,
          }));
          if (Array.isArray(completeResult.rows)) completeGraphRows = completeResult.rows;
        } catch {
          notifyAction('The chart could not load every beneficiary in this report.', 'error');
        }
      }
      if (nextPage === 1) setGraphReportRows(reportCategory === 'monitor' ? completeGraphRows : null);
      setReport(result);
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
        reportFocus,
        reportCategory,
        beneficiaryType: requestParams.granularity,
        growthMetrics: [...growthMetrics],
        profileMetrics: [...profileMetrics],
        profileGraphColumn,
        programName,
      });
      setPage(nextPage);
      setActiveTab(4);
    } catch (reportError) {
      notifyAction(reportError.message || 'Unable to generate report.', 'error');
      setReport(null);
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
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return false;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey >= activeRange[0] && monthKey <= activeRange[1];
      });
    });
  };

  const sortedRows = useMemo(() => {
    const sourceRows = filterRowsBySelectedRange(activeReport?.rows || []);
    const aggregatedRows = aggregateReportRows(sourceRows, displayReportFocus);
    const rows = aggregatedRows.length ? aggregatedRows : sourceRows;
    return rows.sort((left, right) => {
      const a = left[displaySort.key] ?? '';
      const b = right[displaySort.key] ?? '';
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return displaySort.direction === 'asc' ? result : -result;
    });
  }, [activeReport, displayReportFocus, displaySort]);

  const breadcrumb = [
    'Home',
    displaySelection.schoolId ? options.schools.find((item) => String(item.id) === String(displaySelection.schoolId))?.name : 'Select School',
    displaySelection.schoolId ? (displaySelection.groupId ? groups.find((item) => String(item.id) === String(displaySelection.groupId))?.name : 'All Groups') : null,
    displaySelection.groupId ? (displaySelection.batchId ? batches.find((item) => String(item.id) === String(displaySelection.batchId))?.name : 'All Batches') : null,
  ].filter(Boolean);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortLabel = (label, key) => <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>{label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}</button>;

  const exportReport = async () => {
    if (!selection.schoolId) return;
    const selectedProgram = programs.find((program) => normalizeProgramName(program.name) === normalizeProgramName(programName));
    const requestParams = buildProgressReportParams({
      selection,
      reportCategory,
      beneficiaryType,
      selectedProgram,
      programName,
      benefitPeriod,
      benefitMonth,
      perPage: 100,
      exportAll: true,
    });
    const result = await apiGetProgressReport(requestParams);
    const lines = [
      `# ${breadcrumb.join(' > ')}`,
      `# Generated ${new Date().toISOString()}`,
      REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([, label]) => label).map(csvValue).join(','),
      ...aggregateReportRows(result.rows, displayReportFocus).map((row) => REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => formatCellValue(id, row[id])).map(csvValue).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${beneficiaryType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifyAction('Progress report CSV download started.');
    if (canRecordReportDownload) {
      apiRecordReportDownload().catch((downloadError) => {
        console.error('Unable to record report download notification:', downloadError);
      });
    }
  };

  const selectedSchool = options.schools.find((item) => String(item.id) === String(displaySelection.schoolId));
  const resultsRows = sortedRows;
  const monitoringTableRows = useMemo(() => {
    if (displayReportCategory !== 'monitor') return resultsRows;
    return filterRowsBySelectedRange(activeReport?.rows || []).flatMap((row) => (row.growthSeries || []).map((point, index) => ({
      ...row,
      measurementDate: point.date || point.measurementDate || '',
      ...Object.fromEntries(selectedTableGrowthFields.map((field) => [field, pointValueForTableField(point, field)])),
      historyRowKey: `${row.childId || row.motherId || row.child || row.mother || index}-${point.date || point.measurementDate || index}`,
    })));
  }, [activeReport, displayReportCategory, resultsRows, selectedTableGrowthFields]);
  const tableRows = tableDisplayMode === 'monitoring-dates' ? monitoringTableRows : resultsRows;
  const tableVisibleFields = tableDisplayMode === 'general'
    ? displayVisibleFields
    : tableDisplayMode === 'monitoring-dates'
      ? addGrowthScoresBeforeInterpretations([...monitoringTableBaseFields, 'measurementDate', ...selectedTableGrowthFields])
      : displayVisibleFields;
  const graphSourceRows = displayReportCategory === 'program'
    ? aggregateReportRows(resultsRows, 'group-school')
    : displayReportCategory === 'monitor'
      ? filterRowsBySelectedRange(graphReportRows ?? activeReport?.rows ?? [])
      : resultsRows;
  const graphAggregationFocus = displayReportCategory === 'monitor'
    ? null
    : displaySelection.batchId
      ? 'batch-group'
      : displaySelection.schoolId
        ? 'group-school'
        : displayReportFocus;
  const filterGraphRowsByRange = (rows) => {
    if (!activeRange || !activeRange[0] || !activeRange[1]) return rows;
    const [startMonth, endMonth] = activeRange;
    return rows
      .map((row) => ({
        ...row,
        growthSeries: (row.growthSeries || []).filter((point) => {
          const dateValue = point?.date || point?.measurementDate;
          if (!dateValue) return false;
          const date = new Date(dateValue);
          if (Number.isNaN(date.getTime())) return false;
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return monthKey >= startMonth && monthKey <= endMonth;
        }),
      }))
      .filter((row) => row.growthSeries?.length || (row[displayBeneficiaryType === 'mother' ? 'bmiForAge' : 'weightForAge'] !== undefined && row[displayBeneficiaryType === 'mother' ? 'bmiForAge' : 'weightForAge'] !== null));
  };
  const graphRows = aggregateGrowthRows(
    filterGraphRowsByRange(
      graphSourceRows.filter((row) => growthMetrics.some((metric) => {
        if (INTERPRETATION_METRICS.has(metric)) {
          return row.growthSeries?.some((point) => getPointInterpretation(point, metric));
        }
        return row.growthSeries?.some((point) => Number.isFinite(getPointValue(point, metric))) || Number.isFinite(Number(row[metric]));
      }))
    ),
    graphAggregationFocus,
    displayBeneficiaryType,
  );
  const averageMetric = (field, rows = resultsRows) => {
    if (INTERPRETATION_METRICS.has(field)) return rows.map((row) => row[field]).find(Boolean) || '—';
    const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value));
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
  };
  const completedPercent = resultsRows.length
    ? Math.round(resultsRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / resultsRows.length)
    : 0;
  const canOpenTab = (tab) => tab === 1 || (tab === 2 && Boolean(selection.schoolId)) || (tab === 3 && Boolean(selection.schoolId)) || (tab === 4 && Boolean(activeReport));
  const goToTab = (tab) => {
    if (canOpenTab(tab)) setActiveTab(tab);
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
    setFinalizedSnapshot(null);
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
    setGrowthMetrics(['weightForLengthInterpretation']);
    setProfileMetrics(CHILD_PROFILE_METRICS.map(([id]) => id));
    setProfileSection('general');
    setProgramMetrics(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth']);
    setReportFocus(isHealthWorker ? 'beneficiary-group' : 'beneficiary-batch');
    setReportCategory('monitor');
    setBeneficiaryType('child');
    setGraphMetricType('interpretation');
    setResultsView('graph');
    setTableDisplayMode('general');
    setDisplayWeeks('all');
    setProfileGraphColumn('gender');
    setProgramName('');
    setBenefitPeriod('overall');
    setBenefitMonth(new Date().toISOString().slice(0, 7));
    setActiveTab(1);
    setPage(1);
    setError('');
  };
  const selectGrowthMetric = (id) => {
    const nextType = INTERPRETATION_METRICS.has(id) || id === 'hospitalReferral' ? 'interpretation' : 'numeric';
    setGraphMetricType(nextType);
    setGrowthMetrics([id]);
    syncVisibleFieldsForGrowthMetric([id]);
  };
  const toggleProfileMetric = (id) => setProfileMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const toggleProgramMetric = (id) => setProgramMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const selectBeneficiaryType = (type) => {
    setBeneficiaryType(type);
    setProfileSection('general');
    setProfileMetrics((type === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS).map(([id]) => id));
    setProfileGraphColumn(type === 'mother' ? 'bmiInterpretation' : 'gender');
    const initialMetric = type === 'mother' ? 'bmiForAge' : 'weightForLengthInterpretation';
    setGraphMetricType(type === 'mother' ? 'numeric' : 'interpretation');
    setGrowthMetrics([initialMetric]);
    syncVisibleFieldsForGrowthMetric([initialMetric]);
    setFinalizedSnapshot(null);
    setReport(null);
    setActiveTab(2);
  };
  const selectReportCategory = (category) => {
    setReportCategory(category);
    if (category === 'program') {
      setProgramMetrics(['receivedBenefitAveragePerMonth']);
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
    if (!metricOptions.some(([id]) => id === growthMetrics[0])) {
      const nextMetric = metricOptions[0]?.[0] || '';
      setGrowthMetrics([nextMetric]);
      if (nextMetric) syncVisibleFieldsForGrowthMetric([nextMetric]);
    }
  }, [availableGrowthMetrics, availableNumericGrowthMetrics, graphMetricType, growthMetrics, reportCategory]);

  useEffect(() => {
    if (activeTab !== 4) return undefined;
    const heading = document.querySelector('.growth-report-single-card h3');
    const subtitle = document.querySelector('.growth-report-single-card > p');
    const exportButton = document.querySelector('.progress-report-results-header > .secondary-btn')
      || [...document.querySelectorAll('.results-tab-panel button.secondary-btn')].find((button) => button.textContent.trim() === 'Export CSV');
    const resultsHeader = document.querySelector('.progress-report-results-header');
    const chartActions = document.querySelector('.program-average-chart-actions');
    if (exportButton && displayReportCategory === 'program' && chartActions) chartActions.appendChild(exportButton);
    if (exportButton && displayReportCategory !== 'program' && resultsHeader) resultsHeader.appendChild(exportButton);
    if (heading && displayReportCategory === 'monitor' && beneficiaryType === 'mother') heading.textContent = '📈 BMI';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'mother') subtitle.textContent = 'Latest mother BMI measurements · values are plotted by month';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'child') subtitle.textContent = 'Weight and length plotted against age in months';
    if (heading && displayReportCategory === 'monitor' && beneficiaryType === 'child') {
      const metricText = (availableGrowthMetrics.find(([id]) => id === growthMetrics[0])?.[1] || 'Weight-for-Length/Height')
        .replace(/\s+Z-Score$/i, '')
        .replace(/\s+Interpretation$/i, '');
      heading.textContent = metricText;
    }
    if (displayReportCategory === 'program') {
      const selectedMetric = PROGRAM_METRICS.find(([id]) => id === displayWeeks);
      const selectedMetricLabel = selectedMetric?.[1] || 'Program Benefits';
      if (heading) heading.textContent = selectedMetricLabel;
      if (subtitle) subtitle.textContent = `${selectedMetricLabel} by group`;
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.textContent = averageMetric(displayWeeks, graphRows);
      if (value) value.style.display = 'none';
    } else {
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.style.display = '';
    }
    return undefined;
  }, [activeTab, beneficiaryType, displayReportCategory, displayWeeks, graphRows]);

  return (
    <div className="community-page progress-report-shell">
      <div className="progress-report-panel hierarchical-progress-report">
        <PageHeader title="Progress Report" breadcrumbs={[{ label: 'Reports' }, { label: 'Progress Report' }]} actions={<button type="button" className="secondary-btn" onClick={resetSetup}>Reset Setup</button>} />
        <ReportTabBar tabs={REPORT_TABS} activeTab={activeTab} canOpenTab={canOpenTab} goToTab={goToTab} />

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
              updateSelection={updateSelection}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 2 && (
            <ReportFocusStep
              reportCategory={reportCategory}
              selectReportCategory={selectReportCategory}
              programName={programName}
              setProgramName={setProgramName}
              programs={programs}
              benefitPeriod={benefitPeriod}
              setBenefitPeriod={setBenefitPeriod}
              benefitMonth={benefitMonth}
              setBenefitMonth={setBenefitMonth}
              beneficiaryType={beneficiaryType}
              setBeneficiaryType={selectBeneficiaryType}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 3 && (
            <GrowthMetricsStep
              reportCategory={reportCategory}
              availableProfileMetrics={availableProfileMetrics}
              profileMetrics={profileMetrics}
              toggleProfileMetric={toggleProfileMetric}
              programMetrics={PROGRAM_METRICS}
              selectedProgramMetrics={programMetrics}
              toggleProgramMetric={toggleProgramMetric}
              beneficiaryType={beneficiaryType}
              availableGrowthMetrics={availableGrowthMetrics}
              growthMetrics={growthMetrics}
              selectGrowthMetric={selectGrowthMetric}
              setActiveTab={setActiveTab}
              generateReport={generateReport}
              profileFieldSections={activeProfileFieldSections}
              profileSectionLabels={activeProfileSectionLabels}
              profileSection={profileSection}
              setProfileSection={setProfileSection}
            />
          )}

          {activeTab === 4 && (loadingReport || activeReport) && (
            loadingReport ? (
              <div className="progress-report-tab-panel results-tab-panel">
                <div className="progress-report-empty">Generating report…</div>
              </div>
            ) : (
              <ResultsPanel
                selectedSchool={selectedSchool}
                selection={selection}
                groups={groups}
                batches={batches}
                exportReport={exportReport}
                resultsView={resultsView}
                setResultsView={setResultsView}
                tableDisplayMode={tableDisplayMode}
                setTableDisplayMode={setTableDisplayMode}
                tableRows={tableRows}
                tableVisibleFields={tableVisibleFields}
                monitoringRows={monitoringTableRows}
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
                availableGrowthMetrics={availableGrowthMetrics}
                availableNumericGrowthMetrics={availableNumericGrowthMetrics}
                selectedGraphMetric={selectedGraphMetric}
                setGrowthMetrics={setGrowthMetrics}
                displayWeeks={displayWeeks}
                setDisplayWeeks={setDisplayWeeks}
                rangeRows={displayReportCategory === 'monitor' ? graphReportRows ?? activeReport?.rows ?? [] : resultsRows}
                averageMetric={averageMetric}
                graphRows={graphRows}
                resultsRows={resultsRows}
                reportFields={REPORT_FIELDS}
                displayVisibleFields={displayVisibleFields}
                displaySort={displaySort}
                changeSort={changeSort}
                formatCellValue={formatCellValue}
                displayBeneficiaryType={displayBeneficiaryType}
                displayReportFocus={displayReportFocus}
                profileGraphFields={PROFILE_GRAPH_FIELDS}
                interpretationMetrics={INTERPRETATION_METRICS}
                programMetrics={PROGRAM_METRICS}
              />
            )
          )}
        </section>
      </div>
    </div>
  );
}
