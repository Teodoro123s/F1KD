import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { apiGetBeneficiaryMonitoringReport } from '../../api/programs';

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
  const { programId, beneficiaryType, beneficiaryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const beneficiaryName = location.state?.beneficiaryName || 'Beneficiary';
  const [reportRows, setReportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monitorDate, setMonitorDate] = useState(localDate);
  const [programFilter, setProgramFilter] = useState('');
  const [view, setView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGetBeneficiaryMonitoringReport(programId, beneficiaryType, beneficiaryId);
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
  }, [programId, beneficiaryType, beneficiaryId]);

  const programs = [...new Set(reportRows.map((row) => row.program_name).filter(Boolean))].sort();
  const filteredRows = reportRows.filter((row) => !programFilter || row.program_name === programFilter);
  const receivedByDate = new Map(filteredRows.filter((row) => row.monitored).map((row) => [toDateKey(row.date), row]));
  const selectedReceipt = selectedDate ? receivedByDate.get(selectedDate) : null;
  const days = calendarDays(calendarMonth);

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
            <p>Review when this beneficiary received the program.</p>
          </div>
          <button type="button" className="view-btn view-btn--secondary" onClick={() => navigate(`/program/${programId}`)}>Back to program</button>
        </div>
        <div className="program-monitoring-report__toolbar">
          <span>Daily status: {monitorDate}</span>
          <button type="button" className="view-btn view-btn--secondary" onClick={loadHistory} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && <div className="program-receipt-controls">
          <label>Program Type<select value={programFilter} onChange={(event) => { setProgramFilter(event.target.value); setSelectedDate(null); }}><option value="">All programs</option>{programs.map((program) => <option key={program} value={program}>{program}</option>)}</select></label>
          <div className="program-view-toggle" role="tablist" aria-label="Receipt history view"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List View</button><button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar View</button></div>
        </div>}
        {loading ? <p>Loading receipt history...</p> : view === 'list' ? <table className="data-table">
          <thead><tr><th>Received on</th><th>Received</th><th>Program</th><th>Recorded by</th></tr></thead>
          <tbody>{filteredRows.length ? filteredRows.map((row) => <tr key={`${row.date}-${row.program_name}`}><td>{toDateKey(row.date)}</td><td><span className={`program-recipient-status ${row.monitored ? 'received' : 'pending'}`}>{row.monitored ? 'Yes' : 'No'}</span></td><td>{row.program_name}</td><td>{row.monitored_by_name || 'Unknown'}</td></tr>) : <tr><td colSpan="4" className="no-data">No receipt history found.</td></tr>}</tbody>
        </table> : <div className="program-calendar-wrap">
          <div className="program-calendar-header"><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>Previous</button><h3>{monthLabel(calendarMonth)}</h3><button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>Next</button></div>
          <div className="program-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="program-calendar-grid">{days.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; const receipt = receivedByDate.get(key); return <button type="button" key={key} className={`program-calendar-day${day.getMonth() !== calendarMonth.getMonth() ? ' muted' : ''}${receipt ? ' received' : ''}${selectedDate === key ? ' selected' : ''}`} onClick={() => receipt && setSelectedDate(key)} disabled={!receipt}><span>{day.getDate()}</span>{receipt && <strong>Received</strong>}</button>; })}</div>
          {selectedReceipt ? <div className="program-calendar-detail"><strong>{selectedDate}</strong><span>{selectedReceipt.program_name}</span><span>Recorded by {selectedReceipt.monitored_by_name || 'Unknown'}</span></div> : <p className="program-calendar-empty">{filteredRows.some((row) => row.monitored) ? 'Select a highlighted date to view receipt details.' : 'No receipt history found.'}</p>}
        </div>}
      </section>
    </div>
  );
}