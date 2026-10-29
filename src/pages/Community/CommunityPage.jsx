import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CommunityTable from './CommunityTable';
import CommunityModalManager from './CommunityModalManager';
import CommunityToolbar from './components/CommunityToolbar';
import CommunityPagination from './components/CommunityPagination';
import CommunityOverviewCards from './components/CommunityOverviewCards';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import BatchDocumentationPanel from './components/BatchDocumentationPanel';
import { MoreVerticalIcon } from './CommunityIcons';
import { useCommunityData } from './hooks/useCommunityData';
import { useCommunityMutations } from './hooks/useCommunityMutations';
import { useAuth } from '../../auth/AuthProvider';
import { can, hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, isSchoolScopedRole, ROLES } from '../../utils/permissions';
import { getMotherProfileProgress } from '../../utils/beneficiary/motherProgress';
import { getChildProfileProgress } from '../../utils/beneficiary/childProgress';
import { apiDeleteMother } from '../../api/mothers';
import { apiDeleteChild } from '../../api/children';
import { apiGetChildren } from '../../api/children';
import { notifyAction } from '../../components/ActionFeedback';
import FloatingLayer from '../../components/ui/FloatingLayer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getGroupDeleteImpact } from './communityService';
import { getGroupDeletionDescription, getGroupDeletionSummary } from './groupDeletionCopy';

