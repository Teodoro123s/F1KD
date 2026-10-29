import React from 'react';

export function CommunitySelectionStep({
  isCommunityOrganizer,
  assignedSchool,
  selection,
  groups,
  batches,
  isHealthWorker,
  options,
  loadingOptions = false,
  updateSelection,
  reportCategoryStep,
}) {
  return (
    <div className="community-selection-step">
      <div className="progress-report-tab-panel">
        <h1>I. Community Selection</h1>
        {isCommunityOrganizer && (
          <p className="progress-report-assigned-school">
            Assigned school: <strong title={assignedSchool?.name || undefined}>{assignedSchool?.name || 'Loading assigned school...'}</strong>
          </p>
        )}
        <div className={`progress-report-config-grid${isCommunityOrganizer ? ' organizer-report-config-grid' : ''}`}>
          {!isCommunityOrganizer && (
            <label>
              School
              <select value={selection.schoolId} onChange={(event) => updateSelection('schoolId', event.target.value)} disabled={isHealthWorker || loadingOptions}>
                <option value="">All accessible schools</option>
                {options.schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <label>
            Group
            <select
              title="Filter the report by group"
              value={selection.groupId}
              onChange={(event) => updateSelection('groupId', event.target.value)}
              disabled={isHealthWorker || loadingOptions}
            >
              <option value="">All groups</option>
              {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Batch
            <select
              title="Optionally filter the report by batch"
              value={selection.batchId}
              onChange={(event) => updateSelection('batchId', event.target.value)}
              disabled={loadingOptions}
            >
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
              : 'Choose a school to narrow the report, or keep All accessible schools for your authorized records. Group and Batch are optional filters.'}
        </p>
      </div>
      {reportCategoryStep}
    </div>
  );
}
