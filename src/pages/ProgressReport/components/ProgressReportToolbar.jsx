import React from 'react';

export default function ProgressReportToolbar({
  activeTab,
  tabs,
  onTabChange,
  onDownload,
  rankedBy,
  rankOptions,
  onRankedByChange,
  rankDirection,
  onRankDirectionChange,
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
        {activeTab === 'Ranked by' && (
          <label className="ranked-by-select">
            <span>Ranked by</span>
            <select value={rankedBy} onChange={(event) => onRankedByChange(event.target.value)} aria-label="Rank report by">
              {rankOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <select value={rankDirection} onChange={(event) => onRankDirectionChange(event.target.value)} aria-label="Rank direction">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        )}
        <button type="button" className="primary-btn" onClick={onDownload}>
          Export ▾
        </button>
      </div>
    </div>
  );
}
