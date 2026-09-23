import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { apiGetBeneficiaryMonitoringReport, apiGetClusterMonitoringReport, apiSetBeneficiaryMonitoring } from '../../api/programs';
import { formatDateForDisplay, normalizeDateValue } from '../../utils/dateFormat';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toDateKey = (value) => String(value || '').slice(0, 10);
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
  const location = useLocation();
  const navigate = useNavigate();
  const isClusterHistory = Boolean(clusterType && clusterName);
  const showGroupColumn = isClusterHistory && clusterType !== 'batch';
  const beneficiaryName = location.state?.beneficiaryName || location.state?.clusterName || 'Beneficiary';
  const [reportRows, setReportRows] = useState([]);
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
      setError(loadError.message || 'Unable to load receipt history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [programId, beneficiaryType, beneficiaryId, clusterType, clusterName, isClusterHistory]);

  const clusterBeneficiaries = Array.isArray(location.state?.beneficiaries) ? location.state.beneficiaries : [];
  const filteredRows = reportRows;
  const receivedByDate = new Map();
  filteredRows.filter((row) => row.monitored).forEach((row) => {
    const key = toDateKey(row.date);
    const existing = receivedByDate.get(key) || [];
    existing.push(row);
    receivedByDate.set(key, existing);
  });
  const selectedReceipts = selectedDate ? receivedByDate.get(selectedDate) || [] : [];
  const days = calendarDays(calendarMonth);

  const openReceiptModal = (date = monitorDate, defaultMonitored = false) => {
    const existingReceipt = filteredRows.find((row) => toDateKey(row.date) === date);
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
      const targets = isClusterHistory && clusterBeneficiaries.length
        ? clusterBeneficiaries
        : [{ id: beneficiaryId, type: beneficiaryType }];

      if (isClusterHistory && !targets.length) {
        throw new Error('No beneficiaries found for this cluster.');
      }

      await Promise.all(targets.map((target) => apiSetBeneficiaryMonitoring(programId, {
        beneficiaryId: target.id,
        beneficiaryType: target.type,
        date: receiptModal.date,
        monitored: receiptModal.monitored,
      })));

      setMonitorDate(receiptModal.date);
      setSelectedDate(receiptModal.monitored ? receiptModal.date : null);
      setReceiptModal(null);
      await loadHistory();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save receipt status.');
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
          <button type="button" className="view-btn view-btn--secondary" onClick={() => navigate(-1)}>Back to program</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && <div className="program-receipt-controls">
          <div className="program-receipt-controls-actions"><button type="button" className="view-btn view-btn--primary" onClick={() => openReceiptModal()}>Record receipt</button><div className="program-view-toggle" role="tablist" aria-label="Receipt history view"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List View</button><button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar View</button></div></div>
        </div>}
        {loading ? <p>Loading receipt history...</p> : view === 'list' ? <table className="data-table">
          <thead><tr><th>Date</th>{isClusterHistory ? <><th>Beneficiary</th>{showGroupColumn && <th>Group</th>}<th>Batch</th></> : null}<th>Recorded by</th><th>Action</th></tr></thead>
          <tbody>{filteredRows.length ? filteredRows.map((row) => <tr key={`${row.date}-${row.program_name}-${row.beneficiary_name || row.beneficiary_id || 'entry'}`}><td>{toDateKey(row.date)}</td>{isClusterHistory ? <><td>{row.beneficiary_name || row.beneficiary_id || 'Unknown beneficiary'}</td>{showGroupColumn && <td>{row.group_name || 'Unknown group'}</td>}<td>{row.batch_name || 'Unknown batch'}</td></> : null}<td>{row.monitored_by_name || 'Unknown'}</td><td><button type="button" className="view-btn view-btn--secondary" onClick={() => openReceiptModal(toDateKey(row.date))}>Edit</button></td></tr>) : <tr><td colSpan={isClusterHistory ? (showGroupColumn ? 6 : 5) : 3} className="no-data">No receipt history found.</td></tr>}</tbody>
        </table> : <div className="program-calendar-wrap">
          <div className="program-calendar-header"><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>Previous</button><h3>{monthLabel(calendarMonth)}</h3><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>Next</button></div>
          <div className="program-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="program-calendar-grid">{days.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; const receipt = receivedByDate.get(key) || []; return <button type="button" key={key} className={`program-calendar-day${day.getMonth() !== calendarMonth.getMonth() ? ' muted' : ''}${receipt.length ? ' received' : ''}${selectedDate === key ? ' selected' : ''}`} onClick={() => openReceiptModal(key, true)}><span>{day.getDate()}</span>{receipt.length > 0 && <strong>{receipt.length > 1 ? `${receipt.length} Yes` : 'Yes'}</strong>}</button>; })}</div>
          {selectedReceipts.length ? <div className="program-calendar-detail">
            <strong>{selectedDate}</strong>
            <span>{selectedReceipts.length} received on this date</span>
            {selectedReceipts.map((selectedReceipt, index) => (
              <div key={`${selectedDate}-${selectedReceipt.beneficiary_id || index}`}>
                <span>{selectedReceipt.program_name}</span>
                {isClusterHistory && <span>Beneficiary: {selectedReceipt.beneficiary_name || selectedReceipt.beneficiary_id || 'Unknown beneficiary'}</span>}
                {isClusterHistory && <><span>School: {selectedReceipt.school_name || 'Unknown school'}</span><span>Group: {selectedReceipt.group_name || 'Unknown group'}</span><span>Batch: {selectedReceipt.batch_name || 'Unknown batch'}</span></>}
                <span>Recorded by {selectedReceipt.monitored_by_name || 'Unknown'}</span>
              </div>
            ))}
          </div> : <p className="program-calendar-empty">{filteredRows.some((row) => row.monitored) ? 'Select a highlighted date to view receipt details.' : 'No receipt history found.'}</p>}
        </div>}
        {receiptModal && <div className="modal-backdrop" role="presentation" onClick={() => !savingReceipt && setReceiptModal(null)}><div className="program-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" onClick={(event) => event.stopPropagation()}><div className="program-receipt-modal-header"><h3 id="receipt-modal-title">Record program receipt</h3><button type="button" className="document-preview-close" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Close</button></div><form onSubmit={saveReceipt}><label>Date<input type="text" inputMode="numeric" pattern="\d{4}/\d{2}/\d{2}" value={receiptModal.date ? formatDateForDisplay(receiptModal.date) : ''} onChange={(event) => setReceiptModal((current) => ({ ...current, date: normalizeDateValue(event.target.value) || '' }))} placeholder="yyyy/mm/dd" required /></label><label>Received this program item?<select value={receiptModal.monitored ? 'yes' : 'no'} onChange={(event) => setReceiptModal((current) => ({ ...current, monitored: event.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></label><div className="program-receipt-modal-actions"><button type="button" className="view-btn view-btn--secondary" onClick={() => setReceiptModal(null)} disabled={savingReceipt}>Cancel</button><button type="submit" className="view-btn view-btn--primary" disabled={savingReceipt}>{savingReceipt ? 'Saving...' : 'Save status'}</button></div></form></div></div>}
      </section>
    </div>
  );
}