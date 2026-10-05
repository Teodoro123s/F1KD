import React from 'react';
import { GrowthChart } from './GrowthChart';
import { formatDateForDisplay } from '../../../utils/dateFormat';

function ReferralAssistanceTable({ rows }) {
  const visits = rows.flatMap((row) => (row.growthSeries || [])
    .filter((point) => point.hospitalReferral)
    .map((point, index) => ({
      key: `${row.motherId || row.mother}-${point.date || index}`,
      beneficiary: row.mother || 'Unknown beneficiary',
      ...point,
    })))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

  if (!visits.length) return <p className="growth-report-empty">No hospital referrals are recorded for this date range.</p>;

  return <div className="progress-report-table-shell"><table className="progress-report-table referral-assistance-table">
    <thead><tr><th>Reported date</th><th>Mother</th><th>Lab assistance</th><th>Assistance amount</th><th>Source of funds</th><th>Facility type</th></tr></thead>
    <tbody>{visits.map((visit) => <tr key={visit.key}>
      <td>{formatDateForDisplay(visit.date)}</td>
      <td>{visit.beneficiary}</td>
      <td>{visit.labAssistanceProvided ? 'Yes' : 'No'}</td>
      <td>{visit.assistanceAmount === null || visit.assistanceAmount === undefined ? '—' : `₱${Number(visit.assistanceAmount).toFixed(2)}`}</td>
      <td>{visit.sourceOfFunds || '—'}</td>
      <td>{visit.facilityType || '—'}</td>
    </tr>)}</tbody>
  </table></div>;
}

function getHistogramRange(field, beneficiaryType, values) {
  if (beneficiaryType === 'mother' && field === 'initialWeight') return { min: 40, max: 100 };
  if (beneficiaryType === 'mother' && field === 'initialHeight') return { min: 140, max: 190 };

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = Math.max(dataMax - dataMin, Math.abs(dataMax) * 0.1, 1);
  const isHeight = /height|length/i.test(field);
  if (isHeight && dataMin >= 100) return { min: 140, max: 190 };
  if (isHeight) return { min: 0, max: 100 };
  if (dataMin >= 20) return { min: 40, max: 100 };
  if (/weight/i.test(field)) return { min: 0, max: 10 };
  return {
    min: Math.floor((dataMin - span * 0.1) * 10) / 10,
    max: Math.ceil((dataMax + span * 0.1) * 10) / 10,
  };
}

