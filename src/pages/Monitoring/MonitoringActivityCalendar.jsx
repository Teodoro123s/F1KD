import React, { useMemo, useState } from 'react';
import {
  formatMonitoringDate,
  getMonitoringActivityStatusCounts,
  getMonitoringMonthDays,
  toMonitoringDateKey,
} from './monitoringActivityCalendarUtils.mjs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getActivityDescription(activity) {
  return `${activity.motherName} — ${activity.trimester}, ${activity.activity}, ${activity.status}`;
}

function ActivityStatus({ status }) {
  const statusClass = status.toLowerCase().replace(/\s+/g, '-');
  return <span className={`monitoring-calendar-status is-${statusClass}`}>{status}</span>;
}

export default function MonitoringActivityCalendar({
  activities,
  loading,
  error,
  onRetry,
  onOpenActivity,
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [view, setView] = useState('calendar');
  const todayKey = toMonitoringDateKey(new Date());
  const monthDays = useMemo(() => getMonitoringMonthDays(month), [month]);
  const activitiesByDate = useMemo(() => {
    const grouped = new Map();
    activities.forEach((activity) => {
      if (!grouped.has(activity.activityDate)) grouped.set(activity.activityDate, []);
      grouped.get(activity.activityDate).push(activity);
    });
    return grouped;
  }, [activities]);
  const selectedActivities = activitiesByDate.get(selectedDate) || [];
  const hasActivitiesInMonth = activities.some((activity) => {
    const [year, monthNumber] = activity.activityDate.split('-').map(Number);
    return year === month.getFullYear() && monthNumber === month.getMonth() + 1;
  });

  const changeMonth = (amount) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setView('activities');
  };

  return (
    <section className="monitoring-activity-calendar" aria-labelledby="monitoring-activity-calendar-title">
      {view === 'calendar' ? (
        <>
          <div className="monitoring-activity-calendar-heading">
            <div>
              <h2 id="monitoring-activity-calendar-title">Monitoring Activity Calendar</h2>
              <p>View maternal monitoring activities and checkup records by date.</p>
            </div>
            <div className="monitoring-activity-calendar-controls" aria-label="Calendar navigation">
              <button type="button" className="monitoring-calendar-nav" onClick={() => changeMonth(-1)} disabled={loading}>Previous Month</button>
              <button
                type="button"
                className="monitoring-calendar-nav"
                onClick={() => {
                  const now = new Date();
                  setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayKey);
                }}
                disabled={loading}
              >
                Today
              </button>
              <button type="button" className="monitoring-calendar-nav" onClick={() => changeMonth(1)} disabled={loading}>Next Month</button>
            </div>
          </div>

          {error ? (
            <div className="monitoring-calendar-message is-error" role="alert">
              <span>{error}</span>
              <button type="button" className="secondary-btn" onClick={onRetry} disabled={loading}>Retry</button>
            </div>
          ) : loading ? (
            <p className="monitoring-calendar-message" role="status">Loading maternal monitoring activities…</p>
          ) : (
            <>
              <h3 className="monitoring-activity-calendar-month" aria-live="polite">
                {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}
              </h3>
              <div className="monitoring-calendar-legend" aria-label="Activity status legend">
                <span><i className="is-done" aria-hidden="true" />Done</span>
                <span><i className="is-pending" aria-hidden="true" />Pending</span>
                <span><i className="is-missing" aria-hidden="true" />Missing</span>
              </div>
              <div className="monitoring-calendar-grid" role="group" aria-label="Monthly monitoring activity calendar">
                {WEEKDAYS.map((day) => (
                  <div className="monitoring-calendar-weekday" key={day}>{day}</div>
                ))}
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <span className="monitoring-calendar-empty-day" key={`empty-${index}`} aria-hidden="true" />;
                  }
                  const dayActivities = activitiesByDate.get(day.key) || [];
                  const statusCounts = getMonitoringActivityStatusCounts(dayActivities);
                  const labels = dayActivities.map(getActivityDescription);
                  return (
                    <button
                      type="button"
                      className={[
                        'monitoring-calendar-day',
                        dayActivities.length ? 'has-activities' : '',
                        day.key === todayKey ? 'is-today' : '',
                        day.key === selectedDate ? 'is-selected' : '',
                      ].filter(Boolean).join(' ')}
                      key={day.key}
                      aria-label={`${formatMonitoringDate(day.key)}${labels.length ? `, ${labels.join('; ')}` : ', no monitoring activities'}`}
                      aria-pressed={day.key === selectedDate}
                      onClick={() => selectDate(day.key)}
                    >
                      <span className="monitoring-calendar-day-number">{day.date.getDate()}</span>
                      {dayActivities.length > 0 && (
                        <span className="monitoring-calendar-counts" aria-label={labels.join('; ')}>
                          {statusCounts.done > 0 && <span className="monitoring-calendar-count is-done" aria-label={`${statusCounts.done} done`}>{statusCounts.done}</span>}
                          {statusCounts.pending > 0 && <span className="monitoring-calendar-count is-pending" aria-label={`${statusCounts.pending} pending`}>{statusCounts.pending}</span>}
                          {statusCounts.missing > 0 && <span className="monitoring-calendar-count is-missing" aria-label={`${statusCounts.missing} missing`}>{statusCounts.missing}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!hasActivitiesInMonth && (
                <p className="monitoring-calendar-empty-month" role="status">
                  No maternal monitoring activities recorded or scheduled for this month.
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <section className="monitoring-calendar-selected" aria-labelledby="monitoring-calendar-selected-title">
          <div className="monitoring-activity-calendar-heading monitoring-calendar-selected-heading">
            <div>
              <h2 id="monitoring-calendar-selected-title">Monitoring Activities on {formatMonitoringDate(selectedDate)}</h2>
              <p>Completed visits, pending appointments, and missed appointments for the selected date.</p>
            </div>
            <button type="button" className="secondary-btn monitoring-calendar-back-button" onClick={() => setView('calendar')}>
              Back to Calendar
            </button>
          </div>
          {selectedActivities.length ? (
            <div className="monitoring-calendar-table-wrap">
              <table className="monitoring-calendar-table">
                <caption className="sr-only">Maternal monitoring activities for {formatMonitoringDate(selectedDate)}</caption>
                <thead>
                  <tr>
                    <th scope="col">Mother Name</th>
                    <th scope="col">Monitoring Activity</th>
                    <th scope="col">Trimester</th>
                    <th scope="col">Check-up Date</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedActivities.map((activity) => {
                    const openActivity = () => onOpenActivity(activity);
                    return (
                      <tr
                        key={activity.key}
                        className="monitoring-calendar-activity-row"
                        tabIndex={0}
                        aria-label={`Open ${activity.motherName}, ${activity.activity}, ${activity.trimester} monitoring form`}
                        onClick={openActivity}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openActivity();
                          }
                        }}
                      >
                        <th scope="row">
                          <strong>{activity.motherName}</strong>
                        </th>
                        <td>{activity.activity}</td>
                        <td>{activity.trimester || '—'}</td>
                        <td>{formatMonitoringDate(activity.activityDate)}</td>
                        <td><ActivityStatus status={activity.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="monitoring-calendar-empty-date" role="status">
              <svg className="monitoring-calendar-empty-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect x="5.5" y="8.5" width="29" height="26" rx="4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13 5.5v6M27 5.5v6M6 16h28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M15 23h10M15 28h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <strong>No activities for this date</strong>
              <span>No maternal check-ups are recorded or scheduled for {formatMonitoringDate(selectedDate)}.</span>
              <span>Choose another date or return to the calendar.</span>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
