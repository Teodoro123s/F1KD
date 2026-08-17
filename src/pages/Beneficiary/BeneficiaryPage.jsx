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
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

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

    if (selectedCommunity) {
      items.push({ label: selectedCommunity, clickable: true });
    }
    if (selectedBatch) {
      items.push({ label: selectedBatch.name || selectedBatch, clickable: true });
    }

    if (path.includes('/beneficiary/create/mother')) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (path.includes('/beneficiary/create/child')) {
      items.push({ label: 'Child', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (selectedMother) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: selectedMother.name, clickable: false });
    } else if (!selectedCommunity && !selectedBatch) {
      items.push({ label: 'List', clickable: false });
    }
    return items;
  }, [location?.pathname, selectedMother, selectedCommunity, selectedBatch]);

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

  const communitiesList = useMemo(() => {
    // derive community names from the mock data 'communities' (areas)
    const setNames = Array.from(new Set((communities || []).map((c) => c.area || c.community || 'Unknown')));
    return setNames.sort();
  }, [communities]);

  const derivedBatches = useMemo(() => {
    // create simple batch groupings per area for the UI if real batch mapping is not available
    const map = {};
    communitiesList.forEach((area) => {
      const inArea = (communities || []).filter((m) => (m.area || '').toLowerCase() === (area || '').toLowerCase());
      const perBatch = 6;
      const batchesLocal = [];
      for (let i = 0; i < Math.ceil(inArea.length / perBatch); i += 1) {
        batchesLocal.push({ id: `${area}-B${String(i + 1).padStart(2, '0')}`, name: `${area} Batch ${i + 1}`, community: area, members: inArea.slice(i * perBatch, (i + 1) * perBatch).map((m) => m.id) });
      }
      map[area] = batchesLocal;
    });
    return map;
  }, [communitiesList, communities]);

  const mothersInSelectedScope = useMemo(() => {
    if (selectedBatch) {
      // selectedBatch can be an object
      const ids = selectedBatch.members || [];
      return (communities || []).filter((m) => ids.includes(m.id));
    }
    if (selectedCommunity) {
      return (communities || []).filter((m) => (m.area || '').toLowerCase() === (selectedCommunity || '').toLowerCase());
    }
    return communities;
  }, [communities, selectedCommunity, selectedBatch]);

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

      {isMotherDetail ? (
        <main className="beneficiary-main-full">
          <MotherDetailPage selectedMother={selectedMother} onClose={handleCloseMotherDetail} />
        </main>
      ) : (
        <div className="beneficiary-grid">
          <aside className="beneficiary-communities">
            <h3>Communities</h3>
            <ul>
              <li>
                <button type="button" className={`community-item${!selectedCommunity ? ' active' : ''}`} onClick={() => { setSelectedCommunity(null); setSelectedBatch(null); }}>
                  All
                </button>
              </li>
              {communitiesList.map((c) => (
                <li key={c}>
                  <button type="button" className={`community-item${selectedCommunity === c ? ' active' : ''}`} onClick={() => { setSelectedCommunity(c); setSelectedBatch(null); }}>
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="beneficiary-batches">
            <h3>Batches</h3>
            <div className="batches-list">
              <button type="button" className={`batch-item${!selectedBatch ? ' active' : ''}`} onClick={() => setSelectedBatch(null)}>All batches</button>
              {(selectedCommunity ? (derivedBatches[selectedCommunity] || []) : Object.values(derivedBatches).flat()).map((b) => (
                <button key={b.id} type="button" className={`batch-item${selectedBatch && selectedBatch.id === b.id ? ' active' : ''}`} onClick={() => setSelectedBatch(b)}>
                  {b.name} <span className="muted">({b.members.length})</span>
                </button>
              ))}
            </div>
          </section>

          <main className="beneficiary-main">
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
            ) : (
              <BeneficiaryListPage
                groups={mothersInSelectedScope}
                communities={communities}
                batches={batches}
                onSelectMother={handleSelectMother}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
