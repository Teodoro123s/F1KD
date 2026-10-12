import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommunityTable from './CommunityTable';
import CommunityModalManager from './CommunityModalManager';
import { ConfirmActionModal } from './CommunityModals';
import CommunityToolbar from './components/CommunityToolbar';
import CommunityPagination from './components/CommunityPagination';
import { MoreVerticalIcon } from './CommunityIcons';
import { useCommunityData } from './hooks/useCommunityData';
import { useCommunityMutations } from './hooks/useCommunityMutations';
import { useAuth } from '../../../../auth/AuthProvider';
import { can, hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, isSchoolScopedRole, ROLES } from '../../../../utils/permissions';
import { getMotherProfileProgress } from '../_shared/utils/motherProgress';
import { getChildProfileProgress } from '../_shared/utils/childProgress';
import { apiDeleteMother } from '../../../../api/mothers';
import { apiGetChildren } from '../../../../api/children';
import { notifyAction } from '../_shared/components/ActionFeedback';
import { BatchesIcon, GroupsIcon, UsersIcon } from '../../../../components/ui/ModuleIcons';
import '../../_shared/community-module.css';
import './community-page.css';

const defaultCommunityForm = { name: '', area: 'Poblacion', coordinator: '' };
const defaultGroupForm = { name: '', batchName: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' };
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [childrenRows, setChildrenRows] = useState([]);

  const activeTab = batchId
    ? (isSuperAdmin ? 'batches' : 'mothers')
    : isHealthWorker
      ? 'batches'
      : isAssignedCommunityOrganizer
        ? (groupId ? 'batches' : 'groups')
        : groupId
          ? 'batches'
          : schoolId
            ? 'groups'
            : 'communities';

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(batchId)),
    [batches, batchId]
  );

  const selectedGroup = useMemo(() => {
    const groupFromRoute = scopedGroups.find((group) => String(group.id) === String(isHealthWorker ? assignedGroupId : groupId));

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
  }, [assignedGroupId, groupId, isHealthWorker, scopedGroups, selectedBatch]);

  const selectedSchool = useMemo(() => {
    const sourceCommunities = isSchoolScopedUser ? scopedCommunities : communities;
    const schoolFromRoute = sourceCommunities.find((community) => String(community.id) === String(schoolId || assignedSchoolId));

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
  }, [assignedSchoolId, communities, isSchoolScopedUser, scopedCommunities, schoolId, selectedBatch, selectedGroup]);

  const selectedSchoolGroups = useMemo(() => {
    if (!selectedSchool) return [];

    return scopedGroups
      .filter((group) => group.community === selectedSchool.name)
      .filter((group) => {
        if (!query.trim()) return true;
        const term = query.trim().toLowerCase();
        return [group.name, String(group.id), group.leader, group.status].some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      });
  }, [query, scopedGroups, selectedSchool]);

  const groupBatches = useMemo(() => {
    if (!selectedGroup) return [];

    return batches
      .filter((batch) => {
        const assignedGroupIds = String(batch.groupIds || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const groupNames = String(batch.groupNames || batch.group_name || batch.group || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const sameGroupName = groupNames.some((name) => String(name).toLowerCase() === String(selectedGroup.name || '').toLowerCase());
        const sameCommunity = String(batch.community || '').toLowerCase() === String(selectedGroup.community || '').toLowerCase();

        return assignedGroupIds.includes(String(selectedGroup.id))
          || sameGroupName
          || (assignedGroupIds.length === 0 && sameCommunity);
      });
  }, [batches, selectedGroup]);

  const selectedGroupBatches = useMemo(() => {
    if (!query.trim()) return groupBatches;
    const term = query.trim().toLowerCase();
    return groupBatches.filter((batch) =>
      [batch.name, String(batch.id), batch.community, batch.status].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [groupBatches, query]);

  const selectedBatchMothers = useMemo(() => {
    if (!selectedBatch) return [];

    return mothers
      .filter((mother) => mother.batchId === selectedBatch.id)
      .filter((mother) => {
        if (!query.trim()) return true;
        const term = query.trim().toLowerCase();
        return [mother.name, String(mother.id), mother.group, mother.status].some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      });
  }, [mothers, query, selectedBatch]);

  useEffect(() => {
    if (activeTab !== 'mothers' || entityFilter !== 'Child') {
      setChildrenRows([]);
      return;
    }

    let active = true;

    apiGetChildren()
      .then((response) => {
        const rows = (response.children || []).map((child) => {
          const childName = child.name || [child.first_name, child.middle_name, child.last_name, child.suffix].filter(Boolean).join(' ');
          const motherName = child.mother_first_name || child.motherFirstName
            ? `${child.mother_first_name || child.motherFirstName || ''} ${child.mother_last_name || child.motherLastName || ''}`.trim()
            : child.mother_name || '';

          return {
            id: child.id,
            name: childName || 'Unnamed child',
            motherName,
            community: child.community_name || child.community || '',
            group: child.group_name || child.group || '',
            batch: child.batch_name || child.batch || '',
            batchId: child.batch_id ?? child.batchId ?? null,
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
        }
      });

    return () => { active = false; };
  }, [activeTab, entityFilter]);

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (activeTab === 'communities') {
      return scopedCommunities.filter((community) => {
        if (!term) return true;
        return [community.name, String(community.id), community.area].some((value) =>
          String(value || '').toLowerCase().includes(term)
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
          String(value || '').toLowerCase().includes(term)
        );
      });
    }

    return selectedBatchMothers;
  }, [activeTab, childrenRows, communities, entityFilter, query, scopedCommunities, selectedBatch, selectedBatchMothers, selectedGroup, selectedGroupBatches, selectedSchool, selectedSchoolGroups]);

  const organizerOverview = useMemo(() => {
    const schoolGroups = selectedSchool
      ? scopedGroups.filter((group) => String(group.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase())
      : [];
    const groupIds = new Set(schoolGroups.map((group) => String(group.id)));
    const groupNames = new Set(schoolGroups.map((group) => String(group.name || '').trim().toLowerCase()).filter(Boolean));
    const schoolBatches = selectedSchool
      ? batches.filter((batch) => {
        const batchGroupIds = String(batch.groupIds || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const batchGroupNames = String(batch.groupNames || batch.group_name || batch.group || '')
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);
        return batchGroupIds.some((id) => groupIds.has(id))
          || batchGroupNames.some((name) => groupNames.has(name))
          || (!batchGroupIds.length && !batchGroupNames.length
            && String(batch.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase());
      })
      : [];
    const batchIds = new Set(schoolBatches.flatMap((batch) => [
      batch.id,
      batch.databaseId,
      batch.batchCode,
      batch.code,
    ]).filter((id) => id !== null && id !== undefined && id !== '').map(String));
    const beneficiaryCount = mothers.filter((mother) => batchIds.has(String(mother.batchId ?? mother.batch_id ?? ''))).length;

    return {
      groupCount: schoolGroups.length,
      batchCount: schoolBatches.length,
      beneficiaryCount,
    };
  }, [batches, mothers, scopedGroups, selectedSchool]);

  const organizerGroupOverview = useMemo(() => {
    const batchIds = new Set(groupBatches.flatMap((batch) => [
      batch.id,
      batch.databaseId,
      batch.batchCode,
      batch.code,
    ]).filter((id) => id !== null && id !== undefined && id !== '').map(String));
    const motherCount = mothers.filter((mother) =>
      batchIds.has(String(mother.batchId ?? mother.batch_id ?? ''))
    ).length;
    const averageProgress = groupBatches.length
      ? Math.round(groupBatches.reduce((total, batch) => total + Number(batch.progress ?? 0), 0) / groupBatches.length)
      : 0;

    return {
      batchCount: groupBatches.length,
      motherCount,
      averageProgress,
    };
  }, [groupBatches, mothers]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = filteredData.slice(startIndex, startIndex + perPage);

  const tableTitle = useMemo(() => {
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
  }, [activeTab, selectedBatch, selectedGroup, selectedSchool]);

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

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    setActiveDropdownId((current) => (current === id ? null : id));
  };

  const openCreateModal = () => {
    if (activeTab === 'communities') {
      setCommunityForm(defaultCommunityForm);
      setShowModal('createCommunity');
      return;
    }

    if (activeTab === 'groups') {
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

  const requestDelete = (item) => {
    const type = activeTab === 'communities'
      ? 'school'
      : activeTab === 'groups'
        ? 'group'
        : activeTab === 'batches'
          ? 'batch'
          : 'mother';
    setPendingDelete({ id: item.id, name: item.name, type });
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleteSubmitting) return;
    setDeleteSubmitting(true);

    try {
      if (pendingDelete.type === 'school') {
        await mutations.deleteCommunity(pendingDelete.id);
      } else if (pendingDelete.type === 'group') {
        await mutations.deleteGroup(pendingDelete.id);
      } else if (pendingDelete.type === 'batch') {
        await mutations.deleteBatch(pendingDelete.id);
      } else {
        const deleted = await handleDeleteMother(pendingDelete.id);
        if (!deleted) return;
      }
      setPendingDelete(null);
    } catch (error) {
      console.error(`[CommunityPage] Unable to delete ${pendingDelete.type}:`, error);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteMother = async (id) => {
    try {
      await apiDeleteMother(id);
      await refreshData();
      notifyAction('Mother deleted successfully.');
      return true;
    } catch (error) {
      console.error('[CommunityPage] Unable to delete mother:', error);
      notifyAction(error?.message || 'Unable to delete mother.', 'error');
      return false;
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
                    setActiveDropdownId(null);
                    if (activeTab === 'mothers') {
                      requestDelete(row);
                      return;
                    }

                    requestDelete(row);
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
  }, [activeDropdownId, activeTab, canManage, canManageSchools, entityFilter, groups, navigate, openEditModal, requestDelete]);

  const currentRowClickHandler =
    activeTab === 'communities'
      ? (school) => navigate(`/community/school/${school.id}`)
      : activeTab === 'groups'
        ? (group) => navigate(`/community/group/${group.id}`)
        : activeTab === 'batches'
          ? isSuperAdmin
            ? undefined
            : (batch) => navigate(`/beneficiary?batchId=${encodeURIComponent(batch.databaseId || batch.id)}`, { state: { batch } })
          : entityFilter === 'Child'
            ? (child) => handleChildRowClick(child)
            : (mother) => handleMotherRowClick(mother);

  if (loading) {
    return <div className={`community-page community-module-page${isCommunityOrganizer ? ' community-page--organizer' : ''}`}><p>Loading community data...</p></div>;
  }

  if (error) {
    return <div className={`community-page community-module-page${isCommunityOrganizer ? ' community-page--organizer' : ''}`}><p className="error-message">{error}</p></div>;
  }

  return (
    <div className={`community-page community-module-page${isCommunityOrganizer ? ' community-page--organizer' : ''}`}>
      <CommunityToolbar
        activeTab={activeTab}
        query={query}
        entityFilter={entityFilter}
        onSearch={handleSearch}
        onEntityFilterChange={handleEntityFilterChange}
        onTabChange={handleTabChange}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage={canManage && (activeTab !== 'communities' || canManageSchools)}
        isCommunityOrganizer={isCommunityOrganizer}
      />

      {isCommunityOrganizer && activeTab === 'groups' && (
        <section className="organizer-community-summary" aria-label="School community overview">
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Total groups</div>
            <div className="organizer-community-stat__value">{organizerOverview.groupCount}</div>
            <div className="organizer-community-stat__detail">{selectedSchool?.name || 'Assigned school'}</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--groups" aria-hidden="true"><GroupsIcon /></span>
          </article>
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Total batches</div>
            <div className="organizer-community-stat__value">{organizerOverview.batchCount}</div>
            <div className="organizer-community-stat__detail">Across your groups</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--batches" aria-hidden="true"><BatchesIcon /></span>
          </article>
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Mothers</div>
            <div className="organizer-community-stat__value">{organizerOverview.beneficiaryCount}</div>
            <div className="organizer-community-stat__detail">In your assigned batches</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--beneficiaries" aria-hidden="true"><UsersIcon /></span>
          </article>
        </section>
      )}

      {isCommunityOrganizer && activeTab === 'batches' && (
        <section className="organizer-community-summary" aria-label="Group overview">
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Total batches</div>
            <div className="organizer-community-stat__value">{organizerGroupOverview.batchCount}</div>
            <div className="organizer-community-stat__detail">{selectedGroup?.name || 'Selected group'}</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--batches" aria-hidden="true"><BatchesIcon /></span>
          </article>
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Mothers</div>
            <div className="organizer-community-stat__value">{organizerGroupOverview.motherCount}</div>
            <div className="organizer-community-stat__detail">Across this group's batches</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--beneficiaries" aria-hidden="true"><UsersIcon /></span>
          </article>
          <article className="organizer-community-stat">
            <div className="organizer-community-stat__label">Average progress</div>
            <div className="organizer-community-stat__value">{organizerGroupOverview.averageProgress}%</div>
            <div className="organizer-community-stat__detail">Across this group's batches</div>
            <span className="organizer-community-stat__icon organizer-community-stat__icon--groups" aria-hidden="true"><GroupsIcon /></span>
          </article>
        </section>
      )}

      <CommunityTable
        columns={columns}
        data={currentRows}
        onRowClick={currentRowClickHandler}
        tableTitle={tableTitle}
        minRows={10}
        tableControls={isCommunityOrganizer && (
          <label className="organizer-community-search">
            <span className="organizer-community-search__icon" aria-hidden="true">⌕</span>
            <span className="sr-only">Search community records</span>
            <input
              type="search"
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={`Search ${activeTab === 'groups' ? 'groups' : activeTab === 'batches' ? 'batches' : 'beneficiaries'}...`}
            />
          </label>
        )}
        tableFooter={isCommunityOrganizer && (
          <CommunityPagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={handlePerPageChange}
            rangeStart={filteredData.length === 0 ? 0 : startIndex + 1}
            rangeEnd={Math.min(startIndex + perPage, filteredData.length)}
            totalItems={filteredData.length}
          />
        )}
      />

      {!isCommunityOrganizer && (
        <CommunityPagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={handlePerPageChange}
          rangeStart={filteredData.length === 0 ? 0 : startIndex + 1}
          rangeEnd={Math.min(startIndex + perPage, filteredData.length)}
          totalItems={filteredData.length}
        />
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
        hideBatchSchoolField={isHealthWorker || Boolean(schoolId || groupId)}
        onCreateGroup={handleCreateGroup}
        onEditGroup={handleEditGroup}
        hideGroupSchoolField={isHealthWorker || isAssignedCommunityOrganizer || Boolean(schoolId)}
        isSubmitting={mutations.loading}
      />

      <ConfirmActionModal
        show={Boolean(pendingDelete)}
        title={pendingDelete?.type === 'group' || pendingDelete?.type === 'batch'
          ? `Delete ${pendingDelete.type} and its content?`
          : pendingDelete ? `Delete ${pendingDelete.type}?` : 'Confirm deletion'}
        message={pendingDelete
          ? ['group', 'batch'].includes(pendingDelete.type)
            ? `Are you sure you want to delete "${pendingDelete.name}" and its content? This action cannot be undone.`
            : `Are you sure you want to delete "${pendingDelete.name}"? This action cannot be undone.`
          : ''}
        confirmLabel={['group', 'batch'].includes(pendingDelete?.type)
          ? `Delete ${pendingDelete.type} and its content`
          : 'Delete'}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteSubmitting) setPendingDelete(null);
        }}
        isSubmitting={deleteSubmitting}
      />
    </div>
  );
}
