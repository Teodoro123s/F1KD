import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { useMothers } from '../../context/MothersContext';
import MotherCheckup from '../Beneficiary/mother/MotherCheckup';
import StatusFilterBar from '../Beneficiary/components/StatusFilterBar';
import EntitySearchControls from '../Beneficiary/components/EntitySearchControls';
import ChildMonitor, { getChildName } from './ChildMonitor';
import { createMonitorModel } from './monitorModel';
import { apiGetChild, apiGetChildren, apiSaveChildCheckup } from '../../api/children';
import { apiGetMother, apiSaveMotherCheckup } from '../../api/mothers';
import { useAuth } from '../../auth/AuthProvider';
import { canViewAuditSignatures, isHealthWorkerRole } from '../../utils/permissions';
import { getChildMonitoringProgress } from '../../utils/childProgress';
import { getMotherMonitoringProgress } from '../../utils/motherProgress';
import { hasCheckupThisMonth } from '../../utils/monthlyCheckups';
import { notifyAction } from '../../components/ActionFeedback';
import TableSearch from '../../components/ui/TableSearch';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import { navigateBack } from '../../utils/navigation';

function getMotherName(mother) {
  return mother?.name || [mother?.firstName || mother?.first_name, mother?.middleName || mother?.middle_name, mother?.lastName || mother?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed mother';
}

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
};

const isWithinCurrentWeek = (date) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return date >= start && date <= end;
};

const getDateStatus = (date) => {
  if (!date) return 'Pending';
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < currentDate) return 'Missing';
  if (isWithinCurrentWeek(date)) return 'Pending';
  return 'Pending';
};

const getMotherMonitoringStatus = (mother, completed, total) => {
  if (completed >= total) return 'Done';
  const checkups = (mother.checkups || []).flat().filter(Boolean);
  const nextDate = checkups
    .filter((checkup) => checkup.nextCheckupDate)
    .sort((a, b) => String(b.nextCheckupDate).localeCompare(String(a.nextCheckupDate)))[0]?.nextCheckupDate;
  const dateStatus = getDateStatus(parseDateOnly(nextDate));
  if (dateStatus === 'Missing') return 'Missing';
  if (completed > 0) return 'Pending';
  return dateStatus;
};

const getChildMonitoringStatus = (child, completed, total) => {
  if (completed >= total) return 'Done';
  const dateStatus = getDateStatus(parseDateOnly(child.nextCheckupDate));
  if (dateStatus === 'Missing') return 'Missing';
  if (completed > 0) return 'Pending';
  return dateStatus;
};

