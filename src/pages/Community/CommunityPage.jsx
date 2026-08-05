import React, { useMemo, useState, useEffect } from 'react';
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

const initialCommunityData = [
  { id: 'SCH-0001', name: 'San Isidro High School', area: 'Poblacion', batches: 2, records: 3 },
  { id: 'SCH-0002', name: 'Poblacion National School', area: 'Poblacion', batches: 1, records: 2 },
  { id: 'SCH-0003', name: 'Sto. Niño Academy', area: 'Poblacion', batches: 2, records: 4 },
  { id: 'SCH-0004', name: 'San Jose Elementary', area: 'Upland', batches: 3, records: 8 },
  { id: 'SCH-0005', name: 'Central City High', area: 'Downtown', batches: 4, records: 12 },
  { id: 'SCH-0006', name: 'Nueva Technical School', area: 'Coastal', batches: 1, records: 5 },
  { id: 'SCH-0007', name: 'Kabuntalan Integrated School', area: 'Riverside', batches: 2, records: 7 },
  { id: 'SCH-0008', name: 'San Miguel Prep', area: 'Highland', batches: 2, records: 6 },
  { id: 'SCH-0009', name: 'Luntian Elementary', area: 'Forest', batches: 1, records: 3 },
  { id: 'SCH-0010', name: 'Dela Cruz High School', area: 'Lowland', batches: 5, records: 18 },
  { id: 'SCH-0011', name: 'Malaya Community School', area: 'Coastal', batches: 1, records: 2 },
  { id: 'SCH-0012', name: 'Luntian Hills School', area: 'Highland', batches: 3, records: 9 },
];

const initialBatchesData = [
  { id: 'BAT-0001', name: 'Batch 1', community: 'San Isidro High School', records: 2, status: 'Active' },
  { id: 'BAT-0002', name: 'Batch 2', community: 'San Isidro High School', records: 1, status: 'Active' },
  { id: 'BAT-0003', name: 'Batch 3', community: 'Poblacion National School', records: 2, status: 'Completed' },
  { id: 'BAT-0004', name: 'Batch 4', community: 'Sto. Niño Academy', records: 2, status: 'Completed' },
  { id: 'BAT-0005', name: 'Batch 5', community: 'Sto. Niño Academy', records: 2, status: 'Active' },
  { id: 'BAT-0006', name: 'Batch 6', community: 'San Jose Elementary', records: 3, status: 'Pending' },
  { id: 'BAT-0007', name: 'Batch 7', community: 'San Jose Elementary', records: 3, status: 'Active' },
  { id: 'BAT-0008', name: 'Batch 8', community: 'San Jose Elementary', records: 2, status: 'Active' },
  { id: 'BAT-0009', name: 'Batch 9', community: 'Central City High', records: 4, status: 'Completed' },
  { id: 'BAT-0010', name: 'Batch 10', community: 'Central City High', records: 3, status: 'Active' },
  { id: 'BAT-0011', name: 'Batch 11', community: 'Central City High', records: 3, status: 'Pending' },
  { id: 'BAT-0012', name: 'Batch 12', community: 'Central City High', records: 2, status: 'Active' },
];

const initialGroupsData = [
  { id: 'GRP-0001', name: 'Group Alpha', leader: 'Liza Reyes', members: 12, status: 'Active', batches: 2 },
  { id: 'GRP-0002', name: 'Group Bravo', leader: 'Marco Santos', members: 8, status: 'Pending', batches: 1 },
  { id: 'GRP-0003', name: 'Group Delta', leader: 'Ana Cruz', members: 15, status: 'Active', batches: 3 },
  { id: 'GRP-0004', name: 'Group Sierra', leader: 'Renato Diaz', members: 6, status: 'Completed', batches: 0 },
  { id: 'GRP-0005', name: 'Group Central', leader: 'May Torres', members: 9, status: 'Active', batches: 1 },
];