function ProfileMeasurementGraph({ rows, field, label, beneficiaryType, numbers }) {
  const defaultRange = getHistogramRange(field, beneficiaryType, numbers);
  const [rangeMin, setRangeMin] = React.useState(defaultRange.min);
  const [rangeMax, setRangeMax] = React.useState(defaultRange.max);
  const [chartType, setChartType] = React.useState(() => numbers.length <= 5 ? 'dot' : 'histogram');
  const [binWidth, setBinWidth] = React.useState('auto');
  const points = rows.flatMap((row, index) => {
    const rawValue = row[field];
    if (rawValue === undefined || rawValue === null || rawValue === '') return [];
    const value = Number(rawValue);
    return Number.isFinite(value) ? [{ row, index, value }] : [];
  }).filter(({ value }) => value >= rangeMin && value <= rangeMax);
  const filteredValues = points.map(({ value }) => value);
  const filteredCount = filteredValues.length;

  const rangeControls = (
    <div className="profile-measurement-controls">
      <label className="profile-chart-type-control">Chart type
        <select value={chartType} onChange={(event) => setChartType(event.target.value)}>
          <option value="dot">Dot plot</option>
          <option value="histogram">Histogram</option>
        </select>
      </label>
      {chartType === 'histogram' && (
        <label className="profile-chart-type-control">Class width
          <select value={binWidth} onChange={(event) => setBinWidth(event.target.value)}>
            <option value="auto">Auto</option>
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </label>
      )}
      <label>Minimum
        <input type="number" step="0.1" value={rangeMin} onChange={(event) => {
          const nextMin = Number(event.target.value);
          if (event.target.value !== '' && Number.isFinite(nextMin)) setRangeMin(Math.min(nextMin, rangeMax));
        }} />
      </label>
      <label>Maximum
        <input type="number" step="0.1" value={rangeMax} onChange={(event) => {
          const nextMax = Number(event.target.value);
          if (event.target.value !== '' && Number.isFinite(nextMax)) setRangeMax(Math.max(nextMax, rangeMin));
        }} />
      </label>
      <button type="button" onClick={() => { setRangeMin(defaultRange.min); setRangeMax(defaultRange.max); }}>Reset range</button>
      <span>{filteredCount} of {numbers.length} records</span>
    </div>
  );

  if (!filteredCount) {
    return <>{rangeControls}<p className="growth-report-empty">No records in the selected range.</p></>;
  }

  const width = 720;
  const height = 300;
  const left = 58;
  const right = width - 20;
  const top = 22;
  const bottom = height - 44;
  const rangeSpan = rangeMax - rangeMin;
  const xPosition = (value) => rangeSpan === 0 ? (left + right) / 2 : left + ((value - rangeMin) / rangeSpan) * (right - left);
  const ticks = [0, 0.5, 1].map((fraction) => ({
    fraction,
    value: rangeMin + fraction * rangeSpan,
    x: left + fraction * (right - left),
  }));

  if (chartType === 'dot') {
    const duplicateValues = new Map();
    return (
      <>
        {rangeControls}
        <div className="profile-scatterplot-wrap">
          <svg className="profile-scatterplot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} dot plot`}>
            {ticks.map(({ fraction, value, x }) => (
              <g key={fraction}>
                <line x1={x} y1={top} x2={x} y2={bottom} className="profile-scatterplot-gridline" />
                <text x={x} y={bottom + 22} textAnchor="middle" className="profile-scatterplot-tick">{value.toFixed(1)}</text>
              </g>
            ))}
            <line x1={left} y1={bottom} x2={right} y2={bottom} className="profile-scatterplot-axis" />
            {points.map(({ row, index, value }) => {
              const stackIndex = duplicateValues.get(value) || 0;
              duplicateValues.set(value, stackIndex + 1);
              const person = row.child || row.mother || `Record ${index + 1}`;
              const y = bottom - 14 - (stackIndex % 8) * 20;
              return (
                <circle key={`${person}-${index}`} cx={xPosition(value)} cy={y} r="6" className="profile-scatterplot-point">
                  <title>{`${person}: ${value}`}</title>
                </circle>
              );
            })}
            <text x={(left + right) / 2} y={height - 8} textAnchor="middle" className="profile-scatterplot-label">{label}</text>
          </svg>
        </div>
      </>
    );
  }

  const specifiedBinWidth = binWidth === 'auto' ? null : Number(binWidth);
  const binCount = rangeSpan === 0 ? 1 : specifiedBinWidth
    ? Math.min(40, Math.max(1, Math.ceil(rangeSpan / specifiedBinWidth)))
    : Math.min(8, Math.max(3, Math.ceil(Math.sqrt(filteredCount))));
  const step = rangeSpan === 0 ? 1 : specifiedBinWidth || rangeSpan / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: rangeMin + index * step,
    end: Math.min(rangeMax, rangeMin + (index + 1) * step),
    count: 0,
  }));
  points.forEach(({ value }) => {
    const binIndex = rangeSpan === 0 ? 0 : Math.min(binCount - 1, Math.floor((value - rangeMin) / step));
    bins[binIndex].count += 1;
  });
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <>
      {rangeControls}
      <div className="profile-histogram-shell">
        <span className="profile-histogram-axis-label profile-histogram-y-label">Records</span>
        <div className={`growth-report-bars growth-report-bars-chart profile-histogram-chart${rangeSpan === 0 ? ' single-bin' : ''}`}>
          {bins.map((bin) => (
            <div className="growth-report-bar-item" key={`${bin.start}-${bin.end}`}>
              <strong>{bin.count}</strong>
              <span style={{ '--bar-height': `${Math.max(6, (bin.count / maxCount) * 100)}%` }} title={`${bin.count} records`} />
              <small>{bin.start.toFixed(1)}{rangeSpan === 0 ? '' : `–${bin.end.toFixed(1)}`}</small>
            </div>
          ))}
        </div>
        <span className="profile-histogram-axis-label profile-histogram-x-label">{label}</span>
      </div>
    </>
  );
}

