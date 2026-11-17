import React from 'react';

export default function ReportFilters({
  scopeLevel,
  selectedSchoolId,
  selectedGroupId,
  selectedUserId,
  visibleGroups,
  visibleUsers,
  schools,
  search,
  dateRangePreset,
  viewMode,
  onScopeLevelChange,
  onSchoolChange,
  onGroupChange,
  onUserChange,
  onSearchChange,
  onDateRangeChange,
  onViewModeChange,
  onShowGraph,
}) {
  return (
    <section className="reports-toolbar" aria-label="Report controls" data-guide="reports-filters">
      <div className={`reports-filter-grid reports-filter-grid--${scopeLevel}`} aria-label="Report filters">
        <label className="reports-filter-field">
          <span>Report level</span>
          <select value={scopeLevel} aria-label="Report level" onChange={(event) => onScopeLevelChange(event.target.value)}>
            <option value="school">School</option>
            <option value="group">Group</option>
            <option value="individual">Individual</option>
          </select>
        </label>
        {(scopeLevel === 'school' || scopeLevel === 'group') && (
          <label className="reports-filter-field">
            <span>School</span>
            <select value={selectedSchoolId} aria-label="School" onChange={(event) => onSchoolChange(event.target.value)}>
              <option value="">All schools</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
        )}
        {scopeLevel === 'group' && (
          <label className="reports-filter-field">
            <span>Group</span>
            <select value={selectedGroupId} aria-label="Group" onChange={(event) => onGroupChange(event.target.value)}>
              <option value="">All groups</option>
              {visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
        )}
        {scopeLevel === 'individual' && (
          <label className="reports-filter-field">
            <span>Activity performed by</span>
            <select value={selectedUserId} aria-label="Activity performed by" onChange={(event) => onUserChange(event.target.value)}>
              <option value="">All users</option>
              {visibleUsers.map((user) => (
                <option key={`${user.id ?? 'deleted'}-${user.email || user.name}`} value={user.id ?? ''}>
                  {user.name}{user.email ? ` (${user.email})` : ''}{user.id ? '' : ' (deleted account)'}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="reports-filter-field reports-search">
          <span>Search activity</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="User, action, or details"
          />
        </label>
      </div>
      <div className="reports-date-range" aria-label="Date range">
        <label className="reports-filter-field">
          <span>Date range</span>
          <select value={dateRangePreset} aria-label="Date range" onChange={(event) => onDateRangeChange(event.target.value)}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
          </select>
        </label>
      </div>
      <div className="reports-toolbar-footer">
        <span className="reports-toolbar-label">Display</span>
        <div className="reports-view-switch" role="group" aria-label="Activity view">
          <button
            type="button"
            className={viewMode === 'graph' ? 'is-active' : ''}
            aria-pressed={viewMode === 'graph'}
            onClick={onShowGraph}
          >
            Graph view
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'is-active' : ''}
            aria-pressed={viewMode === 'table'}
            onClick={() => onViewModeChange('table')}
          >
            Table view
          </button>
        </div>
      </div>
    </section>
  );
}
