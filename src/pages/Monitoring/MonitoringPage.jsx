import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMothers } from '../../context/MothersContext';
import MotherCheckup from '../Beneficiary/mother/MotherCheckup';
import StatusFilterBar from '../Beneficiary/components/StatusFilterBar';
import EntitySearchControls from '../Beneficiary/components/EntitySearchControls';
import ChildMonitor, { getChildName } from './ChildMonitor';
import { apiGetChildren } from '../../api/children';

function getMotherName(mother) {
  return mother?.name || [mother?.firstName, mother?.middleName, mother?.lastName]
    .filter(Boolean)
    .join(' ') || 'Unnamed mother';
}

export default function MonitoringPage() {
  const { mothers } = useMothers();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [selectedMother, setSelectedMother] = useState(() => location.state?.mother || null);
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(() => location.state?.child || null);
  const [beneficiaryType, setBeneficiaryType] = useState(() => (location.state?.child ? 'Child' : 'Mother'));
  const [savedMessage, setSavedMessage] = useState('');
  const [motherCheckups, setMotherCheckups] = useState(() => location.state?.mother?.checkups || []);
  const [childCompletedWeeks, setChildCompletedWeeks] = useState(() => location.state?.child?.completedWeeks || []);
  const [statusFilter, setStatusFilter] = useState('All');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    let active = true;
    apiGetChildren().then((response) => {
      if (active) setChildren(response.children || []);
    }).catch(() => {
      if (active) setChildren([]);
    }).finally(() => {
      if (active) setChildrenLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredMothers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return mothers;
    return mothers.filter((mother) => (
      `${getMotherName(mother)} ${mother.motherId || mother.id || ''} ${mother.community || mother.area || ''}`
        .toLowerCase()
        .includes(term)
    ));
  }, [mothers, query]);

  const filteredChildren = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return children;
    return children.filter((child) => (
      `${getChildName(child)} ${child.child_code || child.id || ''} ${child.community_name || ''}`.toLowerCase().includes(term)
    ));
  }, [children, query]);

  const handleSave = (payload) => {
    setMotherCheckups((current) => {
      const next = current.map((trimester) => [...trimester]);
      const trimesterIndex = payload.trimester === '2nd Trimester' ? 1 : payload.trimester === '3rd Trimester' ? 2 : 0;
      if (!next[trimesterIndex]) next[trimesterIndex] = [null, null, null];
      next[trimesterIndex][payload.checkupNumber - 1] = { ...payload, completed: true };
      return next;
    });
    setSavedMessage(`Check-up ${payload.trimester} ${payload.checkupNumber} captured for ${getMotherName(selectedMother)}.`);
  };

  const handleSelectMother = (mother) => {
    setSelectedMother(mother);
    setMotherCheckups(mother.checkups || []);
    setSelectedChild(null);
    setSavedMessage('');
  };

  const handleSelectChild = (child) => {
    setSelectedChild(child);
    setChildCompletedWeeks(child.completedWeeks || []);
    setSelectedMother(null);
    setSavedMessage('');
  };

  const handleBack = () => {
    navigate('/beneficiary');
  };

  const clearSearch = () => { setQuery(''); setPage(1); };

  const visibleBeneficiaries = beneficiaryType === 'Mother' ? filteredMothers : filteredChildren;

  const monitoringRows = useMemo(() => visibleBeneficiaries.map((beneficiary) => {
    const completed = beneficiaryType === 'Mother'
      ? (beneficiary.checkups || []).flat().filter(Boolean).length
      : (beneficiary.completedWeeks || []).length;
    const total = beneficiaryType === 'Mother' ? 9 : 48;
    const progress = Math.min(100, Math.round((completed / total) * 100));
    const status = progress === 0 ? 'Missing' : progress < 100 ? 'Pending' : 'Done';
    return { beneficiary, completed, total, progress, status };
  }).filter((row) => statusFilter === 'All' || row.status === statusFilter), [visibleBeneficiaries, beneficiaryType, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(monitoringRows.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentRows = monitoringRows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const rangeStart = monitoringRows.length ? (currentPage - 1) * perPage + 1 : 0;
  const rangeEnd = Math.min(currentPage * perPage, monitoringRows.length);

  const renderPaginationButtons = () => {
    const buttons = [];
    buttons.push(<button key="first" type="button" className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`} onClick={() => setPage(1)} disabled={currentPage === 1} aria-label="First page">«</button>);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      if (pageCount > 5 && pageNumber > 3 && pageNumber < pageCount) {
        if (pageNumber === 4) buttons.push(<span key="ellipsis" className="pagination-btn ellipsis">...</span>);
        continue;
      }
      buttons.push(<button key={pageNumber} type="button" className={`pagination-btn${currentPage === pageNumber ? ' active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>);
    }
    buttons.push(<button key="last" type="button" className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`} onClick={() => setPage(pageCount)} disabled={currentPage === pageCount} aria-label="Last page">»</button>);
    return buttons;
  };

  const openBeneficiary = (beneficiary) => {
    if (beneficiaryType === 'Mother') handleSelectMother(beneficiary);
    else handleSelectChild(beneficiary);
  };

  return (
    <div className="checkup-module page">
      <header className="checkup-module-header">
        <div>
          <h1>Monitor</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-item">
              <span className="breadcrumb-current">Monitor</span>
            </span>
          </nav>
        </div>
        <button type="button" className="btn-secondary" onClick={handleBack}>
          Back to Beneficiaries
        </button>
      </header>

      {!selectedMother && !selectedChild ? (
        <section className="monitoring-list-container" aria-labelledby="monitoring-list-title">
          <div className="tabs-row monitoring-filter-row">
            <StatusFilterBar selectedStatusFilter={statusFilter} onChange={(nextStatus) => { setStatusFilter(nextStatus); setPage(1); }} />
            <EntitySearchControls
              selectedEntityFilter={beneficiaryType}
              query={query}
              onEntityToggle={() => { setBeneficiaryType((current) => (current === 'Mother' ? 'Child' : 'Mother')); setQuery(''); setPage(1); }}
              onQueryChange={(value) => { setQuery(value); setPage(1); }}
            />
          </div>
          <div className="table-card monitoring-table-card">
            <div className="table-overflow">
              <table className="data-table">
                <thead><tr><th>{beneficiaryType}</th><th>Monitoring type</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {childrenLoading && beneficiaryType === 'Child' ? <tr><td colSpan="5" className="no-data">Loading children...</td></tr> : currentRows.length ? currentRows.map(({ beneficiary, completed, total, progress, status }) => {
                    const name = beneficiaryType === 'Mother' ? getMotherName(beneficiary) : getChildName(beneficiary);
                    const id = beneficiary.motherId || beneficiary.child_code || beneficiary.id || 'No ID';
                    const locationName = beneficiary.community || beneficiary.area || beneficiary.community_name || 'No community';
                    return <tr key={id}><td><strong>{name}</strong><span className="monitoring-table-meta">{id} · {locationName}</span></td><td>{beneficiaryType === 'Mother' ? 'Prenatal check-ups' : 'Growth monitoring'}</td><td><div className="monitoring-progress"><span><span style={{ width: `${progress}%` }} /></span><b>{completed}/{total}</b></div></td><td><span className={`monitoring-status ${status.toLowerCase()}`}>{status}</span></td><td><button type="button" className="btn-secondary monitoring-open-button" onClick={() => openBeneficiary(beneficiary)}>Open record</button></td></tr>;
                  }) : <tr><td colSpan="5" className="no-data">No monitoring records match your search.</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="pagination-container"><div className="pagination-left" aria-label="Pagination navigation">{renderPaginationButtons()}</div><div className="pagination-center"><span>Show</span><select className="select-entries" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></div><div className="pagination-right">Showing {rangeStart}-{rangeEnd} of {monitoringRows.length}</div></footer>
          </div>
        </section>
      ) : selectedChild ? (
        <section className="checkup-entry-view" aria-labelledby="selected-child-title">
          <div className="selected-mother-bar">
            <div>
              <span className="selected-mother-eyebrow">Selected child</span>
              <h2 id="selected-child-title">{getChildName(selectedChild)}</h2>
              <p>{selectedChild.child_code || selectedChild.id || 'No ID'} <span aria-hidden="true">·</span> 48-week growth monitoring</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSelectedChild(null)}>Change Beneficiary</button>
          </div>
          {savedMessage && <p className="checkup-save-message" role="status">{savedMessage}</p>}
          <ChildMonitor
            child={selectedChild}
            completedWeeks={childCompletedWeeks}
            onSave={(payload) => {
              setChildCompletedWeeks((current) => current.includes(payload.week) ? current : [...current, payload.week].sort((a, b) => a - b));
              setSavedMessage(`Week ${payload.week} progress captured for ${getChildName(selectedChild)}.`);
            }}
            onCancel={() => setSelectedChild(null)}
          />
        </section>
      ) : (
        <section className="checkup-entry-view" aria-labelledby="selected-mother-title">
          <div className="selected-mother-bar">
            <div>
              <span className="selected-mother-eyebrow">Selected beneficiary</span>
              <h2 id="selected-mother-title">{getMotherName(selectedMother)}</h2>
              <p>{selectedMother.motherId || selectedMother.id || 'No ID'}{selectedMother.community || selectedMother.area ? ` · ${selectedMother.community || selectedMother.area}` : ''} <span aria-hidden="true">·</span> prenatal monitoring</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSelectedMother(null)}>
              Change Mother
            </button>
          </div>
          {savedMessage && <p className="checkup-save-message" role="status">{savedMessage}</p>}
          <MotherCheckup mother={{ ...selectedMother, checkups: motherCheckups }} onSave={handleSave} onCancel={() => setSelectedMother(null)} />
        </section>
      )}
    </div>
  );
}