function ProfileGraph({ rows, field, profileGraphFields, beneficiaryType }) {
  const fieldMap = new Map(profileGraphFields.map(([id, label, type]) => [id, { label, type }]));
  const metadata = fieldMap.get(field) || fieldMap.get('gender') || { label: 'Field', type: 'categorical' };
  const values = rows.map((row) => row[field]).filter((value) => value !== undefined && value !== null && value !== '');

  if (metadata.type === 'boolean' || metadata.type === 'pie') {
    const counts = new Map();
    const chartValues = metadata.type === 'boolean' ? rows.map((row) => row[field]) : values;
    chartValues.forEach((value) => {
      const normalized = String(value).trim();
      const isNo = /^(no|false|0|not recorded)$/i.test(normalized);
      const isYes = /^(yes|true|1)$/i.test(normalized);
      const label = metadata.type === 'boolean'
        ? (isNo || (!isYes && !normalized) ? 'No' : 'Yes')
        : normalized || 'Not recorded';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const entries = [...counts.entries()].sort((left, right) => right[1] - left[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    if (!total) return <p className="growth-report-empty">No values available for this field.</p>;
    const colors = ['#15803d', '#e07a45', '#3973a8', '#d2a33c', '#287f78', '#8c5b83', '#6f7d4d', '#b54e4e'];
    let offset = 0;
    const gradient = entries.map(([, count], index) => {
      const start = offset;
      offset += (count / total) * 100;
      return `${colors[index % colors.length]} ${start}% ${offset}%`;
    }).join(', ');

    return (
      <div className="profile-pie-layout">
        <div className="growth-report-pie profile-graph-pie" role="img" aria-label={`${metadata.label} distribution`} style={{ background: `conic-gradient(${gradient})` }} />
        <div className="profile-pie-legend">
          {entries.map(([label, count], index) => (
            <div key={label}>
              <span><i style={{ background: colors[index % colors.length] }} />{label}</span>
              <strong>{count} · {Math.round((count / total) * 100)}%</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

  if (metadata.type === 'histogram') {
    return (
      <ProfileMeasurementGraph
        key={`${beneficiaryType}-${field}-${numbers.join('|')}`}
        rows={rows}
        field={field}
        label={metadata.label}
        beneficiaryType={beneficiaryType}
        numbers={numbers}
      />
    );
  }

  if (metadata.type === 'measurement') {
    const width = 720;
    const height = 300;
    const left = 58;
    const right = width - 20;
    const top = 22;
    const bottom = height - 44;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const points = rows.flatMap((row, index) => {
      const rawValue = row[field];
      if (rawValue === undefined || rawValue === null || rawValue === '') return [];
      const value = Number(rawValue);
      return Number.isFinite(value) ? [{ row, index, value }] : [];
    });
    const xPosition = (index) => points.length === 1 ? (left + right) / 2 : left + (index / (points.length - 1)) * (right - left);
    const yPosition = (value) => max === min ? (top + bottom) / 2 : bottom - ((value - min) / (max - min)) * (bottom - top);

    return (
      <div className="profile-scatterplot-wrap">
        <svg className="profile-scatterplot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metadata.label} scatterplot`}>
          {[0, 0.5, 1].map((fraction) => {
            const y = bottom - fraction * (bottom - top);
            const tickValue = max === min ? min : min + fraction * (max - min);
            return (
              <g key={fraction}>
                <line x1={left} y1={y} x2={right} y2={y} className="profile-scatterplot-gridline" />
                <text x={left - 10} y={y + 4} textAnchor="end" className="profile-scatterplot-tick">{tickValue.toFixed(1)}</text>
              </g>
            );
          })}
          <line x1={left} y1={top} x2={left} y2={bottom} className="profile-scatterplot-axis" />
          <line x1={left} y1={bottom} x2={right} y2={bottom} className="profile-scatterplot-axis" />
          {points.map(({ row, index, value }) => {
            const person = row.child || row.mother || `Record ${index + 1}`;
            return (
              <circle key={`${person}-${index}`} cx={xPosition(index)} cy={yPosition(value)} r="6" className="profile-scatterplot-point">
                <title>{`${person}: ${value}`}</title>
              </circle>
            );
          })}
          <text x={(left + right) / 2} y={height - 10} textAnchor="middle" className="profile-scatterplot-label">Beneficiary</text>
          <text x="16" y={(top + bottom) / 2} textAnchor="middle" className="profile-scatterplot-label" transform={`rotate(-90 16 ${(top + bottom) / 2})`}>{metadata.label}</text>
        </svg>
      </div>
    );
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
  rangeRows = resultsRows,
  displayWeeks,
  setDisplayWeeks,
  displayBeneficiaryType,
  averageMetric,
  profileGraphFields,
  interpretationMetrics,
  programMetrics,
}) {
  const availableProfileGraphFields = displayBeneficiaryType === 'mother'
    ? profileGraphFields
      .filter(([id]) => !['gender', 'deliveryType', 'liveBirthDocument', 'bloodType', 'birthWeight', 'birthLength', 'contactNumber', 'addressDetails'].includes(id))
      .map(([id, label, type]) => [
        id,
        id === 'initialWeight' ? 'Prenatal Weight (kg)' : id === 'initialHeight' ? 'Prenatal Height (cm)' : label,
        type,
      ])
    : profileGraphFields;
  const effectiveProfileGraphColumn = availableProfileGraphFields.some(([id]) => id === profileGraphColumn)
    ? profileGraphColumn
    : displayBeneficiaryType === 'mother' && availableProfileGraphFields.some(([id]) => id === 'bmiInterpretation')
      ? 'bmiInterpretation'
      : availableProfileGraphFields[0]?.[0] || '';
  const graphMetricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
  const metricLabel = (graphMetricOptions.find(([id]) => id === selectedGraphMetric)?.[1] || selectedGraphMetric || 'Metric')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const selectedProfileField = availableProfileGraphFields.find(([id]) => id === effectiveProfileGraphColumn);
  const graphicMonthOptions = [...new Set(rangeRows.flatMap((row) => (row.growthSeries || []).map((point) => {
    const dateValue = point?.date || point?.measurementDate;
    const date = dateValue
      ? new Date(dateValue)
      : Number.isFinite(Number(point?.ageWeeks))
        ? new Date(Date.now() - (Math.max(0, Number(point.ageWeeks)) * 7 * 24 * 60 * 60 * 1000))
        : null;
    if (!date) return '';
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  })).filter(Boolean))].sort();
  const formatMonthKey = (monthKey) => {
    if (!monthKey) return 'Unknown';
    const [year, monthNumber] = String(monthKey).split('-').map(Number);
    if (!year || !monthNumber) return monthKey;
    return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };
  const parseRangeValue = (value) => {
    if (String(value || '').startsWith('range:')) {
      const [startMonth, endMonth] = String(value).slice(6).split(':');
      return { startMonth: startMonth || '', endMonth: endMonth || '' };
    }
    return { startMonth: graphicMonthOptions[0] || '', endMonth: graphicMonthOptions.at(-1) || '' };
  };
  const currentRange = parseRangeValue(displayWeeks);
  const displayRangeStart = graphicMonthOptions.includes(currentRange.startMonth) ? currentRange.startMonth : (graphicMonthOptions[0] || '');
  const displayRangeEnd = graphicMonthOptions.includes(currentRange.endMonth) ? currentRange.endMonth : (graphicMonthOptions.at(-1) || '');
  const applyMonthRange = (startMonth, endMonth) => {
    const safeStart = startMonth || graphicMonthOptions[0] || '';
    const safeEnd = endMonth && endMonth >= safeStart ? endMonth : safeStart || graphicMonthOptions.at(-1) || '';
    setDisplayWeeks(`range:${safeStart}:${safeEnd}`);
  };
  const chartTitle = displayReportCategory === 'program'
    ? programMetrics.find(([id]) => id === displayWeeks)?.[1] || 'Program Benefits'
    : displayReportCategory === 'profile'
      ? selectedProfileField?.[1] || 'Profile Summary'
      : displayBeneficiaryType === 'mother'
        ? selectedGraphMetric === 'hospitalReferral' ? 'Referral to Hospital' : 'BMI'
        : metricLabel.replace(/\s+Z-Score$/i, '').replace(/\s+Interpretation$/i, '');
  const chartSubtitle = displayReportCategory === 'program'
    ? 'Program benefits by group'
    : displayReportCategory === 'profile'
      ? `Profile values for ${selectedProfileField?.[1] || 'selected field'}`
      : displayBeneficiaryType === 'mother'
        ? selectedGraphMetric === 'hospitalReferral' ? 'Referral and assistance recorded at maternal check-ups' : 'Latest mother BMI measurements · values are plotted by month'
        : 'Weight and length plotted against age in months';
  const profileGraphType = selectedProfileField?.[2] === 'measurement'
    ? 'Scatterplot'
    : selectedProfileField?.[2] === 'histogram'
      ? ''
      : ['boolean', 'pie'].includes(selectedProfileField?.[2]) ? 'Pie chart' : 'Bar chart';

  const isWeightLengthFocus = chartTitle === 'Weight-for-Length/Height';
  const graphCardClass = `${displayReportCategory}-report-graph-card`;

  return (
    <div className="results-graph-wrap">
      <div className={`growth-report-single-card ${graphCardClass}${isWeightLengthFocus ? ' weight-length-focus-card' : ''}`}>
        <h3>{chartTitle}</h3>
        <p>{chartSubtitle}</p>
        <div className="graph-controls">
          {displayReportCategory === 'profile' ? (
            <>
              <label className="report-chart-select">
                Customize column
                <select value={effectiveProfileGraphColumn} onChange={(event) => setProfileGraphColumn(event.target.value)}>
                  {availableProfileGraphFields.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              {profileGraphType && <span className="profile-graph-type">{profileGraphType}</span>}
            </>
          ) : selectedGraphMetric !== 'hospitalReferral' ? (
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
          ) : null}
          {displayReportCategory === 'monitor' && (
            <label className="report-chart-select">
              Date range
              <div className="report-chart-date-range">
                <select aria-label="Range start month" value={displayRangeStart} onChange={(event) => applyMonthRange(event.target.value, displayRangeEnd)} disabled={!graphicMonthOptions.length}>
                  {!graphicMonthOptions.length && <option value="">No dates</option>}
                  {graphicMonthOptions.map((monthKey) => <option key={monthKey} value={monthKey}>{formatMonthKey(monthKey)}</option>)}
                </select>
                <span>to</span>
                <select aria-label="Range end month" value={displayRangeEnd} onChange={(event) => applyMonthRange(displayRangeStart, event.target.value)} disabled={!graphicMonthOptions.length}>
                  {!graphicMonthOptions.length && <option value="">No dates</option>}
                  {graphicMonthOptions.map((monthKey) => <option key={monthKey} value={monthKey}>{formatMonthKey(monthKey)}</option>)}
                </select>
              </div>
            </label>
          )}
        </div>

        {displayReportCategory === 'profile' ? (
          <ProfileGraph
            key={`${displayBeneficiaryType}-${effectiveProfileGraphColumn}-${resultsRows.map((row) => row[effectiveProfileGraphColumn] ?? '').join('|')}`}
            rows={resultsRows}
            field={effectiveProfileGraphColumn}
            profileGraphFields={availableProfileGraphFields}
            beneficiaryType={displayBeneficiaryType}
          />
        ) : displayReportCategory === 'monitor' && displayBeneficiaryType === 'mother' && selectedGraphMetric === 'hospitalReferral' ? (
          <ReferralAssistanceTable rows={graphRows} />
        ) : (
          <GrowthChart rows={graphRows} progressRows={resultsRows} metric={selectedGraphMetric} chartType="line" displayWeeks={displayWeeks} beneficiaryType={displayBeneficiaryType} />
        )}
      </div>
    </div>
  );
}
