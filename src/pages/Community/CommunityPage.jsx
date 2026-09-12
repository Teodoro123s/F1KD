import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommunityTable from './CommunityTable';
import CommunityModalManager from './CommunityModalManager';
import CommunityToolbar from './components/CommunityToolbar';
import CommunityPagination from './components/CommunityPagination';
import { MoreVerticalIcon } from './CommunityIcons';
import { useCommunityData } from './hooks/useCommunityData';
import { useCommunityMutations } from './hooks/useCommunityMutations';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../utils/permissions';
import { apiDeleteMother } from '../../api/mothers';
import { apiGetChildren } from '../../api/children';

const defaultCommunityForm = { name: '', area: 'Poblacion', coordinator: '' };
const defaultGroupForm = { name: '', community: '', assignedBatchIds: [], leader: '', members: 1, status: 'Active' };
const defaultBatchForm = { name: '', community: '', records: 1, progress: 0, status: 'Active' };

const getMotherProfileProgress = (mother) => {
  const requiredFields = [
    mother?.first_name || mother?.firstName,
    mother?.last_name || mother?.lastName,
    mother?.dob || mother?.dateOfBirth,
    mother?.community || mother?.area,
    mother?.birth_certificate_document_path || mother?.birthCertificateDocumentPath,
    mother?.consent_document_path || mother?.consentDocumentPath,
  ];

  const completedFields = requiredFields.filter(Boolean).length;
  return Math.round((completedFields / requiredFields.length) * 100);
};

const getChildProfileProgress = (child) => {
  const requiredFields = [
    child?.mother_id || child?.motherId,
    child?.name || child?.first_name || child?.firstName,
    child?.birth_date || child?.birthDate,
    child?.birth_document_path || child?.birthDocumentPath,
  ];

  const completedFields = requiredFields.filter(Boolean).length;
  return Math.round((completedFields / requiredFields.length) * 100);
};

const truncateLabel = (label, maxLength = 26) => {
  if (!label) return '—';
  return String(label).length > maxLength ? `${String(label).slice(0, maxLength - 1).trimEnd()}…` : String(label);
};

