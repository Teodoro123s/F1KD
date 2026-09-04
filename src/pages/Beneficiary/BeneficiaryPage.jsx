import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { PlusIcon } from './BeneficiaryIcons';
import CreateMotherPage from './mother/CreateMotherPage';
import CreateChildPage from './child/CreateChildPage';
import BeneficiaryListPage from './BeneficiaryListPage';
import MotherDetailPage from './mother/MotherDetailPage';
import { useMothers } from '../../context/MothersContext';
import { getSummary } from '../Community/communityService';
import { apiGetMother } from '../../api/mothers';
import { apiGetChildrenByMother } from '../../api/children';
import { can } from '../../utils/permissions';
import { useAuth } from '../../auth/AuthProvider';

export default function BeneficiaryPage() {
  // Mothers are loaded from the DB via MothersContext
  const auth = useAuth();
  const { mothers, setMothers } = useMothers();
  const [groups, setGroups] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState(null);

  useEffect(() => {
    getSummary()
      .then((summary) => {
        setCommunities(summary.communities || []);
        setGroups(summary.groups || []);
        setBatches(summary.batches || []);
      })
      .catch((error) => console.error('[BeneficiaryPage] Unable to load community options:', error));
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { id: motherRouteId } = useParams();

  useEffect(() => {
    function closeDropdowns() {
      setCreateDropdownOpen(false);
    }
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  const openCreateModal = (e) => {
    e.stopPropagation();
    setCreateDropdownOpen((open) => !open);
  };

  const openCreateMother = () => {
    setCreateDropdownOpen(false);
    navigate('/beneficiary/create/mother');
  };

  const openCreateChild = () => {
    setCreateDropdownOpen(false);
    navigate('/beneficiary/create/child');
  };

  const isCreateMother = location.pathname.includes('/beneficiary/create/mother');
  const isCreateChild = location.pathname.includes('/beneficiary/create/child');
  const isMotherDetail = Boolean(selectedMother);
  const canCreate = can(auth?.currentUser?.role, 'admin-resources', 'create');

  // If navigation includes a mother in state (e.g., navigating from child pages or external links), ensure the selectedMother is populated
  React.useEffect(() => {
    const navMother = location.state?.mother || null;
    const updatedMother = location.state?.updatedMother || null;
    if (updatedMother) {
      setSelectedMother((current) => ({ ...(current || {}), ...updatedMother }));
      return;
    }
    if (location.pathname.startsWith('/beneficiary/mother/') && navMother) {
      apiGetChildrenByMother(navMother.raw?.id || navMother.original?.raw?.id || navMother.id || navMother.motherId)
        .then((childrenResponse) => {
          setSelectedMother({ ...navMother, children: childrenResponse?.children || [] });
        })
        .catch((error) => {
          console.error('[BeneficiaryPage] Unable to refresh mother children:', error);
          setSelectedMother(navMother);
        });
      return;
    }
    if (location.pathname.startsWith('/beneficiary/mother/') && motherRouteId) {
      apiGetMother(motherRouteId)
        .then(async (response) => {
          const loadedMother = response?.mother || null;
          if (!loadedMother) return;
          const childrenResponse = await apiGetChildrenByMother(loadedMother.raw?.id || loadedMother.id || motherRouteId);
          setSelectedMother({ ...loadedMother, children: childrenResponse?.children || [] });
        })
        .catch((error) => console.error('[BeneficiaryPage] Unable to load mother deep link:', error));
    }
  }, [location.pathname, location.state, motherRouteId]);

  const handleSelectMother = async (mother) => {
    try {
      const [motherResponse, childrenResponse] = await Promise.all([
        apiGetMother(mother.id || mother.motherId),
        apiGetChildrenByMother(mother.raw?.id || mother.original?.raw?.id || mother.id || mother.motherId),
      ]);
      setSelectedMother({
        ...mother,
        ...(motherResponse?.mother || {}),
        children: childrenResponse?.children || [],
      });
    } catch (error) {
      console.error('[BeneficiaryPage] Unable to load mother detail:', error);
      setSelectedMother(mother);
    }
  };

  const handleCloseMotherDetail = () => {
    setSelectedMother(null);
  };

  const handleSelectChild = (child) => {
    // Table rows wrap the API record in `original`; pass the record itself to the detail page.
    const childRecord = child.original?.id ? child.original : child;
    navigate(`/beneficiary/child/${childRecord.id}`, {
      state: {
        child: childRecord,
        mother: childRecord.mother || child.mother || null,
      },
    });
  };

  return (
    <div className="community-page beneficiary-page">
      <PageHeader
        title="Beneficiaries"
        breadcrumbs={[{ label: 'Beneficiaries' }]}
        actions={
          !isMotherDetail && canCreate ? (
            <div className="create-menu-wrapper">
              <button className="view-btn view-btn--primary" onClick={openCreateModal} type="button">
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
          ) : null
        }
      />

      <main className="beneficiary-main">
        {/* Check create routes before showing selected mother detail so navigation to create pages works even when a mother is selected */}
        {isCreateMother ? (
          <CreateMotherPage
            communities={communities}
            groups={groups}
            batches={batches}
            navigate={navigate}
          />
        ) : isCreateChild ? (
          <CreateChildPage
            communities={communities}
            batches={batches}
            mothers={mothers}
            setGroups={setGroups}
            navigate={navigate}
          />
        ) : isMotherDetail ? (
          <MotherDetailPage selectedMother={selectedMother} onClose={handleCloseMotherDetail} />
        ) : (
          <BeneficiaryListPage
            mothers={mothers}
            communities={communities}
            batches={batches}
            onSelectMother={handleSelectMother}
            onSelectChild={handleSelectChild}
          />
        )}
      </main>
    </div>
  );
}
