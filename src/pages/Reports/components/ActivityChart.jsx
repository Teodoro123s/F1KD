import React, { useState } from 'react';
import '../styles/ReportsPage.css';

export default function ActivityChart({
  dailyActivity,
  onPointSelect,
  title = 'Activity over time',
  ariaLabel = 'Daily user login activity',
  emptyMessage = 'No login recorded for the selected scope and period.',
  itemLabel = 'activity',
  description = '',
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 760;
  const height = 280;
  const padding = { top: 26, right: 18, bottom: 54, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(1, ...dailyActivity.map((item) => Number(item.count) || 0));
  const slotWidth = dailyActivity.length ? plotWidth / dailyActivity.length : plotWidth;
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const niceMaximum = Math.ceil(maxCount / tickStep) * tickStep;
  const yTicks = Array.from({ length: niceMaximum / tickStep + 1 }, (_, index) => index * tickStep);
  const points = dailyActivity.map((item, index) => ({
    ...item,
    count: Number(item.count) || 0,
    x: padding.left + index * slotWidth + slotWidth / 2,
    y: padding.top + plotHeight - ((Number(item.count) || 0) / niceMaximum) * plotHeight,
  }));
  const total = points.reduce((sum, item) => sum + item.count, 0);
  const peak = points.reduce((current, item) => item.count > current.count ? item : current, { count: 0 });
  const itemLabelPlural = itemLabel === 'activity' ? 'activities' : `${itemLabel}s`;
  const peakDate = peak.date
    ? new Date(`${peak.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const hasActivity = total > 0;

  return (
    <section className="report-chart-card" aria-label={title} data-guide="reports-results">
      <h2>{title}</h2>
      {description && <p className="report-chart-description">{description}</p>}
      {hasActivity ? (
        <p className="report-chart-summary">
          <strong>{total.toLocaleString()} {itemLabelPlural}</strong>
          <span>Peak: {peak.count.toLocaleString()} on {peakDate}</span>
        </p>
      ) : null}
      {hasActivity ? (
        <div className="report-chart-scroll">
          <svg
            className="report-activity-chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="group"
            aria-label={ariaLabel}
          >
            {yTicks.map((tick) => {
              const y = padding.top + plotHeight - (tick / niceMaximum) * plotHeight;
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
                  <text x={padding.left - 9} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{tick}</text>
                </g>
              );
            })}
            {points.map((item, index) => {
              const barWidth = Math.min(22, Math.max(4, slotWidth * 0.62));
              const barHeight = item.count ? Math.max(2, padding.top + plotHeight - item.y) : 0;
              const showValue = item.count > 0 && (points.length <= 12 || item.count === peak.count);
              const dateLabelStep = Math.max(1, Math.ceil(points.length / 6));
              return (
                <g
                  key={item.date}
                  className="report-chart-bar"
                  tabIndex="0"
                  role="button"
                  aria-label={`${item.date}: ${item.count} ${item.count === 1 ? itemLabel : itemLabelPlural}. View ${itemLabelPlural} for this day.`}
                  onClick={() => onPointSelect?.(item.date)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onPointSelect?.(item.date);
                    }
                  }}
                  onMouseEnter={() => setHoveredPoint(item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onFocus={() => setHoveredPoint(item)}
                  onBlur={() => setHoveredPoint(null)}
                >
                  <title>{`${item.date}: ${item.count} ${item.count === 1 ? itemLabel : itemLabelPlural}`}</title>
                  <rect
                    className="report-chart-bar__hit-area"
                    x={item.x - Math.max(barWidth / 2, 7)}
                    y={padding.top}
                    width={Math.max(barWidth, 14)}
                    height={plotHeight + 2}
                    fill="transparent"
                  />
                  <rect
                    className="report-chart-bar__value"
                    x={item.x - barWidth / 2}
                    y={item.y}
                    width={barWidth}
                    height={barHeight}
                    rx={Math.min(5, barWidth / 3)}
                    fill="#2563eb"
                  />
                  {showValue && (
                    <text x={item.x} y={Math.max(padding.top - 7, item.y - 8)} textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="700">
                      {item.count}
                    </text>
                  )}
                  {(index === 0 || index === points.length - 1 || index % dateLabelStep === 0) && (
                    <text
                      x={item.x}
                      y={height - padding.bottom + 20}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                    >
                      {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                </g>
              );
            })}
            {hoveredPoint && (() => {
              const tooltipWidth = 150;
              const tooltipHeight = 40;
              const tooltipX = Math.max(4, Math.min(width - tooltipWidth - 4, hoveredPoint.x - tooltipWidth / 2));
              const tooltipY = Math.max(4, hoveredPoint.y - tooltipHeight - 12);
              return (
                <g className="report-chart-tooltip" pointerEvents="none">
                  <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="#0f172a" />
                  <text x={tooltipX + 9} y={tooltipY + 15} fill="#cbd5e1" fontSize="10">
                    {new Date(`${hoveredPoint.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </text>
                  <text x={tooltipX + 9} y={tooltipY + 31} fill="#fff" fontSize="12" fontWeight="600">
                    {hoveredPoint.count} {hoveredPoint.count === 1 ? itemLabel : itemLabelPlural}
                  </text>
                </g>
              );
            })()}
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + plotHeight}
              y2={padding.top + plotHeight}
              stroke="#94a3b8"
            />
            <text x={padding.left + plotWidth / 2} y={height - 2} textAnchor="middle" fill="#64748b" fontSize="10">Date</text>
            <text x="12" y={padding.top + plotHeight / 2} textAnchor="middle" fill="#64748b" fontSize="10" transform={`rotate(-90 12 ${padding.top + plotHeight / 2})`}>
              {itemLabelPlural === 'activities' ? 'Activities' : 'Logins'}
            </text>
          </svg>
        </div>
      ) : (
        <p className="report-muted">{emptyMessage}</p>
      )}
    </section>
  );
}