export default function MonitoringPage() {
  const { currentUser } = useAuth();
  const { mothers, setMothers } = useMothers();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [selectedMother, setSelectedMother] = useState(() => location.state?.mother || null);
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(() => location.state?.child || null);
  const [selectedRecordLoading, setSelectedRecordLoading] = useState(() => Boolean(location.state?.child || location.state?.mother));
  const [beneficiaryType, setBeneficiaryType] = useState(() => (location.state?.child ? 'Child' : 'Mother'));
  const [savedMessage, setSavedMessage] = useState('');
  const [motherCheckups, setMotherCheckups] = useState(() => location.state?.mother?.checkups || []);
  const [childCompletedWeeks, setChildCompletedWeeks] = useState(() => location.state?.child?.completedWeeks || []);
  const [editingCheckup, setEditingCheckup] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [monthlyCheckupFilter, setMonthlyCheckupFilter] = useState('All');
  const [selectedMonitoringCard, setSelectedMonitoringCard] = useState(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const assignedGroupId = currentUser?.group_id ?? currentUser?.groupId;
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);

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

  React.useEffect(() => {
    const routeChild = location.state?.child;
    const routeMother = location.state?.mother;
    if (!routeChild && !routeMother) return undefined;

    let active = true;
    setSelectedRecordLoading(true);
    const loadSelectedRecord = async () => {
      try {
        if (routeChild) {
          const childId = routeChild.id || routeChild.childId || routeChild.child_id || routeChild.child_code;
          const response = await apiGetChild(childId);
          if (!active) return;
          const detailedChild = response?.child || routeChild;
          setSelectedChild(detailedChild);
          setSelectedMother(null);
          setBeneficiaryType('Child');
          setChildCompletedWeeks(detailedChild.completedWeeks || []);
        } else {
          const motherId = routeMother.id || routeMother.motherId || routeMother.mother_id || routeMother.mother_code;
          const response = await apiGetMother(motherId);
          if (!active) return;
          const detailedMother = response?.mother || routeMother;
          setSelectedMother(detailedMother);
          setSelectedChild(null);
          setBeneficiaryType('Mother');
          setMotherCheckups(detailedMother.checkups || []);
        }
      } catch (error) {
        if (active) notifyAction(error.message || 'Unable to load monitoring record.', 'error');
      } finally {
        if (active) setSelectedRecordLoading(false);
      }
    };

    loadSelectedRecord();
    return () => { active = false; };
  }, [location.state]);

  const scopedMothers = useMemo(() => isHealthWorkerRole(currentUser?.role) && assignedGroupId
    ? mothers.filter((mother) => String(mother.groupId ?? mother.group_id) === String(assignedGroupId))
    : mothers, [assignedGroupId, currentUser?.role, mothers]);
  const scopedChildren = useMemo(() => isHealthWorkerRole(currentUser?.role) && assignedGroupId
    ? children.filter((child) => String(child.groupId ?? child.group_id) === String(assignedGroupId))
    : children, [assignedGroupId, children, currentUser?.role]);

  const handleSave = async (payload) => {
    try {
      await apiSaveMotherCheckup(payload.motherId, payload);
      const response = await apiGetMother(payload.motherId);
      const savedMother = response?.mother || null;
      if (savedMother) {
        setSelectedMother(savedMother);
        setMotherCheckups(savedMother.checkups || []);
        setMothers((current) => current.map((mother) => (
          String(mother.id) === String(savedMother.id) || String(mother.motherId) === String(savedMother.motherId)
            ? { ...mother, ...savedMother }
            : mother
        )));
      }
    } catch (error) {
      setSavedMessage(`Unable to save check-up: ${error.message}`);
      return false;
    }
    const nextCheckups = motherCheckups.map((trimester) => [...trimester]);
    const trimesterIndex = payload.trimester === '2nd Trimester' ? 1 : payload.trimester === '3rd Trimester' ? 2 : 0;
    if (!nextCheckups[trimesterIndex]) nextCheckups[trimesterIndex] = [null, null, null];
    nextCheckups[trimesterIndex][payload.checkupNumber - 1] = { ...payload, completed: true };
    setMotherCheckups(nextCheckups);
    const completedCount = nextCheckups.flat().filter(Boolean).length;
    const message = completedCount >= 9
      ? `Monitoring completed successfully for ${getMotherName(selectedMother)}.`
      : `Check-up ${payload.trimester} ${payload.checkupNumber} captured successfully for ${getMotherName(selectedMother)}.`;
    setSavedMessage(message);
    notifyAction(message);
    return true;
  };

  const handleSelectMother = (mother) => {
    setSelectedMother(mother);
    setEditingCheckup(false);
    setMotherCheckups(mother.checkups || []);
    setSelectedChild(null);
    setSavedMessage('');
  };

  const handleSelectChild = async (child) => {
    setSavedMessage('');
    try {
      const response = await apiGetChild(child.id || child.child_code);
      const detailedChild = response?.child || child;
      setSelectedChild(detailedChild);
      setChildCompletedWeeks(detailedChild.completedWeeks || child.completedWeeks || []);
    } catch (error) {
      setSelectedChild(child);
      setChildCompletedWeeks(child.completedWeeks || []);
      setSavedMessage(`Unable to load saved child check-ups: ${error.message}`);
    }
    setSelectedMother(null);
    setEditingCheckup(false);
  };

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigateBack(navigate, location, '/monitoring');
      return;
    }

    setSelectedMother(null);
    setSelectedChild(null);
    setEditingCheckup(false);
    setSavedMessage('');

    if (location.pathname === '/monitoring' || location.pathname === '/checkup') {
      navigate('/monitoring', { replace: true });
      return;
    }

    const motherId = location.pathname.match(/^\/beneficiary\/mother\/([^/]+)\/monitoring$/)?.[1];
    navigateBack(navigate, location, motherId ? `/beneficiary/mother/${motherId}` : '/monitoring');
  };

  const clearSearch = () => { setQuery(''); setPage(1); };

  const visibleBeneficiaries = beneficiaryType === 'Mother' ? scopedMothers : scopedChildren;

  const allMonitoringRows = useMemo(() => visibleBeneficiaries.map((beneficiary) => {
    const maternalProgress = beneficiaryType === 'Mother' ? getMotherMonitoringProgress(beneficiary) : null;
    const childProgress = beneficiaryType === 'Child' ? getChildMonitoringProgress(beneficiary) : null;
    const completed = maternalProgress?.completed ?? childProgress?.completed ?? 0;
    const total = maternalProgress?.total ?? childProgress?.total ?? 24;
    const progress = Math.min(100, Math.round((completed / total) * 100));
    const status = beneficiaryType === 'Mother'
      ? getMotherMonitoringStatus(beneficiary, completed, total)
      : getChildMonitoringStatus(beneficiary, completed, total);
    return {
      beneficiary,
      monitor: createMonitorModel(beneficiary),
      completed,
      total,
      progress,
      status,
      hasCheckupThisMonth: hasCheckupThisMonth(beneficiary),
    };
  }), [visibleBeneficiaries, beneficiaryType]);
  const monitoringRows = useMemo(() => {
    const term = query.trim();
    return allMonitoringRows.filter(({ beneficiary, status, hasCheckupThisMonth: hasMonthlyRecord }) => {
      const searchableText = beneficiaryType === 'Mother'
        ? `${getMotherName(beneficiary)} ${beneficiary.motherCode || beneficiary.mother_code || beneficiary.id || ''} ${beneficiary.community || beneficiary.community_name || beneficiary.area || ''}`
        : `${getChildName(beneficiary)} ${beneficiary.child_code || beneficiary.id || ''} ${beneficiary.community || beneficiary.community_name || beneficiary.area || ''}`;
      return (!term || searchableText.includes(term))
        && (statusFilter === 'All' || status === statusFilter)
        && (monthlyCheckupFilter !== 'NoCheckupThisMonth' || !hasMonthlyRecord);
    });
  }, [allMonitoringRows, beneficiaryType, monthlyCheckupFilter, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(monitoringRows.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentRows = monitoringRows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const rangeStart = monitoringRows.length ? (currentPage - 1) * perPage + 1 : 0;
  const rangeEnd = Math.min(currentPage * perPage, monitoringRows.length);

  const renderPaginationButtons = () => (
    <>
      <button
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
        onClick={() => setPage((value) => Math.max(1, value - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      <input
        type="number"
        min={1}
        max={pageCount}
        value={currentPage}
        className="pagination-page-input"
        placeholder="Page"
        aria-label="Jump to a page"
        onChange={(event) => {
          const nextPage = Number(event.target.value);
          if (!Number.isNaN(nextPage) && nextPage >= 1 && nextPage <= pageCount) {
            setPage(nextPage);
          }
        }}
      />

      <button
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
        onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
        disabled={currentPage === pageCount}
        aria-label="Next page"
      >
        ›
      </button>
    </>
  );

  const openBeneficiary = (beneficiary) => {
    if (beneficiaryType === 'Mother') handleSelectMother(beneficiary);
    else handleSelectChild(beneficiary);
  };

  return (
    <div className="community-page checkup-module page">
      <PageHeader
        title={selectedMother || selectedChild ? (selectedMother ? getMotherName(selectedMother) : getChildName(selectedChild)) : 'Monitor'}
        breadcrumbs={selectedMother || selectedChild ? [{ label: 'Monitor', href: '/monitoring' }, { label: selectedMother ? getMotherName(selectedMother) : getChildName(selectedChild) }] : [{ label: 'Monitor' }]}
        actions={selectedMother || selectedChild ? (
          <button type="button" className="view-btn view-btn--secondary back-action" onClick={handleBack}>Back</button>
        ) : null}
      />

      {!selectedMother && !selectedChild ? (
        <section className="monitoring-list-container" aria-labelledby="monitoring-list-title">
          <ModuleSummaryCards
            selected={selectedMonitoringCard}
            toggleOnSelect
            onSelect={(key) => {
              setSelectedMonitoringCard(key);
              if (key) setStatusFilter(key);
              setPage(1);
            }}
            cards={[
              { key: 'All', label: 'Total Records', value: allMonitoringRows.length, description: 'View list' },
              { key: 'Missing', label: 'Missing', value: allMonitoringRows.filter((row) => row.status === 'Missing').length, description: 'View list' },
              { key: 'Pending', label: 'Pending', value: allMonitoringRows.filter((row) => row.status === 'Pending').length, description: 'View list' },
              { key: 'Done', label: 'Done', value: allMonitoringRows.filter((row) => row.status === 'Done').length, description: 'View list' },
            ]}
          />
          {selectedMonitoringCard && (
            <>
          <div className="table-card monitoring-table-card">
            <div className="monitoring-filter-row">
              <EntitySearchControls
                selectedEntityFilter={beneficiaryType}
                showSearch={false}
                onEntityChange={(nextType) => { setBeneficiaryType(nextType); setQuery(''); setPage(1); }}
              />
              <StatusFilterBar
                selectedStatusFilter={statusFilter}
                onChange={(nextStatus) => {
                  setStatusFilter(nextStatus);
                  setSelectedMonitoringCard(nextStatus);
                  setPage(1);
                }}
              />
              <div className="monitoring-monthly-filter">
                <select
                  aria-label="Monthly check-up filter"
                  value={monthlyCheckupFilter}
                  onChange={(event) => { setMonthlyCheckupFilter(event.target.value); setPage(1); }}
                >
                  <option value="All">All records</option>
                  <option value="NoCheckupThisMonth">No check-up this month</option>
                </select>
              </div>
              <TableSearch
                value={query}
                onChange={(value) => { setQuery(value); setPage(1); }}
                placeholder={`Search ${beneficiaryType.toLowerCase()} records (case-sensitive)`}
              />
            </div>
            <div className="table-overflow">
              <table className="data-table">
                <thead><tr><th>{beneficiaryType}</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {childrenLoading && beneficiaryType === 'Child' ? <tr><td colSpan="4" className="no-data">Loading children...</td></tr> : currentRows.length ? currentRows.map(({ beneficiary, completed, total, progress, status }) => {
                    const name = beneficiaryType === 'Mother' ? getMotherName(beneficiary) : getChildName(beneficiary);
                    const recordKey = beneficiaryType === 'Mother' ? beneficiary.id || beneficiary.motherId : beneficiary.child_code || beneficiary.id || 'No ID';
                    return <tr key={recordKey}><td><strong>{name}</strong></td><td><div className="monitoring-progress"><span><span style={{ width: `${progress}%` }} /></span><b>{completed}/{total}</b></div></td><td><span className={`monitoring-status ${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span></td><td><button type="button" className="btn-secondary monitoring-open-button" onClick={() => openBeneficiary(beneficiary)}>Open record</button></td></tr>;
                  }) : <tr><td colSpan="4" className="no-data">No monitoring records match your search.</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="pagination-container"><div className="pagination-left" aria-label="Pagination navigation">{renderPaginationButtons()}</div><div className="pagination-center"><span>Show</span><select className="select-entries" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></div><div className="pagination-right">Showing {rangeStart}-{rangeEnd} of {monitoringRows.length}</div></footer>
          </div>
            </>
          )}
        </section>
      ) : selectedChild ? (
        selectedRecordLoading ? <section className="checkup-entry-view" aria-live="polite"><p>Loading child monitoring record...</p></section> : <section className="checkup-entry-view" aria-labelledby="selected-child-title">
          <div className="selected-mother-bar">
            <div className="selected-record-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/child/${selectedChild.id}`, {
                state: {
                  child: selectedChild,
                  returnTo: location.pathname,
                  returnToState: { child: selectedChild, returnTo: location.state?.returnTo, week: location.state?.week },
                },
              })}>
                Beneficiary Profile
              </button>
              <button type="button" className="btn-primary" onClick={() => setEditingCheckup((current) => !current)}>
                {editingCheckup ? 'Cancel edit' : 'Edit checkup'}
              </button>
            </div>
          </div>
          {savedMessage.startsWith('Unable to save check-up:') && <p className="checkup-save-message checkup-save-message-error" role="alert">{savedMessage}</p>}
          <ChildMonitor
            child={selectedChild}
            showAuditSignatures={showAuditSignatures}
            completedWeeks={childCompletedWeeks}
            initialWeek={location.state?.week}
            onSave={async (payload) => {
              setSavedMessage('');
              let completedWeeks = [];
              try {
                const response = await apiSaveChildCheckup(payload.childId, payload);
                const savedChild = response?.child || null;
                completedWeeks = savedChild?.completedWeeks || [payload.week];
                setSelectedChild(savedChild || selectedChild);
                setChildCompletedWeeks(completedWeeks);
                setChildren((current) => current.map((child) => String(child.id) === String(payload.childId) ? { ...child, ...savedChild } : child));
                setEditingCheckup(false);
              } catch (error) {
                setSavedMessage(`Unable to save check-up: ${error.message}`);
                return false;
              }
              const message = completedWeeks.length >= 24
                ? `Monitoring completed successfully for ${getChildName(selectedChild)}.`
                : `M${payload.week} progress captured successfully for ${getChildName(selectedChild)}.`;
              setSavedMessage(message);
              return true;
            }}
            onCancel={() => setEditingCheckup(false)}
            forceEdit={editingCheckup}
          />
        </section>
      ) : selectedRecordLoading ? (
        <section className="checkup-entry-view" aria-live="polite"><p>Loading mother monitoring record...</p></section>
      ) : (
        <section className="checkup-entry-view" aria-labelledby="selected-mother-title">
          <div className="selected-mother-bar">
            <div className="selected-record-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${selectedMother.id || selectedMother.motherId}`, {
                state: {
                  mother: selectedMother,
                  returnTo: location.pathname,
                  returnToState: { mother: selectedMother, returnTo: location.state?.returnTo },
                },
              })}>
                Beneficiary Profile
              </button>
              <button type="button" className="btn-primary" onClick={() => setEditingCheckup((current) => !current)}>
                {editingCheckup ? 'Cancel edit' : 'Edit checkup'}
              </button>
            </div>
          </div>
          {savedMessage.startsWith('Unable to save check-up:') && <p className="checkup-save-message checkup-save-message-error" role="alert">{savedMessage}</p>}
          <MotherCheckup
            mother={{ ...selectedMother, checkups: motherCheckups }}
            showAuditSignatures={showAuditSignatures}
            onSave={async (payload) => {
              if (await handleSave(payload)) setEditingCheckup(false);
            }}
            onCancel={() => { setEditingCheckup(false); setSelectedMother(null); }}
            forceEdit={editingCheckup}
          />
        </section>
      )}
    </div>
  );
}