const defaultCommunityForm = { name: '', area: 'Poblacion', coordinator: '' };
const defaultGroupForm = { name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' };
const defaultBatchForm = { name: '', community: '', records: 1, progress: 0, status: 'Active' };

const truncateLabel = (label, maxLength = 26) => {
  if (!label) return '—';
  return String(label).length > maxLength ? `${String(label).slice(0, maxLength - 1).trimEnd()}…` : String(label);
};

export default function CommunityPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolId, groupId, batchId } = useParams();
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const canViewSchoolsFromOverview = hasRole(currentUser?.role, [ROLES.ADMIN, ROLES.PARTNER]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canManageSchools = isSuperAdmin;
  const canManage = can(currentUser?.role, 'community-resources', 'update') && !isHealthWorkerRole(currentUser?.role);
  const assignedSchoolId = currentUser?.school_id ?? currentUser?.schoolId ?? null;
  const assignedGroupId = currentUser?.group_id ?? currentUser?.groupId ?? null;
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isAssignedCommunityOrganizer = isCommunityOrganizer && Boolean(assignedSchoolId);
  const isSchoolScopedUser = isSchoolScopedRole(currentUser?.role);
  const [childrenRows, setChildrenRows] = useState([]);
  const [childrenOverviewError, setChildrenOverviewError] = useState('');

  const { communities, batches, groups, mothers, coordinators, loading, error, refreshData } = useCommunityData();
  const scopedCommunities = useMemo(() => {
    if (!isSchoolScopedUser || !assignedSchoolId) return communities;
    return communities.filter((community) => {
      const rawId = community.id ?? community.school_id ?? community.schoolId ?? community.community_id ?? community.communityId;
      return String(rawId) === String(assignedSchoolId) || String(community.id) === String(assignedSchoolId);
    });
  }, [assignedSchoolId, communities, isSchoolScopedUser]);
  const scopedGroups = useMemo(() => {
    if (!isHealthWorker || !assignedGroupId) return groups;
    return groups.filter((group) => String(group.id) === String(assignedGroupId));
  }, [assignedGroupId, groups, isHealthWorker]);
  const mutations = useCommunityMutations({ refreshData });

  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('Mother');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const activeDropdownAnchorRef = useRef(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteImpactError, setDeleteImpactError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const deleteImpactRequestRef = useRef(0);
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [showChildMotherColumn, setShowChildMotherColumn] = useState(true);
  const [showChildBatchColumn, setShowChildBatchColumn] = useState(true);
  const [selectedBatchCard, setSelectedBatchCard] = useState('Mother');
  const [batchDocumentationCount, setBatchDocumentationCount] = useState(0);
  const [batchDocumentationLoading, setBatchDocumentationLoading] = useState(false);
  const [schoolOverviewSelection, setSchoolOverviewSelection] = useState(null);
  const [drilldownSchoolId, setDrilldownSchoolId] = useState(null);
  const [drilldownGroupId, setDrilldownGroupId] = useState(null);
  const [drilldownBatchId, setDrilldownBatchId] = useState(null);

  const activeTab = batchId
    ? (isSuperAdmin ? 'batches' : 'mothers')
    : drilldownBatchId
      ? 'mothers'
      : drilldownGroupId || groupId
        ? 'batches'
        : drilldownSchoolId || schoolId
          ? 'groups'
          : isHealthWorker
            ? 'batches'
            : isAssignedCommunityOrganizer
              ? (groupId ? 'batches' : 'groups')
              : 'communities';

  useEffect(() => {
    setSchoolOverviewSelection(null);
    setDrilldownSchoolId(null);
    setDrilldownGroupId(null);
    setDrilldownBatchId(null);
    setSelectedBatchCard('Mother');
    setBatchDocumentationCount(0);
    setPage(1);
  }, [schoolId, groupId, batchId]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(drilldownBatchId || batchId)),
    [batches, batchId, drilldownBatchId]
  );

  const selectedGroup = useMemo(() => {
    const groupFromRoute = scopedGroups.find((group) =>
      String(group.id) === String(drilldownGroupId || (isHealthWorker ? assignedGroupId : groupId))
    );

    if (groupFromRoute) {
      return groupFromRoute;
    }

    if (!selectedBatch) {
      return null;
    }

    const groupNames = String(selectedBatch.groupNames || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (groupNames.length === 0) {
      return null;
    }

    return scopedGroups.find((group) => group.name === groupNames[0]) || null;
  }, [assignedGroupId, drilldownGroupId, groupId, isHealthWorker, scopedGroups, selectedBatch]);

  const selectedSchool = useMemo(() => {
    const sourceCommunities = isSchoolScopedUser ? scopedCommunities : communities;
    const schoolFromRoute = sourceCommunities.find((community) =>
      String(community.id) === String(drilldownSchoolId || schoolId || assignedSchoolId)
    );

    if (schoolFromRoute) {
      return schoolFromRoute;
    }

    if (selectedGroup) {
      return sourceCommunities.find((community) => community.name === selectedGroup.community) || null;
    }

    if (selectedBatch) {
      return sourceCommunities.find((community) => community.name === selectedBatch.community) || null;
    }

    if (isSchoolScopedUser && assignedSchoolId) {
      return sourceCommunities.find((community) => String(community.id) === String(assignedSchoolId)) || null;
    }

    return null;
  }, [assignedSchoolId, communities, drilldownSchoolId, isSchoolScopedUser, scopedCommunities, schoolId, selectedBatch, selectedGroup]);

  const selectedSchoolGroups = useMemo(() => {
    if (!selectedSchool) return [];

    return scopedGroups
      .filter((group) => group.community === selectedSchool.name)
      .filter((group) => {
        if (!query.trim()) return true;
        const term = query.trim();
        return [group.name, String(group.id), group.leader, group.status].some((value) =>
          String(value || '').includes(term)
        );
      });
  }, [query, scopedGroups, selectedSchool]);

  const batchesForSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];

    return batches.filter((batch) => String(batch.groupIds || '')
      .split(',')
      .map((value) => value.trim())
      .includes(String(selectedGroup.id)));
  }, [batches, selectedGroup]);

  const selectedGroupBatches = useMemo(() => {
    if (!selectedGroup) return [];

    return batchesForSelectedGroup
      .filter((batch) => {
        if (!query.trim()) return true;
        const term = query.trim();
        return [batch.name, String(batch.id), batch.community, batch.status].some((value) =>
          String(value || '').includes(term)
        );
      });
  }, [batchesForSelectedGroup, query]);

  const selectedGroupBatchKeys = useMemo(
    () => new Set(batchesForSelectedGroup.flatMap((batch) =>
      [batch.id, batch.databaseId, batch.code]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .map(String)
    )),
    [batchesForSelectedGroup],
  );
  const selectedGroupMothers = useMemo(
    () => selectedGroup
      ? mothers.filter((mother) => mother.group === selectedGroup.name
        || selectedGroupBatchKeys.has(String(mother.batchId || '')))
      : [],
    [mothers, selectedGroup, selectedGroupBatchKeys],
  );
  const selectedGroupChildren = useMemo(
    () => selectedGroup
      ? childrenRows.filter((child) => String(child.groupId || '') === String(selectedGroup.id)
        || selectedGroupBatchKeys.has(String(child.batchId || '')))
      : [],
    [childrenRows, selectedGroup, selectedGroupBatchKeys],
  );

  const selectedBatchKeys = useMemo(
    () => new Set(selectedBatch
      ? [selectedBatch.id, selectedBatch.databaseId, selectedBatch.batchCode, selectedBatch.code]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .map(String)
      : []),
    [selectedBatch],
  );
  const selectedBatchAllMothers = useMemo(() => {
    if (!selectedBatch) return [];

    return mothers.filter((mother) => selectedBatchKeys.has(String(mother.batchId ?? ''))
      || selectedBatchKeys.has(String(mother.batchCode ?? '')));
  }, [mothers, selectedBatch, selectedBatchKeys]);
  const selectedBatchMothers = useMemo(() => {
    const term = query.trim();
    return selectedBatchAllMothers
      .filter((mother) => !term
        || [mother.name, String(mother.id), mother.group, mother.status].some((value) =>
          String(value || '').includes(term)
        ));
  }, [query, selectedBatchAllMothers]);
  const selectedBatchChildren = useMemo(() => {
    if (!selectedBatch) return [];

    return childrenRows.filter((child) => selectedBatchKeys.has(String(child.batchId ?? ''))
      || child.batch === selectedBatch.name);
  }, [childrenRows, selectedBatch, selectedBatchKeys]);

  const schoolOverviewGroups = useMemo(
    () => selectedSchool
      ? scopedGroups.filter((group) => String(group.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase())
      : [],
    [scopedGroups, selectedSchool],
  );
  const schoolOverviewMothers = useMemo(
    () => selectedSchool
      ? mothers.filter((mother) => String(mother.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase())
      : [],
    [mothers, selectedSchool],
  );
  const schoolOverviewChildren = useMemo(
    () => selectedSchool
      ? childrenRows.filter((child) => String(child.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase())
      : [],
    [childrenRows, selectedSchool],
  );
  const childOverviewRows = activeTab === 'batches' && selectedGroup
    ? selectedGroupChildren
    : activeTab === 'communities'
      ? childrenRows
      : schoolOverviewChildren;
  const schoolOverviewBatches = useMemo(
    () => selectedSchool
      ? batches.filter((batch) => String(batch.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase())
      : [],
    [batches, selectedSchool],
  );
  const unassignedSchoolBatches = useMemo(() => {
    const groupIds = new Set(schoolOverviewGroups.map((group) => String(group.id)));
    return schoolOverviewBatches.filter((batch) => {
      const assignedGroupIds = String(batch.groupIds || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return !assignedGroupIds.some((id) => groupIds.has(id));
    });
  }, [schoolOverviewBatches, schoolOverviewGroups]);
  const overviewBatchRows = activeTab === 'communities'
    ? batches
    : activeTab === 'batches' && selectedGroup
      ? selectedGroupBatches
      : schoolOverviewBatches;
  const overviewMotherRows = activeTab === 'communities'
    ? mothers
    : activeTab === 'batches' && selectedGroup
      ? selectedGroupMothers
      : schoolOverviewMothers;
  const overviewChildRows = activeTab === 'communities'
    ? childrenRows
    : activeTab === 'batches' && selectedGroup
      ? selectedGroupChildren
      : schoolOverviewChildren;

  const shouldLoadChildren = (activeTab === 'mothers' && (entityFilter === 'Child' || Boolean(selectedBatch)))
    || activeTab === 'communities'
    || (activeTab === 'groups' && Boolean(selectedSchool))
    || (activeTab === 'batches' && Boolean(selectedGroup));

  useEffect(() => {
    if (!shouldLoadChildren) {
      setChildrenRows([]);
      setChildrenOverviewError('');
      return;
    }

    let active = true;
    setChildrenOverviewError('');

    apiGetChildren()
      .then((response) => {
        const rows = (response.children || []).map((child) => {
          const childName = child.name || [child.first_name, child.middle_name, child.last_name, child.suffix].filter(Boolean).join(' ');
          const motherName = child.mother_name || [
            child.mother_first_name || child.motherFirstName,
            child.mother_middle_name || child.motherMiddleName,
            child.mother_last_name || child.motherLastName,
          ].filter(Boolean).join(' ');

          return {
            id: child.id,
            name: childName || 'Unnamed child',
            motherName,
            community: child.community_name || child.community || '',
            group: child.group_name || child.group || '',
            groupId: child.group_id ?? child.mother_group_id ?? child.groupId ?? '',
            batch: child.batch_name || child.batch || '',
            batchId: child.effective_batch_id ?? child.batchId ?? child.batch_id ?? null,
            progress: Number(child.progress ?? 0),
            profileProgress: getChildProfileProgress(child),
            raw: child,
          };
        });

        if (active) {
          setChildrenRows(rows);
        }
      })
      .catch((error) => {
        console.error('[CommunityPage] Unable to load child rows:', error);
        if (active) {
          setChildrenRows([]);
          setChildrenOverviewError(error?.message || 'Unable to load children for this school.');
        }
      });

    return () => { active = false; };
  }, [selectedGroup, selectedSchool, shouldLoadChildren]);

  const filteredData = useMemo(() => {
    const term = query.trim();

    if (activeTab === 'communities') {
      return scopedCommunities.filter((community) => {
        if (!term) return true;
        return [community.name, String(community.id), community.area].some((value) =>
          String(value || '').includes(term)
        );
      });
    }

    if (activeTab === 'groups') return selectedSchoolGroups;
    if (activeTab === 'batches') return selectedGroupBatches;

    if (entityFilter === 'Child') {
      return childrenRows.filter((child) => {
        const selectedBatchKeys = selectedBatch
          ? [selectedBatch.id, selectedBatch.databaseId, selectedBatch.batchCode, selectedBatch.code]
            .filter((value) => value !== undefined && value !== null && value !== '')
            .map(String)
          : [];
        const matchesBatch = !selectedBatch
          || selectedBatchKeys.includes(String(child.batchId ?? ''))
          || child.batch === selectedBatch.name;
        const selectedBatchBelongsToGroup = Boolean(selectedGroup && selectedBatch && selectedGroupBatches.some((batch) => String(batch.id) === String(selectedBatch.id)));
        const matchesGroup = !selectedGroup
          || child.group === selectedGroup.name
          || (matchesBatch && selectedBatchBelongsToGroup);
        const matchesSchool = !selectedSchool || child.community === selectedSchool.name;

        if (!matchesBatch || !matchesGroup || !matchesSchool) return false;
        if (!term) return true;

        return [child.name, child.motherName, child.community, child.group, String(child.id)].some((value) =>
          String(value || '').includes(term)
        );
      });
    }

    return selectedBatchMothers;
  }, [activeTab, childrenRows, communities, entityFilter, query, scopedCommunities, selectedBatch, selectedBatchMothers, selectedGroup, selectedGroupBatches, selectedSchool, selectedSchoolGroups]);

  const overviewRows = useMemo(() => {
    const source = schoolOverviewSelection === 'schools'
      ? scopedCommunities
      : schoolOverviewSelection === 'mothers'
      ? overviewMotherRows
      : schoolOverviewSelection === 'children'
        ? overviewChildRows
        : schoolOverviewSelection === 'batches'
          ? overviewBatchRows
          : schoolOverviewSelection === 'groups'
            ? (activeTab === 'communities' ? scopedGroups : schoolOverviewGroups)
          : [];
    const rows = schoolOverviewSelection === 'groups' && activeTab === 'communities'
      ? source.map((row) => ({
        ...row,
        schoolName: row.community || row.school_name || row.schoolName || 'Unknown school',
      }))
      : source;
    const term = query.trim();
    return rows.filter((row) => {
      if (!term) return true;
      return [row.name, row.area, row.coordinator, row.motherName, row.batch, row.group, row.community, row.schoolName, String(row.id)]
        .some((value) => String(value || '').includes(term));
    });
  }, [activeTab, overviewBatchRows, overviewChildRows, overviewMotherRows, query, schoolOverviewGroups, schoolOverviewSelection, scopedCommunities, scopedGroups]);
  const tableData = schoolOverviewSelection ? overviewRows : filteredData;
  const pageCount = Math.max(1, Math.ceil(tableData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = tableData.slice(startIndex, startIndex + perPage);

  const tableTitle = useMemo(() => {
    if (schoolOverviewSelection === 'groups') return `Groups: ${selectedSchool?.name || 'All schools'}`;
    if (schoolOverviewSelection === 'mothers') return `Mothers: ${selectedSchool?.name || 'All schools'}`;
    if (schoolOverviewSelection === 'children') return `Children: ${selectedSchool?.name || 'All schools'}`;
    if (schoolOverviewSelection === 'batches') return `Batches: ${selectedGroup?.name || selectedSchool?.name || 'All schools'}`;

    if (activeTab === 'communities') {
      return 'Schools';
    }

    if (activeTab === 'groups') {
      return selectedSchool?.name ? `School: ${selectedSchool.name}` : 'School';
    }

    if (activeTab === 'batches') {
      return selectedGroup?.name ? `Group: ${selectedGroup.name}` : 'Group';
    }

    if (activeTab === 'mothers') {
      return selectedBatch?.name ? `Batch: ${selectedBatch.name}` : 'Batch';
    }

    return '';
  }, [activeTab, schoolOverviewSelection, selectedBatch, selectedGroup, selectedSchool]);

  const breadcrumbItems = useMemo(() => {
    if (isHealthWorker || isAssignedCommunityOrganizer) {
      if (activeTab === 'mothers') {
        return [
          { label: isHealthWorker ? 'Batches' : 'Groups', to: '/community', clickable: true },
          { label: truncateLabel(selectedBatch?.name || 'Batch'), clickable: false },
        ];
      }

      if (activeTab === 'batches') return [{ label: 'Batches', clickable: false }];
      return [{ label: 'Groups', clickable: false }];
    }

    const items = [{ label: 'Schools', to: '/community', clickable: activeTab !== 'communities' }];

    if (activeTab === 'groups' || activeTab === 'batches' || activeTab === 'mothers') {
      items.push({
        label: truncateLabel(selectedSchool?.name || 'School'),
        to: selectedSchool ? `/community/school/${selectedSchool.id}` : '/community',
        clickable: activeTab !== 'groups',
      });
    }

    if (activeTab === 'batches' || activeTab === 'mothers') {
      items.push({
        label: truncateLabel(selectedGroup?.name || 'Group'),
        to: selectedGroup ? `/community/group/${selectedGroup.id}` : '/community',
        clickable: activeTab !== 'batches',
      });
    }

    if (activeTab === 'mothers') {
      items.push({
        label: truncateLabel(selectedBatch?.name || 'Batch'),
        clickable: false,
      });
    }

    return items;
  }, [activeTab, isHealthWorker, selectedBatch, selectedGroup, selectedSchool]);

  useEffect(() => {
    const sourceCommunities = isSchoolScopedUser ? scopedCommunities : communities;
    if (sourceCommunities.length > 0 && !batchForm.community) {
      setBatchForm((previous) => ({ ...previous, community: sourceCommunities[0].name }));
    }

    if (sourceCommunities.length > 0 && !groupForm.community) {
      setGroupForm((previous) => ({ ...previous, community: sourceCommunities[0].name }));
    }
  }, [batchForm.community, communities, groupForm.community, isSchoolScopedUser, scopedCommunities]);

  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  const handleEntityFilterChange = (nextFilter) => {
    setEntityFilter(nextFilter);
    setPage(1);
  };

  const handlePerPageChange = (value) => {
    setPerPage(Number(value));
    setPage(1);
  };

  const handleTabChange = (nextTab) => {
    setQuery('');
    setPage(1);
    setActiveDropdownId(null);
    setDrilldownSchoolId(null);
    setDrilldownGroupId(null);
    setDrilldownBatchId(null);
    setSchoolOverviewSelection(null);

    if (nextTab === 'communities') {
      navigate('/community');
      return;
    }

    if (nextTab === 'groups') {
      navigate(selectedSchool ? `/community/school/${selectedSchool.id}` : '/community');
      return;
    }

    if (nextTab === 'batches') {
      navigate(selectedGroup ? `/community/group/${selectedGroup.id}` : '/community');
      return;
    }

    navigate(selectedBatch ? `/community/batch/${selectedBatch.id}` : '/community');
  };

  const handleSchoolRowClick = (school) => {
    setDrilldownSchoolId(school.id);
    setDrilldownGroupId(null);
    setDrilldownBatchId(null);
    setSchoolOverviewSelection('groups');
    setQuery('');
    setPage(1);
  };

  const handleGroupRowClick = (group) => {
    setDrilldownSchoolId(null);
    setDrilldownGroupId(group.id);
    setDrilldownBatchId(null);
    setSchoolOverviewSelection('batches');
    setQuery('');
    setPage(1);
  };

  const handleBatchRowClick = (batch) => {
    setDrilldownBatchId(batch.id);
    setSchoolOverviewSelection(null);
    setSelectedBatchCard('Mother');
    setQuery('');
    setPage(1);
  };

  const handleOverviewSelection = (selection) => {
    setSchoolOverviewSelection(selection);
    setPage(1);
  };

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      return;
    }

    activeDropdownAnchorRef.current = event.currentTarget;
    setActiveDropdownId(id);
  };

  const openCreateModal = (type = activeTab === 'communities' ? 'community' : activeTab === 'groups' ? 'group' : 'batch') => {
    if (type === 'community') {
      setCommunityForm(defaultCommunityForm);
      setShowModal('createCommunity');
      return;
    }

    if (type === 'group') {
      setGroupForm({
        ...defaultGroupForm,
        community: selectedSchool?.name || communities[0]?.name || '',
      });
      setShowModal('createGroup');
      return;
    }

    setBatchForm({
      ...defaultBatchForm,
      community: selectedSchool?.name || selectedGroup?.community || communities[0]?.name || '',
      groupId: selectedGroup?.id || groupId || '',
    });
    setShowModal('createBatch');
  };

  const openEditModal = (item, itemType = activeTab) => {
    setSelectedItem(item);

    if (itemType === 'communities') {
      setCommunityForm({
        name: item.name,
        area: item.area,
        coordinator: item.coordinatorId || '',
      });
      setShowModal('editCommunity');
      return;
    }

    if (itemType === 'groups') {
      setGroupForm({
        name: item.name,
        community: item.community || communities[0]?.name || '',
        assignedBatchIds: item.assignedBatchIds || [],
        leader: item.leader,
        members: item.members,
        status: item.status,
      });
      setShowModal('editGroup');
      return;
    }

    setBatchForm({
      name: item.name,
      community: item.community,
      groupId: selectedGroup?.id || groupId || String(item.groupIds || '').split(',').filter(Boolean)[0] || '',
      records: item.records,
      progress: item.progress ?? 0,
      status: item.status,
    });
    setShowModal('editBatch');
  };

  const handleCreateCommunity = async (event) => {
    event.preventDefault();
    if (!communityForm.name.trim()) return;

    try {
      await mutations.createCommunity(communityForm);
    } catch {
      return;
    }
    setShowModal(null);
  };

  const handleEditCommunity = async (event) => {
    event.preventDefault();
    if (!communityForm.name.trim()) return;

    try {
      await mutations.updateCommunity(selectedItem.id, communityForm);
    } catch (error) {
      if (error?.status === 409) {
        setCommunityForm((current) => ({
          ...current,
          coordinator: selectedItem.coordinatorId || '',
        }));
      }
      return;
    }
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();
    if (!batchForm.name.trim()) return;

    await mutations.createBatch(batchForm);
    setShowModal(null);
  };

  const handleEditBatch = async (event) => {
    event.preventDefault();
    if (!batchForm.name.trim()) return;

    await mutations.updateBatch(selectedItem.id, batchForm);
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!groupForm.name.trim()) return;

    await mutations.createGroup(groupForm);
    setShowModal(null);
  };

  const handleEditGroup = async (event) => {
    event.preventDefault();
    if (!groupForm.name.trim()) return;

    await mutations.updateGroup(selectedItem.id, groupForm);
    setShowModal(null);
    setSelectedItem(null);
  };

  const requestDelete = async (type, item) => {
    const requestId = ++deleteImpactRequestRef.current;
    setPendingDelete({ type, item, impact: null });
    setDeleteImpactError('');
    setDeleteError('');
    if (type !== 'group') return;

    setDeleteImpactLoading(true);
    try {
      const { group: impact } = await getGroupDeleteImpact(item.id);
      if (deleteImpactRequestRef.current === requestId) {
        setPendingDelete((current) => current?.item.id === item.id ? { ...current, impact } : current);
      }
    } catch (error) {
      if (deleteImpactRequestRef.current === requestId) {
        setDeleteImpactError(error?.message || 'Unable to load the records affected by deleting this group.');
      }
    } finally {
      if (deleteImpactRequestRef.current === requestId) setDeleteImpactLoading(false);
    }
  };

  const cancelDelete = () => {
    deleteImpactRequestRef.current += 1;
    setPendingDelete(null);
    setDeleteImpactLoading(false);
    setDeleteImpactError('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleteSubmitting || deleteImpactLoading) return;
    const { type, item } = pendingDelete;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      if (type === 'community') await mutations.deleteCommunity(item.id);
      else if (type === 'group') await mutations.deleteGroup(item.id);
      else if (type === 'batch') await mutations.deleteBatch(item.id);
      else {
        if (type === 'child') await apiDeleteChild(item.id);
        else await apiDeleteMother(item.id);
        await refreshData();
        notifyAction(type === 'child' ? 'Child and related health records deleted successfully.' : 'Mother and associated child records deleted successfully.');
      }
      cancelDelete();
    } catch (error) {
      console.error(`[CommunityPage] Unable to delete ${type}:`, error);
      const message = error?.message || `Unable to delete ${type}.`;
      setDeleteError(message);
      if (type === 'mother') notifyAction(message, 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getPendingDeleteDescription = () => {
    if (!pendingDelete) return '';
    const { type, item, impact } = pendingDelete;
    if (type === 'group') return getGroupDeletionDescription(item, impact);
    if (type === 'community') {
      return `Delete the School "${item.name}"? This also deletes its Groups, Batches, beneficiaries, and associated health histories. This action cannot be undone.`;
    }
    if (type === 'batch') {
      return `Permanently delete the Batch "${item.name}" and all mothers and children assigned to it, including their check-ups and health records? This action cannot be undone.`;
    }
    if (type === 'child') {
      return `Delete the Child record for "${item.name}"? This permanently removes the Child and associated health histories. This action cannot be undone.`;
    }
    return `Delete the Mother "${item.name}"? This permanently removes her record, associated Child records, and their related health histories. This action cannot be undone.`;
  };

  const handleMotherRowClick = (mother) => {
    navigate(`/beneficiary/mother/${mother.id}`, {
      state: { mother, returnTo: `${location.pathname}${location.search}` },
    });
  };

  const handleChildRowClick = (child) => {
    navigate(`/beneficiary/child/${child.id}`, {
      state: {
        child: child.raw || child,
        mother: child.raw?.mother || child.mother || null,
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const columns = useMemo(() => {
    const actionColumn = {
      key: 'actions',
      header: 'Actions',
      thClassName: 'actions-cell batch-actions-cell',
      cellClassName: activeTab === 'batches' ? 'actions-cell batch-actions-cell' : 'actions-cell',
      renderCell: (row) => {
        const canMutateRow = canManage && (activeTab !== 'communities' || canManageSchools);
        if (!canMutateRow) {
          return <span className="no-actions">—</span>;
        }

        return (
          <>
            <button
              type="button"
              className="btn-actions"
              ref={activeDropdownId === row.id ? activeDropdownAnchorRef : undefined}
              onClick={(event) => toggleDropdown(event, row.id)}
              aria-label="Actions menu"
              aria-haspopup="true"
              aria-expanded={activeDropdownId === row.id}
            >
              <MoreVerticalIcon />
            </button>
            {activeDropdownId === row.id && (
              <FloatingLayer
                open
                anchorRef={activeDropdownAnchorRef}
                onDismiss={() => setActiveDropdownId(null)}
                className="actions-dropdown actions-dropdown-portal community-actions-dropdown"
                role="menu"
              >
                {activeTab !== 'mothers' && (
                  <button
                    type="button"
                    className="actions-dropdown-item"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      openEditModal(row);
                    }}
                    role="menuitem"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="actions-dropdown-item delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDropdownId(null);
                    if (activeTab === 'mothers') {
                      requestDelete(entityFilter === 'Child' ? 'child' : 'mother', row);
                    } else if (activeTab === 'communities') {
                      requestDelete('community', row);
                    } else if (activeTab === 'groups') {
                      requestDelete('group', row);
                    } else {
                      requestDelete('batch', row);
                    }
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
              </FloatingLayer>
            )}
          </>
        );
      },
    };
    const appendActions = (baseColumns) => (canManage && (activeTab !== 'communities' || canManageSchools)) ? [...baseColumns, actionColumn] : baseColumns;

    if (activeTab === 'communities') {
      return appendActions([
        { key: 'name', header: 'School Name', style: { width: '48%' }, renderCell: (row) => <span className="community-title-text" title={row.name}>{row.name}</span> },
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches || 0 },
        { key: 'groups', header: 'Total Groups', cellClassName: 'small-column', renderCell: (row) => groups.filter((group) => group.community === row.name).length },
      ]);
    }

    if (activeTab === 'groups') {
      return appendActions([
        { key: 'name', header: 'Group Name', style: { width: '60%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches ?? row.assignedBatchIds?.length ?? 0 },
      ]);
    }

    if (activeTab === 'mothers') {
      if (entityFilter === 'Child') {
        return appendActions([
          { key: 'name', header: 'Child Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
          { key: 'motherName', header: 'Mother Name', style: { width: '24%' }, renderCell: (row) => row.motherName || '—' },
          { key: 'profileProgress', header: 'Profile Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.profileProgress ?? 0)}%` },
          { key: 'progress', header: 'Monitor Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.progress ?? 0)}%` },
        ]);
      }

      return appendActions([
        { key: 'name', header: 'Mother Name', style: { width: '52%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'profileProgress', header: 'Profile Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${getMotherProfileProgress(row)}%` },
        { key: 'progress', header: 'Monitor Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.progress ?? 0)}%` },
      ]);
    }

    return appendActions([
      { key: 'name', header: 'Batch Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
      { key: 'records', header: 'Total Mothers', cellClassName: 'compact-column', renderCell: (row) => row.records },
      { key: 'progress', header: 'Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${row.progress ?? 0}%` },
    ]);
  }, [activeDropdownId, activeTab, canManage, canManageSchools, entityFilter, groups, navigate, openEditModal, requestDelete]);

  const overviewColumns = useMemo(() => {
    if (schoolOverviewSelection === 'groups') {
      return [
        { key: 'name', header: 'Group Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        ...(activeTab === 'communities' ? [{ key: 'schoolName', header: 'School' }] : []),
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches ?? row.assignedBatchIds?.length ?? 0 },
        ...(activeTab === 'groups' ? columns.filter((column) => column.key === 'actions') : []),
      ];
    }
    if (schoolOverviewSelection === 'mothers') {
      return [
        { key: 'name', header: 'Mother Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'group', header: 'Group', renderCell: (row) => row.group || '—' },
      ];
    }
    if (schoolOverviewSelection === 'children') {
      return [
        { key: 'name', header: 'Child Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        ...(showChildMotherColumn ? [{ key: 'motherName', header: 'Mother Name', renderCell: (row) => row.motherName || '—' }] : []),
        ...(showChildBatchColumn ? [{ key: 'batch', header: 'Batch', renderCell: (row) => row.batch || '—' }] : []),
        { key: 'group', header: 'Group', renderCell: (row) => row.group || '—' },
      ];
    }
    if (schoolOverviewSelection === 'batches') {
      const batchActionColumn = canManage ? {
        key: 'actions',
        header: 'Actions',
        thClassName: 'actions-cell batch-actions-cell',
        cellClassName: 'actions-cell batch-actions-cell',
        renderCell: (row) => (
          <>
            <button
              type="button"
              className="btn-actions"
              ref={activeDropdownId === row.id ? activeDropdownAnchorRef : undefined}
              onClick={(event) => {
                event.stopPropagation();
                toggleDropdown(event, row.id);
              }}
              aria-label={`Actions for ${row.name}`}
              aria-haspopup="true"
              aria-expanded={activeDropdownId === row.id}
            >
              <MoreVerticalIcon />
            </button>
            {activeDropdownId === row.id && (
              <FloatingLayer
                open
                anchorRef={activeDropdownAnchorRef}
                onDismiss={() => setActiveDropdownId(null)}
                className="actions-dropdown actions-dropdown-portal community-actions-dropdown"
                role="menu"
              >
                <button
                  type="button"
                  className="actions-dropdown-item"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDropdownId(null);
                    openEditModal(row, 'batches');
                  }}
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="actions-dropdown-item delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDropdownId(null);
                    requestDelete('batch', row);
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
              </FloatingLayer>
            )}
          </>
        ),
      } : null;
      return [
        { key: 'name', header: 'Batch Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'records', header: 'Total Mothers', cellClassName: 'compact-column', renderCell: (row) => row.records || 0 },
        { key: 'progress', header: 'Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${row.progress ?? 0}%` },
        ...(batchActionColumn ? [batchActionColumn] : []),
      ];
    }
    return columns;
  }, [activeDropdownId, activeTab, canManage, columns, openEditModal, requestDelete, schoolOverviewSelection, showChildBatchColumn, showChildMotherColumn]);

  const currentRowClickHandler =
    schoolOverviewSelection === 'groups'
      ? handleGroupRowClick
      : schoolOverviewSelection === 'mothers'
      ? (mother) => handleMotherRowClick(mother)
      : schoolOverviewSelection === 'children'
        ? (child) => handleChildRowClick(child)
        : schoolOverviewSelection === 'batches'
          ? handleBatchRowClick
          : activeTab === 'communities'
            ? handleSchoolRowClick
            : activeTab === 'groups'
              ? handleGroupRowClick
              : activeTab === 'batches'
                ? handleBatchRowClick
                : entityFilter === 'Child'
                  ? (child) => handleChildRowClick(child)
                  : (mother) => handleMotherRowClick(mother);

  if (loading) {
    return <div className="community-page"><p>Loading community data...</p></div>;
  }

  if (error) {
    return <div className="community-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="community-page">
      <CommunityToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage={canManage && (activeTab !== 'communities' || canManageSchools)}
      />

      {(activeTab === 'communities' || (activeTab === 'groups' && selectedSchool) || (activeTab === 'batches' && selectedGroup)) && (
        <>
          <CommunityOverviewCards
            selected={schoolOverviewSelection}
            onSelect={handleOverviewSelection}
            cards={[
              { key: 'schools', label: 'Total Schools', value: communities.length, interactive: canViewSchoolsFromOverview },
              { key: 'groups', label: 'Total Groups', value: activeTab === 'communities' ? groups.length : schoolOverviewGroups.length },
              { key: 'batches', label: 'Total Batches', value: overviewBatchRows.length },
              { key: 'mothers', label: 'Total Mothers', value: overviewMotherRows.length },
              { key: 'children', label: 'Total Children', value: childrenOverviewError ? 'Unavailable' : overviewChildRows.length },
            ].filter((card) => (
              (!isCommunityOrganizer || card.key !== 'schools')
              && (!isHealthWorker || !['schools', 'groups'].includes(card.key))
            ))}
          />
          {childrenOverviewError && <p className="error-message" role="alert">{childrenOverviewError}</p>}
          {schoolOverviewSelection ? (
            <>
              {schoolOverviewSelection === 'children' && (
                <div className="community-child-column-filters" role="group" aria-label="Choose child table columns">
                  <select
                    className="entity-filter-btn"
                    value={showChildMotherColumn ? 'show' : 'hide'}
                    onChange={(event) => setShowChildMotherColumn(event.target.value === 'show')}
                    aria-label="Show or hide Mother Name column"
                  >
                    <option value="show">Show Mother Name</option>
                    <option value="hide">Hide Mother Name</option>
                  </select>
                  <select
                    className="entity-filter-btn"
                    value={showChildBatchColumn ? 'show' : 'hide'}
                    onChange={(event) => setShowChildBatchColumn(event.target.value === 'show')}
                    aria-label="Show or hide Batch column"
                  >
                    <option value="show">Show Batch</option>
                    <option value="hide">Hide Batch</option>
                  </select>
                </div>
              )}
              <CommunityTable
                columns={overviewColumns}
                data={currentRows}
                onRowClick={currentRowClickHandler}
                tableTitle={tableTitle}
                emptyMessage={schoolOverviewSelection === 'schools'
                  ? 'No schools found.'
                  : `No ${schoolOverviewSelection} found ${selectedSchool ? `for ${selectedSchool.name}` : 'across the available schools'}.`}
                searchValue={query}
                onSearchChange={handleSearch}
              />
              {schoolOverviewSelection === 'groups' && unassignedSchoolBatches.length > 0 && (
                <p className="community-overview-hint" role="status">
                  {unassignedSchoolBatches.length} {unassignedSchoolBatches.length === 1 ? 'batch is' : 'batches are'} not assigned to a group: {unassignedSchoolBatches.map((batch) => batch.name).join(', ')}.
                </p>
              )}
              <CommunityPagination
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={handlePerPageChange}
                rangeStart={tableData.length === 0 ? 0 : startIndex + 1}
                rangeEnd={Math.min(startIndex + perPage, tableData.length)}
                totalItems={tableData.length}
              />
            </>
          ) : (
            <p className="community-overview-hint">Select a card to view its list.</p>
          )}
        </>
      )}
      {!(activeTab === 'communities' || (activeTab === 'groups' && selectedSchool) || (activeTab === 'batches' && selectedGroup)) && (
        <>
          {activeTab === 'mothers' && selectedBatch && (
            <>
              <ModuleSummaryCards
                selected={selectedBatchCard}
                onSelect={(selection) => {
                  setSelectedBatchCard(selection);
                  if (selection === 'Mother' || selection === 'Child') handleEntityFilterChange(selection);
                  else setQuery('');
                  setPage(1);
                }}
                cards={[
                  { key: 'Mother', label: 'Mothers', value: selectedBatchAllMothers.length, description: 'View list' },
                  {
                    key: 'Child',
                    label: 'Children',
                    value: childrenOverviewError ? 'Unavailable' : selectedBatchChildren.length,
                    description: 'View list',
                  },
                  {
                    key: 'Documentation',
                    label: 'Documentation',
                    value: batchDocumentationLoading ? '...' : batchDocumentationCount ?? 'Error',
                    description: isCommunityOrganizer
                      ? 'View or add dated photo evidence'
                      : 'View and download dated photo evidence',
                  },
                ]}
              />
              {childrenOverviewError && <p className="error-message" role="alert">{childrenOverviewError}</p>}
              <BatchDocumentationPanel
                key={String(selectedBatch.id)}
                batchId={selectedBatch.id}
                visible={selectedBatchCard === 'Documentation'}
                canManage={isCommunityOrganizer}
                onCountChange={setBatchDocumentationCount}
                onLoadingChange={setBatchDocumentationLoading}
              />
            </>
          )}
          {(activeTab !== 'mothers' || !selectedBatch || selectedBatchCard !== 'Documentation') && (
            <CommunityTable
              columns={columns}
              data={currentRows}
              onRowClick={currentRowClickHandler}
              tableTitle={tableTitle}
              searchValue={query}
              onSearchChange={handleSearch}
            />
          )}

          {(activeTab !== 'mothers' || !selectedBatch || selectedBatchCard !== 'Documentation') && (
            <CommunityPagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              perPage={perPage}
              onPerPageChange={handlePerPageChange}
              rangeStart={tableData.length === 0 ? 0 : startIndex + 1}
              rangeEnd={Math.min(startIndex + perPage, tableData.length)}
              totalItems={tableData.length}
            />
          )}
        </>
      )}

      <CommunityModalManager
        showModal={showModal}
        onClose={() => {
          setShowModal(null);
          mutations.clearError();
        }}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        communities={communities}
        groups={groups}
        batches={batches}
        coordinators={coordinators}
        onCreateCommunity={handleCreateCommunity}
        onEditCommunity={handleEditCommunity}
        onCreateBatch={handleCreateBatch}
        onEditBatch={handleEditBatch}
        showBatchGroupField={showModal === 'createBatch'}
        hideBatchSchoolField={showModal === 'createBatch' && (isHealthWorker || Boolean(selectedSchool || selectedGroup))}
        onCreateGroup={handleCreateGroup}
        onEditGroup={handleEditGroup}
        hideGroupSchoolField={isHealthWorker || isAssignedCommunityOrganizer || Boolean(selectedSchool)}
        isSubmitting={mutations.loading}
        notification={mutations.error}
        selectedCommunityId={showModal === 'editCommunity' ? selectedItem?.id : null}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === 'group' ? 'Delete Group?' : `Delete ${pendingDelete?.type || 'record'}?`}
        description={getPendingDeleteDescription()}
        confirmLabel={pendingDelete?.type === 'group' ? 'Delete Group' : pendingDelete?.type === 'community' ? 'Delete School' : 'Delete'}
        loadingLabel={pendingDelete?.type === 'group' ? 'Deleting...' : 'Deleting...'}
        loading={deleteSubmitting}
        confirmDisabled={deleteImpactLoading}
        summary={pendingDelete?.type === 'group' ? getGroupDeletionSummary(pendingDelete.impact, deleteImpactLoading) : []}
        error={deleteError || deleteImpactError}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
