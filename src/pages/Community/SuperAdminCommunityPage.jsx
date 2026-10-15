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
import CommunityOverviewCards from './components/CommunityOverviewCards';
import { getAllHealthWorkers, getGroupHealthWorkers } from './communityService';

const defaultCommunityForm = { name: '', area: 'Poblacion', coordinator: '' };
const defaultGroupForm = { name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' };
const defaultBatchForm = { name: '', community: '', records: 1, progress: 0, status: 'Active' };

export default function SuperAdminCommunityPage() {
  const navigate = useNavigate();
  const { schoolId, groupId, batchId } = useParams();
  const { communities, batches, groups, coordinators, totalHealthWorkers, loading, error, refreshData } = useCommunityData();
  const mutations = useCommunityMutations({ refreshData });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [selectedSchoolId, setSelectedSchoolId] = useState(schoolId || null);
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || null);
  const [rootListType, setRootListType] = useState('communities');
  const [healthWorkers, setHealthWorkers] = useState([]);
  const [healthWorkersLoading, setHealthWorkersLoading] = useState(false);
  const [healthWorkersError, setHealthWorkersError] = useState('');
  const [groupHealthWorkers, setGroupHealthWorkers] = useState([]);
  const [groupHealthWorkersLoading, setGroupHealthWorkersLoading] = useState(false);
  const [groupHealthWorkersError, setGroupHealthWorkersError] = useState('');

  const activeSchoolId = selectedSchoolId;
  const activeGroupId = selectedGroupId;
  const activeTab = activeGroupId ? 'healthWorkers' : activeSchoolId ? 'groups' : rootListType;

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const clickedInsideDropdown = event.target.closest('.actions-dropdown');
      const clickedToggleButton = event.target.closest('.btn-actions');

      if (!clickedInsideDropdown && !clickedToggleButton) {
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    if (rootListType !== 'healthWorkers') return undefined;

    let active = true;
    setHealthWorkersLoading(true);
    setHealthWorkersError('');
    getAllHealthWorkers()
      .then((response) => {
        if (active) setHealthWorkers(Array.isArray(response.users) ? response.users : []);
      })
      .catch((requestError) => {
        if (active) setHealthWorkersError(requestError.message || 'Unable to load health workers.');
      })
      .finally(() => {
        if (active) setHealthWorkersLoading(false);
      });

    return () => { active = false; };
  }, [rootListType]);

  useEffect(() => {
    setPage(1);
    setQuery('');
    setActiveDropdownId(null);
    setSelectedSchoolId(schoolId || null);
    setSelectedGroupId(groupId || null);
    setRootListType('communities');
  }, [groupId, schoolId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(activeGroupId)) || null,
    [activeGroupId, groups],
  );
  const selectedSchool = useMemo(
    () => communities.find((community) => String(community.id) === String(activeSchoolId || selectedGroup?.communityId))
      || communities.find((community) => community.name === selectedGroup?.community)
      || null,
    [activeSchoolId, communities, selectedGroup],
  );
  const getSchoolCoordinator = (school) => coordinators.find((coordinator) => String(coordinator.schoolId || '') === String(school?.id || ''));

  useEffect(() => {
    if (!selectedGroup || activeSchoolId) return;
    const parentSchool = communities.find((community) => String(community.id) === String(selectedGroup.communityId))
      || communities.find((community) => community.name === selectedGroup.community);
    if (parentSchool) setSelectedSchoolId(parentSchool.id);
  }, [activeSchoolId, communities, selectedGroup]);

  useEffect(() => {
    if (!activeGroupId) return undefined;

    let active = true;
    setGroupHealthWorkersLoading(true);
    setGroupHealthWorkersError('');
    getGroupHealthWorkers(activeGroupId)
      .then((response) => {
        if (!active) return;
        const workers = Array.isArray(response.users) ? response.users : [];
        setGroupHealthWorkers(workers
          .filter((worker) => String(worker.role || '').trim().toLowerCase().replace(/[\s_]/g, '') === 'healthworker')
          .map((worker) => ({
            ...worker,
            school_name: worker.school_name || selectedSchool?.name || selectedGroup?.community || '',
            group_name: worker.group_name || selectedGroup?.name || '',
          })));
      })
      .catch((requestError) => {
        if (active) setGroupHealthWorkersError(requestError.message || 'Unable to load group health workers.');
      })
      .finally(() => {
        if (active) setGroupHealthWorkersLoading(false);
      });

    return () => { active = false; };
  }, [activeGroupId, selectedGroup, selectedSchool]);

  const schoolGroups = useMemo(
    () => selectedSchool
      ? groups.filter((group) => (
        group.communityId != null
          ? String(group.communityId) === String(selectedSchool.id)
          : String(group.community || '').toLowerCase() === String(selectedSchool.name || '').toLowerCase()
      ))
      : [],
    [groups, selectedSchool],
  );
  const selectedGroupBatches = useMemo(
    () => activeGroupId
      ? batches.filter((batch) => String(batch.groupIds || '').split(',').map((id) => id.trim()).includes(String(activeGroupId)))
      : [],
    [activeGroupId, batches],
  );
  const overviewCards = [
    { key: 'communities', label: 'Total Schools', value: communities.length },
    { key: 'groups', label: 'Total Groups', value: activeSchoolId ? schoolGroups.length : groups.length },
    { key: 'healthWorkers', label: 'Total Health Workers', value: activeGroupId ? groupHealthWorkers.length : totalHealthWorkers },
  ];
  const selectedOverviewCard = activeGroupId ? 'healthWorkers' : activeSchoolId ? 'groups' : rootListType;

  useEffect(() => {
    if (!batchId || loading) return;
    const selectedBatch = batches.find((batch) => String(batch.id || batch.code) === String(batchId));
    const parentGroupId = String(selectedBatch?.groupIds || '').split(',').map((id) => id.trim()).find(Boolean);
    if (parentGroupId) navigate(`/community/group/${parentGroupId}`, { replace: true });
    else if (selectedBatch?.community) {
      const parentSchool = communities.find((community) => community.name === selectedBatch.community);
      navigate(parentSchool ? `/community/school/${parentSchool.id}` : '/community', { replace: true });
    } else navigate('/community', { replace: true });
  }, [batchId, batches, communities, loading, navigate]);

  const filteredData = useMemo(() => {
    const term = query.trim();
    let rows = communities;

    if (activeTab === 'groups') {
      rows = (selectedSchool ? schoolGroups : groups).map((group) => ({
        ...group,
        schoolName: group.community || communities.find((community) => String(community.id) === String(group.communityId))?.name || selectedSchool?.name || 'Unknown school',
      }));
    } else if (activeTab === 'batches') {
      rows = selectedGroupBatches;
    } else if (activeTab === 'healthWorkers') {
      rows = activeGroupId ? groupHealthWorkers : healthWorkers;
    }

    if (!term) return rows;
    return rows.filter((row) => [row.name, row.area, row.community, row.schoolName, row.groupName, row.email, row.contact_number, row.status, row.leader, row.id]
      .some((value) => String(value || '').includes(term)));
  }, [activeGroupId, activeTab, communities, groupHealthWorkers, groups, healthWorkers, query, schoolGroups, selectedGroupBatches, selectedSchool]);
  const tableData = filteredData;
  const pageCount = Math.max(1, Math.ceil(tableData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = tableData.slice(startIndex, startIndex + perPage);

  const tableTitle = activeTab === 'communities'
    ? 'Schools'
    : activeTab === 'groups'
      ? selectedSchool ? `Groups: ${selectedSchool.name}` : 'Groups: All schools'
      : activeTab === 'healthWorkers'
        ? activeGroupId ? `Health Workers: ${selectedGroup?.name || 'Group'}` : 'Health Workers: All schools'
        : `Batches: ${selectedGroup?.name || 'Group'}`;

  const breadcrumbItems = [
    { label: 'Schools', clickable: false },
    ...(selectedSchool ? [{ label: selectedSchool.name, clickable: false }] : []),
    ...(selectedGroup ? [{ label: selectedGroup.name, clickable: false }] : []),
    ...(activeTab === 'healthWorkers' ? [{ label: 'Health Workers', clickable: false }] : []),
  ];

  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  const selectGroup = (group) => {
    const parentSchool = communities.find((community) => String(community.id) === String(group.communityId))
      || communities.find((community) => community.name === group.community);
    setSelectedGroupId(group.id);
    setSelectedSchoolId(parentSchool?.id || group.communityId || null);
    setRootListType('communities');
    setQuery('');
    setPage(1);
  };

  const selectSchool = (school) => {
    setSelectedSchoolId(school.id);
    setSelectedGroupId(null);
    setQuery('');
    setPage(1);
  };

  const handleOverviewSelect = (selection) => {
    if (selection === 'healthWorkers') {
      if (!activeGroupId) {
        setSelectedSchoolId(null);
        setSelectedGroupId(null);
        setRootListType('healthWorkers');
      }
      setQuery('');
      setPage(1);
      return;
    }
    if (selection === 'batches') {
      setQuery('');
      setPage(1);
      return;
    }
    if (selection === 'communities') {
      setSelectedSchoolId(null);
      setSelectedGroupId(null);
      setRootListType('communities');
    } else if (activeGroupId) {
      setSelectedGroupId(null);
    } else if (activeSchoolId) {
      setSelectedGroupId(null);
    } else {
      setRootListType('groups');
    }

    setQuery('');
    setPage(1);
  };

  const openCreateModal = (type = activeTab === 'communities' ? 'community' : activeTab === 'groups' ? 'group' : 'batch') => {
    if (type === 'community') {
      setCommunityForm(defaultCommunityForm);
      setShowModal('createCommunity');
      return;
    }

    if (type === 'group') {
      setGroupForm({ ...defaultGroupForm, community: selectedSchool?.name || communities[0]?.name || '' });
      setShowModal('createGroup');
      return;
    }

    setBatchForm({
      ...defaultBatchForm,
      community: selectedSchool?.name || selectedGroup?.community || communities[0]?.name || '',
      groupId: String(selectedGroup?.id || ''),
    });
    setShowModal('createBatch');
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'communities') {
      setCommunityForm({ name: item.name, area: item.area, coordinator: item.coordinatorId || getSchoolCoordinator(item)?.id || '' });
      setShowModal('editCommunity');
      return;
    }
    if (activeTab === 'groups') {
      setGroupForm({ ...defaultGroupForm, ...item, community: item.community || selectedSchool?.name || '' });
      setShowModal('editGroup');
      return;
    }
    if (activeTab === 'batches') {
      setBatchForm({
        ...defaultBatchForm,
        ...item,
        community: item.community || selectedSchool?.name || '',
        groupId: String(selectedGroup?.id || String(item.groupIds || '').split(',')[0] || ''),
      });
      setShowModal('editBatch');
    }
    return;
  };

  const deleteItem = (item) => {
    setPendingDeleteItem(item);
  };

  const confirmDeleteItem = async () => {
    if (!pendingDeleteItem) return;

    const item = pendingDeleteItem;
    setPendingDeleteItem(null);

    if (activeTab === 'communities') await mutations.deleteCommunity(item.id);
    else if (activeTab === 'groups') await mutations.deleteGroup(item.id);
    else await mutations.deleteBatch(item.id);
  };

  const columns = useMemo(() => {
    const actionColumn = {
      key: 'actions',
      header: 'Actions',
      thClassName: 'actions-cell',
      cellClassName: 'actions-cell',
      renderCell: (row) => (
        <>
          <button type="button" className="btn-actions" onClick={(event) => { event.stopPropagation(); setActiveDropdownId((current) => current === row.id ? null : row.id); }} aria-label="Actions menu" aria-haspopup="true" aria-expanded={activeDropdownId === row.id}>
            <MoreVerticalIcon />
          </button>
          {activeDropdownId === row.id && (
            <div className="actions-dropdown" role="menu">
              {activeTab === 'communities' && (
                <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); navigate(`/user-management/school/${row.id}`, { state: { schoolName: row.name } }); setActiveDropdownId(null); }} role="menuitem">View Users</button>
              )}
              {activeTab === 'groups' && (
                <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); selectGroup(row); setActiveDropdownId(null); }} role="menuitem">View Health Workers</button>
              )}
              {activeTab === 'healthWorkers' ? (
                <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); navigate(`/user-management/user/${row.id}`); setActiveDropdownId(null); }} role="menuitem">View User</button>
              ) : (
                <>
                  <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); openEditModal(row); setActiveDropdownId(null); }} role="menuitem">Edit</button>
                  <button type="button" className="actions-dropdown-item delete" onClick={(event) => { event.stopPropagation(); setActiveDropdownId(null); deleteItem(row); }} role="menuitem">Delete</button>
                </>
              )}
            </div>
          )}
        </>
      ),
    };

    if (activeTab === 'communities') {
      return [
        { key: 'name', header: 'School Name', style: { width: '48%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'coordinatorName', header: 'Assigned Community Coordinator', renderCell: (row) => row.coordinatorName || getSchoolCoordinator(row)?.name || 'Not assigned' },
        { key: 'groups', header: 'Total Groups', cellClassName: 'small-column', renderCell: (row) => groups.filter((group) => (
          group.communityId != null
            ? String(group.communityId) === String(row.id)
            : String(group.community || '').toLowerCase() === String(row.name || '').toLowerCase()
        )).length },
        actionColumn,
      ];
    }

    if (activeTab === 'groups') {
      return [
        {
          key: 'name',
          header: 'Group Name',
          style: { width: selectedSchool ? '60%' : '45%' },
          renderCell: (row) => (
            <button
              type="button"
              className="community-title-text"
              aria-label={`View health workers in ${row.name}`}
              onClick={(event) => {
                event.stopPropagation();
                selectGroup(row);
              }}
              style={{ border: 0, padding: 0, background: 'transparent', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
            >
              {row.name}
            </button>
          ),
        },
        ...(!selectedSchool ? [{ key: 'schoolName', header: 'School' }] : []),
        { key: 'healthWorkers', header: 'Health Workers', cellClassName: 'small-column', renderCell: (row) => row.healthWorkers || 0 },
        actionColumn,
      ];
    }

    if (activeTab === 'healthWorkers') {
      return [
        {
          key: 'name',
          header: 'Health Worker',
          style: { width: '52%' },
          renderCell: (row) => (
            <button
              type="button"
              className="community-title-text community-health-worker-link"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/user-management/user/${row.id}`, {
                  state: {
                    user: {
                      ...row,
                      firstName: row.first_name || '',
                      middleInitial: row.middle_initial || '',
                      lastName: row.last_name || '',
                      contactNumber: row.contact_number || '',
                      schoolId: row.school_id || '',
                      groupId: row.group_id || '',
                    },
                  },
                });
              }}
            >
              {row.name || row.full_name || 'Unnamed user'}
            </button>
          ),
        },
        { key: 'groupName', header: 'Group', style: { width: '32%' }, renderCell: (row) => activeGroupId ? selectedGroup?.name || row.group_name || '—' : row.group_name || '—' },
        actionColumn,
      ];
    }

    return [
      { key: 'name', header: 'Batch Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
      { key: 'records', header: 'Total Mothers', cellClassName: 'small-column', renderCell: (row) => row.records || 0 },
      { key: 'progress', header: 'Progress (%)', cellClassName: 'small-column', renderCell: (row) => `${row.progress || 0}%` },
      actionColumn,
    ];
  }, [activeDropdownId, activeGroupId, activeTab, communities, coordinators, groups, navigate, selectGroup, selectedGroup, selectedSchool]);

  const onRowClick = activeTab === 'communities'
    ? selectSchool
    : activeTab === 'groups'
      ? selectGroup
      : activeTab === 'batches'
        ? (row) => navigate(`/user-management/batch/${row.id}`, { state: { batchName: row.name, schoolId: selectedSchool?.id, schoolName: selectedSchool?.name } })
      : undefined;
  if (loading) return <div className="community-page"><p>Loading community data...</p></div>;
  if (error) return <div className="community-page"><p className="error-message">{error}</p></div>;

  return (
    <div className="community-page">
      <CommunityToolbar
        activeTab={activeTab}
        onEntityFilterChange={() => {}}
        onTabChange={(tab) => {
          setSelectedGroupId(null);
          if (tab === 'communities') {
            setSelectedSchoolId(null);
            setRootListType('communities');
          } else if (!selectedSchool) {
            setRootListType('groups');
          }
          setQuery('');
          setPage(1);
        }}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage
      />
      <CommunityOverviewCards
        selected={selectedOverviewCard}
        onSelect={handleOverviewSelect}
        cards={overviewCards}
        toggleSelection={false}
      />
      {activeTab === 'healthWorkers' && (activeGroupId ? groupHealthWorkersLoading : healthWorkersLoading) ? (
        <p>Loading health workers...</p>
      ) : activeTab === 'healthWorkers' && (activeGroupId ? groupHealthWorkersError : healthWorkersError) ? (
        <p className="error-message" role="alert">{activeGroupId ? groupHealthWorkersError : healthWorkersError}</p>
      ) : (
        <>
          <CommunityTable
            columns={columns}
            data={currentRows}
            tableClassName={activeTab === 'healthWorkers' ? 'community-health-workers-table' : ''}
            activeRowKey={activeDropdownId}
            onRowClick={onRowClick}
            tableTitle={tableTitle}
            emptyMessage={activeTab === 'healthWorkers' ? 'No health workers found.' : `No ${activeTab === 'communities' ? 'schools' : activeTab}${selectedSchool ? ` for ${selectedSchool.name}` : ''} found.`}
            searchValue={query}
            onSearchChange={handleSearch}
          />
          <CommunityPagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
            rangeStart={tableData.length ? startIndex + 1 : 0}
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
        groups={activeTab === 'batches' && selectedGroup ? [selectedGroup] : groups}
        batches={batches}
        showBatchGroupField={showModal === 'createBatch'}
        hideBatchSchoolField={showModal === 'createBatch' && Boolean(selectedSchool || selectedGroup)}
        coordinators={coordinators}
        onCreateCommunity={async (event) => { event.preventDefault(); await mutations.createCommunity(communityForm); setShowModal(null); }}
        onEditCommunity={async (event) => { event.preventDefault(); await mutations.updateCommunity(selectedItem.id, communityForm); setShowModal(null); setSelectedItem(null); }}
        onCreateGroup={async (event) => { event.preventDefault(); await mutations.createGroup(groupForm); setShowModal(null); }}
        onEditGroup={async (event) => { event.preventDefault(); await mutations.updateGroup(selectedItem.id, groupForm); setShowModal(null); setSelectedItem(null); }}
        onCreateBatch={async (event) => { event.preventDefault(); await mutations.createBatch(batchForm); setShowModal(null); }}
        onEditBatch={async (event) => { event.preventDefault(); await mutations.updateBatch(selectedItem.id, batchForm); setShowModal(null); setSelectedItem(null); }}
        isSubmitting={mutations.loading}
      />
      <ConfirmActionModal
        show={Boolean(pendingDeleteItem)}
        title={`Delete ${activeTab === 'communities' ? 'school' : activeTab === 'groups' ? 'group' : 'batch'}?`}
        message={pendingDeleteItem ? `Are you sure you want to delete ${pendingDeleteItem.name}?` : 'Are you sure?'}
        confirmLabel="OK"
        onConfirm={confirmDeleteItem}
        onCancel={() => setPendingDeleteItem(null)}
        isSubmitting={mutations.loading}
      />
    </div>
  );
}
