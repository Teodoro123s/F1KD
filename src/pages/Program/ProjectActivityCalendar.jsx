import React from 'react';
import {
  formatActivityDate,
  getDistinctProjectsForDate,
  getMonthCalendarDays,
  toLocalDateKey,
} from './projectActivityCalendarUtils.mjs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProjectActivityCalendar({
  month,
  activities,
  loading,
  error,
  onRetry,
  onMonthChange,
}) {
  const [selectedDate, setSelectedDate] = React.useState('');
  const [showSelectedDate, setShowSelectedDate] = React.useState(false);
  const todayKey = toLocalDateKey(new Date());
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const days = getMonthCalendarDays(month);
  const distinctActivities = (dateKey) => getDistinctProjectsForDate(activities, dateKey);
  const monthShift = (amount) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(toLocalDateKey(today));
    setShowSelectedDate(false);
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
  };
  const showDateActivities = (dateKey) => {
    setSelectedDate(dateKey);
    setShowSelectedDate(true);
  };
  const selectedProjects = distinctActivities(selectedDate);

  return (
    <section className="project-activity-calendar" aria-labelledby="project-activity-calendar-title">
      {showSelectedDate ? (
        <div className="project-activity-date-view">
          <div className="project-activity-calendar-header">
            <div>
              <p className="program-section-eyebrow">Project activity</p>
              <h2 id="project-activity-calendar-title">Activities on {formatActivityDate(selectedDate)}</h2>
            </div>
            <button type="button" className="view-btn view-btn--secondary" onClick={() => setShowSelectedDate(false)}>
              Back to Calendar
            </button>
          </div>
          {loading ? (
            <p className="project-activity-state" role="status">Loading project activities…</p>
          ) : error ? (
            <div className="project-activity-error" role="alert">
              <p>{error}</p>
              <button type="button" className="view-btn view-btn--secondary" onClick={onRetry}>Retry</button>
            </div>
          ) : selectedProjects.length ? (
            <div className="project-activity-table-wrap">
              <table className="data-table project-activity-table">
                <thead><tr><th>Project Name</th><th>Activity Date</th></tr></thead>
                <tbody>
                  {selectedProjects.map((project) => (
                    <tr key={project.id}>
                      <td><strong>{project.name}</strong></td>
                      <td>{formatActivityDate(project.activityDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="project-activity-empty">
              <p>No project activities recorded on this date</p>
              <button type="button" className="view-btn view-btn--secondary" onClick={() => setShowSelectedDate(false)}>
                Back to Calendar
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="project-activity-calendar-header">
            <div>
              <p className="program-section-eyebrow">Activity overview</p>
              <h2 id="project-activity-calendar-title">Project Activity Calendar</h2>
            </div>
            <div className="project-activity-calendar-controls" aria-label="Calendar navigation">
              <button type="button" className="view-btn view-btn--secondary" onClick={() => monthShift(-1)} aria-label="Previous month">Previous Month</button>
              <button type="button" className="view-btn view-btn--secondary" onClick={goToToday}>Today</button>
              <button type="button" className="view-btn view-btn--secondary" onClick={() => monthShift(1)} aria-label="Next month">Next Month</button>
            </div>
          </div>
          <div className="project-activity-month" aria-live="polite">{monthLabel}</div>
          {error && (
            <div className="project-activity-error" role="alert">
              <p>{error}</p>
              <button type="button" className="view-btn view-btn--secondary" onClick={onRetry}>Retry</button>
            </div>
          )}
          {loading && <p className="project-activity-state" role="status">Loading project activities…</p>}
          {!loading && !error && !activities.length && (
            <p className="project-activity-state">No project check-ins recorded this month.</p>
          )}
          <div className={`project-activity-grid${loading || error ? ' is-unavailable' : ''}`} role="grid" aria-label={`Project activity for ${monthLabel}`}>
            {WEEKDAYS.map((day) => <div key={day} className="project-activity-weekday" role="columnheader">{day}</div>)}
            {days.map((day, index) => {
              if (!day) return <span className="project-activity-empty-day" key={`empty-${index}`} aria-hidden="true" />;
              const { date, key } = day;
              const projects = distinctActivities(key);
              const visibleProjects = projects.slice(0, 2);
              const overflow = projects.length - visibleProjects.length;
              const accessibleProjects = projects.length
                ? `Projects: ${projects.map((project) => project.name).join(', ')}`
                : 'No project activity';
              return (
                <button
                  type="button"
                  key={key}
                  role="gridcell"
                  className={[
                    'project-activity-day',
                    key === todayKey ? ' is-today' : '',
                    key === selectedDate ? ' is-selected' : '',
                    projects.length ? ' has-activity' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={`${formatActivityDate(key)}, ${accessibleProjects}`}
                  aria-pressed={key === selectedDate}
                  onClick={() => showDateActivities(key)}
                >
                  <span className="project-activity-day-number">{date.getDate()}</span>
                  <span className="project-activity-day-projects" aria-hidden="true">
                    {visibleProjects.map((project) => (
                      <span className="project-activity-chip" key={project.id} title={project.name}>{project.name}</span>
                    ))}
                    {overflow > 0 && <span className="project-activity-more">+{overflow} more · view day</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
