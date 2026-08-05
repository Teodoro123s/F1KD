import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BeneficiaryTable from './BeneficiaryTable';
import {
  CreateCommunityModal,
  EditCommunityModal,
  CreateBatchModal,
  EditBatchModal,
  CreateGroupModal,
  EditGroupModal,
} from './BeneficiaryModals';
import { SearchIcon, PlusIcon, BuildingIcon, GroupsIcon } from './BeneficiaryIcons';

const initialCommunityData = [
  { id: 'SCH-0001', name: 'Maria Santos', area: 'Poblacion', batches: 2, records: 3, progress: 72 },
  { id: 'SCH-0002', name: 'Liza Reyes', area: 'Poblacion', batches: 1, records: 2, progress: 58 },
  { id: 'SCH-0003', name: 'Ana Cruz', area: 'Poblacion', batches: 2, records: 4, progress: 84 },
  { id: 'SCH-0004', name: 'Teresa Gomez', area: 'Upland', batches: 3, records: 8, progress: 65 },
  { id: 'SCH-0005', name: 'Isabel Mendoza', area: 'Downtown', batches: 4, records: 12, progress: 91 },
  { id: 'SCH-0006', name: 'Clara dela Cruz', area: 'Coastal', batches: 1, records: 5, progress: 48 },
  { id: 'SCH-0007', name: 'Lucia Rivera', area: 'Riverside', batches: 2, records: 7, progress: 77 },
  { id: 'SCH-0008', name: 'Rosa Fernandez', area: 'Highland', batches: 2, records: 6, progress: 69 },
  { id: 'SCH-0009', name: 'Elena Mercado', area: 'Forest', batches: 1, records: 3, progress: 55 },
  { id: 'SCH-0010', name: 'Nora Santos', area: 'Lowland', batches: 5, records: 18, progress: 95 },
  { id: 'SCH-0011', name: 'May Torres', area: 'Coastal', batches: 1, records: 2, progress: 38 },
  { id: 'SCH-0012', name: 'Gloria Diaz', area: 'Highland', batches: 3, records: 9, progress: 82 },
];

const initialBatchesData = [
  { id: 'BAT-0001', name: 'Health Visit 1', community: 'Maria Santos', records: 2, progress: 68, status: 'Active' },
  { id: 'BAT-0002', name: 'Health Visit 2', community: 'Maria Santos', records: 1, progress: 45, status: 'Active' },
  { id: 'BAT-0003', name: 'Health Visit 3', community: 'Liza Reyes', records: 2, progress: 92, status: 'Completed' },
  { id: 'BAT-0004', name: 'Health Visit 4', community: 'Ana Cruz', records: 2, progress: 100, status: 'Completed' },
  { id: 'BAT-0005', name: 'Health Visit 5', community: 'Ana Cruz', records: 2, progress: 57, status: 'Active' },
  { id: 'BAT-0006', name: 'Health Visit 6', community: 'Teresa Gomez', records: 3, progress: 18, status: 'Pending' },
  { id: 'BAT-0007', name: 'Health Visit 7', community: 'Teresa Gomez', records: 3, progress: 74, status: 'Active' },
  { id: 'BAT-0008', name: 'Health Visit 8', community: 'Teresa Gomez', records: 2, progress: 63, status: 'Active' },
  { id: 'BAT-0009', name: 'Health Visit 9', community: 'Isabel Mendoza', records: 4, progress: 88, status: 'Completed' },
  { id: 'BAT-0010', name: 'Health Visit 10', community: 'Isabel Mendoza', records: 3, progress: 41, status: 'Active' },
  { id: 'BAT-0011', name: 'Health Visit 11', community: 'Isabel Mendoza', records: 3, progress: 22, status: 'Pending' },
  { id: 'BAT-0012', name: 'Health Visit 12', community: 'Isabel Mendoza', records: 2, progress: 50, status: 'Active' },
];

const initialGroupsData = [
  {
    id: 'GRP-0001',
    name: 'Child Alpha',
    community: 'Maria Santos',
    assignedBatchIds: ['BAT-0001', 'BAT-0002'],
    leader: 'Liza Reyes',
    members: 12,
    status: 'Active',
    batches: 2,
  },
  {
    id: 'GRP-0002',
    name: 'Child Bravo',
    community: 'Liza Reyes',
    assignedBatchIds: ['BAT-0003'],
    leader: 'Marco Santos',
    members: 8,
    status: 'Pending',
    batches: 1,
  },
  {
    id: 'GRP-0003',
    name: 'Child Delta',
    community: 'Ana Cruz',
    assignedBatchIds: ['BAT-0004', 'BAT-0005', 'BAT-0008'],
    leader: 'Ana Cruz',
    members: 15,
    status: 'Active',
    batches: 3,
  },
  {
    id: 'GRP-0004',
    name: 'Child Sierra',
    community: 'Teresa Gomez',
    assignedBatchIds: [],
    leader: 'Renato Diaz',
    members: 6,
    status: 'Completed',
    batches: 0,
  },
  {
    id: 'GRP-0005',
    name: 'Child Central',
    community: 'Isabel Mendoza',
    assignedBatchIds: ['BAT-0009'],
    leader: 'May Torres',
    members: 9,
    status: 'Active',
    batches: 1,
  },
];

