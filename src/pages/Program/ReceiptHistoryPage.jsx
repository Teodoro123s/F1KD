import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import DateInput from '../../components/ui/DateInput';
import AuditSignatures from '../../components/ui/AuditSignatures';
import { notifyAction } from '../../components/ActionFeedback';
import { apiGetBeneficiaryMonitoringReport, apiGetClusterMonitoringReport, apiGetPrograms, apiSetBeneficiaryMonitoring } from '../../api/programs';
import { apiGetChildren } from '../../api/children';
import { apiGetMothers } from '../../api/mothers';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { canViewAuditSignatures } from '../../utils/permissions';
import { navigateBack } from '../../utils/navigation';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toDateKey = (value) => String(value || '').slice(0, 10);
const normalizeScopeValue = (value) => String(value || '').trim().toLowerCase();
const getRecipientKey = (recipient) => `${String(recipient.type || '').toLowerCase()}:${String(recipient.id || '')}`;
const isValidRecipient = (recipient) => String(recipient?.id || '').trim() !== ''
  && ['mother', 'child'].includes(String(recipient?.type || '').toLowerCase());
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
  const { currentUser } = useAuth();
  const { programId, beneficiaryType, beneficiaryId, clusterType, clusterName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isClusterHistory = Boolean(clusterType && clusterName);
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);
  const showGroupColumn = isClusterHistory && clusterType !== 'batch';
  const beneficiaryName = location.state?.beneficiaryName || location.state?.clusterName || clusterName || 'Beneficiary';
  const fallbackReturnTo = isClusterHistory
    ? `/program/${programId}/cluster/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}`
    : `/program/${programId}`;
  const [reportRows, setReportRows] = useState([]);
  const [clusterRecipients, setClusterRecipients] = useState([]);
  const [selectedRecipientKeys, setSelectedRecipientKeys] = useState([]);
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
    setLoading(true);
    setError('');
    try {
      const response = isClusterHistory
        ? await apiGetClusterMonitoringReport(programId, clusterType, clusterName)
        : await apiGetBeneficiaryMonitoringReport(programId, beneficiaryType, beneficiaryId);
      setReportRows(response.report || []);
    } catch (loadError) {
      setReportRows([]);
      const message = loadError.message || 'Unable to load receipt history.';
      setError(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [programId, beneficiaryType, beneficiaryId, clusterType, clusterName, isClusterHistory]);

  useEffect(() => {
    if (!isClusterHistory) {
      setClusterRecipients([]);
      setSelectedRecipientKeys([]);
      setRecipientsLoading(false);
      return undefined;
    }

    let active = true;
    setRecipientsLoading(true);
    const loadClusterRecipients = async () => {
      const passedRecipients = (Array.isArray(location.state?.beneficiaries) ? location.state.beneficiaries : [])
        .filter(isValidRecipient)
        .map((recipient) => ({ ...recipient, type: String(recipient.type).toLowerCase() }));
      let recipients = passedRecipients;

      if (!recipients.length) {
        const programsResponse = await apiGetPrograms();
        const program = (programsResponse?.programs || []).find((item) => String(item.id) === String(programId));
        if (!program) throw new Error("Unable to determine this program's eligible beneficiary type.");
        const programType = String(program.beneficiaryType || program.beneficiary_type || 'Mother')
          .trim()
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
        const includeMothers = programType === 'mother' || programType === 'mother and child';
        const includeChildren = programType === 'child' || programType === 'mother and child';
        if (!includeMothers && !includeChildren) {
          throw new Error('This program has an unsupported beneficiary type.');
        }
        const [mothersResponse, childrenResponse] = await Promise.all([
          includeMothers ? apiGetMothers() : Promise.resolve({ mothers: [] }),
          includeChildren ? apiGetChildren() : Promise.resolve({ children: [] }),
        ]);
        const mothers = mothersResponse?.mothers || [];
        const children = childrenResponse?.children || [];
        const scope = normalizeScopeValue(clusterName);
        const matchesScope = (entity, type) => {
          if (type === 'group') return normalizeScopeValue(entity.group || entity.group_name || entity.groupName) === scope;
          if (type === 'batch') return normalizeScopeValue(entity.batch || entity.batch_name || entity.batchName) === scope;
          return normalizeScopeValue(entity.community || entity.community_name || entity.school) === scope;
        };

        recipients = [
          ...(includeMothers ? mothers : []).filter((mother) => matchesScope(mother, clusterType)).map((mother) => ({
            id: mother.raw?.id || mother.id || mother.motherId,
            type: 'mother',
            name: mother.name || [mother.firstName, mother.lastName].filter(Boolean).join(' '),
          })),
          ...(includeChildren ? children : []).filter((child) => matchesScope(child, clusterType)).map((child) => ({
            id: child.id || child.child_id,
            type: 'child',
            name: child.name || [child.first_name, child.last_name].filter(Boolean).join(' '),
          })),
        ].filter(isValidRecipient);
      }

      const uniqueRecipients = [...new Map(recipients.map((recipient) => [getRecipientKey(recipient), recipient])).values()];
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
  }, [clusterName, clusterType, isClusterHistory, location.state]);

  const filteredRows = reportRows;
  const receivedByDate = new Map();
  filteredRows.filter((row) => row.monitored).forEach((row) => {
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
      monitored: existingReceipt ? Boolean(existingReceipt.monitored) : defaultMonitored,
    });
  };

  const saveReceipt = async (event) => {
    event.preventDefault();
    if (!receiptModal?.date) return;
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
      notifyAction(message, 'error');
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
          <button type="button" className="view-btn view-btn--secondary back-action" onClick={() => navigateBack(navigate, location, fallbackReturnTo)}>Back to program</button>
        </div>
        {!loading && <div className="program-receipt-controls">
          <div className="program-receipt-controls-actions"><button type="button" className="view-btn view-btn--primary" onClick={() => openReceiptModal()} disabled={isClusterHistory && recipientsLoading}>Record receipt</button><div className="program-view-toggle" role="tablist" aria-label="Receipt history view"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List View</button><button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar View</button></div></div>
        </div>}
        {loading ? <p>Loading receipt history...</p> : view === 'list' ? <div className="program-receipt-table-scroll"><table className={`data-table ${isClusterHistory ? 'program-receipt-cluster-table' : 'program-receipt-beneficiary-table'}`}>
          <thead><tr><th>Date</th>{isClusterHistory ? <><th>Beneficiary</th>{showGroupColumn && <th>Group</th>}<th>Batch</th></> : null}{showAuditSignatures && <th>Signatures</th>}<th>Action</th></tr></thead>
          <tbody>{filteredRows.length ? filteredRows.map((row) => <tr key={`${row.date}-${row.program_name}-${row.beneficiary_name || row.beneficiary_id || 'entry'}`}><td>{formatDateForDisplay(toDateKey(row.date))}</td>{isClusterHistory ? <><td>{row.beneficiary_name || row.beneficiary_id || 'Unknown beneficiary'}</td>{showGroupColumn && <td>{row.group_name || 'Unknown group'}</td>}<td>{row.batch_name || 'Unknown batch'}</td></> : null}{showAuditSignatures && <td><AuditSignatures
            createdByName={row.created_by_name || row.monitored_by_name}
            createdByRole={row.created_by_role || row.monitored_by_role}
            createdAt={row.recorded_at}
            updatedByName={row.updated_by_name || row.monitored_by_name}
            updatedByRole={row.updated_by_role || row.monitored_by_role}
            updatedAt={row.updated_at}
          /></td>}<td><button type="button" className="view-btn view-btn--secondary" onClick={() => openReceiptModal(toDateKey(row.date))}>Edit</button></td></tr>) : <tr><td colSpan={(isClusterHistory ? (showGroupColumn ? 4 : 3) : 1) + (showAuditSignatures ? 1 : 0) + 1} className="no-data">No receipt history found.</td></tr>}</tbody>
        </table></div> : <div className="program-calendar-wrap">
          <div className="program-calendar-header"><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>Previous</button><h3>{monthLabel(calendarMonth)}</h3><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>Next</button></div>
          <div className="program-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="program-calendar-grid">{days.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; const receipt = receivedByDate.get(key) || []; return <button type="button" key={key} className={`program-calendar-day${day.getMonth() !== calendarMonth.getMonth() ? ' muted' : ''}${receipt.length ? ' received' : ''}${selectedDate === key ? ' selected' : ''}`} onClick={() => openReceiptModal(key, true)}><span>{day.getDate()}</span>{receipt.length > 0 && <strong>{receipt.length > 1 ? `${receipt.length} Yes` : 'Yes'}</strong>}</button>; })}</div>
        </div>}
        {receiptModal && <div className="modal-backdrop" role="presentation" onClick={() => !savingReceipt && setReceiptModal(null)}><div className="program-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" onClick={(event) => event.stopPropagation()}><div className="program-receipt-modal-header"><h3 id="receipt-modal-title">Record program receipt</h3><button type="button" className="document-preview-close" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Close</button></div><form onSubmit={saveReceipt}><label htmlFor="receipt-date">Date<DateInput id="receipt-date" className="form-input" value={receiptModal.date} onChange={(value) => setReceiptModal((current) => ({ ...current, date: value }))} required disabled={savingReceipt} ariaLabel="Receipt date" /></label>{isClusterHistory && <fieldset className="receipt-beneficiary-selection" disabled={savingReceipt || recipientsLoading}><legend>Beneficiaries ({selectedRecipientKeys.length}/{clusterRecipients.length})</legend><label className="receipt-beneficiary-select-all"><input type="checkbox" checked={clusterRecipients.length > 0 && selectedRecipientKeys.length === clusterRecipients.length} onChange={(event) => setSelectedRecipientKeys(event.target.checked ? clusterRecipients.map(getRecipientKey) : [])} /><span>Select all in this {clusterType}</span></label><div className="receipt-beneficiary-list">{clusterRecipients.length ? clusterRecipients.map((recipient) => { const key = getRecipientKey(recipient); return <label key={key} className="receipt-beneficiary-option"><input type="checkbox" checked={selectedRecipientKeys.includes(key)} onChange={(event) => setSelectedRecipientKeys((current) => event.target.checked ? [...current, key] : current.filter((value) => value !== key))} /><span>{recipient.name || `${recipient.type} ${recipient.id}`}</span></label>; }) : <p className="receipt-beneficiary-empty">No beneficiaries found in this {clusterType}.</p>}</div></fieldset>}<label>Received this program item?<select value={receiptModal.monitored ? 'yes' : 'no'} onChange={(event) => setReceiptModal((current) => ({ ...current, monitored: event.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></label><div className="program-receipt-modal-actions"><button type="button" className="view-btn view-btn--secondary" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Cancel</button><button type="submit" className="view-btn view-btn--primary" disabled={savingReceipt || (isClusterHistory && recipientsLoading)}>{savingReceipt ? 'Saving...' : 'Save status'}</button></div></form></div></div>}
      </section>
    </div>
  );
}