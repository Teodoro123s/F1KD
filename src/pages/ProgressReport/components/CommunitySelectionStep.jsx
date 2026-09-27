import React from 'react';

export function CommunitySelectionStep({
  isCommunityOrganizer,
  assignedSchool,
  selection,
  groups,
  batches,
  isHealthWorker,
  options,
  updateSelection,
  setActiveTab,
}) {
  return (
    <div className="progress-report-tab-panel">
      <h1>I. Community Selection</h1>
      {isCommunityOrganizer && (
        <p className="progress-report-assigned-school">
          Assigned school: <strong>{assignedSchool?.name || 'Loading assigned school...'}</strong>
        </p>
      )}
      <div className={`progress-report-config-grid${isCommunityOrganizer ? ' organizer-report-config-grid' : ''}`}>
        {!isCommunityOrganizer && (
          <label>
            School
            <select value={selection.schoolId} onChange={(event) => updateSelection('schoolId', event.target.value)} disabled={isHealthWorker}>
              <option value="">Select school</option>
              {options.schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <label>
          Group
          <select value={selection.groupId} onChange={(event) => updateSelection('groupId', event.target.value)} disabled={!selection.schoolId || isHealthWorker}>
            <option value="">All groups</option>
            {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Batch
          <select value={selection.batchId} onChange={(event) => updateSelection('batchId', event.target.value)} disabled={!selection.groupId}>
            <option value="">All batches</option>
            {batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <p className="progress-report-note">
        {isHealthWorker
          ? 'School and group are assigned to your account. Batch is an optional filter.'
          : isCommunityOrganizer
            ? 'Your school is assigned to your account. Group and Batch are optional filters.'
            : 'Select a School to begin. Group and Batch are optional filters.'}
      </p>
      <div className="progress-report-tab-actions">
        <button type="button" className="primary-btn" disabled={!selection.schoolId} onClick={() => setActiveTab(2)}>
          Next: Report Focus →
        </button>
      </div>
    </div>
  );
}
