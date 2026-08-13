import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusIcon } from './BeneficiaryIcons';
import CreateMotherPage from './CreateMotherPage';
import CreateChildPage from './CreateChildPage';
import BeneficiaryListPage from './BeneficiaryListPage';
import MotherDetailPage from './MotherDetailPage';
import {
  initialCommunityData,
  initialBatchesData,
  initialGroupsData,
} from '../../utils/mockData';

export default function BeneficiaryPage() {
  const [communities, setCommunities] = useState(initialCommunityData);
  const [batches, setBatches] = useState(initialBatchesData);
  const [groups, setGroups] = useState(initialGroupsData);
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

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Beneficiary', clickable: false }];
    const path = location?.pathname || '';

    if (path.includes('/beneficiary/create/mother')) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (path.includes('/beneficiary/create/child')) {
      items.push({ label: 'Child', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (selectedMother) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: selectedMother.name, clickable: false });
    } else {
      items.push({ label: 'List', clickable: false });
    }
    return items;
  }, [location?.pathname, selectedMother]);

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
          <h1>Beneficiary</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={`${item.label}-${index}`} className="breadcrumb-item">
                {item.clickable ? (
                  <button type="button" className="breadcrumb-link">{item.label}</button>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && <span className="breadcrumb-separator">›</span>}
              </span>
            ))}
          </nav>
        </div>
        {!(isCreateMother || isCreateChild || isMotherDetail) && (
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

      {isCreateMother ? (
        <CreateMotherPage
          communities={communities}
          groups={groups}
          batches={batches}
          setCommunities={setCommunities}
          navigate={navigate}
        />
      ) : isCreateChild ? (
        <CreateChildPage
          communities={communities}
          batches={batches}
          setGroups={setGroups}
          navigate={navigate}
        />
      ) : null}

      {isMotherDetail ? (
        <MotherDetailPage selectedMother={selectedMother} onClose={handleCloseMotherDetail} />
      ) : !isCreateMother && !isCreateChild && (
        <BeneficiaryListPage
          groups={groups}
          communities={communities}
          batches={batches}
          onSelectMother={handleSelectMother}
        />
      )}
    </div>
  );
}