export default function BeneficiaryPage() {
  const [communities, setCommunities] = useState(initialCommunityData);
  const [batches, setBatches] = useState(initialBatchesData);
  const [groups, setGroups] = useState(initialGroupsData);

  const [activeTab, setActiveTab] = useState('groups');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedCommunityFilter, setSelectedCommunityFilter] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [communityForm, setCommunityForm] = useState({ name: '', area: 'Poblacion' });
  const [groupForm, setGroupForm] = useState({ name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' });
  const [batchForm, setBatchForm] = useState({ name: '', community: '', records: 1, progress: 0, status: 'Active' });

  const navigate = useNavigate();
  const { schoolId, groupId } = useParams();

  const selectedSchool = useMemo(
    () => communities.find((comm) => comm.id === schoolId),
    [communities, schoolId]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

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

  useEffect(() => {
    function closeDropdowns() {
      setActiveDropdownId(null);
      setCreateDropdownOpen(false);
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

  const handleCommunityRowClick = (school) => {
    navigate(`/beneficiary/school/${school.id}`);
  };

  const handleGroupRowClick = (group) => {
    navigate(`/beneficiary/group/${group.id}`);
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

    // groups tab: search both child (name) and mother (community)
    let groupSet = groups;
    if (selectedCommunityFilter) {
      groupSet = groupSet.filter((g) => g.community === selectedCommunityFilter);
    }
    if (selectedBatchFilter) {
      groupSet = groupSet.filter((g) => (g.assignedBatchIds || []).includes(selectedBatchFilter));
    }
    if (!term) return groupSet;
    return groupSet.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        (g.community || '').toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term) ||
        g.leader.toLowerCase().includes(term) ||
        g.status.toLowerCase().includes(term)
    );
  }, [activeTab, query, communities, batches, groups]);

  const currentFilteredData =
    groupId && activeTab === 'batches' ? selectedGroupBatches :
    selectedSchool && activeTab === 'groups' ? selectedSchoolGroups :
    filteredData;
  const pageCount = Math.max(1, Math.ceil(currentFilteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = currentFilteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = currentFilteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, currentFilteredData.length);

  const motherProgressByName = useMemo(
    () => Object.fromEntries(communities.map((comm) => [comm.name, comm.progress ?? 0])),
    [communities]
  );

  const displayRows = useMemo(() => {
    if (activeTab === 'groups') {
      return currentRows.map((row) => {
        const groupBatchIds = row.assignedBatchIds || [];
        const groupBatches = batches.filter((batch) => groupBatchIds.includes(batch.id));
        const childProgress = groupBatches.length
          ? Math.round(groupBatches.reduce((sum, batch) => sum + (batch.progress ?? 0), 0) / groupBatches.length)
          : null;
        return { ...row, childProgress };
      });
    }
    return currentRows;
  }, [activeTab, currentRows, batches]);

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

  const openCreateModal = (e) => {
    e.stopPropagation();
    setCreateDropdownOpen((open) => !open);
  };

  const openCreateMother = () => {
    setCreateDropdownOpen(false);
    setGroupForm({ name: '', community: selectedSchool?.name || communities[0]?.name || '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' });
    setShowModal('createGroup');
  };

  const openCreateChild = () => {
    setCreateDropdownOpen(false);
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
      progress: 0,
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
      progress: Number(batchForm.progress) || 0,
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
              progress: Number(batchForm.progress) || 0,
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
      community: groupForm.community,
      assignedBatchIds: groupForm.assignedBatchIds || [],
      leader: groupForm.leader.trim(),
      members: Number(groupForm.members) || 0,
      status: groupForm.status,
      batches: (groupForm.assignedBatchIds?.length ?? 0),
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
          <h1>Beneficiary</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-item">
              <span className="breadcrumb-current">Mother</span>
            </span>
          </nav>
        </div>
        <div className="create-menu-wrapper">
          <button className="btn-create" onClick={openCreateModal} type="button">
            <PlusIcon />
            <span>Create</span>
          </button>
          {createDropdownOpen && (
            <div className="create-dropdown" role="menu">
              <button type="button" className="actions-dropdown-item" onClick={openCreateMother} role="menuitem">
                Create Mother
              </button>
              <button type="button" className="actions-dropdown-item" onClick={openCreateChild} role="menuitem">
                Create Child
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="tabs-row">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedCommunityFilter}
            onChange={(e) => { setSelectedCommunityFilter(e.target.value); setPage(1); }}
            aria-label="Filter by community"
            className="search-input-field"
            style={{ width: 180 }}
          >
            <option value="">All Communities</option>
            {communities.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedBatchFilter}
            onChange={(e) => { setSelectedBatchFilter(e.target.value); setPage(1); }}
            aria-label="Filter by batch"
            className="search-input-field"
            style={{ width: 220 }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} — {b.community}</option>
            ))}
          </select>
        </div>
        <div className="search-container">
          <SearchIcon />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search child name..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>
      </section>

      <BeneficiaryTable
        currentRows={displayRows}
        filteredDataLength={displayLength}
        rangeStart={displayRangeStart}
        rangeEnd={displayRangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        renderPaginationButtons={renderPaginationButtons}
        onCommunityRowClick={handleGroupRowClick}
        motherProgressByName={motherProgressByName}
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
