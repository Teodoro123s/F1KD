import React from 'react';

function ProfileGraph({ rows, field, profileGraphFields }) {
  const fieldMap = new Map(profileGraphFields.map(([id, label, type]) => [id, { label, type }]));
  const metadata = fieldMap.get(field) || fieldMap.get('gender') || { label: 'Field', type: 'categorical' };
  const values = rows.map((row) => row[field]).filter((value) => value !== undefined && value !== null && value !== '');

  if (metadata.type === 'categorical') {
    const counts = new Map();
    values.forEach((value) => {
      const label = String(value ?? '').trim() || 'Not recorded';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const entries = [...counts.entries()].sort((left, right) => right[1] - left[1]);
    const maxCount = Math.max(...entries.map(([, count]) => count), 1);
    return (
      <div className="profile-histogram-shell">
        <span className="profile-histogram-axis-label profile-histogram-y-label">Records</span>
        <div className="growth-report-bars growth-report-bars-chart profile-histogram-chart">
          {entries.map(([label, count]) => (
            <div className="growth-report-bar-item" key={label}>
              <strong>{count}</strong>
              <span style={{ '--bar-height': `${Math.max(6, (count / maxCount) * 100)}%` }} title={`${label}: ${count}`} />
              <small>{label}</small>
            </div>
          ))}
        </div>
        <span className="profile-histogram-axis-label profile-histogram-x-label">{metadata.label}</span>
      </div>
    );
  }

  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numbers.length) {
    return <p className="growth-report-empty">No numeric values available for this field.</p>;
  }
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const binCount = max === min ? 1 : Math.min(6, Math.max(3, numbers.length));
  const step = max === min ? 1 : (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + index * step,
    end: index === binCount - 1 ? max : min + (index + 1) * step,
    count: 0,
  }));
  numbers.forEach((value) => {
    const binIndex = max === min ? 0 : Math.min(binCount - 1, Math.floor((value - min) / step));
    bins[binIndex].count += 1;
  });
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <div className="profile-histogram-shell">
      <span className="profile-histogram-axis-label profile-histogram-y-label">Records</span>
      <div className={`growth-report-bars growth-report-bars-chart profile-histogram-chart${max === min ? ' single-bin' : ''}`}>
        {bins.map((bin) => (
          <div className="growth-report-bar-item" key={`${bin.start}-${bin.end}`}>
            <strong>{bin.count}</strong>
            <span style={{ '--bar-height': `${Math.max(6, (bin.count / maxCount) * 100)}%` }} title={`${bin.count} records`} />
            <small>{bin.start.toFixed(1)}{max === min ? '' : `–${bin.end.toFixed(1)}`}</small>
          </div>
        ))}
      </div>
      <span className="profile-histogram-axis-label profile-histogram-x-label">{metadata.label}</span>
    </div>
  );
}

export function ResultsGraph({
  displayReportCategory,
  profileGraphColumn,
  setProfileGraphColumn,
  graphMetricType,
  setGraphMetricType,
  availableGrowthMetrics,
  availableNumericGrowthMetrics,
  selectedGraphMetric,
  setGrowthMetrics,
  graphRows,
  resultsRows,
  displayWeeks,
  setDisplayWeeks,
  displayBeneficiaryType,
  averageMetric,
  GrowthChart,
  profileGraphFields,
  interpretationMetrics,
  programMetrics,
}) {
  const graphMetricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
  const metricLabel = (graphMetricOptions.find(([id]) => id === selectedGraphMetric)?.[1] || selectedGraphMetric || 'Metric')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const chartTitle = displayReportCategory === 'program'
    ? programMetrics.find(([id]) => id === displayWeeks)?.[1] || 'Program Benefits'
    : displayReportCategory === 'profile'
      ? 'Profile Summary'
      : displayBeneficiaryType === 'mother'
        ? 'BMI'
        : metricLabel.replace(/\s+Z-Score$/i, '').replace(/\s+Interpretation$/i, '');
  const chartSubtitle = displayReportCategory === 'program'
    ? 'Program benefits by group'
    : displayReportCategory === 'profile'
      ? 'Profile distribution snapshot'
      : displayBeneficiaryType === 'mother'
        ? 'Latest mother BMI measurements · values are plotted by month'
        : 'Weight and length plotted against age in months';

  const isWeightLengthFocus = chartTitle === 'Weight-for-Length/Height';

  return (
    <div className="results-graph-wrap">
      <div className={`growth-report-single-card${isWeightLengthFocus ? ' weight-length-focus-card' : ''}`}>
        <h3>{chartTitle}</h3>
        <p>{chartSubtitle}</p>
        <div className="graph-controls">
          {displayReportCategory === 'profile' ? (
            <label className="report-chart-select">
              Graph column
              <select value={profileGraphColumn} onChange={(event) => setProfileGraphColumn(event.target.value)}>
                {profileGraphFields.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          ) : (
            <label className="report-chart-select">
              Y-axis
              <select value={graphMetricType} onChange={(event) => {
                const nextType = event.target.value;
                setGraphMetricType(nextType);
                const nextOptions = nextType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
                const nextMetric = nextOptions.find(([id]) => id === selectedGraphMetric)?.[0] || nextOptions[0]?.[0] || '';
                if (nextMetric) setGrowthMetrics([nextMetric]);
              }}>
                <option value="interpretation">Interpretation</option>
                <option value="numeric">WHO values</option>
              </select>
            </label>
          )}
          {displayReportCategory === 'monitor' && (
            <label className="report-chart-select">
              Display last
              <select value={displayWeeks} onChange={(event) => setDisplayWeeks(event.target.value)}>
                <option value="all">All</option>
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
          )}
        </div>

        {displayReportCategory === 'profile' ? (
          <ProfileGraph rows={resultsRows} field={profileGraphColumn} profileGraphFields={profileGraphFields} />
        ) : (
          <GrowthChart rows={graphRows} metric={selectedGraphMetric} chartType="line" displayWeeks={displayWeeks} beneficiaryType={displayBeneficiaryType} />
        )}
      </div>
    </div>
  );
}
