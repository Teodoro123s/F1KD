import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { useMothers } from '../../context/MothersContext';
import MotherCheckup from '../Beneficiary/mother/MotherCheckup';
import EntitySearchControls from '../Beneficiary/components/EntitySearchControls';
import ChildMonitor, { getChildName } from './ChildMonitor';
import { createMonitorModel } from './monitorModel';
import { apiGetChild, apiGetChildren, apiSaveChildCheckup } from '../../api/children';
import { apiGetMother, apiGetMothers, apiSaveMotherCheckup } from '../../api/mothers';
import { useAuth } from '../../auth/AuthProvider';
import { can, canViewAuditSignatures, isHealthWorkerRole } from '../../utils/permissions';
import { getChildMonitoringProgress } from '../../utils/beneficiary/childProgress';
import { getMotherMonitoringProgress, getMotherNextCheckupDate } from '../../utils/beneficiary/motherProgress';
import { notifyAction } from '../../components/ActionFeedback';
import TableSearch from '../../components/ui/TableSearch';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import useModalAccessibility from '../../components/ui/useModalAccessibility';
import { navigateBack } from '../../utils/navigation/navigation';
import MotherNavigationCards from '../Beneficiary/mother/MotherNavigationCards';
import ChildNavigationCards from '../Beneficiary/child/ChildNavigationCards';
import BeneficiarySuperHeader from '../Beneficiary/mother/BeneficiarySuperHeader';
import MonitoringActivityCalendar from './MonitoringActivityCalendar';
import { getMaternalMonitoringActivities } from './monitoringActivityCalendarUtils.mjs';
import { getMonitoringScreeningRouteFilters, getMonthlyDevelopmentalStatus, normalizeDevelopmentalStatus } from './monitoringScreeningUtils.mjs';

