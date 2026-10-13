import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  INTERPRETATION_METRICS,
  MOTHER_GROWTH_METRICS,
  PROGRAM_METRICS,
  WHO_NUMERIC_GROWTH_METRICS,
  chartDate,
  getInterpretationLevels,
  getPointInterpretation,
  mapInterpretationToBand,
} from '../progressReportConfig';
import { aggregateProgramGraphRows, PROGRAM_GRAPH_BREAKDOWNS } from '../../../../shared/ProgressReport/programReportGraphData';
import { LargeCohortSummaryChart } from '../../../../shared/ProgressReport/components/LargeCohortSummaryChart';

const downloadChartImage = (svgElement, metricLabel) => {
  if (!svgElement) return;
  const serializedSvg = new XMLSerializer().serializeToString(svgElement.cloneNode(true));
  const styledSvg = serializedSvg
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="440" ');
  const svgUrl = URL.createObjectURL(new Blob([styledSvg], { type: 'image/svg+xml' }));
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 440;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${metricLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-growth-chart.png`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      }, 0);
    }, 'image/png');
  };
  image.onerror = () => URL.revokeObjectURL(svgUrl);
  image.src = svgUrl;
};

function MonitoringProgressFallback({ rows = [] }) {
  const uniqueRows = [...new Map(rows.map((row, index) => [String(row.childId || row.motherId || row.child || row.mother || index), row])).values()];
  const progressRows = uniqueRows.filter((row) => Number(row.totalActivities) > 0);
  if (!progressRows.length) return <p className="growth-report-empty">No growth measurements are available.</p>;

  return null;
}

function LatestMeasurementChart({ rows, metric, beneficiaryType }) {
  const navigate = useNavigate();
  const aliases = { weightForAge: 'weight', heightForAge: 'height', bmiForAge: 'bmi' };
  const measurements = rows.flatMap((row, index) => {
    const rawValue = row[metric] ?? row[aliases[metric]];
    if (rawValue === null || rawValue === undefined || rawValue === '') return [];
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return [];
    return [{
      row,
      label: row.child || row.mother || row.group || `Record ${index + 1}`,
      value,
      date: String(row.measurementDate || '').slice(0, 10),
    }];
  });

  if (!measurements.length) {
    return <p className="growth-report-empty">No monitoring measurements are available for this report.</p>;
  }

  const width = Math.max(620, measurements.length * 90 + 110);
  const height = 240;
  const left = 66;
  const right = width - 20;
  const top = 18;
  const bottom = height - 54;
  const minimum = Math.min(...measurements.map(({ value }) => value));
  const maximum = Math.max(...measurements.map(({ value }) => value));
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.1, 1);
  const yMin = minimum - span * 0.1;
  const yMax = maximum + span * 0.1;
  const x = (index) => measurements.length === 1
    ? (left + right) / 2
    : left + (index / (measurements.length - 1)) * (right - left);
  const y = (value) => bottom - ((value - yMin) / (yMax - yMin)) * (bottom - top);
  const ticks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
  const subjectLabel = beneficiaryType === 'mother' ? 'Mother' : 'Child';
  const getMonitoringTarget = ({ row, date }) => {
    if (row.isGroupAggregate) return null;
    if (beneficiaryType === 'mother') {
      const motherId = row.motherId || row.mother_id || row.id;
      return motherId ? { mother: { id: motherId, motherId, name: row.mother || row.name }, checkupDate: date } : null;
    }
    const childId = row.childId || row.child_id || row.id;
    return childId && date
      ? { child: { id: childId, childId, name: row.child || row.name }, checkupDate: date }
      : null;
  };

  return (
    <div className="growth-report-line-chart latest-measurements-chart">
      <p className="growth-report-fallback-note">Showing latest available measurements because dated check-up history is unavailable.</p>
      <svg viewBox={`0 0 ${width} ${height}`}  role="img" aria-label={`Latest ${subjectLabel.toLowerCase()} measurements`}>
        <text className="growth-report-y-axis-label" x="18" y={height / 2} textAnchor="middle" transform={`rotate(-90 18 ${height / 2})`}>
          {metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'Weight (kg)' : metric === 'heightForAge' ? 'Length/Height (cm)' : metric}
        </text>
        {ticks.map((tick) => {
          const tickY = y(tick);
          return (
            <g key={tick}>
              <line className="growth-report-gridline" x1={left} x2={right} y1={tickY} y2={tickY} />
              <text className="growth-report-y-axis-tick" x={left - 8} y={tickY + 3} textAnchor="end">{tick.toFixed(1)}</text>
            </g>
          );
        })}
        {measurements.map((measurement, index) => {
          const monitoringTarget = getMonitoringTarget(measurement);
          const openMonitoringForm = () => {
            if (monitoringTarget) navigate('/monitoring', { state: monitoringTarget });
          };
          return (
          <g key={`${measurement.label}-${index}`}>
            <line className="growth-report-weekline" x1={x(index)} x2={x(index)} y1={top} y2={bottom} />
            <circle className={`growth-report-series-point is-latest${monitoringTarget ? ' growth-report-data-point' : ''}`} cx={x(index)} cy={y(measurement.value)} r={monitoringTarget ? '10' : '7'} role={monitoringTarget ? 'link' : undefined} tabIndex={monitoringTarget ? 0 : undefined} aria-label={monitoringTarget ? `Open ${measurement.label} check-up, ${measurement.value.toFixed(1)}, ${measurement.date}` : undefined} onClick={monitoringTarget ? openMonitoringForm : undefined} onKeyDown={monitoringTarget ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMonitoringForm(); } } : undefined}>
                <title>{`${measurement.label}: ${measurement.value.toFixed(1)}${measurement.date ? ` · ${measurement.date}` : ''}${monitoringTarget ? ' · Click to open this check-up' : ''}`}</title>
            </circle>
            <text className="growth-report-x-axis-tick" x={x(index)} y={height - 28} textAnchor="middle">
              {measurement.label.length > 16 ? `${measurement.label.slice(0, 14)}…` : measurement.label}
            </text>
          </g>
          );
        })}
      </svg>
    </div>
  );
}

function GrowthInterpretationChart({ rows, progressRows, metric, displayWeeks = 'all', beneficiaryType = 'child' }) {
  const navigate = useNavigate();
  const [hoveredSeries, setHoveredSeries] = useState('');
  const isMother = beneficiaryType === 'mother';
  const monthKey = (dateValue) => {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const childTimelineKey = (point) => {
    const dateKey = monthKey(point?.date || point?.measurementDate);
    if (dateKey) return dateKey;
    if (Number.isFinite(Number(point?.ageWeeks))) return monthKey(new Date(Date.now() - (Math.max(0, Number(point.ageWeeks)) * 7 * 24 * 60 * 60 * 1000)));
    return null;
  };
  const timelineKey = (point) => isMother ? monthKey(point.date) : childTimelineKey(point);
  const timelineLabel = (value) => {
    if (!value) return 'Unknown month';
    const [year, monthNumber] = String(value).split('-').map(Number);
    if (year && monthNumber) return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return 'Unknown month';
  };
  const entries = rows.flatMap((row) => (row.growthSeries || []).map((point) => ({ row, point, interpretation: getPointInterpretation(point, metric), timeline: timelineKey(point) })))
    .filter((entry) => entry.interpretation && entry.timeline !== null);
  const timelines = [...new Set(entries.map((entry) => entry.timeline))].sort((left, right) => left.localeCompare(right));
  const rangeSpec = String(displayWeeks || '').startsWith('range:') ? String(displayWeeks).slice(6).split(':') : null;
  const requestedWeeks = Number(displayWeeks);
  const visibleTimelines = (() => {
    if (rangeSpec && rangeSpec[0] && rangeSpec[1]) {
      const [startMonth, endMonth] = rangeSpec;
      return timelines.filter((timeline) => timeline >= startMonth && timeline <= endMonth);
    }
    return String(displayWeeks) === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0
      ? timelines
      : timelines.slice(-requestedWeeks);
  })();
  const fallbackTimelines = visibleTimelines.length ? visibleTimelines : ['1', '2', '3', '4', '5', '6'];
  const displayTimelines = visibleTimelines.length ? visibleTimelines : fallbackTimelines;
  const visibleSet = new Set(displayTimelines);
  const visibleEntries = entries.filter((entry) => visibleSet.has(entry.timeline));

  const categories = getInterpretationLevels(metric);
  const axisCategories = [...categories].reverse();
  const width = Math.max(620, displayTimelines.length * 74 + 120);
  const height = 260;
  const paddingX = 175;
  const yAxisLabelX = 12;
  const xForTimeline = (timeline) => displayTimelines.length <= 1 ? width / 2 : paddingX + (displayTimelines.indexOf(timeline) / (displayTimelines.length - 1)) * (width - paddingX * 2);
  const yForCategory = (category) => {
    const index = axisCategories.indexOf(category);
    if (index < 0) return height / 2;
    return 24 + (index / (axisCategories.length - 1)) * (height - 64);
  };
  const colors = ['#15803d', '#1d9f6f', '#6ea86d', '#b7791f', '#d97706'];
  const beneficiaryCount = new Set(visibleEntries.map(({ row }) => String(row.childId || row.motherId || row.child || row.mother || 'beneficiary'))).size;
  if (beneficiaryCount > 12) {
    return (
      <div className="growth-report-large-cohort">
        <div className="growth-report-cohort-controls">
          <div><strong>Population summary</strong><span>{beneficiaryCount.toLocaleString()} beneficiaries</span></div>
        </div>
        <LargeCohortSummaryChart
          entries={visibleEntries}
          categories={categories}
          colors={colors}
          displayTimelines={displayTimelines}
          timelineLabel={timelineLabel}
          width={Math.max(620, displayTimelines.length * 74 + 120)}
          metric={metric}
          mapInterpretationToBand={mapInterpretationToBand}
          beneficiaryType={beneficiaryType}
        />
      </div>
    );
  }
  const seriesColors = ['#15803d', '#2563eb', '#d97706', '#7c3aed', '#0f766e', '#be123c'];
  const beneficiaryKey = (row) => String(row.childId || row.motherId || row.child || row.mother || 'beneficiary');
  const entriesByRow = new Map();
  visibleEntries.forEach((entry) => {
    const key = beneficiaryKey(entry.row);
    const points = entriesByRow.get(key) || [];
    const band = mapInterpretationToBand(entry.interpretation, metric);
    points.push({ ...entry, interpretation: band });
    entriesByRow.set(key, points);
  });
  const latestPointByBeneficiary = new Map(
    [...entriesByRow.entries()].map(([key, points]) => [key, points.at(-1)?.point])
  );
  const interpretationLines = [...entriesByRow.entries()].map(([key, points], index) => {
    const sortedPoints = [...points].sort((left, right) => displayTimelines.indexOf(left.timeline) - displayTimelines.indexOf(right.timeline));
    const seriesState = hoveredSeries ? (hoveredSeries === key ? ' is-active' : ' is-muted') : '';
    return <polyline key={`interpretation-series-${key}`} className={`growth-report-series-line${seriesState}`} points={sortedPoints.map(({ interpretation, timeline }) => `${xForTimeline(timeline)},${yForCategory(interpretation)}`).join(' ')} fill="none" stroke={seriesColors[index % seriesColors.length]} strokeWidth={hoveredSeries === key ? '5' : '3'} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />;
  });
  return <div className="growth-report-line-chart interpretation-growth-chart" ><svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width}px`, height: `${height}px` }} role="img" aria-label="Growth interpretation over time"><text className="growth-report-y-axis-label" x={yAxisLabelX} y={height / 2} textAnchor="middle" transform={`rotate(-90 ${yAxisLabelX} ${height / 2})`}>Interpretation</text>{axisCategories.map((category) => <line key={`category-line-${category}`} className="growth-report-gridline" x1={paddingX} x2={width - 24} y1={yForCategory(category)} y2={yForCategory(category)} />)}{displayTimelines.map((timeline) => <line key={`interpretation-line-${timeline}`} className="growth-report-weekline" x1={xForTimeline(timeline)} x2={xForTimeline(timeline)} y1="24" y2={height - 64} />)}{axisCategories.map((category) => <text key={category} className="growth-report-y-axis-tick" x={paddingX - 18} y={yForCategory(category) + 4} textAnchor="end">{category}</text>)}{displayTimelines.map((timeline) => <text key={`interpretation-label-${timeline}`} className="growth-report-x-axis-tick" x={xForTimeline(timeline)} y={height - 20} textAnchor="middle">{timelineLabel(timeline)}</text>)}{interpretationLines}{visibleEntries.map(({ row, point, interpretation, timeline }, index) => {
    const band = mapInterpretationToBand(interpretation, metric);
    const beneficiaryName = row.child || row.mother || 'Beneficiary';
    const key = beneficiaryKey(row);
    const isLatestPoint = latestPointByBeneficiary.get(key) === point;
    const checkupDate = String(point.date || point.measurementDate || '').slice(0, 10);
    const monitoringTarget = row.isGroupAggregate ? null : isMother
      ? (row.motherId ? { mother: { id: row.motherId, motherId: row.motherId, name: beneficiaryName }, checkupDate } : null)
      : (row.childId && point.ageWeeks !== null && point.ageWeeks !== undefined ? { child: { id: row.childId, childId: row.childId, name: beneficiaryName }, week: point.ageWeeks, checkupDate } : null);
    const modeCount = Number(point?.[`${metric}ModeCount`]);
    const modeTotal = Number(point?.[`${metric}ModeTotal`]);
    const modeCountText = row.isGroupAggregate && modeTotal > 0
      ? ` · Mode count: ${modeCount}/${modeTotal} ${isMother ? 'mothers' : 'children'}`
      : '';
            const seriesState = hoveredSeries ? (hoveredSeries === key ? ' is-active' : ' is-muted') : '';
    const openMonitoringForm = () => { if (monitoringTarget) navigate('/monitoring', { state: monitoringTarget }); };
    const zScore = point.weightForLengthZScore ?? point.weightForAgeZScore ?? point.lengthForAgeZScore;
    const pointerDetails = [checkupDate, point.weight && `${point.weight} kg`, point.height && `${point.height} cm`, zScore !== null && zScore !== undefined ? `Z-score ${Number(zScore).toFixed(2)}` : ''].filter(Boolean).join(' · ');
    return <circle key={`${beneficiaryName}-${timeline}-${index}`} className={`${monitoringTarget ? 'growth-report-data-point ' : ''}growth-report-series-point${isLatestPoint ? ' is-latest' : ''}${seriesState}`} cx={xForTimeline(timeline)} cy={yForCategory(band)} r={isLatestPoint ? '9' : '6'} fill={colors[categories.indexOf(band) % colors.length]} stroke="#fff" strokeWidth={isLatestPoint ? '3' : '2'} role={monitoringTarget ? 'link' : undefined} aria-label={monitoringTarget ? `Open ${beneficiaryName} check-up, ${band}, ${pointerDetails}` : `${beneficiaryName}: ${band}, ${pointerDetails}`} tabIndex={monitoringTarget ? 0 : undefined} onClick={monitoringTarget ? openMonitoringForm : undefined} onKeyDown={monitoringTarget ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMonitoringForm(); } } : undefined}><title>{beneficiaryName}: {band}{modeCountText} · {pointerDetails}{isLatestPoint ? ' · Latest measurement' : ''}{monitoringTarget ? ' · Click to open this check-up' : ''}</title></circle>;
  })} </svg><div className="growth-report-legend growth-report-series-legend">{[...entriesByRow.entries()].map(([key, points], index) => {
    const name = points[0]?.row.child || points[0]?.row.mother || 'Beneficiary';
    return <span key={key} className={hoveredSeries ? (hoveredSeries === key ? 'is-active' : 'is-muted') : ''} tabIndex={0} onMouseEnter={() => setHoveredSeries(key)} onMouseLeave={() => setHoveredSeries('')} onFocus={() => setHoveredSeries(key)} onBlur={() => setHoveredSeries('')}><i  />{name}</span>;
  })}</div><div className="growth-report-legend">{categories.map((category, index) => <span key={category}><i  />{category}</span>)}</div></div>;
}

