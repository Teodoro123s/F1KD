import React, { useState } from 'react';

const TOTAL_WEEKS = 48;

function getChildName(child) {
  return child?.name || [child?.firstName || child?.first_name, child?.middleName || child?.middle_name, child?.lastName || child?.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed child';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10).replaceAll('-', '/');
}

function formatDateForPayload(value) {
  return String(value || '').trim().replaceAll('/', '-');
}

export default function ChildMonitor({ child, onSave, onCancel, completedWeeks = [] }) {
  const [week, setWeek] = useState(1);
  const [form, setForm] = useState(() => ({
    checkupDate: formatDate(new Date()),
    weight: child?.weight || child?.birth_weight || child?.birthWeight || '',
    height: child?.height || child?.birth_length || child?.birthLength || '',
    headCircumference: child?.head_circumference || child?.headCircumference || '',
    developmentalStatus: 'Normal',
    serviceProvider: '',
    remarks: '',
  }));

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const childName = getChildName(child);

  const goToWeek = (nextWeek) => setWeek(Math.max(1, Math.min(TOTAL_WEEKS, nextWeek)));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ ...form, checkupDate: formatDateForPayload(form.checkupDate), week, childId: child.id || child.child_id });
    goToWeek(week + 1);
  };

  return (
    <section className="child-monitor-page">
      <div className="child-monitor-stepper" aria-label="Child monitoring weeks">
        {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((weekNumber) => (
          <button
            type="button"
            key={weekNumber}
            className={`child-monitor-week${weekNumber === week ? ' active' : ''}${completedWeeks.includes(weekNumber) ? ' complete' : ''}`}
            onClick={() => setWeek(weekNumber)}
            aria-label={`Week ${weekNumber}`}
          >
            W{weekNumber}
          </button>
        ))}
      </div>

      <div className="child-monitor-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToWeek(week - 1)} disabled={week === 1}>Previous week</button>
        <label htmlFor="child-monitor-week-select">
          Current week
          <select id="child-monitor-week-select" value={week} onChange={(event) => goToWeek(Number(event.target.value))}>
            {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((weekNumber) => (
              <option key={weekNumber} value={weekNumber}>Week {weekNumber}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={() => goToWeek(week + 1)} disabled={week === TOTAL_WEEKS}>Next week</button>
      </div>

      <form className="child-monitor-form" onSubmit={handleSubmit}>
        <div className="checkup-card-body">
          <div className="checkup-form-heading">
            <div>
              <span className="checkup-module-kicker">Growth record</span>
              <div className="checkup-section-title">Child Check-up Record</div>
            </div>
            <span className="checkup-week-badge">Week {week} / {TOTAL_WEEKS}</span>
          </div>
          <p className="child-monitor-subtitle">Week {week} of {TOTAL_WEEKS} · {childName}</p>
          <div className="checkup-grid">
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-checkup-date">Check-up Date</label>
              <input id="child-checkup-date" type="text" inputMode="numeric" pattern="\d{4}/\d{2}/\d{2}" className="checkup-field-input" value={form.checkupDate} onChange={update('checkupDate')} placeholder="yyyy/mm/dd" required />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-weight">Weight (kg)</label>
              <input id="child-monitor-weight" type="number" step="0.1" className="checkup-field-input" value={form.weight} onChange={update('weight')} required />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-monitor-height">Height (cm)</label>
              <input id="child-monitor-height" type="number" step="0.1" className="checkup-field-input" value={form.height} onChange={update('height')} required />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-head-circumference">Head Circumference (cm)</label>
              <input id="child-head-circumference" type="number" step="0.1" className="checkup-field-input" value={form.headCircumference} onChange={update('headCircumference')} />
            </div>
            <div className="form-group">
              <label className="checkup-field-label" htmlFor="child-developmental-status">Developmental Screening</label>
              <select id="child-developmental-status" className="checkup-field-input" value={form.developmentalStatus} onChange={update('developmentalStatus')}>
                <option>Normal</option>
                <option>Needs Follow-up</option>
                <option>At Risk</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-service-provider">Health Worker / Provider</label>
              <input id="child-service-provider" type="text" className="checkup-field-input" value={form.serviceProvider} onChange={update('serviceProvider')} placeholder="e.g. Nurse or midwife" />
            </div>
            <div className="form-group full-width">
              <label className="checkup-field-label" htmlFor="child-monitor-remarks">Growth and Development Notes</label>
              <textarea id="child-monitor-remarks" className="checkup-field-input" rows="3" value={form.remarks} onChange={update('remarks')} placeholder="Growth, feeding, or health observations" />
            </div>
          </div>
          <div className="checkup-actions">
            <button type="submit" className="btn-primary">Save Progress</button>
          </div>
        </div>
      </form>
    </section>
  );
}

export { getChildName };