function getMotherName(mother) {
  return mother?.name || [mother?.firstName || mother?.first_name, mother?.middleName || mother?.middle_name, mother?.lastName || mother?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed mother';
}

function MotherCheckupEditDrawer({ mother, initialStep, showAuditSignatures, onSave, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeDrawer = () => {
    if (document.querySelector('.checkup-confirm-modal')) return;
    onClose();
  };
  useModalAccessibility({
    open: true,
    onClose: closeDrawer,
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  return createPortal((
    <div
      className="checkup-edit-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <aside
        ref={dialogRef}
        className="checkup-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkup-edit-drawer-title"
        tabIndex={-1}
      >
        <header className="checkup-edit-drawer__header">
          <div>
            <h2 id="checkup-edit-drawer-title">Edit pregnancy record</h2>
            <p>{getMotherName(mother)}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="checkup-edit-drawer__close"
            onClick={closeDrawer}
            aria-label="Close edit pregnancy record"
          >
            ×
          </button>
        </header>
        <div className="checkup-edit-drawer__content">
          <MotherCheckup
            mother={mother}
            initialStepOverride={initialStep}
            showAuditSignatures={showAuditSignatures}
            onSave={onSave}
            onCancel={closeDrawer}
            forceEdit
          />
        </div>
      </aside>
    </div>
  ), document.body);
}

function ChildCheckupEditDrawer({ child, initialWeek, completedWeeks, showAuditSignatures, onSave, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeDrawer = () => {
    if (document.querySelector('.checkup-confirm-modal')) return;
    onClose();
  };
  useModalAccessibility({
    open: true,
    onClose: closeDrawer,
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  return createPortal((
    <div
      className="checkup-edit-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <aside
        ref={dialogRef}
        className="checkup-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-checkup-edit-drawer-title"
        tabIndex={-1}
      >
        <header className="checkup-edit-drawer__header">
          <div>
            <h2 id="child-checkup-edit-drawer-title">Edit child check-up</h2>
            <p>{getChildName(child)}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="checkup-edit-drawer__close"
            onClick={closeDrawer}
            aria-label="Close edit child check-up"
          >
            ×
          </button>
        </header>
        <div className="checkup-edit-drawer__content">
          <ChildMonitor
            child={child}
            initialWeek={initialWeek}
            completedWeeks={completedWeeks}
            showAuditSignatures={showAuditSignatures}
            onSave={onSave}
            onCancel={closeDrawer}
            forceEdit
          />
        </div>
      </aside>
    </div>
  ), document.body);
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
  const latestCheckup = checkups[checkups.length - 1];
  const nextDate = latestCheckup
    ? latestCheckup.nextCheckupDate || getMotherNextCheckupDate(latestCheckup.checkupDate)
    : '';
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
  const [selectedMotherCheckupStep, setSelectedMotherCheckupStep] = useState(
    () => Number.isInteger(location.state?.checkupStep) ? location.state.checkupStep : null,
  );
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenLoadError, setChildrenLoadError] = useState('');
  const [monitoringCalendarMothers, setMonitoringCalendarMothers] = useState([]);
  const [monitoringCalendarLoading, setMonitoringCalendarLoading] = useState(true);
  const [monitoringCalendarError, setMonitoringCalendarError] = useState('');
  const [monitoringCalendarRetry, setMonitoringCalendarRetry] = useState(0);
  const monitoringCalendarRequestVersion = useRef(0);
  const [selectedChild, setSelectedChild] = useState(() => location.state?.child || null);
  const [selectedRecordLoading, setSelectedRecordLoading] = useState(() => Boolean(location.state?.child || location.state?.mother));
  const [beneficiaryType, setBeneficiaryType] = useState(() => (
    getMonitoringScreeningRouteFilters(location.search)?.beneficiaryType || (location.state?.child ? 'Child' : 'Mother')
  ));
  const [savedMessage, setSavedMessage] = useState('');
  const [motherCheckups, setMotherCheckups] = useState(() => location.state?.mother?.checkups || []);
  const [childCompletedWeeks, setChildCompletedWeeks] = useState(() => location.state?.child?.completedWeeks || []);
  const [editingCheckup, setEditingCheckup] = useState(false);
  const [editingCheckupStep, setEditingCheckupStep] = useState(null);
  const [editingChildCheckup, setEditingChildCheckup] = useState(false);
  const [editingChildCheckupWeek, setEditingChildCheckupWeek] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [developmentalScreeningFilter, setDevelopmentalScreeningFilter] = useState(() => (
    getMonitoringScreeningRouteFilters(location.search)?.screeningStatus || 'All'
  ));
  const [selectedMonitoringCard, setSelectedMonitoringCard] = useState(() => (
    getMonitoringScreeningRouteFilters(location.search) ? 'All' : null
  ));
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const assignedGroupId = currentUser?.group_id ?? currentUser?.groupId;
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);
  const canEditMonitoring = can(currentUser?.role, 'monitor-resources', 'update');

  React.useEffect(() => {
    const routeFilters = getMonitoringScreeningRouteFilters(location.search);
    if (!routeFilters || selectedMother || selectedChild) return;
    setBeneficiaryType(routeFilters.beneficiaryType);
    setStatusFilter('All');
    setDevelopmentalScreeningFilter(routeFilters.screeningStatus);
    setSelectedMonitoringCard('All');
    setPage(1);
  }, [location.search, selectedChild, selectedMother]);

  React.useEffect(() => {
    let active = true;
    apiGetChildren(['checkups']).then((response) => {
      if (active) setChildren(response.children || []);
    }).catch((error) => {
      if (active) {
        setChildren([]);
        setChildrenLoadError(error.message || 'Unable to load child check-up records.');
      }
    }).finally(() => {
      if (active) setChildrenLoading(false);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    const requestId = ++monitoringCalendarRequestVersion.current;
    setMonitoringCalendarLoading(true);
    setMonitoringCalendarError('');
    apiGetMothers(['checkups']).then((response) => {
      if (!Array.isArray(response?.mothers)) {
        throw new Error('Maternal monitoring data could not be loaded in the expected format.');
      }
      if (active && requestId === monitoringCalendarRequestVersion.current) {
        const accessibleMothers = isHealthWorkerRole(currentUser?.role) && assignedGroupId
          ? response.mothers.filter((mother) => String(mother.groupId ?? mother.group_id) === String(assignedGroupId))
          : response.mothers;
        setMonitoringCalendarMothers(accessibleMothers);
      }
    }).catch((error) => {
      if (active && requestId === monitoringCalendarRequestVersion.current) {
        setMonitoringCalendarError(error.message || 'Unable to load maternal monitoring activities.');
      }
    }).finally(() => {
      if (active && requestId === monitoringCalendarRequestVersion.current) {
        setMonitoringCalendarLoading(false);
      }
    });
    return () => {
      active = false;
      monitoringCalendarRequestVersion.current += 1;
    };
  }, [assignedGroupId, currentUser?.role, monitoringCalendarRetry]);

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
          setEditingChildCheckup(false);
          setEditingChildCheckupWeek(null);
          setSelectedChild(detailedChild);
          setSelectedMother(null);
          setBeneficiaryType('Child');
          setChildCompletedWeeks(detailedChild.completedWeeks || []);
        } else {
          const motherId = routeMother.id || routeMother.motherId || routeMother.mother_id || routeMother.mother_code;
          const response = await apiGetMother(motherId);
          if (!active) return;
          const detailedMother = response?.mother || routeMother;
          setEditingChildCheckup(false);
          setEditingChildCheckupWeek(null);
          setSelectedMother(detailedMother);
          setSelectedMotherCheckupStep(Number.isInteger(location.state?.checkupStep) ? location.state.checkupStep : null);
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
  const maternalCalendarActivities = useMemo(
    () => getMaternalMonitoringActivities(monitoringCalendarMothers),
    [monitoringCalendarMothers],
  );

  const handleSave = async (payload) => {
    if (!canEditMonitoring) return false;
    setSavedMessage('');
    let savedCheckups;
    try {
      await apiSaveMotherCheckup(payload.motherId, payload);
      const response = await apiGetMother(payload.motherId);
      const savedMother = response?.mother || null;
      if (savedMother) {
        setSelectedMother(savedMother);
        savedCheckups = savedMother.checkups || [];
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
    const nextCheckups = savedCheckups || motherCheckups.map((trimester) => [...trimester]);
    if (!savedCheckups) {
      const trimesterIndex = payload.trimester === '2nd Trimester' ? 1 : payload.trimester === '3rd Trimester' ? 2 : 0;
      if (!nextCheckups[trimesterIndex]) nextCheckups[trimesterIndex] = [null, null, null];
      nextCheckups[trimesterIndex][payload.checkupNumber - 1] = { ...payload, completed: true };
    }
    setMotherCheckups(nextCheckups);
    setMonitoringCalendarRetry((retry) => retry + 1);
    const completedCount = nextCheckups.flat().filter(Boolean).length;
    const finishedFinalCheckup = payload.trimester === '3rd Trimester'
      && Number(payload.checkupNumber) === 3
      && completedCount >= 9
      && motherCheckups.flat().filter(Boolean).length < 9;
    const message = completedCount >= 9
      ? `Monitoring completed successfully for ${getMotherName(selectedMother)}.`
      : `Check-up ${payload.trimester} ${payload.checkupNumber} captured successfully for ${getMotherName(selectedMother)}.`;
    setSavedMessage(message);
    notifyAction(finishedFinalCheckup
      ? `Congratulations! ${getMotherName(selectedMother)} has completed all maternal check-ups (T3-C3).`
      : message);
    return true;
  };

  const handleSaveChildCheckup = async (payload) => {
    if (!canEditMonitoring) return false;
    setSavedMessage('');
    try {
      const response = await apiSaveChildCheckup(payload.childId, payload);
      const savedChild = response?.child || null;
      const nextChild = savedChild || selectedChild;
      const completedWeeks = nextChild?.completedWeeks || [payload.week];
      setSelectedChild(nextChild);
      setChildCompletedWeeks(completedWeeks);
      setChildren((current) => current.map((child) => String(child.id) === String(payload.childId) ? { ...child, ...nextChild } : child));
    } catch (error) {
      setSavedMessage(`Unable to save check-up: ${error.message}`);
      return false;
    }
    const message = `M${payload.week} progress captured successfully for ${getChildName(selectedChild)}.`;
    setSavedMessage(message);
    notifyAction(message);
    return true;
  };

  const handleSelectMother = (mother, checkupStep = null) => {
    setSelectedMother(mother);
    setSelectedMotherCheckupStep(checkupStep);
    setEditingCheckup(false);
    setEditingChildCheckup(false);
    setEditingChildCheckupWeek(null);
    setMotherCheckups(mother.checkups || []);
    setSelectedChild(null);
    setSavedMessage('');
  };

  const handleOpenMonitoringActivity = (activity) => {
    const mother = activity?.mother;
    const motherId = mother?.id || mother?.motherId || mother?.mother_id || mother?.motherCode || mother?.mother_code;
    if (!motherId) {
      notifyAction('Unable to open this check-up because the mother record has no ID.', 'error');
      return;
    }

    const trimesterIndex = ['1st Trimester', '2nd Trimester', '3rd Trimester'].indexOf(activity.trimester);
    const checkupNumber = Number(activity.checkupNumber);
    const checkupStep = trimesterIndex >= 0 && checkupNumber >= 1 && checkupNumber <= 3
      ? trimesterIndex * 3 + checkupNumber - 1
      : null;

    navigate(`/beneficiary/mother/${encodeURIComponent(motherId)}/monitoring`, {
      state: {
        mother,
        checkupStep,
        returnTo: '/monitoring',
      },
    });
  };

  const handleSelectChild = async (child) => {
    setSavedMessage('');
    setEditingChildCheckup(false);
    setEditingChildCheckupWeek(null);
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
    setSelectedMotherCheckupStep(null);
    setSelectedChild(null);
    setEditingCheckup(false);
    setEditingChildCheckup(false);
    setEditingChildCheckupWeek(null);
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
      screeningStatus: getMonthlyDevelopmentalStatus(beneficiary),
    };
  }), [visibleBeneficiaries, beneficiaryType]);
  const monitoringRows = useMemo(() => {
    const term = query.trim();
    return allMonitoringRows.filter(({ beneficiary, status, screeningStatus }) => {
      const searchableText = beneficiaryType === 'Mother'
        ? `${getMotherName(beneficiary)} ${beneficiary.motherCode || beneficiary.mother_code || beneficiary.id || ''} ${beneficiary.community || beneficiary.community_name || beneficiary.area || ''}`
        : `${getChildName(beneficiary)} ${beneficiary.child_code || beneficiary.id || ''} ${beneficiary.community || beneficiary.community_name || beneficiary.area || ''}`;
      return (!term || searchableText.toLowerCase().includes(term.toLowerCase()))
        && (statusFilter === 'All' || status === statusFilter)
        && (developmentalScreeningFilter === 'All'
          || screeningStatus === normalizeDevelopmentalStatus(developmentalScreeningFilter));
    });
  }, [allMonitoringRows, beneficiaryType, developmentalScreeningFilter, query, statusFilter]);

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
    <div className={`community-page checkup-module page${selectedMother ? ' beneficiary-page' : ''}`}>
      {selectedMother && <BeneficiarySuperHeader />}
      <PageHeader
        title={selectedMother || selectedChild ? (selectedMother ? getMotherName(selectedMother) : getChildName(selectedChild)) : 'Monitor'}
        breadcrumbs={selectedMother || selectedChild
          ? [{ label: 'Monitor', onClick: handleBack }, { label: selectedMother ? getMotherName(selectedMother) : getChildName(selectedChild) }]
          : [{ label: 'Monitor' }]}
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
              if (key) {
                setStatusFilter(key);
                setDevelopmentalScreeningFilter('All');
              }
              setPage(1);
            }}
            cards={[
              { key: 'All', label: `Total ${beneficiaryType} Records`, value: allMonitoringRows.length, description: 'View list' },
              { key: 'Missing', label: 'Missing', value: allMonitoringRows.filter((row) => row.status === 'Missing').length, description: 'View list' },
              { key: 'Pending', label: 'Pending', value: allMonitoringRows.filter((row) => row.status === 'Pending').length, description: 'View list' },
              { key: 'Done', label: 'Done', value: allMonitoringRows.filter((row) => row.status === 'Done').length, description: 'View list' },
            ]}
          />
          {!selectedMonitoringCard && (
            <MonitoringActivityCalendar
              activities={maternalCalendarActivities}
              loading={monitoringCalendarLoading}
              error={monitoringCalendarError}
              onRetry={() => setMonitoringCalendarRetry((retry) => retry + 1)}
              onOpenActivity={handleOpenMonitoringActivity}
            />
          )}
          {selectedMonitoringCard && (
            <>
          <div className="table-card monitoring-table-card">
            <div className="monitoring-filter-row">
              <EntitySearchControls
                selectedEntityFilter={beneficiaryType}
                showSearch={false}
                onEntityChange={(nextType) => { setBeneficiaryType(nextType); setQuery(''); setPage(1); }}
              />
              <label className="monitoring-status-filter monitoring-screening-filter">
                <span className="sr-only">Developmental / newborn screening</span>
                <select
                  aria-label="Developmental / newborn screening filter"
                  value={developmentalScreeningFilter}
                  onChange={(event) => { setDevelopmentalScreeningFilter(event.target.value); setPage(1); }}
                >
                  <option value="All">All screening statuses</option>
                  <option value="Normal">Normal</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Needs Follow-up">Needs Follow-up</option>
                </select>
              </label>
              <TableSearch
                value={query}
                onChange={(value) => { setQuery(value); setPage(1); }}
                placeholder={`Search ${beneficiaryType.toLowerCase()} records`}
              />
            </div>
            <div className="table-overflow">
              <table className="data-table">
                <thead><tr><th>{beneficiaryType}</th><th>Progress</th><th>Screening</th><th>Action</th></tr></thead>
                <tbody>
                  {childrenLoading && beneficiaryType === 'Child' ? <tr><td colSpan="4" className="no-data">Loading children...</td></tr> : currentRows.length ? currentRows.map(({ beneficiary, completed, total, progress, screeningStatus }) => {
                    const name = beneficiaryType === 'Mother' ? getMotherName(beneficiary) : getChildName(beneficiary);
                    const recordKey = beneficiaryType === 'Mother' ? beneficiary.id || beneficiary.motherId : beneficiary.child_code || beneficiary.id || 'No ID';
                    const screeningLabel = screeningStatus === 'normal' ? 'Normal'
                      : screeningStatus === 'needs follow up' ? 'Needs Follow-up'
                        : screeningStatus === 'at risk' ? 'At Risk' : 'Not recorded';
                    const screeningClass = screeningStatus ? screeningStatus.replace(/\s+/g, '-') : 'not-recorded';
                    return <tr key={recordKey}><td><strong>{name}</strong></td><td><div className="monitoring-progress"><span><span style={{ width: `${progress}%` }} /></span><b>{completed}/{total}</b></div></td><td><span className={`monitoring-status ${screeningClass}`}>{screeningLabel}</span></td><td><button type="button" className="btn-secondary monitoring-open-button" onClick={() => openBeneficiary(beneficiary)}>Open record</button></td></tr>;
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
          <ChildNavigationCards child={selectedChild} activeCard="monitor" />
          {savedMessage.startsWith('Unable to save check-up:') && <p className="checkup-save-message checkup-save-message-error" role="alert">{savedMessage}</p>}
          {!editingChildCheckup && (
            <ChildMonitor
              child={selectedChild}
              showAuditSignatures={showAuditSignatures}
              completedWeeks={childCompletedWeeks}
              initialWeek={location.state?.week}
              readOnly
              canCreate={canEditMonitoring}
              onRequestEdit={canEditMonitoring ? (week) => {
                setEditingChildCheckupWeek(week);
                setEditingChildCheckup(true);
              } : undefined}
              onSave={handleSaveChildCheckup}
              onCancel={handleBack}
            />
          )}
        </section>
      ) : selectedRecordLoading ? (
        <section className="checkup-entry-view" aria-live="polite"><p>Loading mother monitoring record...</p></section>
      ) : (
        <section className="checkup-entry-view" aria-labelledby="selected-mother-title">
          <MotherNavigationCards mother={selectedMother} activeCard="monitor" />
          {savedMessage.startsWith('Unable to save check-up:') && <p className="checkup-save-message checkup-save-message-error" role="alert">{savedMessage}</p>}
          {(!editingCheckup || !canEditMonitoring) && (
            <MotherCheckup
              mother={{ ...selectedMother, checkups: motherCheckups }}
              initialStepOverride={selectedMotherCheckupStep ?? undefined}
              showAuditSignatures={showAuditSignatures}
              readOnly={!canEditMonitoring}
              onSave={handleSave}
              onRequestEdit={canEditMonitoring ? (step) => { setEditingCheckupStep(step); setEditingCheckup(true); } : undefined}
            />
          )}
        </section>
      )}
      {canEditMonitoring && selectedMother && editingCheckup && (
        <MotherCheckupEditDrawer
          mother={{ ...selectedMother, checkups: motherCheckups }}
          initialStep={editingCheckupStep}
          showAuditSignatures={showAuditSignatures}
          onSave={async (payload) => {
            const saved = await handleSave(payload);
            if (saved) setEditingCheckup(false);
            return saved;
          }}
          onClose={() => setEditingCheckup(false)}
        />
      )}
      {canEditMonitoring && selectedChild && editingChildCheckup && (
        <ChildCheckupEditDrawer
          child={selectedChild}
          initialWeek={editingChildCheckupWeek}
          completedWeeks={childCompletedWeeks}
          showAuditSignatures={showAuditSignatures}
          onSave={async (payload) => {
            const saved = await handleSaveChildCheckup(payload);
            if (saved) setEditingChildCheckup(false);
            return saved;
          }}
          onClose={() => {
            setEditingChildCheckup(false);
            setEditingChildCheckupWeek(null);
          }}
        />
      )}
    </div>
  );
}