function ProgramBenefitsChart({ rows, metric, beneficiaryType }) {
  const [breakdown, setBreakdown] = useState('beneficiary');
  const metricLabel = PROGRAM_METRICS.find(([id]) => id === metric)?.[1] || 'Program Benefits';
  const points = aggregateProgramGraphRows(rows, metric, breakdown, beneficiaryType);

  if (!points.length) return <p className="growth-report-empty">No program receipt data available for the selected groups.</p>;

  const maximum = Math.max(...points.map(({ value }) => value), 1);
  const formatValue = (value) => metric === 'receivedBenefitAveragePerMonth' ? value.toFixed(1) : value.toLocaleString();
  const breakdownLabel = PROGRAM_GRAPH_BREAKDOWNS.find(([id]) => id === breakdown)?.[1] || 'Beneficiary';
  const pluralBreakdownLabels = {
    Beneficiary: 'beneficiaries',
    Batch: 'batches',
    Group: 'groups',
    School: 'schools',
  };
  const breakdownCountLabel = points.length === 1
    ? breakdownLabel.toLowerCase()
    : pluralBreakdownLabels[breakdownLabel] || `${breakdownLabel.toLowerCase()}s`;

  return (
    <section className="program-average-chart" aria-label={`${metricLabel} by ${breakdownLabel.toLowerCase()}`}>
      <div className="program-chart-controls">
        <label className="report-chart-select">
          Break down by
          <select value={breakdown} onChange={(event) => setBreakdown(event.target.value)}>
            {PROGRAM_GRAPH_BREAKDOWNS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <span>{points.length} {breakdownCountLabel}</span>
      </div>
      <div className="program-chart-axis" aria-hidden="true"><span>{formatValue(0)}</span><span>{formatValue(maximum / 2)}</span><span>{formatValue(maximum)}</span></div>
      <div className="program-chart-rows" role="list" aria-label={`${metricLabel} values`}>
        {points.map(({ key, label, value, count }) => (
          <div className="program-chart-row" key={key} role="listitem">
            <span className="program-chart-label" title={label}>{label}</span>
            <span className="program-chart-track">
              <span
                className="program-chart-bar"
                style={{ width: `${(value / maximum) * 100}%` }}
                title={`${label}: ${formatValue(value)} ${metricLabel}`}
              />
            </span>
            <strong>{formatValue(value)}</strong>
            {breakdown !== 'beneficiary' && <small>{count} {count === 1 ? 'record' : 'records'}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function GrowthChart({ rows, progressRows = [], metric, chartType, displayWeeks = 'all', beneficiaryType = 'child' }) {
  const chartRef = useRef(null);
  const navigate = useNavigate();
  const [hoveredSeries, setHoveredSeries] = useState('');
  if (INTERPRETATION_METRICS.has(metric)) return <GrowthInterpretationChart rows={rows} progressRows={progressRows} metric={metric} displayWeeks={displayWeeks} beneficiaryType={beneficiaryType} />;
  if (PROGRAM_METRICS.some(([id]) => id === metric)) return <ProgramBenefitsChart rows={rows} metric={metric} beneficiaryType={beneficiaryType} />;
  const values = rows
    .map((row) => ({ row, value: Number(row[metric]) }))
    .filter(({ value }) => Number.isFinite(value));
  const maxValue = Math.max(...values.map(({ value }) => value), 1);
  const points = values.slice(0, 20);

  if (!points.length) return null;

  if (chartType === 'pie') {
    const total = points.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
    let offset = 0;
    const segments = points.map(({ row, value }, index) => {
      const start = offset;
      offset += (Math.max(0, value) / total) * 100;
      return <span key={`${row.child || row.mother}-${index}`} className="growth-report-pie-segment"  title={`${row.child || row.mother}: ${value} (${chartDate(row.measurementDate)})`} />;
    });
    return <div className="growth-report-pie-wrap"><div className="growth-report-pie">{segments}</div><div className="growth-report-legend">{points.map(({ row, value }, index) => <span key={`${row.child || row.mother}-legend-${index}`}><i  />{row.child || row.mother}: {value} · {chartDate(row.measurementDate)}</span>)}</div></div>;
  }

  if (chartType === 'line') {
    const height = 180;
    const isZScoreMetric = metric.endsWith('ZScore');
    const rawMeasurementValue = (point) => {
      const directValue = point?.[metric];
      if (directValue !== null && directValue !== undefined && directValue !== '' && Number.isFinite(Number(directValue))) {
        return Number(directValue);
      }
      if (isZScoreMetric) return null;
      const aliases = { weightForAge: 'weight', heightForAge: 'height', bmiForAge: 'bmi' };
      const aliasValue = point?.[aliases[metric]];
      return aliasValue !== null && aliasValue !== undefined && aliasValue !== '' && Number.isFinite(Number(aliasValue))
        ? Number(aliasValue)
        : null;
    };
    const seriesRows = rows.filter((row) => row.growthSeries?.some((point) => rawMeasurementValue(point) !== null));
    if (!seriesRows.length) return <LatestMeasurementChart rows={progressRows} metric={metric} beneficiaryType={beneficiaryType} />;

    const isMother = beneficiaryType === 'mother';
    const monthKey = (dateValue) => {
      const date = new Date(dateValue);
      return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    const monthLabel = (month) => {
      if (!month) return 'Unknown month';
      const [year, monthNumber] = String(month).split('-').map(Number);
      if (!year || !monthNumber) return 'Unknown month';
      return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };
    const childTimelineKey = (point) => {
      const dateKey = monthKey(point?.date || point?.measurementDate);
      if (dateKey) return dateKey;
      if (Number.isFinite(Number(point?.ageWeeks))) return monthKey(new Date(Date.now() - (Math.max(0, Number(point.ageWeeks)) * 7 * 24 * 60 * 60 * 1000)));
      return null;
    };
    const timelineKey = (point) => isMother ? monthKey(point.date) : childTimelineKey(point);
    const timelineLabel = (value) => monthLabel(value);
    const accessibleTimelineLabel = (value) => `Month ${monthLabel(value)}`;
    const allTimelineDates = [...new Set(seriesRows.flatMap((row) => row.growthSeries
      .filter((point) => rawMeasurementValue(point) !== null && timelineKey(point) !== null)
      .map(timelineKey)))].sort((left, right) => left.localeCompare(right));

    const normalizedDisplayWeeks = String(displayWeeks ?? 'all').toLowerCase();
    const requestedWeeks = Number(normalizedDisplayWeeks);
    const rangeSpec = normalizedDisplayWeeks.startsWith('range:') ? normalizedDisplayWeeks.slice(6).split(':') : null;
    const visibleTimelineDates = (() => {
      if (rangeSpec && rangeSpec[0] && rangeSpec[1]) {
        const [startMonth, endMonth] = rangeSpec;
        return allTimelineDates.filter((timeline) => timeline >= startMonth && timeline <= endMonth);
      }
      return normalizedDisplayWeeks === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0 || requestedWeeks >= allTimelineDates.length
        ? allTimelineDates
        : allTimelineDates.slice(-requestedWeeks);
    })();
    const visibleTimelineSet = new Set(visibleTimelineDates);
    const visibleSeriesRows = seriesRows
      .map((row) => ({ ...row, visibleGrowthSeries: row.growthSeries.filter((point) => visibleTimelineSet.has(timelineKey(point)) && rawMeasurementValue(point) !== null) }))
      .filter((row) => row.visibleGrowthSeries.length);

    if (!visibleTimelineDates.length) {
      return <LatestMeasurementChart rows={progressRows} metric={metric} beneficiaryType={beneficiaryType} />;
    }

    const chartPaddingX = 64;
    const width = Math.max(620, visibleTimelineDates.length * 74 + chartPaddingX * 2);
    const xForTimeline = (timelineValue) => {
      if (visibleTimelineDates.length <= 1) return width / 2;
      const index = visibleTimelineDates.indexOf(timelineValue);
      const usableWidth = width - (chartPaddingX * 2);
      return chartPaddingX + (index / (visibleTimelineDates.length - 1)) * usableWidth;
    };
    if (!visibleSeriesRows.length) return <LatestMeasurementChart rows={progressRows} metric={metric} beneficiaryType={beneficiaryType} />;

    const subjectLabel = isMother ? 'Mother' : 'Child';
    const metricOptions = isMother ? MOTHER_GROWTH_METRICS : WHO_NUMERIC_GROWTH_METRICS;
    const metricLabel = metricOptions.find(([id]) => id === metric)?.[1] || metric;
    const valueUnit = isZScoreMetric ? 'Z-score' : metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'kg' : metric === 'heightForAge' ? 'cm' : 'units';
    const beneficiaryKey = (row, index) => String(row.childId || row.motherId || `${row.child || row.mother || 'beneficiary'}-${index}`);
    const timelineGridLines = visibleTimelineDates.map((timelineValue) => <line key={`timeline-line-${timelineValue}`} className="growth-report-weekline" x1={xForTimeline(timelineValue)} x2={xForTimeline(timelineValue)} y1="12" y2={height - 12} />);
    const monthLabels = visibleTimelineDates.map((timelineValue) => ({
      timelineValue,
      xPosition: xForTimeline(timelineValue),
      label: timelineLabel(timelineValue),
    }));
    const numericValues = visibleSeriesRows.flatMap((row) => row.visibleGrowthSeries.map(rawMeasurementValue).filter((value) => value !== null));
    if (!numericValues.length) return <p className="growth-report-empty">No WHO values available for the selected period.</p>;
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    const valueSpan = Math.max(maxValue - minValue, isZScoreMetric ? 1 : Math.max(Math.abs(maxValue) * 0.1, 1));
    const paddingValue = valueSpan * 0.1;
    const yMin = isZScoreMetric ? -6.5 : minValue - paddingValue;
    const yMax = isZScoreMetric ? 6.5 : maxValue + paddingValue;
    const plotTop = 12;
    const plotBottom = height - 18;
    const yForValue = (value) => plotBottom - ((value - yMin) / (yMax - yMin)) * (plotBottom - plotTop);
    const yAxisTicks = (isZScoreMetric ? [-6, -3, 0, 3, 6] : Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4)).map((value) => {
      return { value, y: yForValue(value) };
    });
    const seriesColors = ['#15803d', '#2563eb', '#d97706', '#7c3aed', '#0f766e', '#be123c'];
    const pointMarkerOffsets = new Map();
    const markersByTimeline = new Map();
    visibleSeriesRows.forEach((row, rowIndex) => {
      const seriesKey = beneficiaryKey(row, rowIndex);
      const sortedPoints = [...row.visibleGrowthSeries]
        .map((point) => ({ point, value: rawMeasurementValue(point), timeline: timelineKey(point) }))
        .filter((item) => item.value !== null && visibleTimelineDates.includes(item.timeline))
        .sort((left, right) => left.timeline.localeCompare(right.timeline));
      sortedPoints.forEach(({ value, timeline }, pointIndex) => {
        const displayValue = isZScoreMetric ? Math.max(-6, Math.min(6, value)) : value;
        const markers = markersByTimeline.get(timeline) || [];
        markers.push({ key: `${seriesKey}:${timeline}:${pointIndex}`, y: yForValue(displayValue) });
        markersByTimeline.set(timeline, markers);
      });
    });
    markersByTimeline.forEach((markers) => {
      markers.sort((left, right) => left.y - right.y);
      let cluster = [];
      const saveClusterOffsets = () => cluster.forEach(({ key }, index) => {
        pointMarkerOffsets.set(key, (index - (cluster.length - 1) / 2) * 18);
      });
      markers.forEach((marker) => {
        if (cluster.length && marker.y - cluster[0].y >= 16) {
          saveClusterOffsets();
          cluster = [];
        }
        cluster.push(marker);
      });
      saveClusterOffsets();
    });
    const chartSeries = visibleSeriesRows.map((row, rowIndex) => {
      const beneficiaryName = row.child || row.mother || 'Beneficiary';
      const seriesKey = beneficiaryKey(row, rowIndex);
      const color = seriesColors[rowIndex % seriesColors.length];
      const seriesState = hoveredSeries ? (hoveredSeries === seriesKey ? ' is-active' : ' is-muted') : '';
      const points = [...row.visibleGrowthSeries]
        .map((point) => ({ point, value: rawMeasurementValue(point), timeline: timelineKey(point) }))
        .filter((item) => item.value !== null && visibleTimelineDates.includes(item.timeline))
        .sort((left, right) => left.timeline.localeCompare(right.timeline));
      const latestTimeline = points.at(-1)?.timeline;
      const polyline = points.length > 1
        ? <polyline key={`${seriesKey}-numeric-line`} className={`growth-report-series-line${seriesState}`} points={points.map(({ timeline, value }) => `${xForTimeline(timeline)},${yForValue(isZScoreMetric ? Math.max(-6, Math.min(6, value)) : value)}`).join(' ')} fill="none" stroke={color} strokeWidth={hoveredSeries === seriesKey ? '5' : '3'} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        : null;
      const markers = points.map(({ point, value, timeline }, pointIndex) => {
        const checkupDate = String(point.date || point.measurementDate || '').slice(0, 10);
        const monitoringTarget = row.isGroupAggregate ? null : isMother
          ? row.motherId ? { mother: { id: row.motherId, motherId: row.motherId, name: beneficiaryName }, checkupDate } : null
          : row.childId && point.ageWeeks !== null && point.ageWeeks !== undefined ? { child: { id: row.childId, childId: row.childId, name: beneficiaryName }, week: point.ageWeeks, checkupDate } : null;
        const interpretationMetric = metric.startsWith('weightForAge') ? 'weightForAgeInterpretation'
          : metric.startsWith('lengthForAge') || metric.startsWith('heightForAge') ? 'lengthForAgeInterpretation'
            : metric.startsWith('weightForLength') ? 'weightForLengthInterpretation' : '';
        const interpretation = interpretationMetric ? getPointInterpretation(point, interpretationMetric) : '';
        const isLatestPoint = timeline === latestTimeline;
        const isOutsideWhoRange = isZScoreMetric && (value < -6 || value > 6);
        const displayedValue = isZScoreMetric ? Math.max(-6, Math.min(6, value)) : value;
        const navigateToMonitor = () => { if (monitoringTarget) navigate('/monitoring', { state: monitoringTarget }); };
        const rangeNote = isOutsideWhoRange ? ` · Beyond WHO display range (${value > 6 ? 'above +6' : 'below -6'})` : '';
        return <circle key={`${seriesKey}-${timeline}-${pointIndex}`} className={`${monitoringTarget ? 'growth-report-data-point ' : ''}growth-report-series-point${seriesState}`} cx={xForTimeline(timeline) + (pointMarkerOffsets.get(`${seriesKey}:${timeline}:${pointIndex}`) || 0)} cy={yForValue(displayedValue)} r={isLatestPoint ? '8' : '5'} fill={isOutsideWhoRange ? '#fff7ed' : '#fff'} stroke={isOutsideWhoRange ? '#c2410c' : color} strokeWidth={isLatestPoint || isOutsideWhoRange ? '4' : '3'} role={monitoringTarget ? 'link' : undefined} tabIndex={monitoringTarget ? 0 : undefined} aria-label={monitoringTarget ? `Open ${beneficiaryName} check-up, ${value.toFixed(2)} ${valueUnit}, ${checkupDate}${interpretation ? `, ${interpretation}` : ''}${isLatestPoint ? ', latest measurement' : ''}${isOutsideWhoRange ? ', outside WHO display range' : ''}` : undefined} onClick={monitoringTarget ? navigateToMonitor : undefined} onKeyDown={monitoringTarget ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigateToMonitor(); } } : undefined}><title>{beneficiaryName}: {value.toFixed(2)} {valueUnit}{interpretation ? ` · ${interpretation}` : ''}{rangeNote} · {checkupDate || timelineLabel(timeline)}{isLatestPoint ? ' · Latest measurement' : ''}{monitoringTarget ? ' · Click to open this check-up' : ''}</title></circle>;
      });
      return <g key={`${seriesKey}-numeric-series`}>{polyline}{markers}</g>;
    });
    const yAxisLabel = isZScoreMetric ? metricLabel.replace(/\s+Z-Score$/i, '') : metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'Weight (kg)' : metric === 'heightForAge' ? 'Length/Height (cm)' : metricLabel;
    return <div className="growth-report-line-chart"><svg ref={chartRef} viewBox={`0 0 ${width} ${height}`} style={{ width: `${width}px`, height: `${height}px` }} role="img" aria-label={`${subjectLabel} ${metricLabel} over time`} preserveAspectRatio="none"><text className="growth-report-y-axis-label" x="18" y={height / 2} textAnchor="middle" transform={`rotate(-90 18 ${height / 2})`}>{yAxisLabel}</text>{timelineGridLines}{yAxisTicks.map(({ value, y }) => <g key={value}><line className={`growth-report-gridline${Math.abs(value) < 1e-9 ? ' zero-line' : ''}`} x1={chartPaddingX} x2={width} y1={y} y2={y} /><text className="growth-report-y-axis-tick" x={chartPaddingX - 8} y={y + 3} textAnchor="end" >{value.toFixed(1)}</text></g>)}{chartSeries}</svg><div className="growth-report-line-labels" >{monthLabels.map(({ timelineValue, xPosition, label }) => <span key={`label-${timelineValue}`} >{label}</span>)}</div><div className="growth-report-legend growth-report-series-legend">{visibleSeriesRows.map((row, index) => {
      const seriesKey = beneficiaryKey(row, index);
      const name = row.child || row.mother || 'Beneficiary';
      return <span key={`${seriesKey}-line-legend`} className={hoveredSeries ? (hoveredSeries === seriesKey ? 'is-active' : 'is-muted') : ''} tabIndex={0} onMouseEnter={() => setHoveredSeries(seriesKey)} onMouseLeave={() => setHoveredSeries('')} onFocus={() => setHoveredSeries(seriesKey)} onBlur={() => setHoveredSeries('')}><i  />{name}</span>;
    })}</div></div>;
  }

  return <div className="growth-report-bars growth-report-bars-chart">{points.map(({ row, value }, index) => { const label = row.child || row.mother || row.batch || row.group || 'Report total'; return <div className="growth-report-bar-item" key={`${label}-${index}`}><strong>{value}</strong><span  title={`${label}: ${value} · ${chartDate(row.measurementDate)}`} /><small>{label}</small><small>{chartDate(row.measurementDate)}</small></div>; })}</div>;
}
