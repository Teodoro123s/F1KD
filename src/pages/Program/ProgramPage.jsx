import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { hasRole, isHealthWorkerRole, ROLES } from "../../utils/permissions";
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
} from "./programData";

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ProgramPage() {
  const navigate = useNavigate();
  const { programId, clusterType, clusterName } = useParams();
  const { currentUser } = useAuth();
  const isCommunityOrganizer = ['community organizer', 'communityorganizer']
    .includes(String(currentUser?.role || '').trim().toLowerCase());
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const canManagePrograms = isSuperAdmin || isCommunityOrganizer;
  const canCreatePrograms = isSuperAdmin || isCommunityOrganizer;
  const canDeletePrograms = isSuperAdmin || isCommunityOrganizer;
  const canEndPrograms = isSuperAdmin || isCommunityOrganizer;
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
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [actionProgram, setActionProgram] = useState(null);
  const [pendingDeleteProgram, setPendingDeleteProgram] = useState(null);
  const [programError, setProgramError] = useState('');
  const [beneficiaryRecords, setBeneficiaryRecords] = useState([]);
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

  const normalizeBeneficiaryType = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

  const getProgramBeneficiaryRecords = (program, records = beneficiaryRecords) => {
    if (!program) return [];

    const requestedType = normalizeBeneficiaryType(program?.beneficiaryType || program?.beneficiary_type || 'Mother and Child');
    const programCommunity = String(program?.community || '').trim().toLowerCase();

    return (records || []).filter((record) => {
      const recordType = normalizeBeneficiaryType(record?.type || record?.sourceType || '');
      const recordCommunity = String(record?.school || '').trim().toLowerCase();

      if (requestedType && requestedType !== 'motherandchild' && recordType !== requestedType) {
        return false;
      }

      if (programCommunity && recordCommunity && recordCommunity !== programCommunity) {
        return false;
      }

      return true;
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
      if (normalizedLevel === 'school') {
        return String(record.school || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'group') {
        return String(record.group || '').trim().toLowerCase() === name.toLowerCase();
      }
      if (normalizedLevel === 'batch') {
        return String(record.batch || '').trim().toLowerCase() === name.toLowerCase();
      }
      return false;
    }).map((record) => ({ id: record.sourceId, type: record.sourceType }));
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
              const recordSchool = String(record.school || '').trim().toLowerCase();
              const recordGroup = String(record.group || '').trim().toLowerCase();
              const recordBatch = String(record.batch || '').trim().toLowerCase();
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
                const recordSchool = String(record.school || '').trim().toLowerCase();
                const recordGroup = String(record.group || '').trim().toLowerCase();
                const recordBatch = String(record.batch || '').trim().toLowerCase();
                return batchKeys.includes(recordBatch)
                  && (!recordSchool || recordSchool === String(schoolName).toLowerCase())
                  && (!recordGroup || recordGroup === String(groupName).toLowerCase());
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
  const selectedSchools = hierarchy.schools.filter((school) => scopeSchoolIds.includes(String(school.id)));
  const availableGroups = hierarchy.groups.filter((group) => (
    scopeSchoolIds.includes(String(group.community_id || ''))
    || selectedSchools.some((school) => String(group.community || group.community_name || '').toLowerCase() === String(school.name || '').toLowerCase())
  ));
  const selectedGroups = availableGroups.filter((group) => scopeGroupIds.includes(String(group.id)));
  const availableBatches = hierarchy.batches.filter((batch) => (
    scopeGroupIds.includes(String(batch.group_id || ''))
    || selectedGroups.some((group) => String(batch.group || batch.group_name || '').toLowerCase() === String(group.name || group.group_name || '').toLowerCase())
    || (scopeSchoolIds.includes(String(batch.community_id || '')) && !batch.group_id)
    || (selectedSchools.some((school) => String(batch.community || '').toLowerCase() === String(school.name || '').toLowerCase()) && !batch.group_id)
  ));
  const selectedBatches = availableBatches.filter((batch) => scopeBatchIds.includes(String(batch.id)));
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
              latest: "Aug 26, 2026",
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
      notifyAction(`Select at least one ${beneficiaryScope.toLowerCase()} before adding this cluster.`, 'error');
      return;
    }
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
    setShowBeneficiaryModal(true);
  };
  const resetDrill = () => {
    setDrillLevel('school');
    setDrillSchool(null);
    setDrillGroup(null);
    setDrillBatch(null);
  };
  const openSchool = (school) => {
    setDrillSchool(school);
    setDrillGroup(null);
    setDrillBatch(null);
    setDrillLevel('group');
  };
  const openGroup = (group) => {
    setDrillGroup(group);
    setDrillBatch(null);
    setDrillLevel('batch');
  };
  const openBatch = (batch) => {
    setDrillBatch(batch);
    setDrillLevel('beneficiary');
  };
  const editProgram = () => {
    setForm(actionProgram || selectedProgram);
    setActiveActionMenu(null);
    setShowModal(true);
  };
  const deleteProgram = () => {
    const programToDelete = actionProgram || selectedProgram;
    if (!programToDelete) return;
    setPendingDeleteProgram(programToDelete);
    setActiveActionMenu(null);
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
  const renderActionMenu = (menuId, menuProgram = selectedProgram) => canManagePrograms && (
    <div className="program-action-menu-wrap" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="program-more-button" aria-label="Program actions" aria-haspopup="true" aria-expanded={activeActionMenu === menuId} onClick={(event) => { event.stopPropagation(); setActionProgram(menuProgram); setActiveActionMenu(activeActionMenu === menuId ? null : menuId); }}><MoreVerticalIcon /></button>
      {activeActionMenu === menuId && (
        <div className="actions-dropdown program-actions-dropdown" role="menu">
          {(isSuperAdmin || isCommunityOrganizer) && String(menuProgram?.status || '').trim().toLowerCase() !== 'ended' && (
            <button type="button" className="actions-dropdown-item" onClick={editProgram} role="menuitem">Edit</button>
          )}
          {canEndPrograms && (
            activeTab === 'Ended'
              ? <button type="button" className="actions-dropdown-item" onClick={backToActivePrograms} role="menuitem">Back to active programs</button>
              : <button type="button" className="actions-dropdown-item" onClick={endProgram} role="menuitem">End program</button>
          )}
          {canDeletePrograms && (
            <button type="button" className="actions-dropdown-item delete" onClick={deleteProgram} role="menuitem">Delete</button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="community-page program-page">
      <PageHeader
        title={viewMode && selectedProgram ? selectedProgram.name : 'Program'}
        breadcrumbs={[{ label: 'Program' }]}
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
          {viewMode && !clusterView ? <ExpandableTreeTable
            data={programHierarchy}
            onBeneficiaryClick={openBeneficiaryReport}
            onHistoryClick={(node, level) => {
              if (level === 'beneficiary') return openBeneficiaryReport(node);
              return openClusterHistory(node, level);
            }}
          /> : <table className="data-table">
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
                    <th>Reached</th>
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
                        <td>
                          {Math.min(Number(program.received || 0), getProgramBeneficiaryCount(program))} / {getProgramBeneficiaryCount(program)}
                        </td>
                        <td>{renderActionMenu(`main-${program.id}`, program)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
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
            className="modal program-product-modal"
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
              <fieldset className="program-scope-options">
                <legend>Beneficiary scope</legend>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="School"
                    checked={beneficiaryScope === "School"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Whole school / community</span>
                  <small>
                    Cover all eligible beneficiaries in this school or
                    community.
                  </small>
                </label>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="Group"
                    checked={beneficiaryScope === "Group"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Group</span>
                  <small>Cover one group within the school or community.</small>
                </label>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="Batch"
                    checked={beneficiaryScope === "Batch"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Batch</span>
                  <small>Cover one batch within the selected group.</small>
                </label>
              </fieldset>
              <label className="form-label" htmlFor="beneficiary-scope-school">
                1. Select school or community (you can choose more than one)
                <div id="beneficiary-scope-school" className="program-hierarchy-options">
                  {hierarchy.schools.map((school) => <label key={school.id} className="program-recipient">
                    <input id={`scope-school-${school.id}`} name="scopeSchools" type="checkbox" checked={scopeSchoolIds.includes(String(school.id))} onChange={() => {
                      const id = String(school.id);
                      setScopeSchoolIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                      setScopeGroupIds([]);
                      setScopeBatchIds([]);
                    }} />
                    <span>{school.name}</span>
                  </label>)}
                </div>
              </label>
              {beneficiaryScope !== "School" && (
                <label className="form-label" htmlFor="beneficiary-scope-group">
                  2. Select group within the chosen school(s)
                  <div id="beneficiary-scope-group" className="program-hierarchy-options">
                    {availableGroups.map((group) => <label key={group.id} className="program-recipient">
                      <input id={`scope-group-${group.id}`} name="scopeGroups" type="checkbox" checked={scopeGroupIds.includes(String(group.id))} onChange={() => {
                        const id = String(group.id);
                        setScopeGroupIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                        setScopeBatchIds([]);
                      }} />
                      <span>{group.name || group.group_name}</span>
                    </label>)}
                    {!scopeSchoolIds.length && <small>Choose a school first.</small>}
                  </div>
                </label>
              )}
              {beneficiaryScope === "Batch" && (
                <label className="form-label" htmlFor="beneficiary-scope-batch">
                  3. Select batch within the chosen group(s)
                  <div id="beneficiary-scope-batch" className="program-hierarchy-options">
                    {availableBatches.map((batch) => <label key={batch.id} className="program-recipient">
                      <input id={`scope-batch-${batch.id}`} name="scopeBatches" type="checkbox" checked={scopeBatchIds.includes(String(batch.id))} onChange={() => {
                        const id = String(batch.id);
                        setScopeBatchIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                      }} />
                      <span>{batch.name || batch.batch_code}</span>
                    </label>)}
                    {!scopeGroupIds.length && <small>Choose a group first.</small>}
                  </div>
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowBeneficiaryModal(false)}
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
                  pattern="\d{4}/\d{2}/\d{2}"
                  className="form-input"
                  placeholder="yyyy/mm/dd"
                  defaultValue={formatDateForDisplay('2026-08-26')}
                  onChange={(event) => {
                    const iso = normalizeDateValue(event.target.value);
                    if (iso) event.target.value = iso;
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
