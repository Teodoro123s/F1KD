import React from 'react';
import { calendarDays, monthLabel } from '../utils/receiptHistoryUtils.mjs';

export default function ReceiptHistoryCalendar({
  calendarMonth,
  setCalendarMonth,
  receivedByDate,
  selectedDate,
  openReceiptModal,
  canEditReceipts,
  programEnded,
}) {
  return (
    <div className="program-calendar-wrap">
      <div className="program-calendar-header">
        <button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>Previous</button>
        <h3>{monthLabel(calendarMonth)}</h3>
        <button type="button" className="view-btn view-btn--secondary" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>Next</button>
      </div>
      <div className="program-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="program-calendar-grid">
        {calendarDays(calendarMonth).map((day) => {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const receipt = receivedByDate.get(key) || [];
          return (
            <button
              type="button"
              key={key}
              className={`program-calendar-day${day.getMonth() !== calendarMonth.getMonth() ? ' muted' : ''}${receipt.length ? ' received' : ''}${selectedDate === key ? ' selected' : ''}`}
              onClick={() => openReceiptModal(key, true)}
              disabled={programEnded || !canEditReceipts}
            >
              <span>{day.getDate()}</span>
              {receipt.length > 0 && <strong>{receipt.length > 1 ? `${receipt.length} Yes` : 'Yes'}</strong>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
