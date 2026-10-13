import React, { useEffect, useRef, useState } from 'react';
import './program-page.css';
import './receipt-history.css';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../../utils/permissions';
import PageHeader from '../../../components/ui/PageHeader';
import DateInput from '../../../components/ui/DateInput';
import { notifyAction } from '../../../components/ActionFeedback';
import { apiGetBeneficiaryMonitoringReport, apiGetClusterMonitoringReport, apiGetPrograms, apiSetBeneficiaryMonitoring } from '../../../api/programs';
import { apiGetChildren } from '../../../api/children';
import { apiGetMothers } from '../../../api/mothers';
import { formatDateForDisplay } from '../../../utils/dateFormat';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toDateKey = (value) => String(value || '').slice(0, 10);
const normalizeScopeValue = (value) => String(value || '').trim().toLowerCase();
const isReceived = (value) => value === true || value === 1 || value === '1';
const getRecipientKey = (recipient) => `${String(recipient.type || '').toLowerCase()}:${String(recipient.id || '')}`;
const isValidRecipient = (recipient) => String(recipient?.id || '').trim() !== ''
  && ['mother', 'child'].includes(String(recipient?.type || '').toLowerCase());
const getEligibleRecipientTypes = (value) => {
  const type = normalizeScopeValue(value).replace(/\s*&\s*/g, ' and ');
  if (type === 'mother and child') return ['mother', 'child'];
  return ['mother', 'child'].includes(type) ? [type] : [];
};
const monthLabel = (date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const calendarDays = (date) => {
  const first = startOfMonth(date);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

export default function ReceiptHistoryPage() {
  const { programId, beneficiaryType, beneficiaryId, clusterType, clusterName } = useParams();
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isClusterHistory = Boolean(clusterType && clusterName);
  const canManageReceiptRecords = isCommunityCoordinatorRole(currentUser?.role) || isHealthWorkerRole(currentUser?.role);
  const showGroupColumn = isClusterHistory && clusterType !== 'batch';
  const beneficiaryName = location.state?.beneficiaryName || location.state?.clusterName || clusterName || 'Beneficiary';
  const [reportRows, setReportRows] = useState([]);
  const [clusterRecipients, setClusterRecipients] = useState([]);
  const [selectedRecipientKeys, setSelectedRecipientKeys] = useState([]);
  const [beneficiaryEligibilityNote, setBeneficiaryEligibilityNote] = useState('');
  const [programInfo, setProgramInfo] = useState(null);
  const [programInfoError, setProgramInfoError] = useState('');
  const historyRequestId = useRef(0);
  const [recipientsLoading, setRecipientsLoading] = useState(isClusterHistory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monitorDate, setMonitorDate] = useState(localDate);
  const [view, setView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  const loadHistory = async () => {
    const requestId = ++historyRequestId.current;
    setLoading(true);
    setError('');
    try {
      const response = isClusterHistory
        ? await apiGetClusterMonitoringReport(programId, clusterType, clusterName)
        : await apiGetBeneficiaryMonitoringReport(programId, beneficiaryType, beneficiaryId);
      if (requestId === historyRequestId.current) setReportRows(response.report || []);
    } catch (loadError) {
      if (requestId !== historyRequestId.current) return;
      setReportRows([]);
      const message = loadError.message || 'Unable to load receipt history.';
      setError(message);
    } finally {
      if (requestId === historyRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    return () => { historyRequestId.current += 1; };
  }, [programId, beneficiaryType, beneficiaryId, clusterType, clusterName, isClusterHistory]);

  useEffect(() => {
    let active = true;
    apiGetPrograms().then((response) => {
      const program = (response.programs || []).find((item) => String(item.id) === String(programId));
      if (!program) throw new Error('Program details could not be found. Ask a coordinator to confirm the program is available.');
      if (active) setProgramInfo({
        ...program,
        beneficiaryType: program.beneficiaryType || program.beneficiary_type,
        startsOn: String(program.startsOn || program.starts_on || '').slice(0, 10),
        endsOn: String(program.endsOn || program.ends_on || '').slice(0, 10),
      });
    }).catch((programError) => {
      if (active) {
        setProgramInfoError(programError.message || 'Unable to load program rules.');
        setRecipientsLoading(false);
      }
    });
    return () => { active = false; };
  }, [programId]);

  useEffect(() => {
    if (!isClusterHistory) {
      setClusterRecipients([]);
      setSelectedRecipientKeys([]);
      setRecipientsLoading(false);
      return undefined;
    }

    let active = true;
    setRecipientsLoading(true);
    setBeneficiaryEligibilityNote('');
    if (!programInfo) return () => { active = false; };
    const loadClusterRecipients = async () => {
      const eligibleTypes = getEligibleRecipientTypes(programInfo.beneficiaryType);
      if (!eligibleTypes.length) throw new Error('Unable to determine which beneficiary types this program accepts.');
      setBeneficiaryEligibilityNote(eligibleTypes.length === 1
        ? `Only ${eligibleTypes[0][0].toUpperCase()}${eligibleTypes[0].slice(1)} beneficiaries are eligible for this program.`
        : '');

      const passedRecipients = (Array.isArray(location.state?.beneficiaries) ? location.state.beneficiaries : [])
        .filter(isValidRecipient)
        .map((recipient) => ({ ...recipient, type: String(recipient.type).toLowerCase() }))
        .filter((recipient) => eligibleTypes.includes(recipient.type));
      let recipients = passedRecipients;

      if (!recipients.length) {
        const [mothersResult, childrenResult] = await Promise.allSettled([apiGetMothers(), apiGetChildren()]);
        const mothers = mothersResult.status === 'fulfilled' ? mothersResult.value?.mothers || [] : [];
        const children = childrenResult.status === 'fulfilled' ? childrenResult.value?.children || [] : [];
        const scope = normalizeScopeValue(clusterName);
        const matchesScope = (entity, type) => {
          if (type === 'group') return normalizeScopeValue(entity.group || entity.group_name) === scope;
          if (type === 'batch') return normalizeScopeValue(entity.batch || entity.batch_name) === scope;
          return normalizeScopeValue(entity.community || entity.community_name) === scope;
        };

        recipients = [
          ...mothers.filter((mother) => matchesScope(mother, clusterType)).map((mother) => ({
            id: mother.raw?.id || mother.id || mother.motherId,
            type: 'mother',
            name: mother.name || [mother.firstName, mother.lastName].filter(Boolean).join(' '),
          })),
          ...children.filter((child) => matchesScope(child, clusterType)).map((child) => ({
            id: child.id || child.child_id,
            type: 'child',
            name: child.name || [child.first_name, child.last_name].filter(Boolean).join(' '),
          })),
        ].filter(isValidRecipient);
      }

      const uniqueRecipients = [...new Map(recipients
        .filter((recipient) => eligibleTypes.includes(String(recipient.type).toLowerCase()))
        .map((recipient) => [getRecipientKey(recipient), recipient])).values()];
      if (active) {
        setClusterRecipients(uniqueRecipients);
        setSelectedRecipientKeys(uniqueRecipients.map(getRecipientKey));
        setRecipientsLoading(false);
      }
    };

    loadClusterRecipients().catch((loadError) => {
      if (!active) return;
      setClusterRecipients([]);
      setSelectedRecipientKeys([]);
      setRecipientsLoading(false);
      setError(loadError.message || 'Unable to load beneficiaries for this cluster.');
    });

    return () => { active = false; };
  }, [clusterName, clusterType, isClusterHistory, location.state, programInfo]);

  const filteredRows = reportRows;
  const hasProgramSchedule = Boolean(programInfo?.startsOn && programInfo?.endsOn);
  const canRecordReceipt = canManageReceiptRecords && hasProgramSchedule && String(programInfo?.status || '').toLowerCase() === 'active';
  const isReceiptDateInSchedule = (date) => (
    hasProgramSchedule && date >= programInfo.startsOn && date <= programInfo.endsOn
  );
  const receivedByDate = new Map();
  filteredRows.filter((row) => isReceived(row.monitored)).forEach((row) => {
    const key = toDateKey(row.date);
    const existing = receivedByDate.get(key) || [];
    const beneficiaryKey = row.beneficiary_key || `${row.beneficiary_type || ''}:${row.beneficiary_id || row.beneficiary_name || ''}`;
    if (!existing.some((receipt) => (receipt.beneficiary_key || `${receipt.beneficiary_type || ''}:${receipt.beneficiary_id || receipt.beneficiary_name || ''}`) === beneficiaryKey)) {
      existing.push(row);
    }
    receivedByDate.set(key, existing);
  });
  const days = calendarDays(calendarMonth);

  const openReceiptModal = (date = monitorDate, defaultMonitored = false) => {
    const existingReceipt = filteredRows.find((row) => toDateKey(row.date) === date);
    setSelectedRecipientKeys(clusterRecipients.map(getRecipientKey));
    setReceiptModal({
      date,
      monitored: existingReceipt ? isReceived(existingReceipt.monitored) : defaultMonitored,
    });
  };

  const saveReceipt = async (event) => {
    event.preventDefault();
    if (!receiptModal?.date) return;
    if (!canRecordReceipt) {
      setError('Receipts can only be recorded for active programs with a start and end date.');
      return;
    }
    if (!isReceiptDateInSchedule(receiptModal.date)) {
      setError(`Receipt date must be between ${programInfo.startsOn} and ${programInfo.endsOn}.`);
      return;
    }
    setSavingReceipt(true);
    setError('');
    try {
      const targets = isClusterHistory
        ? clusterRecipients.filter((recipient) => selectedRecipientKeys.includes(getRecipientKey(recipient)))
        : [{ id: beneficiaryId, type: beneficiaryType }].filter(isValidRecipient);
      if (!targets.length) throw new Error(isClusterHistory ? 'Select at least one beneficiary in this group or batch.' : 'Beneficiary ID and type are required.');

      await Promise.all(targets.map((target) => apiSetBeneficiaryMonitoring(programId, {
        beneficiaryId: target.id,
        beneficiaryType: target.type,
        date: receiptModal.date,
        monitored: receiptModal.monitored,
      })));

      setMonitorDate(receiptModal.date);
      setSelectedDate(receiptModal.monitored ? receiptModal.date : null);
      setReceiptModal(null);
      const targetNames = targets.map((target) => isClusterHistory
        ? clusterRecipients.find((recipient) => getRecipientKey(recipient) === getRecipientKey(target))?.name
        : beneficiaryName).filter(Boolean);
      const receiptCount = targets.length;
      const receiptLabel = receiptCount === 1 ? 'beneficiary' : 'beneficiaries';
      notifyAction(`${formatDateForDisplay(receiptModal.date)} · ${receiptCount} ${receiptLabel} marked ${receiptModal.monitored ? 'received' : 'not received'}${targetNames.length ? `: ${targetNames.join(', ')}` : ''}.`);
      await loadHistory();
    } catch (saveError) {
      const message = saveError.message || 'Unable to save receipt status.';
      setError(message);
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <div className="community-page program-page">
      <PageHeader
        title="Receipt History"
        breadcrumbs={[{ label: 'Program', href: `/program/${programId}` }, { label: beneficiaryName }]}
      />
      <section className="program-monitoring-report program-receipt-history-page" aria-labelledby="receipt-history-title">
        <div className="program-monitoring-report__header">
          <div>
            <p className="program-section-eyebrow">Receipt history</p>
            <h2 id="receipt-history-title">{beneficiaryName}</h2>
          </div>
          <button type="button" className="view-btn view-btn--secondary back-action" onClick={() => navigate(-1)}>Back to program</button>
        </div>
        {programInfoError && <p className="program-receipt-history-error" role="alert">{programInfoError}</p>}
        {!programInfoError && !canRecordReceipt && <p className="program-receipt-schedule-notice" role="status">
          {!canManageReceiptRecords
            ? 'Receipt history is read-only for your role. Ask a coordinator or health worker to record corrections.'
            : hasProgramSchedule
              ? 'This program is ended. Receipt history is read-only until a coordinator resumes it.'
              : 'Receipt entry is unavailable until a coordinator sets this program’s start and end dates.'}
        </p>}
        {error && <p className="program-receipt-history-error" role="alert">{error}</p>}
        {!loading && <div className="program-receipt-controls">
          <div className="program-receipt-controls-actions">{canManageReceiptRecords && <button type="button" className="view-btn view-btn--primary" onClick={() => openReceiptModal()} disabled={!canRecordReceipt || (isClusterHistory && recipientsLoading)}>Record receipt</button>}<div className="program-view-toggle" role="tablist" aria-label="Receipt history view"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List View</button><button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar View</button></div></div>
        </div>}
        {loading ? <p>Loading receipt history...</p> : view === 'list' ? <div className="program-receipt-table-scroll"><table className={`data-table ${isClusterHistory ? 'program-receipt-cluster-table' : 'program-receipt-beneficiary-table'}`}>
          <thead><tr><th>Date</th>{isClusterHistory ? <><th>Beneficiary</th>{showGroupColumn && <th>Group</th>}<th>Batch</th></> : null}<th>Status</th><th>Recorded by</th>{canManageReceiptRecords && <th>Action</th>}</tr></thead>
          <tbody>{filteredRows.length ? filteredRows.map((row) => <tr key={`${row.date}-${row.program_name}-${row.beneficiary_name || row.beneficiary_id || 'entry'}`}><td>{formatDateForDisplay(toDateKey(row.date))}</td>{isClusterHistory ? <><td>{row.beneficiary_name || row.beneficiary_id || 'Unknown beneficiary'}</td>{showGroupColumn && <td>{row.group_name || 'Unknown group'}</td>}<td>{row.batch_name || 'Unknown batch'}</td></> : null}<td><span className={`program-receipt-status${isReceived(row.monitored) ? ' received' : ' not-received'}`}>{isReceived(row.monitored) ? 'Received' : 'Not received'}</span></td><td>{row.monitored_by_name || 'Unknown'}</td>{canManageReceiptRecords && <td><button type="button" className="view-btn view-btn--secondary" onClick={() => openReceiptModal(toDateKey(row.date))} disabled={!canRecordReceipt || !isReceiptDateInSchedule(toDateKey(row.date))}>Edit</button></td>}</tr>) : <tr><td colSpan={isClusterHistory ? (showGroupColumn ? (canManageReceiptRecords ? 7 : 6) : (canManageReceiptRecords ? 6 : 5)) : (canManageReceiptRecords ? 4 : 3)} className="no-data">No receipt history found.</td></tr>}</tbody>
        </table></div> : <div className="program-calendar-wrap">
          <div className="program-calendar-header"><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>Previous</button><h3>{monthLabel(calendarMonth)}</h3><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>Next</button></div>
          <div className="program-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="program-calendar-grid">{days.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; const receipt = receivedByDate.get(key) || []; return <button type="button" key={key} className={`program-calendar-day${day.getMonth() !== calendarMonth.getMonth() ? ' muted' : ''}${receipt.length ? ' received' : ''}${selectedDate === key ? ' selected' : ''}`} onClick={() => openReceiptModal(key, true)} disabled={!canRecordReceipt || !isReceiptDateInSchedule(key)}><span>{day.getDate()}</span>{receipt.length > 0 && <strong>{receipt.length > 1 ? `${receipt.length} Yes` : 'Yes'}</strong>}</button>; })}</div>
        </div>}
        {receiptModal && <div className="modal-backdrop" role="presentation" onClick={() => !savingReceipt && setReceiptModal(null)}><div className="program-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" onClick={(event) => event.stopPropagation()}><div className="program-receipt-modal-header"><h3 id="receipt-modal-title">Record program receipt</h3><button type="button" className="document-preview-close" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Close</button></div><form onSubmit={saveReceipt}><label htmlFor="receipt-date">Date<DateInput id="receipt-date" className="form-input" value={receiptModal.date} onChange={(value) => setReceiptModal((current) => ({ ...current, date: value }))} required disabled={savingReceipt} min={programInfo?.startsOn} max={programInfo?.endsOn} ariaLabel="Receipt date" /></label><p className="program-receipt-schedule-note">Receipt date must be between {programInfo?.startsOn || 'not set'} and {programInfo?.endsOn || 'not set'}.</p>{isClusterHistory && <fieldset className="receipt-beneficiary-selection" disabled={savingReceipt || recipientsLoading}><legend>Beneficiaries ({selectedRecipientKeys.length}/{clusterRecipients.length})</legend>{beneficiaryEligibilityNote && <p className="receipt-beneficiary-note">{beneficiaryEligibilityNote}</p>}<label className="receipt-beneficiary-select-all"><input type="checkbox" checked={clusterRecipients.length > 0 && selectedRecipientKeys.length === clusterRecipients.length} onChange={(event) => setSelectedRecipientKeys(event.target.checked ? clusterRecipients.map(getRecipientKey) : [])} /><span>Select all in this {clusterType}</span></label><div className="receipt-beneficiary-list">{clusterRecipients.length ? clusterRecipients.map((recipient) => { const key = getRecipientKey(recipient); return <label key={key} className="receipt-beneficiary-option"><input type="checkbox" checked={selectedRecipientKeys.includes(key)} onChange={(event) => setSelectedRecipientKeys((current) => event.target.checked ? [...current, key] : current.filter((value) => value !== key))} /><span>{recipient.name || `${recipient.type} ${recipient.id}`}</span></label>; }) : <p className="receipt-beneficiary-empty">No beneficiaries found in this {clusterType}.</p>}</div></fieldset>}<label>Received this program item?<select value={receiptModal.monitored ? 'yes' : 'no'} onChange={(event) => setReceiptModal((current) => ({ ...current, monitored: event.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></label><div className="program-receipt-modal-actions"><button type="button" className="view-btn view-btn--secondary" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Cancel</button><button type="submit" className="view-btn view-btn--primary" disabled={!canRecordReceipt || savingReceipt || (isClusterHistory && recipientsLoading) || !isReceiptDateInSchedule(receiptModal.date)}>{savingReceipt ? 'Saving...' : 'Save status'}</button></div></form></div></div>}
      </section>
    </div>
  );
}