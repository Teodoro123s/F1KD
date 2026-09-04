import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommunityTable from './CommunityTable';
import {
  CreateCommunityModal,
  EditCommunityModal,
  CreateBatchModal,
  EditBatchModal,
  CreateGroupModal,
  EditGroupModal,
} from './CommunityModals';
import {
  getSummary,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  createBatch,
  updateBatch,
  deleteBatch,
  createGroup,
  updateGroup,
  deleteGroup,
} from './communityService';
import { apiGetCoordinators } from '../../api/users';
import CommunityToolbar from './components/CommunityToolbar';
import CommunityFilters from './components/CommunityFilters';
import CommunityPagination from './components/CommunityPagination';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../utils/permissions';

export default function CommunityPage() {
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, 'admin-resources', 'create');
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [coordinators, setCoordinators] = useState([]);

  const [activeTab, setActiveTab] = useState('communities');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [communityForm, setCommunityForm] = useState({ name: '', area: 'Poblacion', coordinator: '' });
  const [groupForm, setGroupForm] = useState({ name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' });
  const [batchForm, setBatchForm] = useState({ name: '', community: '', records: 1, progress: 0, status: 'Active' });
  const [mothers, setMothers] = useState([]);

  useEffect(() => {
    const fetchCommunityData = async () => {
      console.info('[CommunityPage] Fetching community data from database...');

      try {
        const data = await getSummary();
        const normalizedData = {
          communities: data.communities || [],
          batches: data.batches || [],
          groups: data.groups || [],
          mothers: data.mothers || [],
        };

        setCommunities(normalizedData.communities);
        setBatches(normalizedData.batches);
        setGroups(normalizedData.groups);
        setMothers(normalizedData.mothers);

        console.info('[CommunityPage] Community data load succeeded', {
          communities: normalizedData.communities.length,
          batches: normalizedData.batches.length,
          groups: normalizedData.groups.length,
          mothers: normalizedData.mothers.length,
        });

        if (normalizedData.communities.length === 0) {
          console.warn('[CommunityPage] No community records were returned from the database.');
        }
      } catch (error) {
        console.error('[CommunityPage] Unable to load community data from database:', error);
      }
    };

    fetchCommunityData();
  }, []);

  useEffect(() => {
    apiGetCoordinators()
      .then((data) => {
        const users = Array.isArray(data?.users) ? data.users : [];
        setCoordinators(users
          .filter((user) => ['community organizer', 'co'].includes(String(user.role || '').trim().toLowerCase()))
          .map((user) => ({
            id: user.id,
            name: user.full_name || user.username || `User ${user.id}`,
          })));
      })
      .catch((error) => console.error('[CommunityPage] Unable to load community coordinators:', error));
  }, []);

  const navigate = useNavigate();
  const { schoolId, groupId, batchId } = useParams();

  const selectedSchool = useMemo(
    () => communities.find((comm) => String(comm.id) === String(schoolId)),
    [communities, schoolId]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(groupId)),
    [groups, groupId]
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(batchId)),
    [batches, batchId]
  );

  const selectedSchoolForGroup = useMemo(
    () => selectedGroup ? communities.find((comm) => comm.name === selectedGroup.community) : null,
    [communities, selectedGroup]
  );

  const selectedGroupForBatch = useMemo(
    () => {
      const batchMother = mothers.find((mother) => String(mother.batchId) === String(batchId));
      return batchMother ? groups.find((group) => group.name === batchMother.group) : null;
    },
    [groups, mothers, batchId]
  );

  const selectedSchoolForBatch = useMemo(() => {
    if (selectedGroupForBatch) {
      return communities.find((comm) => comm.name === selectedGroupForBatch.community) || null;
    }
    if (selectedBatch) {
      return communities.find((comm) => comm.name === selectedBatch.community) || null;
    }
    return null;
  }, [communities, selectedBatch, selectedGroupForBatch]);

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Schools', to: '/community', clickable: activeTab !== 'communities' }];

    const schoolIdForGroups = schoolId || selectedSchool?.id || selectedSchoolForGroup?.id || selectedSchoolForBatch?.id;
    if (activeTab === 'groups' || activeTab === 'batches' || activeTab === 'mothers') {
      items.push({
        label: 'Groups',
        to: schoolIdForGroups ? `/community/school/${schoolIdForGroups}` : '/community',
        clickable: activeTab !== 'groups',
      });
    }

    const batchGroup = selectedGroup || selectedGroupForBatch;
    if (activeTab === 'batches' || activeTab === 'mothers') {
      items.push({
        label: 'Batches',
        to: batchGroup ? `/community/group/${batchGroup.id}` : '/community',
        clickable: activeTab !== 'batches',
      });
    }

    if (activeTab === 'mothers') {
      items.push({ label: 'Mothers', clickable: false });
    }

    return items;
  }, [activeTab, schoolId, selectedSchool, selectedSchoolForGroup, selectedSchoolForBatch, selectedGroup, selectedGroupForBatch]);

  const selectedSchoolGroups = useMemo(() => {
    if (!selectedSchool) return [];
    const term = query.trim().toLowerCase();
    return groups
      .filter((group) => group.community === selectedSchool.name)
      .filter((group) => {
        if (!term) return true;
        return (
          String(group.name || '').toLowerCase().includes(term) ||
          String(group.id || '').toLowerCase().includes(term) ||
          String(group.leader || '').toLowerCase().includes(term) ||
          String(group.status || '').toLowerCase().includes(term)
        );
      });
  }, [groups, selectedSchool, query]);

  const selectedGroupBatches = useMemo(() => {
    if (!selectedGroup) return [];
    const term = query.trim().toLowerCase();
    const groupBatchIds = mothers
      .filter((mother) => mother.group === selectedGroup.name && mother.batchId)
      .map((mother) => String(mother.batchId));
    return batches
      .filter((batch) => groupBatchIds.includes(String(batch.id)))
      .filter((batch) => {
        if (!term) return true;
        return (
          String(batch.name || '').toLowerCase().includes(term) ||
          String(batch.id || '').toLowerCase().includes(term) ||
          String(batch.community || '').toLowerCase().includes(term) ||
          String(batch.status || '').toLowerCase().includes(term)
        );
      });
  }, [batches, mothers, selectedGroup, query]);

  const selectedBatchMothers = useMemo(() => {
    if (!selectedBatch) return [];
    const term = query.trim().toLowerCase();
    return mothers
      .filter((mother) => mother.batchId === selectedBatch.id)
      .filter((mother) => {
        if (!term) return true;
        return (
          String(mother.name || '').toLowerCase().includes(term) ||
          String(mother.id || '').toLowerCase().includes(term) ||
          String(mother.group || '').toLowerCase().includes(term) ||
          String(mother.status || '').toLowerCase().includes(term)
        );
      });
  }, [mothers, selectedBatch, query]);

  useEffect(() => {
    function closeDropdowns() {
      setActiveDropdownId(null);
    }
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    if (communities.length > 0 && !batchForm.community) {
      setBatchForm((prev) => ({ ...prev, community: communities[0].name }));
    }
    if (communities.length > 0 && !groupForm.community) {
      setGroupForm((prev) => ({ ...prev, community: communities[0].name }));
    }
  }, [communities, batchForm.community, groupForm.community]);

  useEffect(() => {
    if (batchId) {
      setActiveTab('mothers');
    } else if (groupId) {
      setActiveTab('batches');
    } else if (schoolId) {
      setActiveTab('groups');
    }
  }, [batchId, groupId, schoolId]);

  const handleTabChange = (tab) => {
    if (schoolId || groupId || batchId) {
      navigate('/community');
    }
    setActiveTab(tab);
    setQuery('');
    setPage(1);
    setActiveDropdownId(null);
  };

  const handleCommunityRowClick = (school) => {
    navigate(`/community/school/${school.id}`);
  };

  const handleGroupRowClick = (group) => {
    navigate(`/community/group/${group.id}`);
  };

  const handleBatchRowClick = (batch) => {
    navigate(`/community/batch/${batch.id}`);
  };

  const handleMotherRowClick = (mother) => {
    navigate(`/beneficiary/mother/${mother.id}`, { state: { mother } });
  };

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (activeTab === 'communities') {
      if (!term) return communities;
      return communities.filter(
        (c) =>
          String(c.name || '').toLowerCase().includes(term) ||
            String(c.id || '').toLowerCase().includes(term) ||
            String(c.area || '').toLowerCase().includes(term)
      );
    }

    if (activeTab === 'mothers') {
      return selectedBatchMothers;
    }

    if (activeTab === 'batches') {
      if (!term) return batches;
      return batches.filter(
        (b) =>
          String(b.name || '').toLowerCase().includes(term) ||
          String(b.id || '').toLowerCase().includes(term) ||
          String(b.community || '').toLowerCase().includes(term) ||
          String(b.status || '').toLowerCase().includes(term)
      );
    }

    if (!term) return groups;
    return groups.filter(
      (g) =>
          String(g.name || '').toLowerCase().includes(term) ||
        String(g.id || '').toLowerCase().includes(term) ||
        String(g.leader || '').toLowerCase().includes(term) ||
        String(g.status || '').toLowerCase().includes(term)
    );
  }, [activeTab, query, communities, batches, groups]);

  const currentFilteredData =
    batchId && activeTab === 'mothers' ? selectedBatchMothers :
    groupId && activeTab === 'batches' ? selectedGroupBatches :
    selectedSchool && activeTab === 'groups' ? selectedSchoolGroups :
    filteredData;
  const pageCount = Math.max(1, Math.ceil(currentFilteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = currentFilteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = currentFilteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, currentFilteredData.length);

  const displayRows = currentRows;
  const displayLength = currentFilteredData.length;
  const displayRangeStart = rangeStart;
  const displayRangeEnd = rangeEnd;

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const handlePerPageChange = (val) => {
    setPerPage(Number(val));
    setPage(1);
  };

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  const openCreateModal = () => {
    if (activeTab === 'communities') {
      setCommunityForm({ name: '', area: 'Poblacion', coordinator: '' });
      setShowModal('createCommunity');
      return;
    }

    if (activeTab === 'groups') {
      setGroupForm({ name: '', community: selectedSchool?.name || communities[0]?.name || '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' });
      setShowModal('createGroup');
      return;
    }

    setBatchForm({
      name: '',
      community: communities[0]?.name || '',
      records: 1,
      progress: 0,
      status: 'Active',
    });
    setShowModal('createBatch');
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'communities') {
      setCommunityForm({ name: item.name, area: item.area, coordinator: '' });
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
      records: item.records,
      progress: item.progress ?? 0,
      status: item.status,
    });
    setShowModal('editBatch');
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!communityForm.name.trim()) return;

    try {
      console.info('[CommunityPage] Creating community in database', communityForm);
      const data = await createCommunity({
        name: communityForm.name.trim(),
        area: communityForm.area,
        coordinator: communityForm.coordinator,
      });
      console.info('[CommunityPage] Community created successfully', data);

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
    } catch (error) {
      console.error('[CommunityPage] Failed to create community:', error);
      window.alert(error.message || 'Unable to create community.');
    }
  };

  const handleEditCommunity = async (e) => {
    e.preventDefault();
    if (!communityForm.name.trim()) return;

    try {
      const data = await updateCommunity(selectedItem.id, {
        name: communityForm.name.trim(),
        area: communityForm.area,
      });

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
      setSelectedItem(null);
      console.info('[CommunityPage] Community updated in DB', data);
    } catch (error) {
      console.error('[CommunityPage] Failed to update community:', error);
      window.alert(error.message || 'Unable to update community.');
    }
  };

  const handleDeleteCommunity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this community?')) {
      return;
    }

    try {
      await deleteCommunity(id);
      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
    } catch (error) {
      console.error('[CommunityPage] Failed to delete community:', error);
      window.alert(error.message || 'Unable to delete community.');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    try {
      console.info('[CommunityPage] Creating batch in database', batchForm);
      const data = await createBatch({
        name: batchForm.name.trim(),
        community: batchForm.community,
        records: Number(batchForm.records) || 0,
        progress: Number(batchForm.progress) || 0,
        status: batchForm.status,
      });

      console.info('[CommunityPage] Batch created successfully', data);

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
    } catch (error) {
      console.error('[CommunityPage] Failed to create batch:', error);
      window.alert(error.message || 'Unable to create batch.');
    }
  };

  const handleEditBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    try {
      await updateBatch(selectedItem.id, {
        name: batchForm.name.trim(),
        community: batchForm.community,
        records: Number(batchForm.records) || 0,
        progress: Number(batchForm.progress) || 0,
        status: batchForm.status,
      });

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
      setSelectedItem(null);
    } catch (error) {
      console.error('[CommunityPage] Failed to update batch:', error);
      window.alert(error.message || 'Unable to update batch.');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    try {
      console.info('[CommunityPage] Creating group in database', groupForm);
      const data = await createGroup({
        name: groupForm.name.trim(),
        community: groupForm.community,
        leader: groupForm.leader.trim(),
        members: Number(groupForm.members) || 0,
        status: groupForm.status,
      });

      console.info('[CommunityPage] Group created successfully', data);

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
    } catch (error) {
      console.error('[CommunityPage] Failed to create group:', error);
      window.alert(error.message || 'Unable to create group.');
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    try {
      await updateGroup(selectedItem.id, {
        name: groupForm.name.trim(),
        community: groupForm.community,
        leader: groupForm.leader.trim(),
        members: Number(groupForm.members) || 0,
        status: groupForm.status,
      });

      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
      setShowModal(null);
      setSelectedItem(null);
    } catch (error) {
      console.error('[CommunityPage] Failed to update group:', error);
      window.alert(error.message || 'Unable to update group.');
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await deleteBatch(id);
      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
    } catch (error) {
      console.error('[CommunityPage] Failed to delete batch:', error);
      window.alert(error.message || 'Unable to delete batch.');
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      await deleteGroup(id);
      const summaryData = await getSummary();
      setCommunities(summaryData.communities || []);
      setBatches(summaryData.batches || []);
      setGroups(summaryData.groups || []);
      setMothers(summaryData.mothers || []);
    } catch (error) {
      console.error('[CommunityPage] Failed to delete group:', error);
      window.alert(error.message || 'Unable to delete group.');
    }
  };

  return (
    <div className="community-page">
      <CommunityToolbar
        activeTab={activeTab}
        query={query}
        onSearch={handleSearch}
        onTabChange={handleTabChange}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage={canManage}
      />

      <CommunityFilters
        activeTab={activeTab}
        query={query}
        onClearQuery={() => setQuery('')}
      />

      <CommunityTable
        activeTab={activeTab}
        currentRows={displayRows}
        groups={groups}
        activeDropdownId={activeDropdownId}
        toggleDropdown={toggleDropdown}
        openEditModal={openEditModal}
        handleDeleteCommunity={handleDeleteCommunity}
        handleDeleteGroup={handleDeleteGroup}
        handleDeleteBatch={handleDeleteBatch}
        onCommunityRowClick={activeTab === 'communities' ? handleCommunityRowClick : activeTab === 'groups' ? handleGroupRowClick : activeTab === 'batches' ? handleBatchRowClick : undefined}
        onMotherRowClick={activeTab === 'mothers' ? handleMotherRowClick : undefined}
        canManage={canManage}
      />
      <CommunityPagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        rangeStart={displayRangeStart}
        rangeEnd={displayRangeEnd}
        totalItems={displayLength}
      />
      <CreateCommunityModal
        showModal={showModal === 'createCommunity'}
        onClose={() => setShowModal(null)}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleCreateCommunity={handleCreateCommunity}
        coordinators={coordinators}
      />
      <EditCommunityModal
        showModal={showModal === 'editCommunity'}
        onClose={() => setShowModal(null)}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleEditCommunity={handleEditCommunity}
      />
      <CreateBatchModal
        showModal={showModal === 'createBatch'}
        onClose={() => setShowModal(null)}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleCreateBatch={handleCreateBatch}
        communities={communities}
      />
      <EditBatchModal
        showModal={showModal === 'editBatch'}
        onClose={() => setShowModal(null)}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleEditBatch={handleEditBatch}
        communities={communities}
      />
      <CreateGroupModal
        showModal={showModal === 'createGroup'}
        onClose={() => setShowModal(null)}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleCreateGroup={handleCreateGroup}
        communities={communities}
        batches={batches}
      />
      <EditGroupModal
        showModal={showModal === 'editGroup'}
        onClose={() => setShowModal(null)}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleEditGroup={handleEditGroup}
        communities={communities}
        batches={batches}
      />
    </div>
  );
}
