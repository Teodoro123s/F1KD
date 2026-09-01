import React from 'react';

export default function ProgressReportToolbar({
  activeTab,
  tabs,
  compareIds,
  onTabChange,
  onCompareClick,
  onDownload,
}) {
  return (
    <div className="progress-report-toolbar">
      <div className="progress-report-tabs" role="tablist" aria-label="Progress report views">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="progress-report-toolbar-actions">
        <button
          type="button"
          className={`ghost-btn ${compareIds.length ? 'selected' : ''}`}
          onClick={onCompareClick}
        >
          Compare{compareIds.length ? ` (${compareIds.length})` : ''}
        </button>
        <button type="button" className="primary-btn" onClick={onDownload}>
          Download CSV
        </button>
      </div>
    </div>
  );
}
