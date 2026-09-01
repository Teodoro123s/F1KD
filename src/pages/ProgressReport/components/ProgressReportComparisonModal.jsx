import React from 'react';

export default function ProgressReportComparisonModal({
  compareMode,
  setCompareMode,
  compareOpen,
  setCompareOpen,
  compareIds,
  compareCandidates,
  getRowKey,
  toggleCompare,
  openComparison,
}) {
  if (!compareOpen) return null;

  return (
    <div className="report-modal-backdrop" role="presentation" onClick={() => setCompareOpen(false)}>
      <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="compare-title">What would you like to compare?</h2>
        <p>Choose two items from the current report view.</p>
        <div className="compare-mode-options">
          {['Beneficiaries', 'Groups', 'Batches', 'Checkups'].map((mode) => (
            <button
              key={mode}
              type="button"
              className={compareMode === mode ? 'active' : ''}
              onClick={() => { setCompareMode(mode); }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="compare-candidates">
          {compareCandidates.map((row, index) => {
            const rowKey = getRowKey(row, index);
            return (
              <label key={rowKey}>
                <input
                  type="checkbox"
                  checked={compareIds.includes(rowKey)}
                  onChange={() => toggleCompare(rowKey)}
                />
                <span>{row.name}</span>
                <small>{row.progress}% progress</small>
              </label>
            );
          })}
        </div>

        {compareMode === 'Checkups' && (
          <p className="compare-help">Select one mother, then Compare to view the two latest checkups.</p>
        )}

        <div className="report-modal-actions">
          <button type="button" className="ghost-btn" onClick={() => setCompareOpen(false)}>Cancel</button>
          <button
            type="button"
            className="primary-btn"
            disabled={compareMode === 'Checkups' ? compareIds.length !== 1 : compareIds.length !== 2}
            onClick={openComparison}
          >
            {compareMode === 'Checkups' ? 'Compare History' : 'Compare Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