export default function CommunityPage() {
  const [communities, setCommunities] = useState(initialCommunityData);
  const [batches, setBatches] = useState(initialBatchesData);
  const [groups, setGroups] = useState(initialGroupsData);

  const [activeTab, setActiveTab] = useState('communities');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [communityForm, setCommunityForm] = useState({ name: '', area: 'Poblacion' });
  const [groupForm, setGroupForm] = useState({ name: '', leader: '', members: 1, status: 'Active' });
  const [batchForm, setBatchForm] = useState({ name: '', community: '', records: 1, status: 'Active' });

  useEffect(() => {
    function closeDropdowns() {
      setActiveDropdownId(null);
    }
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    setCommunities((prevCommunities) =>
      prevCommunities.map((comm) => {
        const matchingBatches = batches.filter((b) => b.community === comm.name);
        const totalRecords = matchingBatches.reduce((acc, curr) => acc + Number(curr.records), 0);
        return {
          ...comm,
          batches: matchingBatches.length,
          records: totalRecords || comm.records,
        };
      })
    );
  }, [batches]);

  useEffect(() => {
    if (communities.length > 0 && !batchForm.community) {
      setBatchForm((prev) => ({ ...prev, community: communities[0].name }));
    }
  }, [communities, batchForm.community]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setQuery('');
    setPage(1);
    setActiveDropdownId(null);
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

  const pageCount = Math.max(1, Math.ceil(filteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = filteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = filteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, filteredData.length);

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
      setGroupForm({ name: '', leader: '', members: 1, status: 'Active' });
      setShowModal('createGroup');
      return;
    }

    setBatchForm({
      name: '',
      community: communities[0]?.name || '',
      records: 1,
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
      setGroupForm({ name: item.name, leader: item.leader, members: item.members, status: item.status });
      setShowModal('editGroup');
      return;
    }

    setBatchForm({
      name: item.name,
      community: item.community,
      records: item.records,
      status: item.status,
    });
    setShowModal('editBatch');
  };

  const handleCreateCommunity = (e) => {
    e.preventDefault();
    if (!communityForm.name.trim()) return;

    const currentMaxId = communities.reduce((max, c) => {
      const num = parseInt(c.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const newCommunity = {
      id: `COM-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: communityForm.name.trim(),
      area: communityForm.area,
      batches: 0,
      records: 0,
    };

    setCommunities((prev) => [newCommunity, ...prev]);
    setShowModal(null);
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

  const handleCreateBatch = (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    const currentMaxId = batches.reduce((max, b) => {
      const num = parseInt(b.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const newBatch = {
      id: `BAT-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: batchForm.name.trim(),
      community: batchForm.community,
      records: Number(batchForm.records) || 0,
      status: batchForm.status,
    };

    setBatches((prev) => [newBatch, ...prev]);
    setShowModal(null);
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
              status: batchForm.status,
            }
          : b
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    const currentMaxId = groups.reduce((max, g) => {
      const num = parseInt(g.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const newGroup = {
      id: `GRP-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: groupForm.name.trim(),
      leader: groupForm.leader.trim(),
      members: Number(groupForm.members) || 0,
      status: groupForm.status,
      batches: 0,
    };

    setGroups((prev) => [newGroup, ...prev]);
    setShowModal(null);
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
              leader: groupForm.leader.trim(),
              members: Number(groupForm.members) || 0,
              status: groupForm.status,
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
        </div>
        <button className="btn-create" onClick={openCreateModal}>
          <PlusIcon />
          <span>
            {activeTab === 'communities'
              ? 'Create School'
              : activeTab === 'groups'
              ? 'Create Group'
              : 'Create Batch'}
          </span>
        </button>
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
        currentRows={currentRows}
        filteredDataLength={filteredData.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        activeDropdownId={activeDropdownId}
        toggleDropdown={toggleDropdown}
        openEditModal={openEditModal}
        handleDeleteCommunity={handleDeleteCommunity}
        handleDeleteGroup={handleDeleteGroup}
        handleDeleteBatch={handleDeleteBatch}
        renderPaginationButtons={renderPaginationButtons}
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
      />
      <EditGroupModal
        showModal={showModal === 'editGroup'}
        onClose={() => setShowModal(null)}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleEditGroup={handleEditGroup}
      />
    </div>
  );
}
