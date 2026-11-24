import { formFieldClasses, formLabelClasses } from '../../utils/formFieldClasses';
import React, { useMemo, useRef, useState } from "react";
import { getModalBackdropClasses, getModalSurfaceClasses, modalHeaderSectionClasses, modalCloseClasses, modalBodyClasses, modalFooterClasses } from '../../components/ui/modalClasses';
import { matchesSearch } from "../../utils/search.mjs";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from "../../utils/permissions";
import PageHeader from '../../components/ui/PageHeader';
import {
  BatchesIcon,
  BuildingIcon,
  GroupsIcon,
  MoreVerticalIcon,
  PlusIcon,
} from "../Community/CommunityIcons";
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import TableSearch from '../../components/ui/TableSearch';
import Pagination from '../../components/ui/Pagination';
import FloatingLayer from '../../components/ui/FloatingLayer';
import { apiArchiveProgram, apiCompleteNamedProgramCluster, apiCompleteProgramCluster, apiCreateProgram, apiCreateProgramClusters, apiEndProgram, apiGetProgramArchiveImpact, apiRestoreArchivedProgram, apiRestoreProgram, apiUpdateProgram } from "../../api/programs";
import { notifyAction } from '../../components/ActionFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDateForDisplay, normalizeDateValue } from '../../utils/formatting/dateFormat';
import {
  beneficiaryNames,
  clusterPath,
  emptyProgram,
  filterPrograms,
  filterProgramBeneficiaryRecords,
  getCluster,
  normalizeBeneficiaryType,
} from "./utils/programData.js";
import ProjectActivityCalendar from './components/ProjectActivityCalendar';
import {
  collectDisplayCandidates,
  localDate,
  mapApiProgram,
  matchesSchoolGroupBatch,
  routeMatchesValue,
  valueMatchesTarget,
} from './utils/programPageUtils.mjs';
import useProgramMonitoring from './hooks/useProgramMonitoring';
import AddProgramBeneficiariesModal from './components/AddProgramBeneficiariesModal';
import ProgramFormModal from './components/ProgramFormModal';
import useProgramPageData from './hooks/useProgramPageData';

