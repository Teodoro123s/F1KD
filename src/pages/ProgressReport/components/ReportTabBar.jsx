import React from 'react';

export function ReportTabBar({ activeTab, canOpenTab, goToTab, tabs = [], isNavigating = false }) {
  return (
    <div className="progress-report-tab-bar" role="tablist" aria-label="Progress report steps">
      {tabs.map((tab, index) => {
        const number = index + 1;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === number}
            disabled={!canOpenTab(number) || isNavigating}
            className={activeTab === number ? 'active' : ''}
            onClick={() => goToTab(number, 'step')}
          >
            <span>{number}</span>
            {tab}
          </button>
        );
      })}
    </div>
  );
}