export default function CommunityPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { schoolId, groupId, batchId } = useParams();
  const canManage = can(currentUser?.role, 'admin-resources', 'create');

  const { communities, batches, groups, mothers, coordinators, loading, error, refreshData } = useCommunityData();
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

  const activeTab = batchId ? 'mothers' : groupId ? 'batches' : schoolId ? 'groups' : 'communities';

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(batchId)),
    [batches, batchId]
  );

  const selectedGroup = useMemo(() => {
    const groupFromRoute = groups.find((group) => String(group.id) === String(groupId));

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

    return groups.find((group) => group.name === groupNames[0]) || null;
  }, [groups, groupId, selectedBatch]);

  const selectedSchool = useMemo(() => {
    const schoolFromRoute = communities.find((community) => String(community.id) === String(schoolId));

    if (schoolFromRoute) {
      return schoolFromRoute;
    }

    if (selectedGroup) {
      return communities.find((community) => community.name === selectedGroup.community) || null;
    }

    if (selectedBatch) {
      return communities.find((community) => community.name === selectedBatch.community) || null;
    }

    return null;
  }, [communities, schoolId, selectedBatch, selectedGroup]);

  const selectedSchoolGroups = useMemo(() => {
    if (!selectedSchool) return [];

    return groups
      .filter((group) => group.community === selectedSchool.name)
      .filter((group) => {
        if (!query.trim()) return true;
        const term = query.trim().toLowerCase();
        return [group.name, String(group.id), group.leader, group.status].some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      });
  }, [groups, query, selectedSchool]);

  const selectedGroupBatches = useMemo(() => {
    if (!selectedGroup) return [];

    const groupBatchIds = mothers
      .filter((mother) => mother.group === selectedGroup.name && mother.batchId)
      .map((mother) => String(mother.batchId));

    return batches
      .filter((batch) => groupBatchIds.includes(String(batch.id)))
      .filter((batch) => {
        if (!query.trim()) return true;
        const term = query.trim().toLowerCase();
        return [batch.name, String(batch.id), batch.community, batch.status].some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      });
  }, [batches, mothers, query, selectedGroup]);

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
      return communities.filter((community) => {
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
        const matchesBatch = !selectedBatch || String(child.batchId ?? '') === String(selectedBatch.id) || child.batch === selectedBatch.name;
        const matchesGroup = !selectedGroup || child.group === selectedGroup.name;
        const matchesSchool = !selectedSchool || child.community === selectedSchool.name;

        if (!matchesBatch || !matchesGroup || !matchesSchool) return false;
        if (!term) return true;

        return [child.name, child.motherName, child.community, child.group, String(child.id)].some((value) =>
          String(value || '').toLowerCase().includes(term)
        );
      });
    }

    return selectedBatchMothers;
  }, [activeTab, childrenRows, communities, entityFilter, query, selectedBatch, selectedBatchMothers, selectedGroup, selectedGroupBatches, selectedSchool, selectedSchoolGroups]);

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
  }, [activeTab, selectedBatch, selectedGroup, selectedSchool]);

  useEffect(() => {
    const closeDropdowns = () => setActiveDropdownId(null);
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    if (communities.length > 0 && !batchForm.community) {
      setBatchForm((previous) => ({ ...previous, community: communities[0].name }));
    }

    if (communities.length > 0 && !groupForm.community) {
      setGroupForm((previous) => ({ ...previous, community: communities[0].name }));
    }
  }, [batchForm.community, communities, groupForm.community]);

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
      community: communities[0]?.name || '',
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
    } catch (error) {
      console.error('[CommunityPage] Unable to delete mother:', error);
      window.alert(error?.message || 'Unable to delete mother.');
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
        if (!canManage) {
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

    if (activeTab === 'communities') {
      return [
        { key: 'name', header: 'School Name', style: { width: '48%' }, renderCell: (row) => <span className="community-title-text" title={row.name}>{row.name}</span> },
        { key: 'batches', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.batches || 0 },
        { key: 'groups', header: 'Total Groups', cellClassName: 'small-column', renderCell: (row) => groups.filter((group) => group.community === row.name).length },
        actionColumn,
      ];
    }

    if (activeTab === 'groups') {
      return [
        { key: 'name', header: 'Group Name', style: { width: '60%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'assignedBatchIds', header: 'Total Batches', cellClassName: 'small-column', renderCell: (row) => row.assignedBatchIds?.length ?? row.batches ?? 0 },
        actionColumn,
      ];
    }

    if (activeTab === 'mothers') {
      if (entityFilter === 'Child') {
        return [
          { key: 'name', header: 'Child Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
          { key: 'motherName', header: 'Mother Name', style: { width: '24%' }, renderCell: (row) => row.motherName || '—' },
          { key: 'profileProgress', header: 'Profile Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.profileProgress ?? 0)}%` },
          { key: 'progress', header: 'Monitor Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.progress ?? 0)}%` },
          actionColumn,
        ];
      }

      return [
        { key: 'name', header: 'Mother Name', style: { width: '52%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
        { key: 'profileProgress', header: 'Profile Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${getMotherProfileProgress(row)}%` },
        { key: 'progress', header: 'Monitor Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${Number(row.progress ?? 0)}%` },
        actionColumn,
      ];
    }

    return [
      { key: 'name', header: 'Batch Name', style: { width: '42%' }, renderCell: (row) => <span className="community-title-text">{row.name}</span> },
      { key: 'community', header: 'Community', style: { width: '32%' }, cellClassName: 'community-column', renderCell: (row) => row.community },
      { key: 'records', header: 'Total Mothers', cellClassName: 'compact-column', renderCell: (row) => row.records },
      { key: 'progress', header: 'Progress (%)', cellClassName: 'status-column', renderCell: (row) => `${row.progress ?? 0}%` },
      actionColumn,
    ];
  }, [activeDropdownId, activeTab, canManage, entityFilter, groups, handleDeleteBatch, handleDeleteCommunity, handleDeleteGroup, handleDeleteMother, navigate, openEditModal]);

  const currentRowClickHandler =
    activeTab === 'communities'
      ? (school) => navigate(`/community/school/${school.id}`)
      : activeTab === 'groups'
        ? (group) => navigate(`/community/group/${group.id}`)
        : activeTab === 'batches'
          ? (batch) => navigate(`/community/batch/${batch.id}`)
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
        query={query}
        entityFilter={entityFilter}
        onSearch={handleSearch}
        onEntityFilterChange={handleEntityFilterChange}
        onTabChange={handleTabChange}
        onCreate={openCreateModal}
        breadcrumbItems={breadcrumbItems}
        navigate={navigate}
        canManage={canManage}
      />

      <CommunityTable
        columns={columns}
        data={currentRows}
        onRowClick={currentRowClickHandler}
        tableTitle={tableTitle}
      />

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
        batches={batches}
        coordinators={coordinators}
        onCreateCommunity={handleCreateCommunity}
        onEditCommunity={handleEditCommunity}
        onCreateBatch={handleCreateBatch}
        onEditBatch={handleEditBatch}
        onCreateGroup={handleCreateGroup}
        onEditGroup={handleEditGroup}
        isSubmitting={mutations.loading}
      />
    </div>
  );
}
