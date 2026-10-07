import React from 'react';

export function ReportTabBar({ activeTab, canOpenTab, goToTab, tabs = [] }) {
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
            disabled={!canOpenTab(number)}
            className={activeTab === number ? 'active' : ''}
            onClick={() => goToTab(number)}
          >
            <span>{number}</span>
            {tab}
          </button>
        );
      })}
    </div>
  );
}
