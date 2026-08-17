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
import { SearchIcon, PlusIcon, BuildingIcon, GroupsIcon, BatchesIcon } from './CommunityIcons';

export default function CommunityPage() {
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);

  const [activeTab, setActiveTab] = useState('communities');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [communityForm, setCommunityForm] = useState({ name: '', area: 'Poblacion' });
  const [groupForm, setGroupForm] = useState({ name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' });
  const [batchForm, setBatchForm] = useState({ name: '', community: '', records: 1, progress: 0, status: 'Active' });
  const [mothers, setMothers] = useState([]);

  useEffect(() => {
    const fetchCommunityData = async () => {
      console.info('[CommunityPage] Fetching community data from database...');

      try {
        const response = await fetch('/api/community/summary');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to load community data`);
        }

        const data = await response.json();
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

  const navigate = useNavigate();
  const { schoolId, groupId, batchId } = useParams();

  const selectedSchool = useMemo(
    () => communities.find((comm) => comm.id === schoolId),
    [communities, schoolId]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId),
    [batches, batchId]
  );

  const selectedSchoolForGroup = useMemo(
    () => selectedGroup ? communities.find((comm) => comm.name === selectedGroup.community) : null,
    [communities, selectedGroup]
  );

  const selectedGroupForBatch = useMemo(
    () => groups.find((group) => group.assignedBatchIds?.includes(batchId)),
    [groups, batchId]
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
          group.name.toLowerCase().includes(term) ||
          group.id.toLowerCase().includes(term) ||
          group.leader.toLowerCase().includes(term) ||
          group.status.toLowerCase().includes(term)
        );
      });
  }, [groups, selectedSchool, query]);

  const selectedGroupBatches = useMemo(() => {
    if (!selectedGroup) return [];
    const term = query.trim().toLowerCase();
    const groupBatchIds = selectedGroup.assignedBatchIds || [];
    return batches
      .filter((batch) => groupBatchIds.includes(batch.id))
      .filter((batch) => {
        if (!term) return true;
        return (
          batch.name.toLowerCase().includes(term) ||
          batch.id.toLowerCase().includes(term) ||
          batch.community.toLowerCase().includes(term) ||
          batch.status.toLowerCase().includes(term)
        );
      });
  }, [batches, selectedGroup, query]);

  const selectedBatchMothers = useMemo(() => {
    if (!selectedBatch) return [];
    const term = query.trim().toLowerCase();
    return mothers
      .filter((mother) => mother.batchId === selectedBatch.id)
      .filter((mother) => {
        if (!term) return true;
        return (
          mother.name.toLowerCase().includes(term) ||
          mother.id.toLowerCase().includes(term) ||
          mother.group.toLowerCase().includes(term) ||
          mother.status.toLowerCase().includes(term)
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

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (activeTab === 'communities') {
      if (!term) return communities;
      return communities.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.id.toLowerCase().includes(term) ||
          c.area.toLowerCase().includes(term)
      );
    }

    if (activeTab === 'mothers') {
      return selectedBatchMothers;
    }

    if (activeTab === 'batches') {
      if (!term) return batches;
      return batches.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.id.toLowerCase().includes(term) ||
          b.community.toLowerCase().includes(term) ||
          b.status.toLowerCase().includes(term)
      );
    }

    if (!term) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term) ||
        g.leader.toLowerCase().includes(term) ||
        g.status.toLowerCase().includes(term)
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
      setCommunityForm({ name: '', area: 'Poblacion' });
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
      setCommunityForm({ name: item.name, area: item.area });
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
      const response = await fetch('/api/community/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: communityForm.name.trim(),
          area: communityForm.area,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to create community');
      }

      const data = await response.json();
      console.info('[CommunityPage] Community created successfully', data);

      const summaryResponse = await fetch('/api/community/summary');
      const summaryData = await summaryResponse.json();
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

  const handleEditCommunity = (e) => {
    e.preventDefault();
    if (!communityForm.name.trim()) return;

    setCommunities((prev) =>
      prev.map((c) =>
        c.id === selectedItem.id
          ? { ...c, name: communityForm.name.trim(), area: communityForm.area }
          : c
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleDeleteCommunity = (id) => {
    if (window.confirm('Are you sure you want to delete this community?')) {
      setCommunities((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    try {
      console.info('[CommunityPage] Creating batch in database', batchForm);
      const response = await fetch('/api/community/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchForm.name.trim(),
          community: batchForm.community,
          records: Number(batchForm.records) || 0,
          progress: Number(batchForm.progress) || 0,
          status: batchForm.status,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to create batch');
      }

      const data = await response.json();
      console.info('[CommunityPage] Batch created successfully', data);

      const summaryResponse = await fetch('/api/community/summary');
      const summaryData = await summaryResponse.json();
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

  const handleEditBatch = (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    setBatches((prev) =>
      prev.map((b) =>
        b.id === selectedItem.id
          ? {
              ...b,
              name: batchForm.name.trim(),
              community: batchForm.community,
              records: Number(batchForm.records) || 0,
              progress: Number(batchForm.progress) || 0,
              status: batchForm.status,
            }
          : b
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    try {
      console.info('[CommunityPage] Creating group in database', groupForm);
      const response = await fetch('/api/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          community: groupForm.community,
          leader: groupForm.leader.trim(),
          members: Number(groupForm.members) || 0,
          status: groupForm.status,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to create group');
      }

      const data = await response.json();
      console.info('[CommunityPage] Group created successfully', data);

      const summaryResponse = await fetch('/api/community/summary');
      const summaryData = await summaryResponse.json();
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

  const handleEditGroup = (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedItem.id
          ? {
              ...g,
              name: groupForm.name.trim(),
              community: groupForm.community,
              assignedBatchIds: groupForm.assignedBatchIds || [],
              leader: groupForm.leader.trim(),
              members: Number(groupForm.members) || 0,
              status: groupForm.status,
              batches: (groupForm.assignedBatchIds?.length ?? 0),
            }
          : g
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleDeleteBatch = (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      setBatches((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleDeleteGroup = (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];

    buttons.push(
      <button
        key="first"
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
        onClick={() => setPage(1)}
        disabled={currentPage === 1}
        aria-label="First page"
      >
        «
      </button>
    );

    const maxVisible = 5;
    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 3; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
      buttons.push(<span key="el-1" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    } else if (currentPage >= pageCount - 2) {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-2" className="pagination-btn ellipsis">...</span>);
      for (let i = pageCount - 2; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-3" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button key={currentPage} type="button" className="pagination-btn active">
          {currentPage}
        </button>
      );
      buttons.push(<span key="el-4" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    }

    buttons.push(
      <button
        key="last"
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
        onClick={() => setPage(pageCount)}
        disabled={currentPage === pageCount}
        aria-label="Last page"
      >
        »
      </button>
    );

    return buttons;
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Communities</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={item.label} className="breadcrumb-item">
                {item.clickable ? (
                  <button
                    type="button"
                    className="breadcrumb-link"
                    onClick={() => navigate(item.to)}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && (
                  <span className="breadcrumb-separator">›</span>
                )}
              </span>
            ))}
          </nav>
        </div>
        {activeTab !== 'mothers' && (
          <button className="btn-create btn-create--hero" onClick={openCreateModal}>
            <PlusIcon />
            <span>
              {activeTab === 'communities'
                ? 'Create School'
                : activeTab === 'groups'
                ? 'Create Group'
                : 'Create Batch'}
            </span>
          </button>
        )}
      </header>

      <section className="tabs-row">
        <div className="tabs-list" role="tablist" aria-label="School sections">
          <button
            role="tab"
            aria-selected={activeTab === 'communities'}
            className={`tab-btn${activeTab === 'communities' ? ' active' : ''}`}
            onClick={() => handleTabChange('communities')}
          >
            <BuildingIcon />
            <span>Schools</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'groups'}
            className={`tab-btn${activeTab === 'groups' ? ' active' : ''}`}
            onClick={() => handleTabChange('groups')}
          >
            <GroupsIcon />
            <span>Groups</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'batches'}
            className={`tab-btn${activeTab === 'batches' ? ' active' : ''}`}
            onClick={() => handleTabChange('batches')}
          >
            <BatchesIcon />
            <span>Batches</span>
          </button>
        </div>

        <div className="search-container">
          <SearchIcon />
          <input
            type="text"
            className="search-input-field"
            placeholder={
              activeTab === 'communities'
                ? 'Search school name...'
                : activeTab === 'groups'
                ? 'Search group name...'
                : activeTab === 'mothers'
                ? 'Search mother name...'
                : 'Search batch name...'
            }
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>
      </section>

      <CommunityTable
        activeTab={activeTab}
        currentRows={displayRows}
        filteredDataLength={displayLength}
        rangeStart={displayRangeStart}
        rangeEnd={displayRangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        activeDropdownId={activeDropdownId}
        toggleDropdown={toggleDropdown}
        openEditModal={openEditModal}
        handleDeleteCommunity={handleDeleteCommunity}
        handleDeleteGroup={handleDeleteGroup}
        handleDeleteBatch={handleDeleteBatch}
        renderPaginationButtons={renderPaginationButtons}
        onCommunityRowClick={activeTab === 'communities' ? handleCommunityRowClick : activeTab === 'groups' ? handleGroupRowClick : activeTab === 'batches' ? handleBatchRowClick : undefined}
      />
      <CreateCommunityModal
        showModal={showModal === 'createCommunity'}
        onClose={() => setShowModal(null)}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleCreateCommunity={handleCreateCommunity}
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
