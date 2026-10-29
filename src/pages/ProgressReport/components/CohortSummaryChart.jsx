import React from 'react';
import {
  getInterpretationLevels,
  getPointInterpretation,
  getPointValue,
  mapInterpretationToBand,
} from '../progressReportConfig';
import {
  summarizeInterpretationCohort,
  summarizeNumericCohort,
} from '../utils/cohortSummary.mjs';

const monthKey = (point, isMother) => {
  const dateValue = isMother ? point?.date : point?.date || point?.measurementDate;
  const date = dateValue
    ? new Date(dateValue)
    : Number.isFinite(Number(point?.ageWeeks))
      ? new Date(Date.now() - (Math.max(0, Number(point.ageWeeks)) * 7 * 24 * 60 * 60 * 1000))
      : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonth = (value) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

function NumericCohortChart({ summary, metric, unit }) {
  if (!summary.length) return <p className="growth-report-empty">No numeric measurements are available for this period.</p>;

  const width = Math.max(620, summary.length * 82 + 120);
  const height = 270;
  const left = 64;
  const right = width - 32;
  const top = 24;
  const bottom = height - 46;
  const values = summary.flatMap(({ median, lowerQuartile, upperQuartile }) => [median, lowerQuartile, upperQuartile]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.1, 1);
  const yMin = metric.endsWith('ZScore') ? -5 : min - span * 0.1;
  const yMax = metric.endsWith('ZScore') ? 5 : max + span * 0.1;
  const x = (index) => summary.length === 1 ? (left + right) / 2 : left + (index / (summary.length - 1)) * (right - left);
  const y = (value) => bottom - ((value - yMin) / (yMax - yMin)) * (bottom - top);
  const medianLine = summary.map((point, index) => `${x(index)},${y(point.median)}`).join(' ');
  const spreadArea = [
    ...summary.map((point, index) => `${x(index)},${y(point.upperQuartile)}`),
    ...summary.map((point, index) => `${x(summary.length - 1 - index)},${y(summary[summary.length - 1 - index].lowerQuartile)}`),
  ].join(' ');

  return (
    <>
      <div className="growth-report-line-chart" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${width}px` }} role="img" aria-label={`${metric} median and interquartile range across the selected beneficiary scope`}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const value = yMin + (yMax - yMin) * fraction;
            return <g key={fraction}>
              <line className="growth-report-gridline" x1={left} x2={right} y1={y(value)} y2={y(value)} />
              <text className="growth-report-y-axis-tick" x={left - 8} y={y(value) + 4} textAnchor="end">{value.toFixed(1)}</text>
            </g>;
          })}
          <polygon points={spreadArea} fill="#2563eb" fillOpacity="0.14" />
          {summary.length > 1 && <polyline points={medianLine} fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {summary.map((point, index) => <g key={point.timeline}>
            <circle cx={x(index)} cy={y(point.median)} r="6" fill="#1d4ed8">
              <title>{`${formatMonth(point.timeline)}: median ${point.median.toFixed(2)} ${unit}; middle 50% ${point.lowerQuartile.toFixed(2)}–${point.upperQuartile.toFixed(2)}; n=${point.count}`}</title>
            </circle>
            <text className="growth-report-x-axis-tick" x={x(index)} y={height - 24} textAnchor="middle">{formatMonth(point.timeline)}</text>
            <text className="growth-report-y-axis-tick" x={x(index)} y={height - 7} textAnchor="middle">n={point.count}</text>
          </g>)}
          <text className="growth-report-y-axis-label" x="16" y={height / 2} textAnchor="middle" transform={`rotate(-90 16 ${height / 2})`}>{unit}</text>
        </svg>
      </div>
      <div className="growth-report-legend">
        <span><i style={{ background: '#1d4ed8' }} />Median</span>
        <span><i style={{ background: '#2563eb', opacity: 0.35 }} />Middle 50% (25th–75th percentile)</span>
      </div>
    </>
  );
}

function InterpretationCohortChart({ summary, categories }) {
  if (!summary.length) return <p className="growth-report-empty">No interpretations are available for this period.</p>;
  const colors = ['#b91c1c', '#d97706', '#15803d', '#2563eb', '#7c3aed'];

  return (
    <>
      <div className="growth-report-cohort-bars" role="list" aria-label="Monthly interpretation distribution">
        {summary.map(({ timeline, count, categories: categoryCounts }) => (
          <div className="growth-report-cohort-row" key={timeline} role="listitem">
            <strong>{formatMonth(timeline)}</strong>
            <div className="growth-report-cohort-bar" role="img" aria-label={`${formatMonth(timeline)}, ${count} recorded interpretations`}>
              {categories.map((category, index) => {
                const categoryCount = categoryCounts[category] || 0;
                const percentage = count ? (categoryCount / count) * 100 : 0;
                return percentage > 0 ? <span
                  key={category}
                  style={{ width: `${percentage}%`, background: colors[index % colors.length] }}
                  title={`${category}: ${categoryCount} of ${count} (${percentage.toFixed(1)}%)`}
                /> : null;
              })}
            </div>
            <small>n={count}</small>
          </div>
        ))}
      </div>
      <div className="growth-report-legend">
        {categories.map((category, index) => <span key={category}>
          <i style={{ background: colors[index % colors.length] }} />{category}
        </span>)}
      </div>
    </>
  );
}

export function CohortSummaryChart({ rows, metric, displayWeeks = 'all', beneficiaryType = 'child', interpretation = false }) {
  const isMother = beneficiaryType === 'mother';
  const entries = rows.flatMap((row) => (row.growthSeries || []).map((point) => ({
    timeline: monthKey(point, isMother),
    value: getPointValue(point, metric),
    interpretation: getPointInterpretation(point, metric),
  })).filter((entry) => entry.timeline));

  if (interpretation) {
    const categories = getInterpretationLevels(metric);
    const normalizedEntries = entries
      .filter((entry) => entry.interpretation)
      .map((entry) => ({ ...entry, interpretation: mapInterpretationToBand(entry.interpretation, metric) }));
    return <InterpretationCohortChart
      summary={summarizeInterpretationCohort(normalizedEntries, categories, displayWeeks)}
      categories={categories}
    />;
  }

  const numericEntries = entries.filter(({ value }) => Number.isFinite(value));
  const unit = metric.endsWith('ZScore') ? 'Z-score' : metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'kg' : metric === 'heightForAge' ? 'cm' : 'units';
  return <NumericCohortChart summary={summarizeNumericCohort(numericEntries, displayWeeks)} metric={metric} unit={unit} />;
}
