import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommunityTable from './CommunityTable';
import CommunityModalManager from './CommunityModalManager';
import CommunityToolbar from './components/CommunityToolbar';
import CommunityPagination from './components/CommunityPagination';
import CommunityOverviewCards from './components/CommunityOverviewCards';
import { MoreVerticalIcon } from './CommunityIcons';
import { useCommunityData } from './hooks/useCommunityData';
import { useCommunityMutations } from './hooks/useCommunityMutations';
import { useAuth } from '../../auth/AuthProvider';
import { can, hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, isSchoolScopedRole, ROLES } from '../../utils/permissions';
import { getMotherProfileProgress } from '../../utils/motherProgress';
import { getChildProfileProgress } from '../../utils/childProgress';
import { apiDeleteMother } from '../../api/mothers';
import { apiGetChildren } from '../../api/children';
import { notifyAction } from '../../components/ActionFeedback';

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
  const { schoolId, groupId, batchId } = useParams();
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canManageSchools = isSuperAdmin;
  const canManage = can(currentUser?.role, 'community-resources', 'update') && !isHealthWorkerRole(currentUser?.role);
  const assignedSchoolId = currentUser?.school_id ?? currentUser?.schoolId ?? null;
  const assignedGroupId = currentUser?.group_id ?? currentUser?.groupId ?? null;
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isAssignedCommunityOrganizer = isCommunityOrganizer && Boolean(assignedSchoolId);
  const isSchoolScopedUser = isSchoolScopedRole(currentUser?.role);

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
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [childrenRows, setChildrenRows] = useState([]);
  const [childrenOverviewError, setChildrenOverviewError] = useState('');
  const [showChildMotherColumn, setShowChildMotherColumn] = useState(true);
  const [showChildBatchColumn, setShowChildBatchColumn] = useState(true);
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

  const selectedBatchMothers = useMemo(() => {
    if (!selectedBatch) return [];

    return mothers
      .filter((mother) => mother.batchId === selectedBatch.id)
      .filter((mother) => {
        if (!query.trim()) return true;
        const term = query.trim();
        return [mother.name, String(mother.id), mother.group, mother.status].some((value) =>
          String(value || '').includes(term)
        );
      });
  }, [mothers, query, selectedBatch]);

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

  useEffect(() => {
    const shouldLoadChildren = (activeTab === 'mothers' && entityFilter === 'Child')
      || activeTab === 'communities'
      || (activeTab === 'groups' && Boolean(selectedSchool))
      || (activeTab === 'batches' && Boolean(selectedGroup));
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
  }, [activeTab, entityFilter, selectedGroup, selectedSchool]);

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
    const source = schoolOverviewSelection === 'mothers'
      ? (activeTab === 'batches' && selectedGroup ? selectedGroupMothers : schoolOverviewMothers)
      : schoolOverviewSelection === 'children'
        ? childOverviewRows
        : schoolOverviewSelection === 'batches'
          ? (activeTab === 'batches' && selectedGroup ? selectedGroupBatches : schoolOverviewBatches)
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
      return [row.name, row.motherName, row.batch, row.group, row.community, row.schoolName, String(row.id)]
        .some((value) => String(value || '').includes(term));
    });
  }, [activeTab, childOverviewRows, query, schoolOverviewBatches, schoolOverviewGroups, schoolOverviewMothers, schoolOverviewSelection, scopedGroups, selectedGroup, selectedGroupBatches, selectedGroupMothers]);
  const tableData = schoolOverviewSelection ? overviewRows : filteredData;
  const pageCount = Math.max(1, Math.ceil(tableData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = tableData.slice(startIndex, startIndex + perPage);

  const tableTitle = useMemo(() => {
    if (schoolOverviewSelection === 'groups') return `Groups: ${selectedSchool?.name || 'All schools'}`;
    if (schoolOverviewSelection === 'mothers') return `Mothers: ${selectedSchool?.name || 'School'}`;
    if (schoolOverviewSelection === 'children') return `Children: ${selectedSchool?.name || 'School'}`;
    if (schoolOverviewSelection === 'batches') return `Batches: ${selectedGroup?.name || selectedSchool?.name || 'School'}`;

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
    const closeDropdowns = () => setActiveDropdownId(null);
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

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
    setQuery('');
    setPage(1);
  };

  const handleOverviewSelection = (selection) => {
    setSchoolOverviewSelection(selection);
    setPage(1);
  };

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    setActiveDropdownId((current) => (current === id ? null : id));
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

  const openEditModal = (item) => {
    setSelectedItem(item);

    if (activeTab === 'communities') {
      setCommunityForm({
        name: item.name,
        area: item.area,
        coordinator: item.coordinatorId || '',
      });
      setShowModal('editCommunity');
      return;
    }

    if (activeTab === 'groups') {
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
      groupId: selectedGroup?.id || groupId || String(item.groupIds || '').split(',')[0] || '',
      records: item.records,
      progress: item.progress ?? 0,
      status: item.status,
    });
    setShowModal('editBatch');
  };

  const handleCreateCommunity = async (event) => {
    event.preventDefault();
    if (!communityForm.name.trim()) return;

    await mutations.createCommunity(communityForm);
    setShowModal(null);
  };

  const handleEditCommunity = async (event) => {
    event.preventDefault();
    if (!communityForm.name.trim()) return;

    await mutations.updateCommunity(selectedItem.id, communityForm);
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

  const handleDeleteCommunity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this community?')) return;
    await mutations.deleteCommunity(id);
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    await mutations.deleteGroup(id);
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    await mutations.deleteBatch(id);
  };

  const handleDeleteMother = async (id) => {
    if (!window.confirm('Are you sure you want to delete this mother?')) return;

    try {
      await apiDeleteMother(id);
      await refreshData();
      notifyAction('Mother deleted successfully.');
    } catch (error) {
      console.error('[CommunityPage] Unable to delete mother:', error);
      notifyAction(error?.message || 'Unable to delete mother.', 'error');
    }
  };

  const handleMotherRowClick = (mother) => {
    navigate(`/beneficiary/mother/${mother.id}`, { state: { mother } });
  };

  const handleChildRowClick = (child) => {
    navigate(`/beneficiary/child/${child.id}`, {
      state: {
        child: child.raw || child,
        mother: child.raw?.mother || child.mother || null,
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
              onClick={(event) => toggleDropdown(event, row.id)}
              aria-label="Actions menu"
              aria-haspopup="true"
              aria-expanded={activeDropdownId === row.id}
            >
              <MoreVerticalIcon />
            </button>
            {activeDropdownId === row.id && (
              <div className="actions-dropdown" role="menu">
                {activeTab !== 'mothers' && (
                  <button
                    type="button"
                    className="actions-dropdown-item"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditModal(row);
                      setActiveDropdownId(null);
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
                    if (activeTab === 'mothers') {
                      handleDeleteMother(row.id);
                      return;
                    }

                    if (activeTab === 'communities') {
                      handleDeleteCommunity(row.id);
                    } else if (activeTab === 'groups') {
                      handleDeleteGroup(row.id);
                    } else {
                      handleDeleteBatch(row.id);
                    }
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
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
        { key: 'assignedBatchIds', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.assignedBatchIds?.length ?? row.batches ?? 0 },
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
  }, [activeDropdownId, activeTab, canManage, canManageSchools, entityFilter, groups, handleDeleteBatch, handleDeleteCommunity, handleDeleteGroup, handleDeleteMother, navigate, openEditModal]);

  const overviewColumns = useMemo(() => {
    if (schoolOverviewSelection === 'groups') {
      return [
        { key: 'name', header: 'Group Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        ...(activeTab === 'communities' ? [{ key: 'schoolName', header: 'School' }] : []),
        { key: 'assignedBatchIds', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.assignedBatchIds?.length ?? row.batches ?? 0 },
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
      return [
        { key: 'name', header: 'Batch Name', renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'records', header: 'Total Mothers', cellClassName: 'compact-column', renderCell: (row) => row.records || 0 },
        { key: 'progress', header: 'Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${row.progress ?? 0}%` },
      ];
    }
    return columns;
  }, [activeTab, columns, schoolOverviewSelection, showChildBatchColumn, showChildMotherColumn]);

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
        entityFilter={entityFilter}
        onEntityFilterChange={handleEntityFilterChange}
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
              { key: 'groups', label: 'Total Groups', value: activeTab === 'communities' ? groups.length : schoolOverviewGroups.length },
              { key: 'batches', label: 'Total Batches', value: activeTab === 'communities' ? batches.length : schoolOverviewBatches.length },
              { key: 'mothers', label: 'Total Mothers', value: activeTab === 'communities' ? mothers.length : schoolOverviewMothers.length },
              { key: 'children', label: 'Total Children', value: childrenOverviewError ? 'Unavailable' : activeTab === 'communities' ? childrenRows.length : schoolOverviewChildren.length },
            ]}
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
                emptyMessage={`No ${schoolOverviewSelection} found for this school.`}
                searchValue={query}
                onSearchChange={handleSearch}
              />
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
          <CommunityTable
            columns={columns}
            data={currentRows}
            onRowClick={currentRowClickHandler}
            tableTitle={tableTitle}
            searchValue={query}
            onSearchChange={handleSearch}
          />

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
      )}

      <CommunityModalManager
        showModal={showModal}
        onClose={() => setShowModal(null)}
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
      />
    </div>
  );
}
