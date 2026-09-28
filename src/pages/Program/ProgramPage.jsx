import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from "../../utils/permissions";
import PageHeader from '../../components/ui/PageHeader';
import {
  BatchesIcon,
  BuildingIcon,
  GroupsIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
} from "../Community/CommunityIcons";
import { getSummary } from "../Community/communityService";
import { apiGetChildren } from "../../api/children";
import { apiCompleteNamedProgramCluster, apiCompleteProgramCluster, apiCreateProgram, apiCreateProgramClusters, apiDeleteProgram, apiEndProgram, apiGetProgramMonitoring, apiGetPrograms, apiRestoreProgram, apiSetProgramMonitoring, apiUpdateProgram } from "../../api/programs";
import { notifyAction } from '../../components/ActionFeedback';
import ExpandableTreeTable from "../Monitoring/ExpandableTreeTable";
import { ConfirmActionModal } from "../Community/CommunityModals";
import { formatDateForDisplay, normalizeDateValue } from '../../utils/dateFormat';
import {
  beneficiaryNames,
  emptyProgram,
  filterPrograms,
  getCluster,
  normalizeBeneficiaryType,
  recordMatchesProgramScope,
} from "./programData";

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ProgramPage() {
  const navigate = useNavigate();
  const { programId, clusterType, clusterName, schoolId, groupId, batchId } = useParams();
  const { currentUser } = useAuth();
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const canManagePrograms = isCommunityOrganizer;
  const canCreatePrograms = isCommunityOrganizer;
  const canDeletePrograms = isCommunityOrganizer;
  const canEndPrograms = isCommunityOrganizer;
  const canMonitorPrograms = canCreatePrograms || hasRole(currentUser?.role, [ROLES.PARTNER]) || isHealthWorkerRole(currentUser?.role);
  const [activeTab, setActiveTab] = useState("Active");
  const [query, setQuery] = useState("");
  const [programs, setPrograms] = useState([]);
  const [isLiveDataLoaded, setIsLiveDataLoaded] = useState(false);
  const viewMode = Boolean(programId);
  const clusterView = Boolean(clusterType && clusterName);
  const [showModal, setShowModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [form, setForm] = useState(emptyProgram);
  const [activityStatus, setActivityStatus] = useState("Open");
  const [checkedRecipients, setCheckedRecipients] = useState([
    "Maria Santos",
    "Juan Dela Cruz",
    "Ana Garcia",
    "Carlo Ramos",
  ]);
  const [beneficiaryScope, setBeneficiaryScope] = useState("School");
  const [scopeSchoolIds, setScopeSchoolIds] = useState([]);
  const [scopeGroupIds, setScopeGroupIds] = useState([]);
  const [scopeBatchIds, setScopeBatchIds] = useState([]);
  const [hierarchy, setHierarchy] = useState({ schools: [], groups: [], batches: [] });
  const [scopeError, setScopeError] = useState('');
  const [actionProgram, setActionProgram] = useState(null);
  const [pendingDeleteProgram, setPendingDeleteProgram] = useState(null);
  const [programError, setProgramError] = useState('');
  const [beneficiaryRecords, setBeneficiaryRecords] = useState([]);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [drillLevel, setDrillLevel] = useState('school');
  const [drillSchool, setDrillSchool] = useState(null);
  const [drillGroup, setDrillGroup] = useState(null);
  const [drillBatch, setDrillBatch] = useState(null);
  const [monitorDate, setMonitorDate] = useState(localDate);
  const [monitoringStatus, setMonitoringStatus] = useState({});
  const [monitoringPending, setMonitoringPending] = useState({});
  const [monitorConfirmation, setMonitorConfirmation] = useState(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const clickedInsideDropdown = event.target.closest('.actions-dropdown');
      const clickedToggleButton = event.target.closest('.program-more-button');

      if (!clickedInsideDropdown && !clickedToggleButton) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const mapApiProgram = (program) => ({
    ...program,
    id: Number(program.id),
    beneficiaryType: program.beneficiaryType || program.beneficiary_type || 'Mother',
    target: Number(program.target || 0),
    received: Number(program.received || 0),
    clusters: program.clusters || [],
    recipients: program.recipients || [],
    latest: program.latest || 'No activity yet',
  });

  const normalizeDisplayValue = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b(school|group|batch)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const collectDisplayCandidates = (...values) => (
    values.flatMap((value) => {
      if (value === null || value === undefined) return [];
      const text = String(value).trim();
      if (!text) return [];
      const normalized = text
        .split(/[|,/]+/)
        .map((segment) => segment.trim())
        .filter(Boolean);
      return normalized;
    })
      .filter(Boolean)
      .map((value) => normalizeDisplayValue(value))
      .filter(Boolean)
  );

  const valueMatchesTarget = (value, target) => {
    const normalizedValue = normalizeDisplayValue(value);
    const normalizedTarget = normalizeDisplayValue(target);
    if (!normalizedValue || !normalizedTarget) return false;
    return normalizedValue === normalizedTarget
      || normalizedValue.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedValue);
  };

  const getProgramBeneficiaryRecords = (program, records = beneficiaryRecords) => {
    if (!program) return [];

    return (records || []).filter((record) => recordMatchesProgramScope(record, program));
  };

  const getRouteBeneficiaryRecords = (program, { schoolName = '', groupName = '', batchName = '' } = {}) => {
    const scopedRecords = getProgramBeneficiaryRecords(program);
    const filtered = scopedRecords.filter((record) => {
      const schoolCandidates = collectDisplayCandidates(record?.school, record?.community, record?.community_name, record?.area);
      const groupCandidates = collectDisplayCandidates(record?.group, record?.group_name, record?.groupName);
      const batchCandidates = collectDisplayCandidates(record?.batch, record?.batch_name, record?.batchName, record?.batchCode, record?.batchId, record?.batch_code);
      const targetSchool = String(schoolName || '').trim();
      const targetGroup = String(groupName || '').trim();
      const targetBatch = String(batchName || '').trim();

      if (targetSchool && schoolCandidates.length && !schoolCandidates.some((candidate) => valueMatchesTarget(candidate, targetSchool))) return false;
      if (targetSchool && schoolCandidates.length === 0 && record?.school) return false;
      if (targetGroup && groupCandidates.length && !groupCandidates.some((candidate) => valueMatchesTarget(candidate, targetGroup))) return false;
      if (targetBatch && batchCandidates.length && !batchCandidates.some((candidate) => valueMatchesTarget(candidate, targetBatch))) return false;
      if (targetGroup && !groupCandidates.length && targetBatch && !batchCandidates.length) return false;
      if (targetBatch && !batchCandidates.length && targetGroup && !groupCandidates.length) return false;
      return true;
    });

    if (filtered.length > 0) return filtered;

    return (beneficiaryRecords || []).filter((record) => {
      const schoolCandidates = collectDisplayCandidates(record?.school, record?.community, record?.community_name, record?.area);
      const groupCandidates = collectDisplayCandidates(record?.group, record?.group_name, record?.groupName);
      const batchCandidates = collectDisplayCandidates(record?.batch, record?.batch_name, record?.batchName, record?.batchCode, record?.batchId, record?.batch_code);
      const targetSchool = String(schoolName || '').trim();
      const targetGroup = String(groupName || '').trim();
      const targetBatch = String(batchName || '').trim();

      const schoolMatches = !targetSchool || !schoolCandidates.length || schoolCandidates.some((candidate) => valueMatchesTarget(candidate, targetSchool));
      const groupMatches = !targetGroup || !groupCandidates.length || groupCandidates.some((candidate) => valueMatchesTarget(candidate, targetGroup));
      const batchMatches = !targetBatch || !batchCandidates.length || batchCandidates.some((candidate) => valueMatchesTarget(candidate, targetBatch));
      return schoolMatches && groupMatches && batchMatches;
    });
  };

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([apiGetPrograms(), getSummary(), apiGetChildren()])
      .then(([programResult, summaryResult, childrenResult]) => {
        if (!mounted) return;
        if (programResult.status !== 'fulfilled') {
          throw programResult.reason;
        }
        const programResponse = programResult.value || {};
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value || {} : {};
        const childrenResponse = childrenResult.status === 'fulfilled' ? childrenResult.value || {} : {};
        const savedPrograms = (programResponse.programs || []).map(mapApiProgram);
        setHierarchy({ schools: summary.communities || [], groups: summary.groups || [], batches: summary.batches || [] });
        const mothers = (summary.mothers || []).map((mother) => ({
          id: `mother-${mother.id}`,
          sourceId: mother.id,
          sourceType: 'mother',
          monitorKey: `mother:${mother.id}`,
          school: mother.community || '',
          group: mother.group || '',
          batch: mother.batchId || '',
          name: mother.name,
          type: 'Mother',
          isMonitored: Boolean(mother.isMonitored ?? mother.is_monitored),
        }));
        const children = (childrenResponse.children || []).map((child) => ({
          id: `child-${child.id}`,
          sourceId: child.id,
          sourceType: 'child',
          monitorKey: `child:${child.id}`,
          school: child.community_name || '',
          group: child.group_name || '',
          batch: child.batch_name || '',
          name: [child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' '),
          type: 'Child',
          isMonitored: Boolean(child.isMonitored ?? child.is_monitored),
        }));
        setBeneficiaryRecords([...mothers, ...children]);
        setPrograms(savedPrograms);
      })
      .then(() => {
        if (mounted) setIsLiveDataLoaded(true);
      })
      .catch((error) => {
        if (!mounted) return;
        notifyAction(error?.message || 'Unable to load saved programs.', 'error');
        setPrograms([]);
        setIsLiveDataLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshMonitoring = async () => {
    if (!programId) return;
    const response = await apiGetProgramMonitoring(programId, monitorDate);
    const next = {};
    (response.logs || []).forEach((log) => { next[`${log.beneficiary_type}:${log.beneficiary_id}`] = Boolean(log.monitored); });
    setMonitoringStatus(next);
  };

  useEffect(() => {
    let active = true;
    if (!programId) return undefined;
    apiGetProgramMonitoring(programId, monitorDate).then((response) => {
      if (!active) return;
      const next = {};
      (response.logs || []).forEach((log) => { next[`${log.beneficiary_type}:${log.beneficiary_id}`] = Boolean(log.monitored); });
      setMonitoringStatus(next);
    }).catch(() => { if (active) notifyAction('Unable to load daily monitoring status.', 'error'); });
    return () => { active = false; };
  }, [programId, monitorDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = localDate();
      setMonitorDate((current) => current === today ? current : today);
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const toggleMonitoring = async (beneficiary, monitored, descendants = null) => {
    const beneficiaries = descendants?.length ? descendants : [beneficiary];
    const changes = beneficiaries.filter((item) => item.monitorKey && item.sourceId && item.sourceType);
    const previous = Object.fromEntries(changes.map((item) => [item.monitorKey, Boolean(monitoringStatus[item.monitorKey])]));
    const keys = changes.map((item) => item.monitorKey);
    setMonitoringStatus((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, monitored])) }));
    setMonitoringPending((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, true])) }));
    try {
      await Promise.all(changes.map((item) => apiSetProgramMonitoring(programId, {
        beneficiaryId: item.sourceId,
        beneficiaryType: item.sourceType,
        monitored,
        date: monitorDate,
      })));
    } catch (error) {
      setMonitoringStatus((current) => ({ ...current, ...previous }));
      notifyAction(error.message || 'Unable to save monitoring status.', 'error');
    } finally {
      setMonitoringPending((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, false])) }));
    }
  };

  const requestMonitoringChange = (beneficiary, monitored, descendants = null) => {
    const affectedCount = descendants?.length || 1;
    setMonitorConfirmation({ beneficiary, monitored, descendants, affectedCount });
  };

  const confirmMonitoringChange = async () => {
    if (!monitorConfirmation) return;
    const { beneficiary, monitored, descendants } = monitorConfirmation;
    setMonitorConfirmation(null);
    await toggleMonitoring(beneficiary, monitored, descendants);
  };

  const openBeneficiaryReport = (beneficiary) => {
    navigate(`/program/${programId}/beneficiaries/${beneficiary.sourceType}/${beneficiary.sourceId}/receipt-history`, {
      state: { beneficiaryName: beneficiary.name },
    });
  };

  const collectClusterBeneficiaries = (cluster, level) => {
    const normalizedLevel = String(level || '').toLowerCase();
    const name = String(cluster?.name || cluster?.group_name || cluster?.batch_name || '').trim();
    if (!name) return [];
    const scopedRecords = getProgramBeneficiaryRecords(selectedProgram);
    return scopedRecords.filter((record) => {
      if (normalizedLevel === 'group') {
        return String(record.group || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'batch') {
        return String(record.batch || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'school') {
        const hasExplicitGroupScope = (selectedProgram?.clusters || []).some((item) => item?.type === 'Group' && String(item?.name || '').trim());
        const hasExplicitBatchScope = (selectedProgram?.clusters || []).some((item) => item?.type === 'Batch' && String(item?.name || '').trim());
        if (hasExplicitGroupScope && String(record.group || '').trim()) {
          return String(record.school || '').trim().toLowerCase() === name.toLowerCase()
            && (selectedProgram?.clusters || []).some((item) => item.type === 'Group' && String(item.name || '').trim().toLowerCase() === String(record.group || '').trim().toLowerCase());
        }
        if (hasExplicitBatchScope && String(record.batch || '').trim()) {
          return String(record.school || '').trim().toLowerCase() === name.toLowerCase()
            && (selectedProgram?.clusters || []).some((item) => item.type === 'Batch' && String(item.name || '').trim().toLowerCase() === String(record.batch || '').trim().toLowerCase());
        }
        return String(record.school || '').trim().toLowerCase() === name.toLowerCase();
      }
      return false;
    }).map((record) => ({ id: record.sourceId, type: record.sourceType, name: record.name }));
  };

  const openClusterHistory = (cluster, level) => {
    const clusterType = level?.toLowerCase?.() || 'school';
    const clusterName = cluster?.name || cluster?.group_name || cluster?.batch_name || '';
    if (!clusterName) return;
    const beneficiaries = collectClusterBeneficiaries(cluster, clusterType);
    navigate(`/program/${programId}/cluster/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}/receipt-history`, {
      state: { clusterName, clusterType, beneficiaries },
    });
  };

  const filteredPrograms = useMemo(() => {
    return filterPrograms(programs, query, activeTab);
  }, [programs, query, activeTab]);

  const saveProgram = async (event) => {
    event.preventDefault();
    if (form.id && String(form.status || '').trim().toLowerCase() === 'ended') return;
    if (!form.name.trim() || !form.provider.trim()) return;
    try {
      const response = form.id
        ? await apiUpdateProgram(form.id, form)
        : await apiCreateProgram(form);
      setPrograms((current) => form.id
        ? current.map((program) => program.id === form.id ? mapApiProgram(response.program) : program)
        : [...current, mapApiProgram(response.program)]);
      setForm(emptyProgram);
      setShowModal(false);
      notifyAction(`${form.id ? 'Updated' : 'Created'} program successfully.`);
    } catch (error) {
      const message = error.message || 'Unable to save program.';
      notifyAction(message, 'error');
    }
  };

  const selectedProgram = programId
    ? programs.find((program) => program.id === Number(programId))
    : programs.find((program) => program.id === Number(form.id)) || filteredPrograms[0];
  const routeMatchesValue = (entity, routeValue, extraKeys = []) => {
    if (!entity || !routeValue) return false;
    const target = String(routeValue).trim().toLowerCase();
    const candidates = new Set([
      entity.id,
      entity.databaseId,
      entity.code,
      entity.batch_code,
      entity.group_code,
      entity.community_code,
      entity.name,
      entity.group_name,
      entity.batch_name,
      entity.community_name,
      ...extraKeys.map((key) => entity?.[key]),
    ].filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => String(value).trim().toLowerCase()));
    return candidates.has(target);
  };
  const selectedRouteSchool = useMemo(() => hierarchy.schools.find((school) => routeMatchesValue(school, schoolId, ['schoolId', 'communityId', 'school_code', 'code'])), [hierarchy.schools, schoolId]);
  const selectedRouteGroup = useMemo(() => hierarchy.groups.find((group) => routeMatchesValue(group, groupId, ['groupId', 'group_code', 'code'])), [hierarchy.groups, groupId]);
  const selectedRouteBatch = useMemo(() => hierarchy.batches.find((batch) => routeMatchesValue(batch, batchId, ['batchId', 'batch_code', 'code', 'name'])), [hierarchy.batches, batchId]);
  const selectedRouteBatchGroup = selectedRouteBatch ? hierarchy.groups.find((group) => (
    String(selectedRouteBatch.group_id || '') === String(group.id || '')
    || String(selectedRouteBatch.groupIds || '').split(',').map((value) => value.trim()).includes(String(group.id || ''))
    || String(selectedRouteBatch.group || selectedRouteBatch.group_name || '').trim().toLowerCase() === String(group.name || group.group_name || '').trim().toLowerCase()
  )) : null;
  const programBreadcrumbs = [{ label: 'Program', to: '/program' }];
  if (viewMode && selectedProgram) {
    programBreadcrumbs.push({ label: selectedProgram.name, to: `/program/${programId}` });
    if (selectedRouteSchool) programBreadcrumbs.push({ label: selectedRouteSchool.name });
    if (selectedRouteGroup) programBreadcrumbs.push({ label: selectedRouteGroup.name || selectedRouteGroup.group_name });
    if (selectedRouteBatchGroup) programBreadcrumbs.push({
      label: selectedRouteBatchGroup.name || selectedRouteBatchGroup.group_name,
      to: `/program/${programId}/group/${selectedRouteBatchGroup.id}`,
    });
    if (selectedRouteBatch) programBreadcrumbs.push({ label: selectedRouteBatch.name || selectedRouteBatch.batch_code || selectedRouteBatch.code });
  }
  const getProgramBeneficiaryCount = (program) => {
    const uniqueBeneficiaries = new Set();

    getProgramBeneficiaryRecords(program).forEach((record) => {
      if (record.sourceType && record.sourceId !== undefined && record.sourceId !== null) {
        uniqueBeneficiaries.add(`${record.sourceType}:${record.sourceId}`);
      }
    });

    return uniqueBeneficiaries.size;
  };
  const isEndedProgram = String(selectedProgram?.status || '').trim().toLowerCase() === 'ended';
  const expandedClusters = useMemo(() => {
    if (!selectedProgram) return [];
    const clusters = [...(selectedProgram.clusters || [])];
    const addCluster = (type, name, beneficiaries) => {
      if (!name || clusters.some((cluster) => cluster.type === type && cluster.name.toLowerCase() === name.toLowerCase())) return;
      clusters.push({ type, name, beneficiaries: Number(beneficiaries || 0), received: 0, derived: true });
    };
    clusters.filter((cluster) => cluster.type === 'School').forEach((schoolCluster) => {
      const schoolName = schoolCluster.name.replace(/ School$/i, '');
      const school = hierarchy.schools.find((item) => String(item.name || '').toLowerCase() === schoolCluster.name.toLowerCase() || String(item.name || '').toLowerCase() === schoolName.toLowerCase());
      if (!school) return;
      const schoolGroups = hierarchy.groups.filter((group) => (
        String(group.community || group.community_name || '').toLowerCase() === String(school.name || '').toLowerCase()
      ));
      schoolGroups.forEach((group) => addCluster('Group', group.name || group.group_name, group.members));
      hierarchy.batches.filter((batch) => (
        String(batch.community || '').toLowerCase() === String(school.name || '').toLowerCase()
      )).forEach((batch) => addCluster('Batch', batch.name || batch.batch_code, batch.records));
    });
    return clusters;
  }, [hierarchy, selectedProgram]);
  const selectedProgramView = selectedProgram ? { ...selectedProgram, clusters: expandedClusters } : selectedProgram;
  const selectedCluster = getCluster(selectedProgramView, clusterType, clusterName);
  const schoolRows = selectedProgramView?.clusters.filter((cluster) => cluster.type === 'School') || [];
  const directScopeClusters = selectedProgramView?.clusters.filter((cluster) => cluster.type === 'Group' || cluster.type === 'Batch') || [];
  const directScopeGroups = useMemo(() => {
    const clusters = selectedProgramView?.clusters || [];
    const groupClusters = clusters.filter((cluster) => cluster.type === 'Group');
    const batchClusters = clusters.filter((cluster) => cluster.type === 'Batch');
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const findBatch = (cluster) => hierarchy.batches.find((batch) => normalize(batch.name || batch.batch_code || batch.code) === normalize(cluster.name));
    const belongsToGroup = (batch, group) => {
      if (!batch) return false;
      const groupId = String(group.id || '');
      const groupName = normalize(group.name || group.group_name);
      return String(batch.group_id || '') === groupId
        || String(batch.groupIds || '').split(',').map((value) => value.trim()).includes(groupId)
        || normalize(batch.group || batch.group_name) === groupName
        || String(batch.groupNames || '').split(',').map(normalize).includes(groupName);
    };
    const groups = hierarchy.groups.filter((group) => (
      groupClusters.some((cluster) => normalize(cluster.name) === normalize(group.name || group.group_name))
      || batchClusters.some((cluster) => belongsToGroup(findBatch(cluster), group))
    ));

    return groups.map((group) => {
      const groupName = normalize(group.name || group.group_name);
      const groupScope = groupClusters.find((cluster) => normalize(cluster.name) === groupName);
      const selectedBatches = batchClusters.filter((cluster) => belongsToGroup(findBatch(cluster), group));
      const allGroupBatches = hierarchy.batches.filter((batch) => belongsToGroup(batch, group));
      return {
        ...group,
        batchCount: selectedBatches.length || (groupScope ? allGroupBatches.length : 0),
        beneficiaryCount: selectedBatches.length
          ? selectedBatches.reduce((total, cluster) => total + Number(cluster.beneficiaries || 0), 0)
          : Number(groupScope?.beneficiaries || 0),
      };
    });
  }, [hierarchy, selectedProgramView]);
  const matchesSchoolGroupBatch = (record, schoolName, groupName, batchName) => {
    const recordSchool = String(record?.school || '').trim().toLowerCase();
    const recordGroup = String(record?.group || '').trim().toLowerCase();
    const recordBatch = String(record?.batch || '').trim().toLowerCase();
    const normalizedSchoolName = String(schoolName || '').trim().toLowerCase();
    const normalizedGroupName = String(groupName || '').trim().toLowerCase();
    const normalizedBatchName = String(batchName || '').trim().toLowerCase();

    if (normalizedSchoolName && recordSchool && recordSchool !== normalizedSchoolName) return false;
    if (normalizedBatchName && recordBatch && recordBatch !== normalizedBatchName) return false;
    if (normalizedGroupName && recordGroup && recordGroup !== normalizedGroupName) return false;
    if (normalizedGroupName && !recordGroup && normalizedBatchName && !recordBatch) return false;
    if (normalizedBatchName && !recordBatch && normalizedGroupName && !recordGroup) return false;
    return true;
  };
  const programHierarchy = useMemo(() => schoolRows.map((schoolCluster, schoolIndex) => {
    const scopedRecords = getProgramBeneficiaryRecords(selectedProgramView);
    const normalizedSchoolName = String(schoolCluster.name || '').replace(/ School$/i, '');
    const school = hierarchy.schools.find((item) => String(item.name || '').toLowerCase() === String(schoolCluster.name || '').toLowerCase() || String(item.name || '').toLowerCase() === normalizedSchoolName.toLowerCase());
    const schoolName = school?.name || normalizedSchoolName;
    const groups = hierarchy.groups
      .filter((group) => String(group.community || group.community_name || '').toLowerCase() === String(schoolName || '').toLowerCase())
      .map((group, groupIndex) => {
        const groupName = group.name || group.group_name;
        const batches = hierarchy.batches
          .filter((batch) => {
            const batchName = batch.name || batch.batch_code || batch.code;
            const batchKeys = [batchName, batch.id, batch.databaseId, batch.code]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());
            const hasMatchingBeneficiary = scopedRecords.some((record) => {
              const recordBatch = String(record.batch || '').trim().toLowerCase();
              const recordSchool = String(record.school || '').trim().toLowerCase();
              const recordGroup = String(record.group || '').trim().toLowerCase();
              return batchKeys.includes(recordBatch)
                && (!recordSchool || recordSchool === String(schoolName).toLowerCase())
                && (!recordGroup || recordGroup === String(groupName).toLowerCase());
            });
            return String(batch.community || '').toLowerCase() === String(schoolName || '').toLowerCase()
              && (
                String(batch.group || batch.group_name || '').toLowerCase() === String(groupName || '').toLowerCase()
                || String(batch.group_id || '') === String(group.id || '')
                || String(batch.groupIds || '').split(',').map((id) => id.trim()).includes(String(group.id || ''))
                || String(batch.groupNames || '').split(',').map((name) => name.trim().toLowerCase()).includes(String(groupName || '').toLowerCase())
                || hasMatchingBeneficiary
              );
          })
          .map((batch, batchIndex) => {
            const batchName = batch.name || batch.batch_code || batch.code;
            const batchKeys = [batchName, batch.id, batch.databaseId, batch.code]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());
            return {
              id: batch.id || `${schoolIndex}-${groupIndex}-${batchIndex}`,
              name: batchName,
              beneficiaries: scopedRecords.filter((record) => {
                const recordBatch = String(record.batch || '').trim().toLowerCase();
                return batchKeys.includes(recordBatch)
                  && matchesSchoolGroupBatch(record, schoolName, groupName, batchName);
              }),
            };
          });
        return { id: group.id || `${schoolIndex}-${groupIndex}`, name: groupName, batches };
      });
    return { id: school?.id || schoolCluster.name, name: schoolName, groups };
  }), [hierarchy, schoolRows, selectedProgramView]);
  const groupRows = drillSchool
    ? hierarchy.groups.filter((group) => String(group.community || '').toLowerCase() === String(drillSchool.name || '').toLowerCase())
    : [];
  const batchRows = drillGroup
    ? hierarchy.batches.filter((batch) => (
      String(batch.group || batch.group_name || '').toLowerCase() === String(drillGroup.name || drillGroup.group_name || '').toLowerCase()
      || String(batch.community || '').toLowerCase() === String(drillSchool?.name || '').toLowerCase() && String(batch.group_id || '') === String(drillGroup.id || '')
    ))
    : [];
  const scopedBeneficiaryRecords = useMemo(() => getProgramBeneficiaryRecords(selectedProgram), [selectedProgram, beneficiaryRecords]);

  const drilledBeneficiaries = scopedBeneficiaryRecords.filter((record) => {
    if (!drillBatch) return false;
    return String(record.batch).toLowerCase() === String(drillBatch.name || drillBatch.batch_code || drillBatch.code || '').toLowerCase();
  });
  const beneficiaryRows = useMemo(() => {
    if (!selectedProgramView) return [];
    const scopedRecords = getProgramBeneficiaryRecords(selectedProgramView);
    const schoolClusters = selectedProgramView.clusters.filter((cluster) => cluster.type === 'School');
    const rows = [];
    schoolClusters.forEach((school) => {
      const records = scopedRecords.filter((record) => String(record.school).toLowerCase() === String(school.name).toLowerCase());
      if (records.length) {
        records.forEach((record) => rows.push({ ...record, school: school.name }));
      } else {
        rows.push({ id: `school-${school.name}`, school: school.name, group: 'All groups', batch: 'All batches', name: 'All beneficiaries', type: 'School coverage', cluster: school });
      }
    });
    return rows;
  }, [selectedProgramView]);
  const schoolHierarchy = useMemo(() => {
    if (!selectedProgramView) return [];
    return selectedProgramView.clusters
      .filter((cluster) => cluster.type === 'School')
      .map((school) => ({
        school,
        groups: selectedProgramView.clusters.filter((cluster) => cluster.type === 'Group' && hierarchy.groups.some((group) => (group.name || group.group_name) === cluster.name && String(group.community || '').toLowerCase() === String(school.name || '').toLowerCase())),
        batches: selectedProgramView.clusters.filter((cluster) => cluster.type === 'Batch' && hierarchy.batches.some((batch) => (batch.name || batch.batch_code) === cluster.name && String(batch.community || '').toLowerCase() === String(school.name || '').toLowerCase())),
      }));
  }, [hierarchy, selectedProgramView]);
  const selectedSchools = hierarchy.schools.filter((school) => scopeSchoolIds.includes(String(school.id || school.school_id || school.community_id)));
  const selectedGroups = hierarchy.groups.filter((group) => scopeGroupIds.includes(String(group.id)));
  const selectedBatches = hierarchy.batches.filter((batch) => scopeBatchIds.includes(String(batch.id)));
  const communityHierarchyGroups = useMemo(() => hierarchy.schools.map((school) => {
    const schoolName = String(school.name || '').trim().toLowerCase();
    const schoolId = String(school.id || school.school_id || school.community_id || '').trim();
    const matchingGroups = hierarchy.groups.filter((group) => {
      const communityName = String(group.community || group.community_name || group.school_name || '').trim().toLowerCase();
      const communityId = String(group.community_id || group.school_id || group.communityId || '').trim();
      return communityName === schoolName || communityId === schoolId || String(group.community || group.community_name || '').trim().toLowerCase() === schoolName;
    });
    const matchingBatches = hierarchy.batches.filter((batch) => {
      const communityName = String(batch.community || batch.community_name || batch.school_name || '').trim().toLowerCase();
      const communityId = String(batch.community_id || batch.school_id || batch.communityId || '').trim();
      const groupCommunityName = String(batch.group_community || batch.groupCommunity || '').trim().toLowerCase();
      return communityName === schoolName || communityId === schoolId || groupCommunityName === schoolName || String(batch.community || '').trim().toLowerCase() === schoolName;
    });

    return {
      school,
      groups: matchingGroups.length ? matchingGroups : hierarchy.groups.filter((group) => String(group.community || group.community_name || '').trim().toLowerCase() === schoolName || String(group.name || group.group_name || '').trim().toLowerCase().includes(schoolName)),
      batches: matchingBatches.length ? matchingBatches : hierarchy.batches.filter((batch) => String(batch.community || '').trim().toLowerCase() === schoolName || String(batch.name || batch.batch_code || batch.code || '').trim().toLowerCase().includes(schoolName)),
    };
  }), [hierarchy]);
  const toggleRecipient = (recipient) =>
    setCheckedRecipients((current) =>
      current.includes(recipient)
        ? current.filter((name) => name !== recipient)
        : [...current, recipient],
    );
  const saveActivity = (event) => {
    event.preventDefault();
    if (!selectedProgram) return;
    setPrograms((current) =>
      current.map((program) =>
        program.id === selectedProgram.id
          ? {
              ...program,
              received: Math.min(
                program.target,
                Math.max(program.received, checkedRecipients.length),
              ),
              activities: program.activities + 1,
              latest: formatDateForDisplay('2026-08-26'),
            }
          : program,
      ),
    );
    setShowActivityModal(false);
  };
  const backToActivePrograms = async () => {
    const programToRestore = actionProgram || selectedProgram;
    if (!programToRestore) return;
    setActiveActionMenu(null);
    try {
      const response = await apiRestoreProgram(programToRestore.id);
      setPrograms((current) => current.map((program) => program.id === programToRestore.id ? mapApiProgram(response.program) : program));
      setActiveTab('Active');
      navigate('/program');
      notifyAction(`Restored ${programToRestore.name}.`);
    } catch (error) {
      const message = error.message || 'Unable to restore program.';
      notifyAction(message, 'error');
    }
  };
  const endProgram = async () => {
    const programToEnd = actionProgram || selectedProgram;
    if (!programToEnd) return;
    setActiveActionMenu(null);
    try {
      const response = await apiEndProgram(programToEnd.id);
      setPrograms((current) => current.map((program) => program.id === programToEnd.id ? mapApiProgram(response.program) : program));
      setActiveTab('Ended');
      navigate('/program');
      notifyAction(`Ended ${programToEnd.name}.`);
    } catch (error) {
      const message = error.message || 'Unable to end program.';
      notifyAction(message, 'error');
    }
  };
  const saveBeneficiaryScope = (event) => {
    event.preventDefault();
    const selectedScopes = beneficiaryScope === 'School' ? selectedSchools : beneficiaryScope === 'Group' ? selectedGroups : selectedBatches;
    if (!selectedProgram || !selectedScopes.length) {
      setScopeError(`Select at least one ${beneficiaryScope.toLowerCase()} before adding this cluster.`);
      return;
    }
    setScopeError('');
    const scopes = selectedScopes.flatMap((scope) => {
      const name = scope.name || scope.group_name || scope.batch_code;
      const coverage = [{ type: beneficiaryScope, name, beneficiaries: Number(scope.records || scope.members_count || 0) }];
      if (beneficiaryScope !== 'School') return coverage;
      const groups = hierarchy.groups.filter((group) => String(group.community || group.community_name || '').toLowerCase() === String(name || '').toLowerCase());
      const batches = hierarchy.batches.filter((batch) => String(batch.community || '').toLowerCase() === String(name || '').toLowerCase());
      return coverage.concat(
        groups.map((group) => ({ type: 'Group', name: group.name || group.group_name, beneficiaries: Number(group.members || 0) })),
        batches.map((batch) => ({ type: 'Batch', name: batch.name || batch.batch_code, beneficiaries: Number(batch.records || 0) })),
      );
    });
    apiCreateProgramClusters(selectedProgram.id, scopes)
      .then((response) => {
        setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? mapApiProgram(response.program) : program));
        setShowBeneficiaryModal(false);
        setScopeSchoolIds([]);
        setScopeGroupIds([]);
        setScopeBatchIds([]);
        setScopeError('');
        notifyAction('Beneficiary scope saved successfully.');
      })
      .catch((error) => {
        const message = error.message || 'Unable to save beneficiary cluster.';
        notifyAction(message, 'error');
      });
  };
  const completeCluster = (cluster) => {
    const completeRequest = cluster.id
      ? apiCompleteProgramCluster(selectedProgram.id, cluster.id)
      : apiCompleteNamedProgramCluster(selectedProgram.id, cluster);
    completeRequest
      .then((response) => setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? mapApiProgram(response.program) : program)))
      .catch((error) => notifyAction(error.message || 'Unable to mark this cluster as done.', 'error'));
  };
  const openBeneficiaryModal = () => {
    setScopeSchoolIds([]);
    setScopeGroupIds([]);
    setScopeBatchIds([]);
    setScopeError('');
    setShowBeneficiaryModal(true);
  };
  const resetDrill = () => {
    setDrillLevel('school');
    setDrillSchool(null);
    setDrillGroup(null);
    setDrillBatch(null);
  };
  const openSchool = (school) => {
    if (programId && school?.id) {
      navigate(`/program/${programId}/school/${school.id}`);
      return;
    }
    setDrillSchool(school);
    setDrillGroup(null);
    setDrillBatch(null);
    setDrillLevel('group');
  };
  const openGroup = (group) => {
    if (programId && group?.id) {
      navigate(`/program/${programId}/group/${group.id}`);
      return;
    }
    setDrillGroup(group);
    setDrillBatch(null);
    setDrillLevel('batch');
  };
  const openBatch = (batch) => {
    if (programId && batch?.id) {
      navigate(`/program/${programId}/batch/${batch.id}`);
      return;
    }
    setDrillBatch(batch);
    setDrillLevel('beneficiary');
  };
  const editProgram = () => {
    setForm(actionProgram || selectedProgram);
    setShowModal(true);
  };
  const deleteProgram = () => {
    const programToDelete = actionProgram || selectedProgram;
    if (!programToDelete) return;
    setPendingDeleteProgram(programToDelete);
  };

  const confirmDeleteProgram = async () => {
    if (!pendingDeleteProgram) return;
    const programToDelete = pendingDeleteProgram;
    setPendingDeleteProgram(null);
    try {
      await apiDeleteProgram(programToDelete.id);
      setPrograms((current) => current.filter((program) => program.id !== programToDelete.id));
      notifyAction(`Deleted ${programToDelete.name}.`);
      navigate('/program');
    } catch (error) {
      const message = error.message || 'Unable to delete program.';
      notifyAction(message, 'error');
    }
  };
  const renderActionMenu = (menuId, menuProgram = selectedProgram) => menuProgram && (
    <div className="actions-cell" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="btn-actions"
        onClick={(event) => {
          event.stopPropagation();
          setActiveActionMenu((currentMenuId) => currentMenuId === menuId ? null : menuId);
        }}
        aria-label="Program actions menu"
        aria-haspopup="true"
        aria-expanded={activeActionMenu === menuId}
      >
        <MoreVerticalIcon />
      </button>
      {activeActionMenu === menuId && (
        <div className="actions-dropdown" role="menu">
          <button type="button" className="actions-dropdown-item" onClick={() => { setActiveActionMenu(null); navigate(`/program/${menuProgram.id}`); }} role="menuitem">Open</button>
          {(isSuperAdmin || isCommunityOrganizer) && String(menuProgram?.status || '').trim().toLowerCase() !== 'ended' && (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); editProgram(); }} role="menuitem">Edit</button>
          )}
          {canEndPrograms && (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); activeTab === 'Ended' ? backToActivePrograms() : endProgram(); }} role="menuitem">
              {activeTab === 'Ended' ? 'Reactivate' : 'End'}
            </button>
          )}
          {canDeletePrograms && (
            <button type="button" className="actions-dropdown-item delete" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); deleteProgram(); }} role="menuitem">Delete</button>
          )}
        </div>
      )}
    </div>
  );

  const openHierarchyNode = (node, level) => {
    if (!programId || !node) return;
    if (level === 'school') {
      navigate(`/program/${programId}/school/${node.id}`);
      return;
    }
    if (level === 'group') {
      navigate(`/program/${programId}/group/${node.id}`);
      return;
    }
    if (level === 'batch') {
      navigate(`/program/${programId}/batch/${node.id}`);
      return;
    }
    openBeneficiaryReport(node);
  };

  const selectedRouteTreeData = useMemo(() => {
    if (!selectedProgramView) return programHierarchy;
    if (selectedRouteSchool) {
      const routeGroups = hierarchy.groups.filter((group) => {
        const groupCommunity = String(group.community || group.community_name || '').trim();
        return valueMatchesTarget(groupCommunity, selectedRouteSchool.name || '') || valueMatchesTarget(selectedRouteSchool.name || '', groupCommunity);
      });
      return [{
        id: selectedRouteSchool.id,
        name: selectedRouteSchool.name,
        groups: routeGroups.map((group) => {
          const groupName = group.name || group.group_name;
          const routeBatches = hierarchy.batches.filter((batch) => {
            const batchCommunity = String(batch.community || '').trim();
            const batchGroupName = String(batch.group || batch.group_name || '').trim();
            const batchGroupIds = String(batch.groupIds || '').split(',').map((value) => value.trim());
            return valueMatchesTarget(batchCommunity, selectedRouteSchool.name || '')
              && (
                valueMatchesTarget(batchGroupName, groupName || '')
                || batchGroupIds.includes(String(group.id || ''))
                || valueMatchesTarget(String(group.id || ''), String(batch.group_id || ''))
              );
          });
          return {
            id: group.id,
            name: groupName,
            batches: routeBatches.map((batch) => ({
              id: batch.id,
              name: batch.name || batch.batch_code || batch.code,
              beneficiaries: getRouteBeneficiaryRecords(selectedProgramView, {
                schoolName: selectedRouteSchool.name,
                groupName: groupName,
                batchName: batch.name || batch.batch_code || batch.code,
              }),
            })),
          };
        }),
      }];
    }
    if (selectedRouteGroup) {
      const programClusters = selectedProgramView.clusters || [];
      const groupName = String(selectedRouteGroup.name || selectedRouteGroup.group_name || '').trim().toLowerCase();
      const hasGroupScope = programClusters.some((cluster) => cluster.type === 'Group' && String(cluster.name || '').trim().toLowerCase() === groupName);
      const batchScopeNames = new Set(programClusters
        .filter((cluster) => cluster.type === 'Batch')
        .filter((cluster) => {
          const scopedBatchName = String(cluster.name || '').trim().toLowerCase();
          return hierarchy.batches.some((batch) => {
            const batchName = String(batch.name || batch.batch_code || batch.code || '').trim().toLowerCase();
            const batchGroupName = String(batch.group || batch.group_name || '').trim().toLowerCase();
            const batchGroupIds = String(batch.groupIds || '').split(',').map((value) => value.trim());
            const belongsToGroup = valueMatchesTarget(batchGroupName, groupName)
              || batchGroupIds.includes(String(selectedRouteGroup.id || ''))
              || valueMatchesTarget(String(batch.group_id || ''), String(selectedRouteGroup.id || ''));
            return batchName === scopedBatchName && belongsToGroup;
          });
        })
        .map((cluster) => String(cluster.name || '').trim().toLowerCase()));
      const routeBatches = hierarchy.batches.filter((batch) => {
        const batchGroupName = String(batch.group || batch.group_name || '').trim();
        const batchGroupIds = String(batch.groupIds || '').split(',').map((value) => value.trim());
        const belongsToGroup = valueMatchesTarget(batchGroupName, groupName)
          || batchGroupIds.includes(String(selectedRouteGroup.id || ''))
          || valueMatchesTarget(String(batch.group_id || ''), String(selectedRouteGroup.id || ''));
        const batchName = String(batch.name || batch.batch_code || batch.code || '').trim().toLowerCase();
        return belongsToGroup && (batchScopeNames.size ? batchScopeNames.has(batchName) : hasGroupScope);
      });
      return [{
        id: selectedRouteGroup.id,
        name: selectedRouteGroup.name || selectedRouteGroup.group_name,
        groups: [{
          id: selectedRouteGroup.id,
          name: selectedRouteGroup.name || selectedRouteGroup.group_name,
          batches: routeBatches.map((batch) => ({
            id: batch.id,
            name: batch.name || batch.batch_code || batch.code,
            scopeBeneficiaries: Number(programClusters.find((cluster) => cluster.type === 'Batch' && String(cluster.name || '').trim().toLowerCase() === String(batch.name || batch.batch_code || batch.code || '').trim().toLowerCase())?.beneficiaries || 0),
            beneficiaries: getRouteBeneficiaryRecords(selectedProgramView, {
              schoolName: selectedRouteSchool?.name || '',
              groupName: selectedRouteGroup?.name || selectedRouteGroup?.group_name || '',
              batchName: batch.name || batch.batch_code || batch.code,
            }),
          })),
        }],
      }];
    }
    if (selectedRouteBatch) {
      const batchName = selectedRouteBatch.name || selectedRouteBatch.batch_code || selectedRouteBatch.code;
      return [{
        id: selectedRouteBatch.id,
        name: selectedRouteBatch.community || selectedRouteSchool?.name || 'School',
        groups: [{
          id: selectedRouteBatch.id,
          name: selectedRouteBatch.group || selectedRouteBatch.group_name || 'Group',
          batches: [{
            id: selectedRouteBatch.id,
            name: batchName,
            beneficiaries: getRouteBeneficiaryRecords(selectedProgramView, {
              schoolName: selectedRouteSchool?.name || selectedRouteBatch?.community || '',
              groupName: selectedRouteBatch?.group || selectedRouteBatch?.group_name || '',
              batchName,
            }),
          }],
        }],
      }];
    }
    return programHierarchy;
  }, [programHierarchy, selectedProgramView, selectedRouteBatch, selectedRouteGroup, selectedRouteSchool, hierarchy]);

  const selectedRouteExpandedPath = useMemo(() => {
    if (!selectedRouteTreeData?.length) return [];

    const buildPath = (schoolNode, groupNode, batchNode) => {
      const segments = [];

      if (schoolNode) {
        segments.push(`school-${schoolNode.id}`);
      }

      if (groupNode) {
        segments.push(`group-${groupNode.id}`);
      }

      if (batchNode) {
        segments.push(`batch-${batchNode.id}`);
      }

      return segments;
    };

    for (const school of selectedRouteTreeData) {
      if (selectedRouteSchool && String(school.id) !== String(selectedRouteSchool.id)) continue;
      const schoolKey = `school-${school.id}`;
      const schoolPath = [schoolKey];

      for (const group of school.groups || []) {
        if (selectedRouteBatch) {
          const matchingBatch = (group.batches || []).find((batch) => String(batch.id) === String(selectedRouteBatch.id));
          if (matchingBatch) {
            return [...schoolPath, `group-${group.id}`, `batch-${matchingBatch.id}`];
          }
        }

        if (selectedRouteGroup && String(group.id) === String(selectedRouteGroup.id)) {
          const batchMatch = (group.batches || []).find((batch) => String(batch.id) === String(selectedRouteBatch?.id || ''));
          return batchMatch ? [...schoolPath, `group-${group.id}`, `batch-${batchMatch.id}`] : [...schoolPath, `group-${group.id}`];
        }
      }

      if (selectedRouteSchool && !selectedRouteGroup && !selectedRouteBatch) {
        return schoolPath;
      }
    }

    if (selectedRouteBatch && !selectedRouteSchool) {
      const schoolMatch = selectedRouteTreeData.find((school) => (school.groups || []).some((group) => (group.batches || []).some((batch) => String(batch.id) === String(selectedRouteBatch.id))));
      if (schoolMatch) {
        const groupMatch = (schoolMatch.groups || []).find((group) => (group.batches || []).some((batch) => String(batch.id) === String(selectedRouteBatch.id)));
        const batchMatch = (groupMatch?.batches || []).find((batch) => String(batch.id) === String(selectedRouteBatch.id));
        return buildPath(schoolMatch, groupMatch, batchMatch);
      }
    }

    if (selectedRouteGroup && !selectedRouteSchool) {
      const schoolMatch = selectedRouteTreeData.find((school) => (school.groups || []).some((group) => String(group.id) === String(selectedRouteGroup.id)));
      const groupMatch = (schoolMatch?.groups || []).find((group) => String(group.id) === String(selectedRouteGroup.id));
      return buildPath(schoolMatch, groupMatch);
    }

    return [];
  }, [selectedRouteBatch, selectedRouteGroup, selectedRouteSchool, selectedRouteTreeData]);

  return (
    <div className="community-page program-page">
      <PageHeader
        title={viewMode && selectedProgram ? selectedProgram.name : 'Program'}
        breadcrumbs={programBreadcrumbs}
        actions={
          canCreatePrograms && (!viewMode || !isEndedProgram) && <button
              className="view-btn view-btn--primary module-create-button"
              type="button"
              onClick={() =>
                viewMode ? openBeneficiaryModal() : setShowModal(true)
              }
            >
              <PlusIcon />
              <span>{viewMode ? 'Add beneficiary' : 'Create Program'}</span>
            </button>
        }
      />

      {clusterView && selectedProgram && (
        <section className="program-cluster-subheader" aria-label="Program beneficiary clusters">
          <div className="program-cluster-tabs" role="tablist" aria-label="Program cluster levels">
            {[['School', 'Schools', BuildingIcon], ['Group', 'Groups', GroupsIcon], ['Batch', 'Batches', BatchesIcon]].map(([type, label, Icon]) => { const cluster = selectedProgramView.clusters.find((item) => item.type === type); return <button key={type} type="button" role="tab" aria-selected={clusterType === type} className={`program-cluster-tab${clusterType === type ? ' active' : ''}`} onClick={() => cluster && navigate(`/program/${selectedProgram.id}/cluster/${type}/${encodeURIComponent(cluster.name)}`)} disabled={!cluster}><Icon /><span>{label}</span></button>; })}
          </div>
        </section>
      )}

      {!viewMode && (
        <section className="tabs-row program-tabs-row">
          <div
            className="tabs-list"
            role="tablist"
            aria-label="Program sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Active"}
              className={`tab-btn${activeTab === "Active" ? " active" : ""}`}
              onClick={() => setActiveTab("Active")}
            >
              <GroupsIcon />
              <span>Active Programs</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Ended"}
              className={`tab-btn${activeTab === "Ended" ? " active" : ""}`}
              onClick={() => setActiveTab("Ended")}
            >
              <BatchesIcon />
              <span>Ended Programs</span>
            </button>
          </div>
          <div className="program-toolbar-controls">
            <div className="search-container program-search">
              <div className="search-field-container">
                <SearchIcon />
                <input
                  id="program-search"
                  name="programSearch"
                  type="text"
                  className="search-input-field"
                  placeholder="Search programs, partners, or communities..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search programs"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="table-card program-table-card">
        <div className="program-table-heading">
          <div>
            <h2>Program beneficiaries</h2>
          </div>
        </div>
        <div className="table-overflow">
          {viewMode && !clusterView ? (() => {
            if (selectedRouteBatch) {
              const batchBeneficiaries = getProgramBeneficiaryRecords(selectedProgramView).filter((record) =>
                String(record.batch || '').trim().toLowerCase() === String(selectedRouteBatch.name || selectedRouteBatch.batch_code || selectedRouteBatch.code || '').trim().toLowerCase()
              );

              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Beneficiary</th>
                      <th>School</th>
                      <th>Group</th>
                      <th>Receipt history</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchBeneficiaries.length ? batchBeneficiaries.map((record) => (
                      <tr key={`${record.sourceType}-${record.sourceId}`} className="program-clickable-row" onClick={() => openBeneficiaryReport(record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBeneficiaryReport(record); } }} tabIndex={0} role="button">
                        <td><strong>{record.name}</strong></td>
                        <td>{record.school || '—'}</td>
                        <td>{record.group || '—'}</td>
                        <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openBeneficiaryReport(record); }}>View</button></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="no-data">No beneficiaries found for this batch.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            }

            if (selectedRouteGroup) {
              const routeBatches = (selectedRouteTreeData[0]?.groups || []).find((group) => String(group.id) === String(selectedRouteGroup.id))?.batches || [];

              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Members</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeBatches.length ? routeBatches.map((batch) => (
                      <tr key={batch.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/batch/${batch.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/batch/${batch.id}`); } }} tabIndex={0} role="button">
                        <td><strong>{batch.name}</strong></td>
                        <td>{(batch.beneficiaries || []).length || Number(batch.scopeBeneficiaries || 0)}</td>
                        <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: batch.name }, 'batch'); }}>View</button></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="no-data">No batches found for this group.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            }

            if (selectedRouteSchool) {
              const routeGroups = selectedRouteTreeData[0]?.groups || [];

              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Batches</th>
                      <th>Beneficiaries</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeGroups.length ? routeGroups.map((group) => {
                      const batchCount = (group.batches || []).length;
                      const beneficiaryCount = (group.batches || []).reduce((total, batch) => total + ((batch.beneficiaries || []).length || 0), 0);

                      return (
                        <tr key={group.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/group/${group.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/group/${group.id}`); } }} tabIndex={0} role="button">
                          <td><strong>{group.name}</strong></td>
                          <td>{batchCount}</td>
                          <td>{beneficiaryCount}</td>
                          <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); navigate(`/program/${programId}/group/${group.id}`); }}>View</button></td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="4" className="no-data">No groups found for this school.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            }

            return (
              <table className="data-table">
                {directScopeGroups.length ? (
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Batches</th>
                      <th>Beneficiaries</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                ) : directScopeClusters.length ? (
                  <thead>
                    <tr>
                      <th>Cluster</th>
                      <th>Scope</th>
                      <th>Beneficiaries</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                ) : (
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Groups</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {programHierarchy.length ? programHierarchy.map((school) => (
                    <tr key={school.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/school/${school.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/school/${school.id}`); } }} tabIndex={0} role="button">
                      <td><strong>{school.name}</strong></td>
                      <td>{(school.groups || []).length}</td>
                      <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); navigate(`/program/${programId}/school/${school.id}`); }}>View</button></td>
                    </tr>
                  )) : directScopeGroups.length ? directScopeGroups.map((group) => (
                    <tr key={group.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/group/${group.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/group/${group.id}`); } }} tabIndex={0} role="button">
                      <td><strong>{group.name || group.group_name}</strong></td>
                      <td>{group.batchCount}</td>
                      <td>{group.beneficiaryCount}</td>
                      <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: group.name || group.group_name }, 'group'); }}>View</button></td>
                    </tr>
                  )) : directScopeClusters.length ? directScopeClusters.map((cluster) => {
                    const entity = cluster.type === 'Group'
                      ? hierarchy.groups.find((group) => String(group.name || group.group_name).toLowerCase() === String(cluster.name).toLowerCase())
                      : hierarchy.batches.find((batch) => String(batch.name || batch.batch_code || batch.code).toLowerCase() === String(cluster.name).toLowerCase());
                    const scopeRoute = entity?.id
                      ? `/program/${programId}/${cluster.type.toLowerCase()}/${entity.id}`
                      : '';
                    return (
                      <tr key={`${cluster.type}-${cluster.name}`}>
                        <td><strong>{cluster.name}</strong></td>
                        <td>{cluster.type}</td>
                        <td>{Number(cluster.beneficiaries || 0)}</td>
                        <td>{scopeRoute ? <button type="button" className="view-btn view-btn--secondary" onClick={() => navigate(scopeRoute)}>View</button> : '—'}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="3" className="no-data">No schools found for this program.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })() : <table className="data-table">
            {clusterView && selectedCluster ? (
              <>
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Cluster</th>
                    <th>Program status</th>
                    <th>Distribution status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCluster.recipients?.length ? selectedCluster.recipients : beneficiaryNames(selectedCluster.beneficiaries).map((name) => ({ id: name, name }))).map((recipient, index) => (
                    <tr key={recipient.id}>
                      <td>
                        <strong>{recipient.name}</strong>
                        <span className="program-table-meta">
                          Cluster member
                        </span>
                      </td>
                      <td>{selectedCluster.name}</td>
                      <td>
                        <span className="program-status active">Covered</span>
                      </td>
                      <td>
                        <span
                          className={`program-recipient-status ${index < selectedCluster.received ? "received" : "pending"}`}
                        >
                          {index < selectedCluster.received
                            ? "Received"
                            : "Not yet recorded"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length ? (
                    filteredPrograms.map((program) => (
                      <tr key={program.id} className="program-clickable-row" onClick={() => navigate(`/program/${program.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/program/${program.id}`); }} tabIndex="0">
                        <td>
                          <a className="program-row-link" href={`/program/${program.id}`} onClick={(event) => event.stopPropagation()}>
                            <strong>{program.name}</strong>
                          <span className="program-table-meta">
                            {program.community} · {program.batch}
                          </span>
                          </a>
                        </td>
                        <td>{program.type}</td>
                        <td>{program.provider}</td>
                        <td>{renderActionMenu(`main-${program.id}`, program)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="no-data">
                        No programs match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>}
        </div>
      </section>

      <ConfirmActionModal
        show={Boolean(pendingDeleteProgram)}
        title="Delete program?"
        message={pendingDeleteProgram ? `Delete ${pendingDeleteProgram.name}?` : 'Delete this program?'}
        confirmLabel="Delete"
        onConfirm={confirmDeleteProgram}
        onCancel={() => setPendingDeleteProgram(null)}
      />

      {showBeneficiaryModal && selectedProgram && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowBeneficiaryModal(false)}
        >
          <form
            className="modal program-product-modal program-beneficiary-modal"
            onSubmit={saveBeneficiaryScope}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add beneficiary cluster</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowBeneficiaryModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="program-modal-context">
                {selectedProgram.name} · Choose the coverage cluster for this
                program.
              </p>
              <div className="program-scope-options" aria-label="Beneficiary scope options">
                {[
                  { value: 'School', label: 'Whole school / community', detail: 'Cover all eligible beneficiaries in this school or community.' },
                  { value: 'Group', label: 'Group', detail: 'Cover one group within the school or community.' },
                  { value: 'Batch', label: 'Batch', detail: 'Cover one batch within the selected group.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`program-scope-pill${beneficiaryScope === option.value ? ' active' : ''}`}
                    aria-pressed={beneficiaryScope === option.value}
                    onClick={() => {
                      if (beneficiaryScope === option.value) return;
                      setBeneficiaryScope(option.value);
                      setScopeSchoolIds([]);
                      setScopeGroupIds([]);
                      setScopeBatchIds([]);
                      setScopeError('');
                    }}
                  >
                    <span>{option.label}</span>
                    <small>{option.detail}</small>
                  </button>
                ))}
              </div>

              <div className="program-hierarchy-field">
                <span className="program-hierarchy-label">Select {beneficiaryScope === 'School' ? 'schools or communities' : beneficiaryScope === 'Group' ? 'groups' : 'batches'} for this program</span>
                {scopeError && <p className="program-scope-error" role="alert">{scopeError}</p>}
                <div className="program-hierarchy-options program-community-hierarchy" role="group" aria-label="Community hierarchy selector">
                  {communityHierarchyGroups.length ? communityHierarchyGroups.map(({ school, groups, batches }) => {
                    const schoolId = String(school.id || school.school_id || school.community_id);
                    const schoolChecked = scopeSchoolIds.includes(schoolId);
                    const schoolGroups = groups.filter((group) => {
                      const groupName = String(group.name || group.group_name || '').trim().toLowerCase();
                      return groupName;
                    });
                    const schoolBatches = batches.filter((batch) => {
                      const batchName = String(batch.name || batch.batch_code || batch.code || '').trim();
                      return batchName;
                    });

                    return (
                      <div key={school.id} className="program-community-cluster">
                          {beneficiaryScope === 'School' ? (
                            <label className="program-recipient program-recipient--school">
                              <input
                                id={`scope-school-${schoolId}`}
                                name="scopeSchools"
                                type="checkbox"
                                checked={schoolChecked}
                                onChange={() => {
                                  setScopeSchoolIds((current) => current.includes(schoolId) ? current.filter((value) => value !== schoolId) : [...current, schoolId]);
                                  setScopeError('');
                                }}
                              />
                              <span>{school.name}</span>
                            </label>
                          ) : (
                            <div className="program-recipient-heading"><strong>{school.name}</strong></div>
                          )}

                        {(beneficiaryScope !== 'School') && (
                          <div className="program-community-subgroups">
                            {schoolGroups.length ? schoolGroups.map((group) => {
                              const groupId = String(group.id);
                              const groupChecked = scopeGroupIds.includes(groupId);
                              const groupName = String(group.name || group.group_name || '').trim().toLowerCase();
                              const groupBatches = schoolBatches.filter((batch) => {
                                const batchGroupIds = String(batch.groupIds || '').split(',').map((value) => value.trim());
                                const batchGroupNames = String(batch.groupNames || '').split(',').map((value) => value.trim().toLowerCase());
                                return String(batch.group_id || '') === groupId
                                  || batchGroupIds.includes(groupId)
                                  || String(batch.group || batch.group_name || '').trim().toLowerCase() === groupName
                                  || batchGroupNames.includes(groupName);
                              });
                              return (
                                <div key={group.id} className="program-community-subgroup">
                                  {beneficiaryScope === 'Group' ? (
                                    <label className="program-recipient">
                                      <input
                                        id={`scope-group-${group.id}`}
                                        name="scopeGroups"
                                        type="checkbox"
                                        checked={groupChecked}
                                        onChange={() => {
                                          setScopeGroupIds((current) => current.includes(groupId) ? current.filter((value) => value !== groupId) : [...current, groupId]);
                                          setScopeError('');
                                        }}
                                      />
                                      <span>{group.name || group.group_name}</span>
                                    </label>
                                  ) : (
                                    <div className="program-recipient-heading"><strong>{group.name || group.group_name}</strong></div>
                                  )}

                                  {beneficiaryScope === 'Batch' && (
                                    <div className="program-community-batches">
                                      {groupBatches.length ? groupBatches.map((batch) => {
                                        const batchId = String(batch.id);
                                        const batchChecked = scopeBatchIds.includes(batchId);
                                        return (
                                          <label key={batch.id} className="program-recipient program-recipient--batch">
                                            <input
                                              id={`scope-batch-${batch.id}`}
                                              name="scopeBatches"
                                              type="checkbox"
                                              checked={batchChecked}
                                              onChange={() => {
                                                setScopeBatchIds((current) => current.includes(batchId) ? current.filter((value) => value !== batchId) : [...current, batchId]);
                                                setScopeError('');
                                              }}
                                            />
                                            <span>{batch.name || batch.batch_code || batch.code}</span>
                                          </label>
                                        );
                                      }) : <small className="program-hierarchy-empty">No batches in this group.</small>}
                                    </div>
                                  )}
                                </div>
                              );
                            }) : <small className="program-hierarchy-empty">No groups under this school.</small>}
                          </div>
                        )}
                      </div>
                    );
                  }) : <small>No communities available yet.</small>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowBeneficiaryModal(false);
                  setScopeError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add beneficiary cluster
              </button>
            </div>
          </form>
        </div>
      )}
      {monitorConfirmation && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setMonitorConfirmation(null)}>
          <div className="modal program-product-modal" role="dialog" aria-modal="true" aria-labelledby="monitor-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="monitor-confirmation-title">Confirm monitored status</h2>
              <button type="button" className="modal-close" onClick={() => setMonitorConfirmation(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p>
                {monitorConfirmation.monitored ? 'Mark' : 'Clear'} {monitorConfirmation.affectedCount > 1 ? `${monitorConfirmation.affectedCount} beneficiaries` : 'this beneficiary'} {monitorConfirmation.monitored ? 'as monitored' : 'as not monitored'} for {monitorDate}?
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setMonitorConfirmation(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmMonitoringChange}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowModal(false)}
        >
          <form
            className="modal program-product-modal"
            onSubmit={saveProgram}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create program</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label" htmlFor="program-name">
                Program name
                <input
                  id="program-name"
                  className="form-input"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </label>
              <label className="form-label" htmlFor="program-type">
                Program type
                <select
                  id="program-type"
                  className="form-select"
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                >
                  <option>Feeding</option>
                  <option>Milk Subsidy</option>
                  <option>Vitamin / Supplement</option>
                  <option>Third-party Support</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="form-label" htmlFor="program-provider">
                Provider / partner
                <input
                  id="program-provider"
                  className="form-input"
                  value={form.provider}
                  onChange={(event) =>
                    setForm({ ...form, provider: event.target.value })
                  }
                  required
                />
              </label>
              <label className="form-label" htmlFor="program-description">
                Description
                <textarea
                  id="program-description"
                  className="form-input"
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <label className="form-label" htmlFor="program-beneficiary-type">
                Beneficiary type
                <select
                  id="program-beneficiary-type"
                  className="form-select"
                  value={form.beneficiaryType}
                  onChange={(event) =>
                    setForm({ ...form, beneficiaryType: event.target.value })
                  }
                >
                  <option>Mother</option>
                  <option>Child</option>
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create active program
              </button>
            </div>
          </form>
        </div>
      )}
      {showActivityModal && selectedProgram && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowActivityModal(false)}
        >
          <form
            className="modal program-product-modal"
            onSubmit={(event) => {
              event.preventDefault();
              setShowActivityModal(false);
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Record activity</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowActivityModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="program-modal-context">
                {selectedProgram.name} · {selectedProgram.community} ·{" "}
                {selectedProgram.batch}
              </p>
              <label className="form-label" htmlFor="activity-date">
                Activity date
                <input
                  id="activity-date"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{2}/\d{2}/\d{4}"
                  className="form-input"
                  placeholder="DD/MM/YYYY"
                  defaultValue={formatDateForDisplay('2026-08-26')}
                  onChange={(event) => {
                    const iso = normalizeDateValue(event.target.value);
                    if (iso) event.target.value = formatDateForDisplay(iso);
                  }}
                  required
                />
              </label>
              <label className="form-label" htmlFor="activity-support">
                Support given
                <input
                  id="activity-support"
                  className="form-input"
                  defaultValue={selectedProgram.name}
                  required
                />
              </label>
              <div className="program-recipient-list">
                <div className="program-recipient-heading">
                  <strong>Recipients</strong>
                  <span>{checkedRecipients.length} selected</span>
                </div>
                {(selectedProgram.recipients || []).map((recipient) => (
                  <label key={recipient.id || recipient.name || recipient} className="program-recipient">
                    <input
                      type="checkbox"
                      checked={checkedRecipients.includes(recipient.id || recipient.name || recipient)}
                      onChange={() => toggleRecipient(recipient.id || recipient.name || recipient)}
                    />
                    <span>{recipient.name || recipient}</span>
                    <small>
                      {checkedRecipients.includes(recipient)
                        ? "Received"
                        : "Not yet recorded"}
                    </small>
                  </label>
                ))}
              </div>
              <label className="form-label" htmlFor="activity-status">
                Activity status
                <select
                  id="activity-status"
                  className="form-select"
                  value={activityStatus}
                  onChange={(event) => setActivityStatus(event.target.value)}
                >
                  <option>Open</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="form-label" htmlFor="activity-remarks">
                Remarks
                <textarea
                  id="activity-remarks"
                  className="form-input"
                  rows="2"
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowActivityModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save activity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
