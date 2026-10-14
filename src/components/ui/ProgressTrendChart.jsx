import React, { useMemo, useState } from 'react';
import './progress-trend-chart.css';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 260;
const PADDING = { top: 24, right: 22, bottom: 48, left: 56 };
const GRID_LINES = 4;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export default function ProgressTrendChart({ title, description, data, metrics }) {
  const [selectedMetric, setSelectedMetric] = useState('');
  const [view, setView] = useState('graph');
  const availableMetrics = useMemo(
    () => metrics.filter((metric) => data.some((point) => toNumber(point[metric.key]) !== null)),
    [data, metrics],
  );
  const activeMetric = availableMetrics.find((metric) => metric.key === selectedMetric) || availableMetrics[0];
  const points = activeMetric
    ? data
      .map((point) => ({ ...point, value: toNumber(point[activeMetric.key]) }))
      .filter((point) => point.value !== null)
    : [];
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const values = points.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const range = maxValue - minValue;
  const padding = range === 0 ? Math.max(Math.abs(maxValue) * 0.1, 1) : range * 0.12;
  const axisMin = Math.max(0, minValue - padding);
  const axisMax = maxValue + padding || 1;
  const axisRange = axisMax - axisMin || 1;
  const getX = (index) => PADDING.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const getY = (value) => PADDING.top + ((axisMax - value) / axisRange) * plotHeight;
  const linePoints = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');
  const latestPoint = points[points.length - 1] || null;
  const firstPoint = points[0] || null;
  const change = latestPoint && firstPoint ? latestPoint.value - firstPoint.value : 0;
  const labelInterval = Math.max(1, Math.ceil(points.length / 6));

  return (
    <section className="beneficiary-progress-chart">
      <div className="beneficiary-progress-chart__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="beneficiary-progress-chart__views" role="group" aria-label="Choose progress view">
          <button type="button" className={view === 'table' ? 'active' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table
          </button>
          <button type="button" className={view === 'graph' ? 'active' : ''} aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
            Graph
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="beneficiary-progress-chart__table-wrap">
          <table className="beneficiary-progress-chart__table">
            <thead>
              <tr>
                <th scope="col">Visit</th>
                <th scope="col">Date</th>
                {metrics.map((metric) => <th scope="col" key={metric.key}>{metric.label} ({metric.unit})</th>)}
              </tr>
            </thead>
            <tbody>
              {data.length ? data.map((point, index) => (
                <tr key={`${point.label || 'visit'}-${index}`}>
                  <td>{point.label || `Visit ${index + 1}`}</td>
                  <td>{point.date || '—'}</td>
                  {metrics.map((metric) => {
                    const value = toNumber(point[metric.key]);
                    return <td key={metric.key}>{value === null ? '—' : value.toFixed(1)}</td>;
                  })}
                </tr>
              )) : (
                <tr><td colSpan={metrics.length + 2}>No monitoring visits have been recorded for this beneficiary yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {availableMetrics.length > 0 && (
            <div className="beneficiary-progress-chart__metrics" role="group" aria-label="Choose progress measurement">
              {availableMetrics.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  className={metric.key === activeMetric.key ? 'active' : ''}
                  aria-pressed={metric.key === activeMetric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          )}
          {activeMetric ? (
            points.length ? (
              <>
                <div className="beneficiary-progress-chart__summary">
                  <span>{activeMetric.label}</span>
                  <strong>{latestPoint.value.toFixed(1)} {activeMetric.unit}</strong>
                  {points.length > 1 && (
                    <span className={change >= 0 ? 'positive' : 'negative'}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)} {activeMetric.unit} since first record
                    </span>
                  )}
                </div>

                <div className="beneficiary-progress-chart__plot">
                  <svg
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    role="img"
                    aria-label={`${activeMetric.label} progress chart. Latest measurement ${latestPoint.value.toFixed(1)} ${activeMetric.unit}.`}
                  >
                    {Array.from({ length: GRID_LINES + 1 }, (_, index) => {
                      const y = PADDING.top + (index / GRID_LINES) * plotHeight;
                      const value = axisMax - (index / GRID_LINES) * axisRange;
                      return (
                        <g key={index} className="beneficiary-progress-chart__grid">
                          <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} />
                          <text x={PADDING.left - 10} y={y + 4} textAnchor="end">{value.toFixed(1)}</text>
                        </g>
                      );
                    })}
                    {points.length > 1 && (
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke={activeMetric.color}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    )}
                    {points.map((point, index) => (
                      <g key={`${point.label}-${index}`}>
                        <circle
                          cx={getX(index)}
                          cy={getY(point.value)}
                          r="5"
                          fill={activeMetric.color}
                          stroke="white"
                          strokeWidth="2"
                        >
                          <title>{`${point.label}: ${point.value} ${activeMetric.unit}`}</title>
                        </circle>
                        {(index % labelInterval === 0 || index === points.length - 1) && (
                          <text
                            className="beneficiary-progress-chart__x-label"
                            x={getX(index)}
                            y={CHART_HEIGHT - 18}
                            textAnchor="middle"
                          >
                            {point.label}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="beneficiary-progress-chart__footnote">
                  {points.length === 1 ? 'One measurement recorded' : `${points.length} measurements recorded`}
                  {firstPoint.date ? ` · First: ${firstPoint.date}` : ''}
                  {latestPoint.date ? ` · Latest: ${latestPoint.date}` : ''}
                </p>
              </>
            ) : (
              <div className="beneficiary-progress-chart__empty">
                No recorded values are available for this measurement yet. Choose Table to view the visit records.
              </div>
            )
          ) : (
            <div className="beneficiary-progress-chart__empty">
              No monitoring measurements have been recorded for this beneficiary yet.
            </div>
          )}
        </>
      )}
    </section>
  );
}
