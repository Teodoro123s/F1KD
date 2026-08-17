import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusIcon } from './BeneficiaryIcons';
import CreateMotherPage from './CreateMotherPage';
import CreateChildPage from './CreateChildPage';
import BeneficiaryListPage from './BeneficiaryListPage';
import MotherDetailPage from './MotherDetailPage';
import { initialCommunityData, initialBatchesData, initialGroupsData } from '../../utils/mockData';

export default function BeneficiaryPage() {
  // Use the existing mock data for mothers list (initialCommunityData contains mother records)
  const [mothers, setMothers] = useState(initialCommunityData);
  const [groups, setGroups] = useState(initialGroupsData);
  const [batches] = useState(initialBatchesData);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSelectMother = (mother) => {
    setSelectedMother(mother);
  };

  const handleCloseMotherDetail = () => {
    setSelectedMother(null);
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Beneficiaries</h1>
        </div>

        {/* Create button (keeps the simple dropdown used previously) */}
        {!isMotherDetail && (
          <div className="create-menu-wrapper">
            <button className="btn-create btn-create--hero" onClick={openCreateModal} type="button">
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
        )}
      </header>

      <main className="beneficiary-main">
        {isMotherDetail ? (
          <MotherDetailPage selectedMother={selectedMother} onClose={handleCloseMotherDetail} />
        ) : isCreateMother ? (
          <CreateMotherPage
            communities={mothers}
            groups={groups}
            batches={batches}
            setCommunities={setMothers}
            navigate={navigate}
          />
        ) : isCreateChild ? (
          <CreateChildPage
            communities={mothers}
            batches={batches}
            setGroups={setGroups}
            navigate={navigate}
          />
        ) : (
          <BeneficiaryListPage
            groups={mothers}
            communities={mothers}
            batches={batches}
            onSelectMother={handleSelectMother}
          />
        )}
      </main>
    </div>
  );
}
