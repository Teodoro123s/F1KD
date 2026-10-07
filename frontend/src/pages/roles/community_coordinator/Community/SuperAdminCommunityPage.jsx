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

const defaultCommunityForm = { name: '', area: 'Poblacion', coordinator: '' };
const defaultGroupForm = { name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' };
const defaultBatchForm = { name: '', community: '', records: 1, progress: 0, status: 'Active' };

export default function SuperAdminCommunityPage() {
  const navigate = useNavigate();
  const { schoolId, groupId, batchId } = useParams();
  const { communities, batches, groups, coordinators, loading, error, refreshData } = useCommunityData();
  const mutations = useCommunityMutations({ refreshData });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [communityForm, setCommunityForm] = useState(defaultCommunityForm);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);

  const activeTab = groupId ? 'batches' : schoolId ? 'groups' : 'communities';

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
    setPage(1);
    setQuery('');
    setActiveDropdownId(null);
  }, [schoolId, groupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(groupId)) || null,
    [groupId, groups],
  );
  const selectedSchool = useMemo(
    () => communities.find((community) => String(community.id) === String(schoolId || selectedGroup?.communityId))
      || communities.find((community) => community.name === selectedGroup?.community)
      || null,
    [communities, schoolId, selectedGroup],
  );
  const getSchoolCoordinator = (school) => coordinators.find((coordinator) => String(coordinator.schoolId || '') === String(school?.id || ''));

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
    const term = query.trim().toLowerCase();
    let rows = communities;

    if (activeTab === 'groups') {
      rows = groups.filter((group) => String(group.community || '') === String(selectedSchool?.name || ''));
    } else if (activeTab === 'batches') {
      rows = batches.filter((batch) => String(batch.groupIds || '').split(',').map((id) => id.trim()).includes(String(groupId)));
    }

    if (!term) return rows;
    return rows.filter((row) => [row.name, row.area, row.community, row.status, row.leader, row.id]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [activeTab, batches, communities, groupId, groups, query, selectedSchool]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = filteredData.slice(startIndex, startIndex + perPage);

  const tableTitle = activeTab === 'communities'
    ? 'Schools'
    : activeTab === 'groups'
      ? `School: ${selectedSchool?.name || 'School'}`
      : `Group: ${selectedGroup?.name || 'Group'}`;

  const breadcrumbItems = activeTab === 'communities'
    ? [{ label: 'Schools', clickable: false }]
    : activeTab === 'groups'
      ? [{ label: 'Schools', to: '/community', clickable: true }, { label: selectedSchool?.name || 'School', clickable: false }]
      : [
        { label: 'Schools', to: '/community', clickable: true },
        { label: selectedSchool?.name || 'School', to: `/community/school/${selectedSchool?.id || ''}`, clickable: true },
        { label: selectedGroup?.name || 'Group', clickable: false },
      ];

  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  const openCreateModal = () => {
    if (activeTab === 'communities') {
      setCommunityForm(defaultCommunityForm);
      setShowModal('createCommunity');
      return;
    }

    if (activeTab === 'groups') {
      setGroupForm({ ...defaultGroupForm, community: selectedSchool?.name || '' });
      setShowModal('createGroup');
      return;
    }

    if (activeTab === 'batches') {
      setBatchForm({ ...defaultBatchForm, community: selectedSchool?.name || '', groupId: String(selectedGroup?.id || '') });
      setShowModal('createBatch');
    }

    return;
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
                <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); navigate(`/user-management/school/${row.id}`, { state: { schoolName: row.name } }); setActiveDropdownId(null); }} role="menuitem">View</button>
              )}
              {activeTab === 'groups' && (
                <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); navigate(`/community/group/${row.id}/health-workers`); setActiveDropdownId(null); }} role="menuitem">View Health Workers</button>
              )}
              <button type="button" className="actions-dropdown-item" onClick={(event) => { event.stopPropagation(); openEditModal(row); setActiveDropdownId(null); }} role="menuitem">Edit</button>
              <button type="button" className="actions-dropdown-item delete" onClick={(event) => { event.stopPropagation(); setActiveDropdownId(null); deleteItem(row); }} role="menuitem">Delete</button>
            </div>
          )}
        </>
      ),
    };

    if (activeTab === 'communities') {
      return [
        { key: 'name', header: 'School Name', style: { width: '48%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'coordinatorName', header: 'Assigned Community Coordinator', renderCell: (row) => row.coordinatorName || getSchoolCoordinator(row)?.name || 'Not assigned' },
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches || 0 },
        { key: 'groups', header: 'Total Groups', cellClassName: 'small-column', renderCell: (row) => groups.filter((group) => group.community === row.name).length },
        actionColumn,
      ];
    }

    if (activeTab === 'groups') {
      return [
        { key: 'name', header: 'Group Name', style: { width: '60%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches || 0 },
        actionColumn,
      ];
    }

    return [
      { key: 'name', header: 'Batch Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
      { key: 'records', header: 'Total Mothers', cellClassName: 'small-column', renderCell: (row) => row.records || 0 },
      { key: 'progress', header: 'Progress (%)', cellClassName: 'small-column', renderCell: (row) => `${row.progress || 0}%` },
      actionColumn,
    ];
  }, [activeDropdownId, activeTab, coordinators, groups, selectedSchool]);

  const onRowClick = activeTab === 'communities'
    ? (row) => navigate(`/community/school/${row.id}`)
    : activeTab === 'groups'
      ? (row) => navigate(`/community/group/${row.id}`)
      : activeTab === 'batches'
        ? (row) => navigate(`/user-management/batch/${row.id}`, { state: { batchName: row.name, schoolId: selectedSchool?.id, schoolName: selectedSchool?.name } })
      : undefined;

  if (loading) return <div className="community-page"><p>Loading community data...</p></div>;
  if (error) return <div className="community-page"><p className="error-message">{error}</p></div>;

  return (
    <div className="community-page">
      <CommunityToolbar
        activeTab={activeTab}
        query={query}
        onSearch={handleSearch}
        onEntityFilterChange={() => {}}
        onTabChange={(tab) => navigate(tab === 'communities' ? '/community' : `/community/school/${selectedSchool?.id || ''}`)}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage
      />
      <CommunityTable columns={columns} data={currentRows} onRowClick={onRowClick} tableTitle={tableTitle} />
      <CommunityPagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
        rangeStart={filteredData.length ? startIndex + 1 : 0}
        rangeEnd={Math.min(startIndex + perPage, filteredData.length)}
        totalItems={filteredData.length}
      />
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
        showBatchGroupField={activeTab === 'batches'}
        hideBatchSchoolField={activeTab === 'batches'}
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