export default function ProgramPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { programId, clusterType, clusterName, schoolId, groupId, batchId } = useParams();
  const clusterScopeId = new URLSearchParams(location.search).get('scopeId');
  const { currentUser } = useAuth();
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canManagePrograms = isCommunityOrganizer;
  const canCreatePrograms = canManagePrograms;
  const canAssignProgramBeneficiaries = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR]);
  const canDeletePrograms = canManagePrograms;
  const canEndPrograms = canManagePrograms;
  const [activeTab, setActiveTab] = useState(null);
  const [query, setQuery] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listPerPage, setListPerPage] = useState(10);
  const viewMode = Boolean(programId);
  const clusterView = Boolean(clusterType && clusterName);
  const {
    programs,
    setPrograms,
    programCounts,
    setProgramCounts,
    archivedPrograms,
    setArchivedPrograms,
    archivedProgramsLoading,
    beneficiaryRecords,
    hierarchy,
    activityMonth,
    setActivityMonth,
    projectActivities,
    activityLoading,
    activityError,
    activityRetry,
    setActivityRetry,
  } = useProgramPageData({ activeTab, viewMode, isCommunityOrganizer });
  const [showModal, setShowModal] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [form, setForm] = useState(emptyProgram);
  const [activityStatus, setActivityStatus] = useState("Open");
  const [checkedRecipients, setCheckedRecipients] = useState([]);
  const [beneficiaryScope, setBeneficiaryScope] = useState("School");
  const [scopeSchoolIds, setScopeSchoolIds] = useState([]);
  const [scopeGroupIds, setScopeGroupIds] = useState([]);
  const [scopeBatchIds, setScopeBatchIds] = useState([]);
  const [scopeError, setScopeError] = useState('');
  const [actionProgram, setActionProgram] = useState(null);
  const [pendingEndProgram, setPendingEndProgram] = useState(null);
  const [isEndingProgram, setIsEndingProgram] = useState(false);
  const [pendingDeleteProgram, setPendingDeleteProgram] = useState(null);
  const [programArchiveImpact, setProgramArchiveImpact] = useState(null);
  const [programArchiveImpactLoading, setProgramArchiveImpactLoading] = useState(false);
  const [programArchiveImpactError, setProgramArchiveImpactError] = useState('');
  const [pendingRestoreProgram, setPendingRestoreProgram] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [isArchivingProgram, setIsArchivingProgram] = useState(false);
  const [isRestoringArchivedProgram, setIsRestoringArchivedProgram] = useState(false);
  const [receiptHistoryProgram, setReceiptHistoryProgram] = useState(null);
  const [programError, setProgramError] = useState('');
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const activeActionMenuAnchorRef = useRef(null);
  const [drillLevel, setDrillLevel] = useState('school');
  const [drillSchool, setDrillSchool] = useState(null);
  const [drillGroup, setDrillGroup] = useState(null);
  const [drillBatch, setDrillBatch] = useState(null);
  const {
    monitorDate,
    monitorConfirmation,
    setMonitorConfirmation,
    confirmMonitoringChange,
  } = useProgramMonitoring(programId);
  const archiveImpactRequestRef = useRef(0);

  const getProgramBeneficiaryRecords = (program, records = beneficiaryRecords) => {
    const scopedRecords = filterProgramBeneficiaryRecords(program, records || []);
    if (!isHealthWorkerRole(currentUser?.role)) return scopedRecords;
    if (!currentUser?.group_id && !currentUser?.groupId) return [];
    const assignedGroupId = String(currentUser.group_id || currentUser.groupId);
    const assignedGroup = hierarchy.groups.find((group) => String(group.id) === assignedGroupId);
    const assignedGroupName = String(assignedGroup?.name || assignedGroup?.group_name || '').trim().toLowerCase();
    return scopedRecords.filter((record) => (
      String(record.groupId || '') === assignedGroupId
      || (assignedGroupName && String(record.group || '').trim().toLowerCase() === assignedGroupName)
    ));
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

  const openBeneficiaryReport = (beneficiary) => {
    navigate(`/program/${programId}/beneficiaries/${beneficiary.sourceType}/${beneficiary.sourceId}/receipt-history`, {
      state: { beneficiaryName: beneficiary.name, programStatus: selectedProgram?.status, returnTo: `${location.pathname}${location.search}` },
    });
  };

  const collectClusterBeneficiaries = (cluster, level, program = selectedProgram) => {
    const normalizedLevel = String(level || '').toLowerCase();
    const name = String(cluster?.name || cluster?.group_name || cluster?.batch_name || '').trim();
    if (!name || !program) return [];
    const scopedRecords = getProgramBeneficiaryRecords(program);
    return scopedRecords.filter((record) => {
      if (normalizedLevel === 'group') {
        return String(record.group || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'batch') {
        return String(record.batch || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'school') {
        const hasExplicitGroupScope = (program?.clusters || []).some((item) => item?.type === 'Group' && String(item?.name || '').trim());
        const hasExplicitBatchScope = (program?.clusters || []).some((item) => item?.type === 'Batch' && String(item?.name || '').trim());
        if (hasExplicitGroupScope && String(record.group || '').trim()) {
          return String(record.school || '').trim().toLowerCase() === name.toLowerCase()
            && (program?.clusters || []).some((item) => item.type === 'Group' && String(item.name || '').trim().toLowerCase() === String(record.group || '').trim().toLowerCase());
        }
        if (hasExplicitBatchScope && String(record.batch || '').trim()) {
          return String(record.school || '').trim().toLowerCase() === name.toLowerCase()
            && (program?.clusters || []).some((item) => item.type === 'Batch' && String(item.name || '').trim().toLowerCase() === String(record.batch || '').trim().toLowerCase());
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
    const scopeId = cluster?.scopeId || cluster?.id;
    const beneficiaries = collectClusterBeneficiaries(cluster, clusterType);
    const scopeQuery = scopeId ? `?scopeId=${encodeURIComponent(scopeId)}` : '';
    navigate(`/program/${programId}/cluster/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}/receipt-history${scopeQuery}`, {
      state: { clusterName, clusterType, scopeId, beneficiaries, programStatus: selectedProgram?.status, returnTo: `${location.pathname}${location.search}` },
    });
  };

  const openProgramClusterHistory = (program, cluster) => {
    if (!program || !cluster?.name) return;
    const clusterType = String(cluster.type || '').toLowerCase();
    const clusterName = String(cluster.name).trim();
    const beneficiaries = collectClusterBeneficiaries(cluster, clusterType, program)
      .map((record) => ({ id: record.sourceId, type: record.sourceType, name: record.name }));
    setReceiptHistoryProgram(null);
    const scopeQuery = cluster.scopeId ? `?scopeId=${encodeURIComponent(cluster.scopeId)}` : '';
    navigate(`/program/${program.id}/cluster/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}/receipt-history${scopeQuery}`, {
      state: { clusterName, clusterType, scopeId: cluster.scopeId, beneficiaries, programStatus: program.status, returnTo: `${location.pathname}${location.search}` },
    });
  };

  const getProgramReceiptClusters = (program) => {
    const clusters = [...(program?.clusters || [])];
    const scopedRecords = getProgramBeneficiaryRecords(program);
    const addDerivedCluster = (type, name, records) => {
      if (!name || !records.length || clusters.some((cluster) => (
        cluster.type === type && String(cluster.name).trim().toLowerCase() === String(name).trim().toLowerCase()
      ))) return;
      clusters.push({ type, name, beneficiaries: records.length, derived: true });
    };

    clusters.filter((cluster) => cluster.type === 'School').forEach((schoolCluster) => {
      const schoolName = String(schoolCluster.name || '').trim().toLowerCase();
      const normalizedSchoolName = schoolName.replace(/ School$/i, '').trim();
      const schoolRecords = scopedRecords.filter((record) => {
        const recordSchool = String(record.school || '').trim().toLowerCase();
        return recordSchool === schoolName || recordSchool === normalizedSchoolName;
      });
      const groupNames = new Set(schoolRecords.map((record) => String(record.group || '').trim()).filter(Boolean));
      const batchNames = new Set(schoolRecords.map((record) => String(record.batch || '').trim()).filter(Boolean));
      groupNames.forEach((groupName) => {
        const records = schoolRecords.filter((record) => String(record.group || '').trim().toLowerCase() === groupName.toLowerCase());
        addDerivedCluster('Group', groupName, records);
      });
      batchNames.forEach((batchName) => {
        const records = schoolRecords.filter((record) => String(record.batch || '').trim().toLowerCase() === batchName.toLowerCase());
        addDerivedCluster('Batch', batchName, records);
      });
    });
    if (isHealthWorkerRole(currentUser?.role)) {
      const assignedGroupId = String(currentUser.group_id || currentUser.groupId || '');
      const assignedGroup = hierarchy.groups.find((group) => String(group.id) === assignedGroupId);
      const assignedGroupName = String(assignedGroup?.name || assignedGroup?.group_name || '').trim().toLowerCase();
      const eligibleBatchNames = new Set(scopedRecords.map((record) => String(record.batch || '').trim().toLowerCase()).filter(Boolean));
      return clusters.filter((cluster) => (
        (cluster.type === 'Group' && String(cluster.name || '').trim().toLowerCase() === assignedGroupName)
        || (cluster.type === 'Batch' && eligibleBatchNames.has(String(cluster.name || '').trim().toLowerCase()))
      ));
    }
    return clusters;
  };

  const filteredPrograms = useMemo(() => {
    if (activeTab === 'Archived') {
      return (archivedPrograms || []).filter((program) => matchesSearch(query, [
        program.name, program.type, program.provider, program.community, program.batch,
        program.description, program.beneficiaryType, program.status,
      ]));
    }
    return filterPrograms(programs, query, activeTab || 'All');
  }, [archivedPrograms, programs, query, activeTab]);
  const listPageCount = Math.max(1, Math.ceil(filteredPrograms.length / listPerPage));
  const currentListPage = Math.min(listPage, listPageCount);
  const currentListStart = (currentListPage - 1) * listPerPage;
  const currentPagePrograms = filteredPrograms.slice(currentListStart, currentListStart + listPerPage);

  const persistProgram = async () => {
    if (form.id && String(form.status || '').trim().toLowerCase() === 'ended') return;
    if (!form.name.trim() || !form.provider.trim()) return;
    try {
      const response = form.id
        ? await apiUpdateProgram(form.id, form)
        : await apiCreateProgram(form);
      setPrograms((current) => form.id
        ? current.map((program) => program.id === form.id ? mapApiProgram(response.program) : program)
        : [...current, mapApiProgram(response.program)]);
      if (!form.id) {
        setProgramCounts((current) => ({
          ...current,
          total: current.total + 1,
          active: current.active + 1,
        }));
      }
      setForm(emptyProgram);
      setShowModal(false);
      setShowSaveConfirmation(false);
      notifyAction(`${form.id ? 'Updated' : 'Created'} project successfully.`);
    } catch (error) {
      const message = error.message || 'Unable to save project.';
      notifyAction(message, 'error');
    }
  };
  const saveProgram = (event) => {
    event.preventDefault();
    if (form.id) {
      setShowSaveConfirmation(true);
      return;
    }
    persistProgram();
  };

  const selectedProgram = programId
    ? programs.find((program) => program.id === Number(programId))
    : programs.find((program) => program.id === Number(form.id)) || filteredPrograms[0];
  const selectedRouteSchool = useMemo(() => hierarchy.schools.find((school) => routeMatchesValue(school, schoolId, ['schoolId', 'communityId', 'school_code', 'code'])), [hierarchy.schools, schoolId]);
  const selectedRouteGroup = useMemo(() => hierarchy.groups.find((group) => routeMatchesValue(group, groupId, ['groupId', 'group_code', 'code'])), [hierarchy.groups, groupId]);
  const selectedRouteBatch = useMemo(() => hierarchy.batches.find((batch) => routeMatchesValue(batch, batchId, ['batchId', 'batch_code', 'code', 'name'])), [hierarchy.batches, batchId]);
  const selectedRouteBatchGroup = selectedRouteBatch ? hierarchy.groups.find((group) => (
    String(selectedRouteBatch.group_id || '') === String(group.id || '')
    || String(selectedRouteBatch.groupIds || '').split(',').map((value) => value.trim()).includes(String(group.id || ''))
    || String(selectedRouteBatch.group || selectedRouteBatch.group_name || '').trim().toLowerCase() === String(group.name || group.group_name || '').trim().toLowerCase()
  )) : null;
  const programBreadcrumbs = viewMode ? [{ label: 'Projects', to: '/program' }] : [];
  if (viewMode && selectedProgram) {
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
    const addCluster = (type, name, scopeId, beneficiaries) => {
      if (!name || clusters.some((cluster) => (
        cluster.type === type
        && (scopeId
          ? String(cluster.scopeId ?? cluster.scope_id ?? '') === String(scopeId)
            || (!(cluster.scopeId ?? cluster.scope_id) && cluster.name.toLowerCase() === name.toLowerCase())
          : !cluster.scopeId && !cluster.scope_id && cluster.name.toLowerCase() === name.toLowerCase())
      ))) return;
      clusters.push({ type, name, scopeId, beneficiaries: Number(beneficiaries || 0), received: 0, derived: true });
    };
    clusters.filter((cluster) => cluster.type === 'School').forEach((schoolCluster) => {
      const schoolName = schoolCluster.name.replace(/ School$/i, '');
      const school = hierarchy.schools.find((item) => (
        schoolCluster.scopeId && String(item.id || item.school_id || item.community_id) === String(schoolCluster.scopeId)
      )) || hierarchy.schools.find((item) => String(item.name || '').toLowerCase() === schoolCluster.name.toLowerCase() || String(item.name || '').toLowerCase() === schoolName.toLowerCase());
      if (!school) return;
      const schoolGroups = hierarchy.groups.filter((group) => (
        String(group.community_id || group.communityId || '') === String(school.id || school.school_id || school.community_id)
      ));
      schoolGroups.forEach((group) => addCluster('Group', group.name || group.group_name, group.id, group.members));
      hierarchy.batches.filter((batch) => (
        String(batch.community_id || batch.communityId || '') === String(school.id || school.school_id || school.community_id)
      )).forEach((batch) => addCluster('Batch', batch.name || batch.batch_code, batch.id, batch.records));
    });
    return clusters;
  }, [hierarchy, selectedProgram]);
  const selectedProgramView = selectedProgram ? { ...selectedProgram, clusters: expandedClusters } : selectedProgram;
  const selectedCluster = getCluster(selectedProgramView, clusterType, clusterName, clusterScopeId);
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
  const assignedGroupId = String(currentUser?.group_id ?? currentUser?.groupId ?? '');
  const assignedGroupCoverageRows = isHealthWorkerRole(currentUser?.role)
    ? directScopeGroups.filter((group) => String(group.id) === assignedGroupId)
    : [];
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
  const selectedScopeRows = beneficiaryScope === 'School' ? selectedSchools : beneficiaryScope === 'Group' ? selectedGroups : selectedBatches;
  const selectedScopeNames = selectedScopeRows.map((scope) => String(scope.name || scope.group_name || scope.batch_code || scope.code || '').trim().toLowerCase()).filter(Boolean);
  const previewProgram = selectedProgram && selectedScopeRows.length
    ? {
      ...selectedProgram,
      clusters: selectedScopeRows.map((scope) => ({
        type: beneficiaryScope,
        name: scope.name || scope.group_name || scope.batch_code || scope.code,
      })),
    }
    : null;
  const previewRecipients = previewProgram ? getProgramBeneficiaryRecords(previewProgram) : [];
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
              latest: formatDateForDisplay(localDate()),
            }
          : program,
      ),
    );
    setShowActivityModal(false);
  };
  const backToActivePrograms = async (program = actionProgram || selectedProgram) => {
    const programToRestore = program;
    if (!programToRestore) return;
    setActiveActionMenu(null);
    try {
      const response = await apiRestoreProgram(programToRestore.id);
      setPrograms((current) => current.map((program) => program.id === programToRestore.id ? mapApiProgram(response.program) : program));
      setProgramCounts((current) => ({
        ...current,
        active: current.active + 1,
        ended: Math.max(0, current.ended - 1),
      }));
      setActiveTab('Active');
      navigate('/program');
      notifyAction(`Restored ${programToRestore.name}.`);
    } catch (error) {
      const message = error.message || 'Unable to restore program.';
      notifyAction(message, 'error');
    }
  };
  const endProgram = async (program = actionProgram || selectedProgram) => {
    const programToEnd = program;
    if (!programToEnd) return;
    setActiveActionMenu(null);
    setIsEndingProgram(true);
    try {
      const response = await apiEndProgram(programToEnd.id);
      setPrograms((current) => current.map((program) => program.id === programToEnd.id ? mapApiProgram(response.program) : program));
      setProgramCounts((current) => ({
        ...current,
        active: Math.max(0, current.active - 1),
        ended: current.ended + 1,
      }));
      setActiveTab('Ended');
      navigate('/program');
      notifyAction(`Marked ${programToEnd.name} as successfully completed.`);
    } catch (error) {
      const message = error.message || 'Unable to end program.';
      notifyAction(message, 'error');
    } finally {
      setIsEndingProgram(false);
    }
  };
  const confirmEndProgram = async () => {
    if (!pendingEndProgram) return;
    await endProgram(pendingEndProgram);
    setPendingEndProgram(null);
  };
  const saveBeneficiaryScope = async (event) => {
    event.preventDefault();
    if (isEndedProgram) {
      notifyAction('This project has ended and is read-only.', 'error');
      setShowBeneficiaryModal(false);
      return;
    }
    const selectedScopes = beneficiaryScope === 'School' ? selectedSchools : beneficiaryScope === 'Group' ? selectedGroups : selectedBatches;
    if (!selectedProgram || !selectedScopes.length) {
      setScopeError(`Select at least one ${beneficiaryScope.toLowerCase()} before adding this cluster.`);
      return;
    }
    setScopeError('');
    const scopes = selectedScopes.map((scope) => {
      const name = scope.name || scope.group_name || scope.batch_code || scope.code;
      return {
        type: beneficiaryScope,
        name,
        scopeId: scope.id || scope.school_id || scope.community_id,
        beneficiaries: Number(scope.records || scope.members_count || 0),
      };
    });
    try {
      const response = await apiCreateProgramClusters(selectedProgram.id, scopes);
      setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? mapApiProgram(response.program) : program));
      setShowBeneficiaryModal(false);
      setScopeSchoolIds([]);
      setScopeGroupIds([]);
      setScopeBatchIds([]);
      setScopeError('');
      notifyAction('Beneficiary scope saved successfully.');
    } catch (error) {
      const message = error.message || 'Unable to save beneficiary scope.';
      notifyAction(message, 'error');
    }
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
    if (isEndedProgram) return;
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
  const editProgram = (program = actionProgram || selectedProgram) => {
    if (!program) return;
    setForm({ ...emptyProgram, ...program });
    setShowModal(true);
  };
  const deleteProgram = (program = actionProgram || selectedProgram) => {
    const programToDelete = program;
    if (!programToDelete) return;
    setPendingDeleteProgram(programToDelete);
    setArchiveReason('');
    setProgramArchiveImpact(null);
    setProgramArchiveImpactError('');
    loadProgramArchiveImpact(programToDelete);
  };

  const loadProgramArchiveImpact = async (program) => {
    const requestId = archiveImpactRequestRef.current + 1;
    archiveImpactRequestRef.current = requestId;
    setProgramArchiveImpactLoading(true);
    setProgramArchiveImpactError('');
    try {
      const response = await apiGetProgramArchiveImpact(program.id);
      if (archiveImpactRequestRef.current === requestId) setProgramArchiveImpact(response);
    } catch (error) {
      if (archiveImpactRequestRef.current === requestId) {
        setProgramArchiveImpactError(error.message || 'Unable to retrieve related program records.');
      }
    } finally {
      if (archiveImpactRequestRef.current === requestId) setProgramArchiveImpactLoading(false);
    }
  };

  const confirmDeleteProgram = async () => {
    if (!pendingDeleteProgram || isArchivingProgram || programArchiveImpactLoading || programArchiveImpactError || !programArchiveImpact) return;
    const programToDelete = pendingDeleteProgram;
    setIsArchivingProgram(true);
    try {
      await apiArchiveProgram(programToDelete.id, archiveReason);
      setPrograms((current) => current.filter((program) => program.id !== programToDelete.id));
      setProgramCounts((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        ended: Math.max(0, current.ended - 1),
        archived: current.archived + 1,
      }));
      setPendingDeleteProgram(null);
      notifyAction(`Archived ${programToDelete.name}. Historical monitoring and distribution records were retained.`);
      navigate('/program');
    } catch (error) {
      const message = error.message || 'Unable to archive project.';
      notifyAction(message, 'error');
    } finally {
      setIsArchivingProgram(false);
    }
  };
  const restoreArchivedProgram = (program) => setPendingRestoreProgram(program);
  const confirmRestoreArchivedProgram = async () => {
    if (!pendingRestoreProgram || isRestoringArchivedProgram) return;
    const program = pendingRestoreProgram;
    setIsRestoringArchivedProgram(true);
    try {
      const response = await apiRestoreArchivedProgram(program.id);
      setArchivedPrograms((current) => (current || []).filter((item) => item.id !== program.id));
      setPrograms((current) => [...current, mapApiProgram(response.program)]);
      setProgramCounts((current) => ({
        ...current,
        total: current.total + 1,
        ended: current.ended + 1,
        archived: Math.max(0, current.archived - 1),
      }));
      setPendingRestoreProgram(null);
      notifyAction(`Restored ${program.name} from archive. It remains ended.`);
    } catch (error) {
      notifyAction(error?.message || 'Unable to restore program.', 'error');
    } finally {
      setIsRestoringArchivedProgram(false);
    }
  };
  const renderActionMenu = (menuId, menuProgram = selectedProgram, { includeReceiptHistory = true, activityMenu = false } = {}) => menuProgram && (
    <div className="actions-cell" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="btn-actions program-more-button"
        onClick={(event) => {
          event.stopPropagation();
          if (activeActionMenu === menuId) {
            setActiveActionMenu(null);
            return;
          }

          activeActionMenuAnchorRef.current = event.currentTarget;
          setActiveActionMenu(menuId);
        }}
        ref={activeActionMenu === menuId ? activeActionMenuAnchorRef : undefined}
        aria-label="Project actions menu"
        aria-haspopup="true"
        aria-expanded={activeActionMenu === menuId}
      >
        <MoreVerticalIcon />
      </button>
      {activeActionMenu === menuId && (
        <FloatingLayer
          open
          anchorRef={activeActionMenuAnchorRef}
          onDismiss={() => setActiveActionMenu(null)}
          className="actions-dropdown actions-dropdown-portal community-actions-dropdown"
          role="menu"
        >
          {includeReceiptHistory && (isCommunityOrganizer || isHealthWorkerRole(currentUser?.role)) && (menuProgram.clusters || []).length > 0 && (
            <button
              type="button"
              className="actions-dropdown-item"
              onClick={() => { setReceiptHistoryProgram(menuProgram); setActiveActionMenu(null); }}
              role="menuitem"
            >
              {isHealthWorkerRole(currentUser?.role) ? 'Receipt history' : 'View'}
            </button>
          )}
          {activeTab === 'Archived' ? (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActiveActionMenu(null); restoreArchivedProgram(menuProgram); }} role="menuitem">Restore from archive</button>
          ) : isCommunityOrganizer
            && menuProgram.clusters?.length > 0
            && String(menuProgram?.status || '').trim().toLowerCase() !== 'ended' && (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); editProgram(menuProgram); }} role="menuitem">Edit</button>
          )}
          {activeTab !== 'Archived' && canEndPrograms && (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); (activityMenu ? String(menuProgram?.status || '').trim().toLowerCase() === 'ended' : activeTab === 'Ended') ? backToActivePrograms(menuProgram) : setPendingEndProgram(menuProgram); }} role="menuitem">
              {(activityMenu ? String(menuProgram?.status || '').trim().toLowerCase() === 'ended' : activeTab === 'Ended') ? 'Reactivate' : 'Mark completed'}
            </button>
          )}
          {activeTab !== 'Archived' && canDeletePrograms && String(menuProgram?.status || '').trim().toLowerCase() === 'ended' && (
            <button type="button" className="actions-dropdown-item" onClick={() => { setActionProgram(menuProgram); setActiveActionMenu(null); deleteProgram(menuProgram); }} role="menuitem">Archive</button>
          )}
        </FloatingLayer>
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
  const receiptHistoryClusters = receiptHistoryProgram ? getProgramReceiptClusters(receiptHistoryProgram) : [];
  const selectedProgramReceiptClusters = selectedProgram ? getProgramReceiptClusters(selectedProgram) : [];

  return (
    <div className="community-page program-page">
      <PageHeader
        title="Projects"
        breadcrumbs={programBreadcrumbs}
        actions={!viewMode && (
          <div className="program-page-header-actions">
            {canCreatePrograms && (
              <button
                className="view-btn view-btn--primary module-create-button"
                type="button"
                data-guide="projects-create"
                onClick={() => {
                  setForm(emptyProgram);
                  setShowModal(true);
                }}
              >
                <PlusIcon />
                <span>Create Project</span>
              </button>
            )}
          </div>
        )}
      />

      {viewMode && selectedProgram && (
        <>
          <section className="program-detail-titlebar" aria-labelledby="program-name-title">
            <h2 id="program-name-title">{selectedProgram.name}</h2>
            <div className="program-page-header-actions">
              {canAssignProgramBeneficiaries && !isEndedProgram && (
                <button
                  className="view-btn view-btn--primary module-create-button"
                  type="button"
                  onClick={openBeneficiaryModal}
                >
                  <PlusIcon />
                  <span>Add beneficiary</span>
                </button>
              )}
              <button
                type="button"
                className="view-btn view-btn--secondary program-receipt-history-header-button"
                onClick={() => setReceiptHistoryProgram(selectedProgram)}
              >
                View receipt history
              </button>
              <button
                type="button"
                className="view-btn view-btn--secondary"
                onClick={() => navigate('/program')}
              >
                Back
              </button>
            </div>
          </section>
          <section className="program-detail-panel" aria-label="Project coverage summary">
            <div className="program-detail-stats">
              <div>
                <strong>{getProgramBeneficiaryCount(selectedProgram).toLocaleString()}</strong>
                <span>Eligible recipients</span>
              </div>
              {['School', 'Group', 'Batch']
                .filter((type) => type !== 'School' || !isHealthWorkerRole(currentUser?.role))
                .map((type) => (
                <div key={type}>
                  <strong>{selectedProgramReceiptClusters.filter((cluster) => cluster.type === type).length.toLocaleString()}</strong>
                  <span>{({ School: 'Schools', Group: 'Groups', Batch: 'Batches' })[type]} covered</span>
                </div>
                ))}
            </div>
          </section>
        </>
      )}

      {clusterView && selectedProgram && (
        <section className="program-cluster-subheader" aria-label="Program beneficiary clusters">
          <div className="program-cluster-tabs" role="tablist" aria-label="Program cluster levels">
            {[['School', 'Schools', BuildingIcon], ['Group', 'Groups', GroupsIcon], ['Batch', 'Batches', BatchesIcon]].map(([type, label, Icon]) => { const cluster = selectedProgramView.clusters.find((item) => item.type === type); return <button key={type} type="button" role="tab" aria-selected={clusterType === type} className={`program-cluster-tab${clusterType === type ? ' active' : ''}`} onClick={() => cluster && navigate(clusterPath(selectedProgram.id, cluster))} disabled={!cluster}><Icon /><span>{label}</span></button>; })}
          </div>
        </section>
      )}

      {!viewMode && (
        <ModuleSummaryCards
          selected={activeTab}
          toggleOnSelect
          onSelect={(tab) => {
            setActiveTab(tab);
            setListPage(1);
          }}
          cards={[
            { key: 'All', label: 'Total Projects', value: programCounts.total, description: 'Show projects', selectedDescription: 'Hide projects' },
            { key: 'Active', label: 'Active Projects', value: programCounts.active, description: 'Show projects', selectedDescription: 'Hide projects' },
            { key: 'Ended', label: 'Completed Projects', value: programCounts.ended, description: 'Show projects', selectedDescription: 'Hide projects' },
            ...(isCommunityOrganizer ? [{ key: 'Archived', label: 'Archived Projects', value: programCounts.archived, description: 'Show projects', selectedDescription: 'Hide projects' }] : []),
          ]}
        />
      )}

      {!viewMode && !activeTab && (
        <ProjectActivityCalendar
          month={activityMonth}
          activities={projectActivities}
          loading={activityLoading}
          error={activityError}
          onRetry={() => setActivityRetry((current) => current + 1)}
          onMonthChange={setActivityMonth}
          canManageProjects={canManagePrograms}
          onProjectOpen={(project) => navigate(`/program/${project.id}`)}
          renderProjectActions={(project) => {
            const program = programs.find((item) => String(item.id) === String(project.id));
            return program
              ? renderActionMenu(`activity-${project.id}`, program, { includeReceiptHistory: false, activityMenu: true })
              : null;
          }}
        />
      )}

      <section className="table-card program-table-card" data-guide="projects-overview" hidden={!viewMode && !activeTab}>
        <div className="program-table-heading">
          <div>
            <h2>{viewMode ? 'Project coverage' : 'Projects'}</h2>
          </div>
          {!viewMode && (
            <TableSearch
              value={query}
              onChange={(value) => {
                setQuery(value);
                setListPage(1);
              }}
              placeholder="Search projects, partners, or communities"
            />
          )}
        </div>
        <div className="table-overflow" role="region" aria-label="Scrollable table" tabIndex={0}>
          {!viewMode && activeTab === 'Archived' && archivedProgramsLoading ? (
            <p className="archive-records-state" role="status">Loading archived programs…</p>
          ) : viewMode && !clusterView ? (() => {
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeBatches.length ? routeBatches.map((batch) => (
                      <tr key={batch.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/batch/${batch.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/batch/${batch.id}`); } }} tabIndex={0} role="button">
                        <td><strong>{batch.name}</strong></td>
                        <td>{(batch.beneficiaries || []).length || Number(batch.scopeBeneficiaries || 0)}</td>
                        <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: batch.name, id: batch.id }, 'batch'); }}>Check-in</button></td>
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
                      <th>Actions</th>
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
                          <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: group.name || group.group_name, id: group.id }, 'group'); }}>Check-in</button></td>
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
                        {isHealthWorkerRole(currentUser?.role) ? (
                  <thead>
                            <tr>
                              <th>Group</th>
                              <th>Batches</th>
                              <th>Beneficiaries</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                        ) : programHierarchy.length ? (
                          <thead>
                    <tr>
                      <th>School</th>
                      <th>Groups</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                ) : directScopeGroups.length ? (
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
                  {isHealthWorkerRole(currentUser?.role) ? assignedGroupCoverageRows.length ? assignedGroupCoverageRows.map((group) => (
                    <tr key={group.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/group/${group.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/group/${group.id}`); } }} tabIndex={0} role="button">
                      <td><strong>{group.name || group.group_name}</strong></td>
                      <td>{group.batchCount}</td>
                      <td>{group.beneficiaryCount}</td>
                      <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: group.name || group.group_name, id: group.id }, 'group'); }}>Check-in</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="no-data">No assigned group found for this project.</td>
                    </tr>
                  ) : programHierarchy.length ? programHierarchy.map((school) => (
                    <tr key={school.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/school/${school.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/school/${school.id}`); } }} tabIndex={0} role="button">
                      <td><strong>{school.name}</strong></td>
                      <td>{(school.groups || []).length}</td>
                      <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: school.name, id: school.id }, 'school'); }}>Check-in</button></td>
                    </tr>
                  )) : directScopeGroups.length ? directScopeGroups.map((group) => (
                    <tr key={group.id} className="program-clickable-row" onClick={() => navigate(`/program/${programId}/group/${group.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/program/${programId}/group/${group.id}`); } }} tabIndex={0} role="button">
                      <td><strong>{group.name || group.group_name}</strong></td>
                      <td>{group.batchCount}</td>
                      <td>{group.beneficiaryCount}</td>
                      <td><button type="button" className="view-btn view-btn--secondary" onClick={(event) => { event.stopPropagation(); openClusterHistory({ name: group.name || group.group_name, id: group.id }, 'group'); }}>Check-in</button></td>
                    </tr>
                  )) : directScopeClusters.length ? directScopeClusters.map((cluster) => {
                    return (
                      <tr key={`${cluster.type}-${cluster.name}`}>
                        <td><strong>{cluster.name}</strong></td>
                        <td>{cluster.type}</td>
                        <td>{Number(cluster.beneficiaries || 0)}</td>
                        <td><button type="button" className="view-btn view-btn--secondary" onClick={() => openClusterHistory({ name: cluster.name, scopeId: cluster.scopeId }, cluster.type)}>Check-in</button></td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="3" className="no-data">No schools found for this project.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })(                    ) : <table className={`data-table ${!clusterView && !viewMode ? 'program-list-table' : ''}`}>
            {!clusterView && !viewMode && (
              <colgroup>
                <col className="program-list-column-name" />
                <col className="program-list-column-coverage" />
                <col className="program-list-column-recipients" />
                <col className="program-list-column-status" />
                <col className="program-list-column-actions" />
              </colgroup>
            )}
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
                    <th>Project</th>
                    <th>Coverage</th>
                    <th>Eligible beneficiaries</th>
                    <th>Status</th>
                    <th>Project actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length ? (
                    currentPagePrograms.map((program) => (
                      <tr key={program.id} className="program-clickable-row" onClick={() => navigate(`/program/${program.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/program/${program.id}`); }} tabIndex="0">
                        <td>
                          <a className="program-row-link" href={`/program/${program.id}`} onClick={(event) => event.stopPropagation()}>
                            <strong>{program.name}</strong>
                            <span
                              className="program-table-meta program-list-meta"
                              title={[program.type, program.provider].filter(Boolean).join(' · ')}
                            >
                              {[program.type, program.provider].filter(Boolean).join(' · ')}
                            </span>
                            {activeTab === 'Archived' && (
                              <span className="program-table-meta program-list-meta">
                                Archived {program.archived_at ? new Date(program.archived_at).toLocaleString() : 'date unavailable'}
                                {program.archived_by ? ` by ${program.archived_by}` : ''}
                                {program.archive_reason ? ` · ${program.archive_reason}` : ''}
                              </span>
                            )}
                          </a>
                        </td>
                        <td>
                          {(program.clusters || []).length ? (
                            <>
                              <strong>{(program.clusters || []).length} coverage area{program.clusters.length === 1 ? '' : 's'}</strong>
                              <span
                                className="program-table-meta program-list-meta"
                                title={[...new Set((program.clusters || []).map((cluster) => cluster.name).filter(Boolean))].join(', ')}
                              >
                                {[...new Set((program.clusters || []).map((cluster) => cluster.name).filter(Boolean))].slice(0, 2).join(', ')}
                                {program.clusters.length > 2 ? ` +${program.clusters.length - 2}` : ''}
                              </span>
                            </>
                          ) : <span className="program-table-meta">No coverage assigned</span>}
                        </td>
                        <td>
                          <strong>{getProgramBeneficiaryCount(program).toLocaleString()}</strong>
                        </td>
                        <td>
                          <span className={`program-status ${String(program.status || '').toLowerCase() === 'ended' ? 'ended' : 'active'}`}>
                            {String(program.status || '').toLowerCase() === 'ended' ? 'Completed' : program.status || 'Active'}
                          </span>
                        </td>
                        <td>{renderActionMenu(`main-${program.id}`, program)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        No projects match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>}
        </div>
      </section>
      {!viewMode && activeTab && (activeTab !== 'Archived' || !archivedProgramsLoading) && (
        <Pagination
          currentPage={currentListPage}
          pageCount={listPageCount}
          onPageChange={setListPage}
          perPage={listPerPage}
          onPerPageChange={(value) => { setListPerPage(Number(value)); setListPage(1); }}
          rangeStart={filteredPrograms.length ? currentListStart + 1 : 0}
          rangeEnd={Math.min(currentListStart + listPerPage, filteredPrograms.length)}
          totalItems={filteredPrograms.length}
          itemLabel="projects"
          ariaLabel="Projects pagination"
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteProgram)}
        title="Archive completed project?"
        description={pendingDeleteProgram ? `Archive ${pendingDeleteProgram.name}? It will be removed from regular project lists, but the project and its monitoring, distribution, and receipt history will remain recoverable in Archived Projects. This does not permanently delete the project.` : ''}
        variant="default"
        confirmLabel="Archive"
        loading={isArchivingProgram}
        loadingLabel="Archiving..."
        confirmDisabled={programArchiveImpactLoading || Boolean(programArchiveImpactError) || !programArchiveImpact}
        summary={programArchiveImpact?.related?.map(({ label, count }) => ({ label, value: count })) || []}
        error={programArchiveImpactError}
        onConfirm={confirmDeleteProgram}
        onCancel={() => {
          archiveImpactRequestRef.current += 1;
          setPendingDeleteProgram(null);
          setProgramArchiveImpactLoading(false);
        }}
      >
        {programArchiveImpactLoading && <p role="status">Checking related records...</p>}
        {programArchiveImpactError && (
          <button type="button" className="btn btn-secondary" onClick={() => loadProgramArchiveImpact(pendingDeleteProgram)}>
            Retry related-record check
          </button>
        )}
        <label className="archive-reason-field">
          <span>Reason (optional)</span>
          <textarea
            value={archiveReason}
            maxLength={500}
            rows={3}
            placeholder="Add a note about why this program is being archived"
            onChange={(event) => setArchiveReason(event.target.value)}
          />
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(pendingRestoreProgram)}
        title="Restore archived project?"
        description={pendingRestoreProgram ? `Restore ${pendingRestoreProgram.name}? Its status will remain completed, and it will return to the Completed Projects list.` : ''}
        variant="default"
        confirmLabel="Restore"
        loading={isRestoringArchivedProgram}
        loadingLabel="Restoring..."
        onConfirm={confirmRestoreArchivedProgram}
        onCancel={() => setPendingRestoreProgram(null)}
      />
      <ConfirmDialog
        open={showSaveConfirmation}
        title="Save project changes?"
        description={`Save the updates to ${form.name || 'this project'}?`}
        variant="primary"
        confirmLabel="Save changes"
        cancelLabel="Continue editing"
        onConfirm={persistProgram}
        onCancel={() => setShowSaveConfirmation(false)}
      />
      <ConfirmDialog
        open={Boolean(pendingEndProgram)}
        title="Mark project as successfully completed?"
        description={pendingEndProgram ? `Mark ${pendingEndProgram.name} as successfully completed? It will become read-only and move to Completed Projects. You can reactivate it if this was a mistake, or archive it to remove it from regular lists while keeping its history recoverable.` : ''}
        variant="default"
        confirmLabel="Mark completed"
        loading={isEndingProgram}
        loadingLabel="Ending..."
        onConfirm={confirmEndProgram}
        onCancel={() => setPendingEndProgram(null)}
      />
      {receiptHistoryProgram && createPortal((
        <div className={`modal-backdrop ${getModalBackdropClasses()}`} role="presentation" onMouseDown={() => setReceiptHistoryProgram(null)}>
          <section
            className={`modal program-product-modal program-receipt-scope-modal ${getModalSurfaceClasses()}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-scope-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`modal-header ${modalHeaderSectionClasses}`}>
              <h2 id="receipt-scope-title">View project receipt history</h2>
              <button type="button" className={`modal-close ${modalCloseClasses}`} onClick={() => setReceiptHistoryProgram(null)} aria-label="Close">×</button>
            </div>
            <div className={`modal-body ${modalBodyClasses}`}>
              <p className="program-modal-context">{receiptHistoryProgram.name} · Choose a school, group, or batch.</p>
              {['School', 'Group', 'Batch'].map((type) => {
                const clusters = receiptHistoryClusters.filter((cluster) => cluster.type === type);
                if (!clusters.length) return null;
                return (
                  <section className="program-receipt-scope-section" key={type} aria-label={`${type} receipt history`}>
                    <h3>{({ School: 'Schools', Group: 'Groups', Batch: 'Batches' })[type]}</h3>
                    {clusters.map((cluster) => (
                      <button
                        type="button"
                        className="program-receipt-scope-option"
                        key={`${type}-${cluster.name}`}
                        onClick={() => openProgramClusterHistory(receiptHistoryProgram, cluster)}
                      >
                        <span>{cluster.name}</span>
                        <small>{Number(cluster.beneficiaries || 0)} beneficiaries</small>
                      </button>
                    ))}
                  </section>
                );
              })}
              {!receiptHistoryClusters.some((cluster) => ['School', 'Group', 'Batch'].includes(cluster.type)) && (
                <p className="program-recipient-preview-empty">No school, group, or batch scopes have been assigned yet.</p>
              )}
            </div>
          </section>
        </div>
      ), document.body)}

      {showBeneficiaryModal && (
        <AddProgramBeneficiariesModal
          program={selectedProgram}
          beneficiaryScope={beneficiaryScope}
          setBeneficiaryScope={setBeneficiaryScope}
          scopeSchoolIds={scopeSchoolIds}
          setScopeSchoolIds={setScopeSchoolIds}
          scopeGroupIds={scopeGroupIds}
          setScopeGroupIds={setScopeGroupIds}
          scopeBatchIds={scopeBatchIds}
          setScopeBatchIds={setScopeBatchIds}
          scopeError={scopeError}
          setScopeError={setScopeError}
          communityHierarchyGroups={communityHierarchyGroups}
          selectedScopeNames={selectedScopeNames}
          previewRecipients={previewRecipients}
          onSubmit={saveBeneficiaryScope}
          onClose={() => setShowBeneficiaryModal(false)}
        />
      )}

      {monitorConfirmation && createPortal((
        <div className={`modal-backdrop ${getModalBackdropClasses()}`} role="presentation" onMouseDown={() => setMonitorConfirmation(null)}>
          <div className={`modal program-product-modal ${getModalSurfaceClasses()}`} role="dialog" aria-modal="true" aria-labelledby="monitor-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={`modal-header ${modalHeaderSectionClasses}`}>
              <h2 id="monitor-confirmation-title">Confirm monitored status</h2>
              <button type="button" className={`modal-close ${modalCloseClasses}`} onClick={() => setMonitorConfirmation(null)} aria-label="Close">×</button>
            </div>
            <div className={`modal-body ${modalBodyClasses}`}>
              <p>
                {monitorConfirmation.monitored ? 'Mark' : 'Clear'} {monitorConfirmation.affectedCount > 1 ? `${monitorConfirmation.affectedCount} beneficiaries` : 'this beneficiary'} {monitorConfirmation.monitored ? 'as monitored' : 'as not monitored'} for {monitorDate}?
              </p>
            </div>
            <div className={`modal-footer ${modalFooterClasses}`}>
              <button type="button" className="btn-secondary" onClick={() => setMonitorConfirmation(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmMonitoringChange}>Confirm</button>
            </div>
          </div>
        </div>
      ), document.body)}
      {showModal && (
        <ProgramFormModal
          form={form}
          setForm={setForm}
          onSubmit={saveProgram}
          onClose={() => {
            setShowModal(false);
            setForm(emptyProgram);
          }}
        />
      )}
      {showActivityModal && selectedProgram && createPortal((
        <div
          className={`modal-backdrop ${getModalBackdropClasses()}`}
          role="presentation"
          onMouseDown={() => setShowActivityModal(false)}
        >
          <form
            className={`modal program-product-modal ${getModalSurfaceClasses()}`}
            onSubmit={(event) => {
              event.preventDefault();
              setShowActivityModal(false);
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`modal-header ${modalHeaderSectionClasses}`}>
              <h2>Record activity</h2>
              <button
                type="button"
                className={`modal-close ${modalCloseClasses}`}
                onClick={() => setShowActivityModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={`modal-body ${modalBodyClasses}`}>
              <p className="program-modal-context">
                {selectedProgram.name} · {selectedProgram.community} ·{" "}
                {selectedProgram.batch}
              </p>
              <label className={`${formLabelClasses} form-label`} htmlFor="activity-date">
                Activity date
                <input
                  id="activity-date"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{2}/\d{2}/\d{4}"
                  className={`${formFieldClasses} form-input`}
                  placeholder="DD/MM/YYYY"
                  defaultValue={formatDateForDisplay(localDate())}
                  onChange={(event) => {
                    const iso = normalizeDateValue(event.target.value);
                    if (iso) event.target.value = formatDateForDisplay(iso);
                  }}
                  required
                />
              </label>
              <label className={`${formLabelClasses} form-label`} htmlFor="activity-support">
                Support given
                <input
                  id="activity-support"
                  className={`${formFieldClasses} form-input`}
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
              <label className={`${formLabelClasses} form-label`} htmlFor="activity-status">
                Activity status
                <select
                  id="activity-status"
                  className={`${formFieldClasses} form-select`}
                  value={activityStatus}
                  onChange={(event) => setActivityStatus(event.target.value)}
                >
                  <option>Open</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className={`${formLabelClasses} form-label`} htmlFor="activity-remarks">
                Remarks
                <textarea
                  id="activity-remarks"
                  className={`${formFieldClasses} form-input`}
                  rows="2"
                />
              </label>
            </div>
            <div className={`modal-footer ${modalFooterClasses}`}>
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
      ), document.body)}
    </div>
  );
}
