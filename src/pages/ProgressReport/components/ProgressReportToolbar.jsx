import React from 'react';

export default function ProgressReportToolbar({
  activeTab,
  tabs,
  compareIds,
  onTabChange,
  onCompareClick,
  onDownload,
  showAnalyzeMenu,
  onAnalyzeToggle,
  onGenerateCohortReport,
  onDownloadSummary,
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
        <div className="analyze-menu-wrap">
          <button
            type="button"
            className="ghost-btn"
            onClick={onAnalyzeToggle}
            aria-expanded={showAnalyzeMenu}
            aria-haspopup="menu"
          >
            Analyze ▾
          </button>

          {showAnalyzeMenu && (
            <div className="analyze-menu" role="menu" aria-label="Statistical summary actions">
              <div className="analyze-menu-header">Statistical Summary</div>
              <button type="button" className="analyze-menu-item" onClick={onGenerateCohortReport}>
                Generate Cohort Report
              </button>
              <button type="button" className="analyze-menu-item" onClick={onDownloadSummary}>
                Download Summary CSV
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`ghost-btn ${compareIds.length ? 'selected' : ''}`}
          onClick={onCompareClick}
        >
          Compare{compareIds.length ? ` (${compareIds.length})` : ''}
        </button>
        <button type="button" className="primary-btn" onClick={onDownload}>
          Export ▾
        </button>
      </div>
    </div>
  );
}
