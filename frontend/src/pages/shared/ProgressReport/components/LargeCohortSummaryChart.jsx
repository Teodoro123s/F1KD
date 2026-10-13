import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LargeCohortSummaryChart({
  entries,
  categories,
  colors,
  displayTimelines,
  timelineLabel,
  width,
  metric,
  mapInterpretationToBand,
  beneficiaryType,
}) {
  const navigate = useNavigate();
  const [selectedPoint, setSelectedPoint] = React.useState(null);
  const latestByBeneficiaryMonth = new Map();
  entries.forEach((entry) => {
    const beneficiaryKey = String(entry.row.childId || entry.row.motherId || entry.row.child || entry.row.mother || 'beneficiary');
    const key = `${beneficiaryKey}:${entry.timeline}`;
    const dateValue = entry.point.date || entry.point.measurementDate;
    const date = dateValue ? new Date(dateValue) : null;
    const timestamp = date && !Number.isNaN(date.getTime()) ? date.getTime() : -1;
    const current = latestByBeneficiaryMonth.get(key);
    if (!current || timestamp >= current.timestamp) {
      latestByBeneficiaryMonth.set(key, {
        timeline: entry.timeline,
        band: mapInterpretationToBand(entry.interpretation, metric),
        timestamp,
        entry,
      });
    }
  });

  const counts = new Map(categories.map((category) => [category, new Map(displayTimelines.map((timeline) => [timeline, 0]))]));
  latestByBeneficiaryMonth.forEach(({ timeline, band }) => {
    const categoryCounts = counts.get(band);
    if (categoryCounts?.has(timeline)) categoryCounts.set(timeline, categoryCounts.get(timeline) + 1);
  });

  const maximumCount = Math.max(0, ...[...counts.values()].flatMap((categoryCounts) => [...categoryCounts.values()]));
  const tickStep = Math.max(1, Math.ceil(maximumCount / 4));
  const axisMaximum = tickStep * 4;
  const height = 300;
  const left = 76;
  const right = width - 24;
  const top = 24;
  const bottom = height - 52;
  const xForTimeline = (timeline) => displayTimelines.length <= 1
    ? (left + right) / 2
    : left + (displayTimelines.indexOf(timeline) / (displayTimelines.length - 1)) * (right - left);
  const yForCount = (count) => bottom - (count / axisMaximum) * (bottom - top);
  const ticks = Array.from({ length: 5 }, (_, index) => index * tickStep);

  return (
    <div className="growth-report-population-summary">
      <p>Monthly beneficiaries by latest available interpretation in each month. Switch to Table View for individual histories.</p>
      <div className="growth-report-line-chart">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width}px`, height: `${height}px` }} role="img" aria-label="Monthly beneficiary counts by growth interpretation">
          <text className="growth-report-y-axis-label" x="16" y={height / 2} textAnchor="middle" transform={`rotate(-90 16 ${height / 2})`}>Beneficiaries</text>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="growth-report-gridline" x1={left} x2={right} y1={yForCount(tick)} y2={yForCount(tick)} />
              <text className="growth-report-y-axis-tick" x={left - 10} y={yForCount(tick) + 4} textAnchor="end">{tick}</text>
            </g>
          ))}
          {displayTimelines.map((timeline) => (
            <g key={timeline}>
              <line className="growth-report-weekline" x1={xForTimeline(timeline)} x2={xForTimeline(timeline)} y1={top} y2={bottom} />
              <text className="growth-report-x-axis-tick" x={xForTimeline(timeline)} y={height - 18} textAnchor="middle">{timelineLabel(timeline)}</text>
            </g>
          ))}
          {categories.map((category, categoryIndex) => {
            const categoryCounts = counts.get(category);
            const points = displayTimelines.map((timeline) => `${xForTimeline(timeline)},${yForCount(categoryCounts.get(timeline))}`).join(' ');
            return (
              <g key={category}>
                <polyline points={points} fill="none" stroke={colors[categoryIndex % colors.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                {displayTimelines.map((timeline) => {
                  const count = categoryCounts.get(timeline);
                  const isSelected = selectedPoint?.category === category && selectedPoint.timeline === timeline;
                  const matchingEntries = [...latestByBeneficiaryMonth.values()]
                    .filter((item) => item.timeline === timeline && item.band === category);
                  const tooltip = `${category}: ${count} beneficiaries · ${timelineLabel(timeline)}. Click to view matching check-ups.`;
                  const handlePointSelection = () => {
                    if (matchingEntries.length === 1) {
                      const { entry } = matchingEntries[0];
                      const row = entry.row;
                      const point = entry.point;
                      const name = row.child || row.mother || 'Beneficiary';
                      const date = String(point.date || point.measurementDate || '').slice(0, 10);
                      if (beneficiaryType === 'mother') {
                        navigate('/monitoring', { state: { mother: { id: row.motherId, motherId: row.motherId, name }, checkupDate: date } });
                      } else {
                        navigate('/monitoring', { state: { child: { id: row.childId, childId: row.childId, name }, week: point.ageWeeks, checkupDate: date } });
                      }
                      return;
                    }
                    setSelectedPoint({ category, timeline, entries: matchingEntries });
                  };
                  const overlappingCategories = count > 0
                    ? categories.filter((candidate) => counts.get(candidate)?.get(timeline) === count)
                    : [];
                  const overlapIndex = overlappingCategories.indexOf(category);
                  const markerOffset = overlappingCategories.length > 1
                    ? (overlapIndex - (overlappingCategories.length - 1) / 2) * 12
                    : 0;
                  return (
                    <circle
                      key={timeline}
                      className="growth-report-summary-point"
                      cx={xForTimeline(timeline) + markerOffset}
                      cy={yForCount(count)}
                      r={isSelected ? '7' : '5'}
                      fill={colors[categoryIndex % colors.length]}
                      role={count > 0 ? 'button' : undefined}
                      tabIndex={count > 0 ? 0 : undefined}
                      aria-label={count > 0 ? tooltip : undefined}
                      aria-pressed={count > 0 ? isSelected : undefined}
                      pointerEvents={count > 0 ? undefined : 'none'}
                      onClick={count > 0 ? handlePointSelection : undefined}
                      onKeyDown={count > 0 ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handlePointSelection();
                        }
                      } : undefined}
                    >
                      {count > 0 && <title>{tooltip}</title>}
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="growth-report-legend growth-report-category-legend">
        {categories.map((category, index) => <span key={category}><i style={{ backgroundColor: colors[index % colors.length] }} />{category}</span>)}
      </div>
      {selectedPoint && (
        <section className="growth-report-point-details" aria-live="polite">
          <div className="growth-report-point-details-header">
            <strong>{selectedPoint.category} · {timelineLabel(selectedPoint.timeline)}</strong>
            <span>{selectedPoint.entries.length} {beneficiaryType === 'mother' ? 'mothers' : 'children'}</span>
          </div>
          {selectedPoint.entries.length ? (
            <ul>
              {selectedPoint.entries
                .sort((left, right) => String(left.entry.row.child || left.entry.row.mother || '').localeCompare(String(right.entry.row.child || right.entry.row.mother || '')))
                .map(({ entry }) => {
                  const row = entry.row;
                  const point = entry.point;
                  const name = row.child || row.mother || 'Beneficiary';
                  const date = String(point.date || point.measurementDate || '').slice(0, 10);
                  const measurement = [point.weight && `${point.weight} kg`, point.height && `${point.height} cm`].filter(Boolean).join(' · ');
                  const zScore = point.weightForLengthZScore ?? point.weightForAgeZScore ?? point.lengthForAgeZScore;
                  const details = [date, measurement, zScore !== null && zScore !== undefined ? `Z-score ${Number(zScore).toFixed(2)}` : ''].filter(Boolean).join(' · ');
                  const openCheckup = () => {
                    if (beneficiaryType === 'mother') {
                      navigate('/monitoring', { state: { mother: { id: row.motherId, motherId: row.motherId, name }, checkupDate: date } });
                      return;
                    }
                    navigate('/monitoring', { state: { child: { id: row.childId, childId: row.childId, name }, week: point.ageWeeks, checkupDate: date } });
                  };
                  return (
                    <li key={`${row.childId || row.motherId}-${date}`}>
                      <button type="button" onClick={openCheckup} disabled={beneficiaryType === 'child' && (point.ageWeeks === null || point.ageWeeks === undefined)}>
                        <span>{name}</span>
                        <small>{details || 'Check-up details unavailable'}</small>
                      </button>
                    </li>
                  );
                })}
            </ul>
          ) : <p>No check-ups match this chart point.</p>}
        </section>
      )}
    </div>
  );
}
