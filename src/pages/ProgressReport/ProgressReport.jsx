import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import { apiGetPrograms } from '../../api/programs';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/AuthProvider';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../utils/permissions';
import { ReportTabBar } from './components/ReportTabBar';
import { CommunitySelectionStep } from './components/CommunitySelectionStep';
import { ReportFocusStep } from './components/ReportFocusStep';
import { GrowthMetricsStep } from './components/GrowthMetricsStep';
import { ResultsPanel } from './components/ResultsPanel';
import {
  EMPTY_SELECTIONS,
  REPORT_FIELDS,
  DEFAULT_VISIBLE_FIELDS,
  addGrowthScoresBeforeInterpretations,
  GROWTH_METRICS,
  WHO_NUMERIC_GROWTH_METRICS,
  INTERPRETATION_METRICS,
  MOTHER_GROWTH_METRICS,
  NUMERIC_GROWTH_METRICS,
  PROFILE_METRICS,
  CHILD_PROFILE_METRICS,
  MOTHER_PROFILE_METRICS,
  PROFILE_GRAPH_FIELDS,
  PROFILE_GRAPH_FIELD_MAP,
  PRESENCE_PROFILE_FIELDS,
  PROGRAM_METRICS,
  REPORT_TABS,
  REPORT_FOCUS_OPTIONS,
  csvValue,
  getInterpretationLevels,
  normalizeNutritionLabel,
  mapInterpretationToBand,
  getBmiInterpretation,
  formatCellValue,
  chartDate,
  getPointValue,
  getPointInterpretation,
  averageNumeric,
  getMode,
  getProfileGraphValue,
} from './progressReportConfig';

const GROWTH_TABLE_FIELDS = new Set([
  'weightForAge',
  'heightForAge',
  'weightForLengthZScore',
  'weightForLengthInterpretation',
  'weightForAgeZScore',
  'weightForAgeInterpretation',
  'bmiForAge',
  'bmiInterpretation',
  'lengthForAgeZScore',
  'lengthForAgeInterpretation',
]);

const MONITORING_HISTORY_EXCLUDED_FIELDS = new Set([
  'progress',
  'totalActivities',
  'activitiesCompleted',
  'weightForAgeInterpretation',
  'pediatricAgeWeeks',
]);

const growthTableFieldsForMetric = (metric) => {
  if (metric?.startsWith('weightForLength')) return ['weightForLengthZScore', 'weightForLengthInterpretation'];
  if (metric?.startsWith('weightForAge')) return ['weightForAge', 'weightForAgeZScore', 'weightForAgeInterpretation'];
  if (metric?.startsWith('lengthForAge') || metric?.startsWith('heightForAge')) return ['heightForAge', 'lengthForAgeZScore', 'lengthForAgeInterpretation'];
  if (metric === 'bmiForAge') return ['bmiForAge', 'bmiInterpretation'];
  if (metric) return [metric];
  return [];
};

const pointValueForTableField = (point, field) => {
  if (field.endsWith('Interpretation')) return getPointInterpretation(point, field);
  if (field.endsWith('ZScore')) return getPointValue(point, field);
  if (field === 'heightForAge') return getPointValue(point, 'heightForAge');
  if (field === 'weightForAge') return getPointValue(point, 'weightForAge');
  if (field === 'bmiForAge') return getPointValue(point, 'bmiForAge');
  return getPointValue(point, field);
};

function ProfileGraph({ rows, field }) {
  const metadata = PROFILE_GRAPH_FIELD_MAP.get(field) || PROFILE_GRAPH_FIELD_MAP.get('gender');
  const values = rows.map((row) => row[field]).filter((value) => value !== undefined && value !== null && value !== '');

  if (metadata.type === 'categorical') {
    const counts = new Map();
    rows.forEach((row) => {
      const value = getProfileGraphValue(row, field);
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    const entries = [...counts.entries()].sort((left, right) => right[1] - left[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    let offset = 0;
    return <div className="profile-distribution-chart"><div className="growth-report-pie-wrap"><div className="growth-report-pie">{entries.map(([label, count], index) => { const start = offset; offset += (count / total) * 100; return <span key={label} className="growth-report-pie-segment" style={{ '--start': `${start}%`, '--end': `${offset}%`, '--segment-color': `hsl(${index * 67 % 360} 62% 42%)` }} title={`${label}: ${count}`} />; })}</div><div className="growth-report-legend">{entries.map(([label, count], index) => <span key={label}><i style={{ background: `hsl(${index * 67 % 360} 62% 42%)` }} />{label}: {count}</span>)}</div></div></div>;
  }

  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numbers.length) return <p className="growth-report-empty">No measurement data available.</p>;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const binCount = max === min ? 1 : Math.min(6, Math.max(3, numbers.length));
  const step = max === min ? 1 : (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + index * step,
    end: index === binCount - 1 ? max : min + (index + 1) * step,
    count: 0,
  }));
  numbers.forEach((value) => { const index = max === min ? 0 : Math.min(binCount - 1, Math.floor((value - min) / step)); bins[index].count += 1; });
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  return <div className="profile-histogram-shell"><span className="profile-histogram-axis-label profile-histogram-y-label">Records</span><div className={`growth-report-bars growth-report-bars-chart profile-histogram-chart${max === min ? ' single-bin' : ''}`}>{bins.map((bin) => <div className="growth-report-bar-item" key={`${bin.start}-${bin.end}`}><strong>{bin.count}</strong><span style={{ '--bar-height': `${Math.max(6, (bin.count / maxCount) * 100)}%` }} title={`${bin.count} records`} /><small>{bin.start.toFixed(1)}{max === min ? '' : `–${bin.end.toFixed(1)}`}</small></div>)}</div><span className="profile-histogram-axis-label profile-histogram-x-label">{metadata.label}</span></div>;
}

const getGrowthMonthKey = (point, isMother = false) => {
  const dateValue = point?.date || point?.measurementDate;
  const date = dateValue ? new Date(dateValue) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const ageWeeks = Number(point?.ageWeeks);
  if (!isMother && point?.ageWeeks !== null && point?.ageWeeks !== undefined && point?.ageWeeks !== '' && Number.isFinite(ageWeeks)) {
    const estimatedDate = new Date(Date.now() - (Math.max(0, ageWeeks) * 7 * 24 * 60 * 60 * 1000));
    return `${estimatedDate.getFullYear()}-${String(estimatedDate.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
};

const getModeSummary = (values) => {
  const normalizedValues = values.map(normalizeNutritionLabel).filter(Boolean);
  const mode = getMode(normalizedValues);
  return {
    mode,
    count: normalizedValues.filter((value) => value === mode).length,
    total: normalizedValues.length,
  };
};

const aggregateGrowthRows = (rows, focus, beneficiaryType = 'child') => {
  const groupField = focus === 'batch-group' || focus === 'batch-school'
    ? 'batch'
    : focus === 'group-school' ? 'group' : null;
  if (!groupField) return rows;

  const groupedRows = new Map();
  rows.forEach((row) => {
    const groupName = row[groupField] || `Unassigned ${groupField}`;
    const groupRows = groupedRows.get(groupName) || [];
    groupRows.push(row);
    groupedRows.set(groupName, groupRows);
  });

  return [...groupedRows.entries()].map(([groupName, groupRows]) => {
    const pointsByMonth = new Map();
    groupRows.forEach((row) => {
      const beneficiaryId = String(row.childId || row.motherId || row.child || row.mother || row.id || 'beneficiary');
      (row.growthSeries || []).forEach((point) => {
        const monthKey = getGrowthMonthKey(point, beneficiaryType === 'mother');
        if (!monthKey) return;
        const monthPoints = pointsByMonth.get(monthKey) || [];
        const currentPoint = monthPoints.find((item) => item.beneficiaryId === beneficiaryId);
        const currentDate = String(currentPoint?.point.date || currentPoint?.point.measurementDate || '');
        const nextDate = String(point.date || point.measurementDate || '');
        if (!currentPoint) monthPoints.push({ beneficiaryId, point });
        else if (nextDate.localeCompare(currentDate) > 0) currentPoint.point = point;
        pointsByMonth.set(monthKey, monthPoints);
      });
    });
    const growthSeries = [...pointsByMonth.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([monthKey, monthRecords]) => {
      const points = monthRecords.map(({ point }) => point);
      const weightForLengthMode = getModeSummary(points.map((point) => point.weightForLengthInterpretation));
      const weightForAgeMode = getModeSummary(points.map((point) => point.weightForAgeInterpretation));
      const lengthForAgeMode = getModeSummary(points.map((point) => point.lengthForAgeInterpretation));
      return {
      ageWeeks: averageNumeric(points.map((point) => point.ageWeeks)),
      date: points.map((point) => point.date || point.measurementDate).filter(Boolean).sort().at(-1) || '',
      weight: averageNumeric(points.map((point) => point.weight)),
      height: averageNumeric(points.map((point) => point.height)),
      bmi: averageNumeric(points.map((point) => point.bmi)),
      weightForLengthZScore: averageNumeric(points.map((point) => point.weightForLengthZScore)),
      weightForAgeZScore: averageNumeric(points.map((point) => point.weightForAgeZScore)),
      lengthForAgeZScore: averageNumeric(points.map((point) => point.lengthForAgeZScore)),
      weightForLengthInterpretation: weightForLengthMode.mode,
      weightForLengthInterpretationModeCount: weightForLengthMode.count,
      weightForLengthInterpretationModeTotal: weightForLengthMode.total,
      weightForAgeInterpretation: weightForAgeMode.mode,
      weightForAgeInterpretationModeCount: weightForAgeMode.count,
      weightForAgeInterpretationModeTotal: weightForAgeMode.total,
      lengthForAgeInterpretation: lengthForAgeMode.mode,
      lengthForAgeInterpretationModeCount: lengthForAgeMode.count,
      lengthForAgeInterpretationModeTotal: lengthForAgeMode.total,
    };
    });
    return {
      ...groupRows[0],
      child: groupName,
      mother: groupName,
      weightForAge: averageNumeric(groupRows.map((row) => row.weightForAge)),
      heightForAge: averageNumeric(groupRows.map((row) => row.heightForAge)),
      bmiForAge: averageNumeric(groupRows.map((row) => row.bmiForAge)),
      bmiInterpretation: getBmiInterpretation(averageNumeric(groupRows.map((row) => row.bmiForAge))),
      weightForLengthInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.weightForLengthInterpretation))),
      weightForAgeInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.weightForAgeInterpretation))),
      lengthForAgeInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.lengthForAgeInterpretation))),
      growthSeries,
      isGroupAggregate: true,
    };
  });
};

const aggregateReportRows = (rows, focus) => {
  const groupField = focus === 'batch-group' || focus === 'batch-school'
    ? 'batch'
    : focus === 'group-school' ? 'group' : null;
  if (!groupField) return rows;

  const groupedRows = new Map();
  rows.forEach((row) => {
    const key = row[groupField] || `Unassigned ${groupField}`;
    const groupRows = groupedRows.get(key) || [];
    groupRows.push(row);
    groupedRows.set(key, groupRows);
  });

  return [...groupedRows.entries()].map(([groupName, groupRows]) => {
    const firstRow = groupRows[0] || {};
    const totalActivities = groupRows.reduce((sum, row) => sum + Number(row.totalActivities || 0), 0);
    const progress = totalActivities
      ? Math.round(groupRows.reduce((sum, row) => sum + Number(row.progress || 0) * Number(row.totalActivities || 0), 0) / totalActivities)
      : Math.round(groupRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / Math.max(groupRows.length, 1));

    return {
      ...firstRow,
      mother: groupField === 'group' ? groupName : '',
      child: groupField === 'group' ? groupName : '',
      group: groupField === 'group' ? groupName : firstRow.group,
      batch: groupField === 'batch' ? groupName : firstRow.batch,
      activitiesCompleted: groupRows.reduce((sum, row) => sum + Number(row.activitiesCompleted || 0), 0),
      totalActivities,
      progress,
      receivedBenefitTotal: groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitTotal || 0), 0),
      receivedBenefitFrequency: groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitFrequency || 0), 0),
      receivedBenefitAveragePerMonth: Number(groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitAveragePerMonth || 0), 0).toFixed(1)),
    };
  });
};

const downloadChartImage = (svgElement, metricLabel) => {
  if (!svgElement) return;
  const serializedSvg = new XMLSerializer().serializeToString(svgElement.cloneNode(true));
  const styledSvg = serializedSvg
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="440" ')
    .replace('</svg>', '<style>text{font-family:Inter,system-ui,sans-serif}.growth-report-y-axis-label{fill:#64748b;font-size:12px;font-weight:700}.growth-report-y-axis-tick{fill:#64748b;font-size:10px;font-weight:600}.growth-report-gridline{stroke:#e8eef5;stroke-width:1.5}polyline{fill:none}circle{fill:#fff}</style></svg>');
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

function GrowthInterpretationChart({ rows, metric, displayWeeks = 'all', beneficiaryType = 'child' }) {
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
    if (year && monthNumber) return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    return 'Unknown month';
  };
  const entries = rows.flatMap((row) => (row.growthSeries || []).map((point) => ({ row, point, interpretation: getPointInterpretation(point, metric), timeline: timelineKey(point) })))
    .filter((entry) => entry.interpretation && entry.timeline !== null);
  const timelines = [...new Set(entries.map((entry) => entry.timeline))].sort((left, right) => left.localeCompare(right));
  const requestedWeeks = Number(displayWeeks);
  const visibleTimelines = String(displayWeeks) === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0
    ? timelines
    : timelines.slice(-requestedWeeks);
  const visibleSet = new Set(visibleTimelines);
  const visibleEntries = entries.filter((entry) => visibleSet.has(entry.timeline));
  if (!visibleEntries.length) return <p className="growth-report-empty">No interpretation data available.</p>;

  const categories = getInterpretationLevels(metric);
  const axisCategories = [...categories].reverse();
  const width = Math.max(520, visibleTimelines.length * 150 + 120);
  const height = 220;
  const paddingX = 175;
  const yAxisLabelX = 12;
  const xForTimeline = (timeline) => visibleTimelines.length <= 1 ? width / 2 : paddingX + (visibleTimelines.indexOf(timeline) / (visibleTimelines.length - 1)) * (width - paddingX * 2);
  const yForCategory = (category) => {
    const index = axisCategories.indexOf(category);
    if (index < 0) return height / 2;
    return 24 + (index / (axisCategories.length - 1)) * (height - 48);
  };
  const colors = ['#15803d', '#1d9f6f', '#6ea86d', '#b7791f', '#d97706'];
  const seriesColors = ['#15803d', '#2563eb', '#d97706', '#7c3aed', '#0f766e', '#be123c'];
  const entriesByRow = new Map();
  visibleEntries.forEach((entry) => {
    const key = entry.row.child || entry.row.mother || 'Beneficiary';
    const points = entriesByRow.get(key) || [];
    const band = mapInterpretationToBand(entry.interpretation, metric);
    points.push({ ...entry, interpretation: band });
    entriesByRow.set(key, points);
  });
  const latestPointByBeneficiary = new Map(
    [...entriesByRow.entries()].map(([name, points]) => [name, points.at(-1)?.point])
  );
  const interpretationLines = [...entriesByRow.entries()].map(([key, points], index) => {
    const sortedPoints = [...points].sort((left, right) => visibleTimelines.indexOf(left.timeline) - visibleTimelines.indexOf(right.timeline));
    const seriesState = hoveredSeries ? (hoveredSeries === key ? ' is-active' : ' is-muted') : '';
    return <polyline key={`interpretation-series-${key}`} className={`growth-report-series-line${seriesState}`} points={sortedPoints.map(({ interpretation, timeline }) => `${xForTimeline(timeline)},${yForCategory(interpretation)}`).join(' ')} fill="none" stroke={seriesColors[index % seriesColors.length]} strokeWidth={hoveredSeries === key ? '5' : '3'} strokeLinecap="round" strokeLinejoin="round" />;
  });
  return <div className="growth-report-line-chart interpretation-growth-chart" style={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${Math.max(width, 720)}px` }} role="img" aria-label="Growth interpretation over time"><text className="growth-report-y-axis-label" x={yAxisLabelX} y={height / 2} textAnchor="middle" transform={`rotate(-90 ${yAxisLabelX} ${height / 2})`}>Interpretation</text>{axisCategories.map((category) => <line key={`category-line-${category}`} className="growth-report-gridline" x1={paddingX} x2={width - 24} y1={yForCategory(category)} y2={yForCategory(category)} />)}{visibleTimelines.map((timeline) => <line key={`interpretation-line-${timeline}`} className="growth-report-weekline" x1={xForTimeline(timeline)} x2={xForTimeline(timeline)} y1="24" y2={height - 24} />)}{axisCategories.map((category) => <text key={category} className="growth-report-y-axis-tick" x={paddingX - 18} y={yForCategory(category) + 4} textAnchor="end">{category}</text>)}{interpretationLines}{visibleEntries.map(({ row, point, interpretation, timeline }, index) => {
    const band = mapInterpretationToBand(interpretation, metric);
    const beneficiaryName = row.child || row.mother || 'Beneficiary';
    const isLatestPoint = latestPointByBeneficiary.get(beneficiaryName) === point;
    const monitoringTarget = row.isGroupAggregate ? null : isMother
      ? (row.motherId ? { mother: { id: row.motherId, motherId: row.motherId, name: beneficiaryName } } : null)
      : (row.childId ? { child: { id: row.childId, childId: row.childId, name: beneficiaryName }, week: point.ageWeeks } : null);
    const modeCount = Number(point?.[`${metric}ModeCount`]);
    const modeTotal = Number(point?.[`${metric}ModeTotal`]);
    const modeCountText = row.isGroupAggregate && modeTotal > 0
      ? ` · Mode count: ${modeCount}/${modeTotal} ${isMother ? 'mothers' : 'children'}`
      : '';
            const seriesState = hoveredSeries ? (hoveredSeries === beneficiaryName ? ' is-active' : ' is-muted') : '';
    const openMonitoringForm = () => { if (monitoringTarget) navigate('/monitoring', { state: monitoringTarget }); };
    return <circle key={`${beneficiaryName}-${timeline}-${index}`} className={`${monitoringTarget ? 'growth-report-data-point ' : ''}growth-report-series-point${isLatestPoint ? ' is-latest' : ''}${seriesState}`} cx={xForTimeline(timeline)} cy={yForCategory(band)} r={isLatestPoint ? '9' : '6'} fill={colors[categories.indexOf(band) % colors.length]} stroke="#fff" strokeWidth={isLatestPoint ? '3' : '2'} role={monitoringTarget ? 'link' : undefined} aria-label={monitoringTarget ? `Open ${beneficiaryName} monitoring form, ${band}, ${timelineLabel(timeline)}${isLatestPoint ? ', latest measurement' : ''}` : undefined} tabIndex={monitoringTarget ? 0 : undefined} onClick={monitoringTarget ? openMonitoringForm : undefined} onKeyDown={monitoringTarget ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMonitoringForm(); } } : undefined}><title>{beneficiaryName}: {band}{modeCountText} · {timelineLabel(timeline)}{isLatestPoint ? ' · Latest measurement' : ''}{monitoringTarget ? ' · Click to open monitoring form' : ''}</title></circle>;
  })} </svg><div className="growth-report-line-labels" style={{ position: 'relative', minHeight: '1.4rem', paddingLeft: '3.2rem', paddingRight: '1.1rem', width: `${Math.max(width, 720)}px`, minWidth: `${Math.max(width, 720)}px` }}>{visibleTimelines.map((timeline) => <span key={timeline} style={{ position: 'absolute', left: `${xForTimeline(timeline)}px`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{timelineLabel(timeline)}</span>)}</div><div className="growth-report-legend growth-report-series-legend">{[...entriesByRow.keys()].map((name, index) => <span key={name} className={hoveredSeries ? (hoveredSeries === name ? 'is-active' : 'is-muted') : ''} tabIndex={0} onMouseEnter={() => setHoveredSeries(name)} onMouseLeave={() => setHoveredSeries('')} onFocus={() => setHoveredSeries(name)} onBlur={() => setHoveredSeries('')}><i style={{ '--series-color': seriesColors[index % seriesColors.length] }} />{name}</span>)}</div><div className="growth-report-legend">{categories.map((category, index) => <span key={category}><i style={{ background: colors[index % colors.length] }} />{category}</span>)}</div></div>;
}

function ProgramAverageChart({ rows, metric = 'receivedBenefitAveragePerMonth' }) {
  const metricLabel = PROGRAM_METRICS.find(([id]) => id === metric)?.[1] || 'Program Benefits';
  const points = rows
    .map((row) => ({ label: row.group || row.child || row.mother || 'Unassigned group', value: Number(row[metric]) }))
    .filter(({ value }) => Number.isFinite(value));

  if (!points.length) return <p className="growth-report-empty">No program receipt data available for the selected groups.</p>;

  const maximum = Math.max(...points.map(({ value }) => value), 1);
  const downloadChart = (format) => {
    const width = Math.max(720, points.length * 150);
    const height = 420;
    const chartHeight = 280;
    const barWidth = 72;
    const gap = (width - points.length * barWidth) / (points.length + 1);
    const bars = points.map(({ label, value }, index) => {
      const x = gap + index * (barWidth + gap);
      const barHeight = Math.max(value > 0 ? 8 : 2, (value / maximum) * chartHeight);
      const y = 330 - barHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="#15803d"/><text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" fill="#166534" font-size="16" font-weight="700">${value.toFixed(1)}</text><text x="${x + barWidth / 2}" y="360" text-anchor="middle" fill="#475569" font-size="14">${String(label).slice(0, 20)}</text>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="24" y="32" fill="#173b2a" font-size="20" font-weight="700">${metricLabel} by Group</text><line x1="24" y1="330" x2="${width - 24}" y2="330" stroke="#cbd5e1"/>${bars}</svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    if (format === 'svg') {
      const link = document.createElement('a');
      link.href = svgUrl;
      link.download = `program-${metric}.svg`;
      link.click();
      URL.revokeObjectURL(svgUrl);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `program-${metric}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        URL.revokeObjectURL(svgUrl);
      }, 'image/png');
    };
    image.src = svgUrl;
  };
  return <div className="program-average-chart" role="img" aria-label={`${metricLabel} by group`}>
    <div className="program-average-chart-y-axis"><span>{maximum.toFixed(1)}</span><span>{(maximum / 2).toFixed(1)}</span><span>0</span></div>
    <div className="program-average-chart-plot">
      <div className="program-average-chart-grid"><span /><span /><span /></div>
      <div className="program-average-chart-bars">
        {points.map(({ label, value }) => <div className="program-average-chart-bar" key={label}>
          <strong>{value.toFixed(1)}</strong>
          <span style={{ '--bar-height': `${Math.max(value > 0 ? 8 : 2, (value / maximum) * 100)}%` }} title={`${label}: ${value.toFixed(1)} ${metricLabel}`} />
          <small title={label}>{label}</small>
        </div>)}
      </div>
      <p className="program-average-chart-axis-label">Group</p>
    </div>
  </div>;
}

function GrowthChart({ rows, metric, chartType, displayWeeks = 'all', beneficiaryType = 'child' }) {
  const chartRef = useRef(null);
  const navigate = useNavigate();
  if (INTERPRETATION_METRICS.has(metric)) return <GrowthInterpretationChart rows={rows} metric={metric} displayWeeks={displayWeeks} beneficiaryType={beneficiaryType} />;
  if (PROGRAM_METRICS.some(([id]) => id === metric)) return <ProgramAverageChart rows={rows} />;
  const values = rows
    .map((row) => ({ row, value: Number(row[metric]) }))
    .filter(({ value }) => Number.isFinite(value));
  const maxValue = Math.max(...values.map(({ value }) => value), 1);
  const points = values.slice(0, 20);

  if (!points.length) return <p className="growth-report-empty">No monitored measurements available.</p>;

  if (chartType === 'pie') {
    const total = points.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
    let offset = 0;
    const segments = points.map(({ row, value }, index) => {
      const start = offset;
      offset += (Math.max(0, value) / total) * 100;
      return <span key={`${row.child || row.mother}-${index}`} className="growth-report-pie-segment" style={{ '--start': `${start}%`, '--end': `${offset}%`, '--segment-color': `hsl(${index * 47 % 360} 62% 42%)` }} title={`${row.child || row.mother}: ${value} (${chartDate(row.measurementDate)})`} />;
    });
    return <div className="growth-report-pie-wrap"><div className="growth-report-pie">{segments}</div><div className="growth-report-legend">{points.map(({ row, value }, index) => <span key={`${row.child || row.mother}-legend-${index}`}><i style={{ background: `hsl(${index * 47 % 360} 62% 42%)` }} />{row.child || row.mother}: {value} · {chartDate(row.measurementDate)}</span>)}</div></div>;
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
    if (!seriesRows.length) return <p className="growth-report-empty">No monitored measurements available.</p>;

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
    const visibleTimelineDates = normalizedDisplayWeeks === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0 || requestedWeeks >= allTimelineDates.length
      ? allTimelineDates
      : allTimelineDates.slice(-requestedWeeks);
    const visibleTimelineSet = new Set(visibleTimelineDates);
    const visibleSeriesRows = seriesRows
      .map((row) => ({ ...row, visibleGrowthSeries: row.growthSeries.filter((point) => visibleTimelineSet.has(timelineKey(point)) && rawMeasurementValue(point) !== null) }))
      .filter((row) => row.visibleGrowthSeries.length);

    if (!visibleTimelineDates.length) {
      return <p className="growth-report-empty">No monitored measurements with timeline data available.</p>;
    };

    const chartPaddingX = 64;
    const width = Math.max(620, visibleTimelineDates.length * 74 + chartPaddingX * 2);
    const xForTimeline = (timelineValue) => {
      if (visibleTimelineDates.length <= 1) return width / 2;
      const index = visibleTimelineDates.indexOf(timelineValue);
      const usableWidth = width - (chartPaddingX * 2);
      return chartPaddingX + (index / (visibleTimelineDates.length - 1)) * usableWidth;
    };
    if (!visibleSeriesRows.length) return <p className="growth-report-empty">No monitored measurements available for the selected period.</p>;

    const subjectLabel = isMother ? 'Mother' : 'Child';
    const metricOptions = isMother ? MOTHER_GROWTH_METRICS : WHO_NUMERIC_GROWTH_METRICS;
    const metricLabel = metricOptions.find(([id]) => id === metric)?.[1] || metric;
    const valueUnit = isZScoreMetric ? 'Z-score' : metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'kg' : metric === 'heightForAge' ? 'cm' : 'units';
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
    const chartSeries = visibleSeriesRows.map((row, rowIndex) => {
      const beneficiaryName = row.child || row.mother || 'Beneficiary';
      const color = seriesColors[rowIndex % seriesColors.length];
      const points = [...row.visibleGrowthSeries]
        .map((point) => ({ point, value: rawMeasurementValue(point), timeline: timelineKey(point) }))
        .filter((item) => item.value !== null && visibleTimelineDates.includes(item.timeline))
        .sort((left, right) => left.timeline.localeCompare(right.timeline));
      const latestTimeline = points.at(-1)?.timeline;
      const polyline = points.length > 1
        ? <polyline key={`${beneficiaryName}-numeric-line`} points={points.map(({ timeline, value }) => `${xForTimeline(timeline)},${yForValue(isZScoreMetric ? Math.max(-6, Math.min(6, value)) : value)}`).join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        : null;
      const markers = points.map(({ point, value, timeline }, pointIndex) => {
        const monitoringTarget = row.isGroupAggregate ? null : isMother
          ? row.motherId ? { mother: { id: row.motherId, motherId: row.motherId, name: beneficiaryName } } : null
          : row.childId ? { child: { id: row.childId, childId: row.childId, name: beneficiaryName }, week: point.ageWeeks } : null;
        const interpretationMetric = metric.startsWith('weightForAge') ? 'weightForAgeInterpretation'
          : metric.startsWith('lengthForAge') || metric.startsWith('heightForAge') ? 'lengthForAgeInterpretation'
            : metric.startsWith('weightForLength') ? 'weightForLengthInterpretation' : '';
        const interpretation = interpretationMetric ? getPointInterpretation(point, interpretationMetric) : '';
        const isLatestPoint = timeline === latestTimeline;
        const isOutsideWhoRange = isZScoreMetric && (value < -6 || value > 6);
        const displayedValue = isZScoreMetric ? Math.max(-6, Math.min(6, value)) : value;
        const navigateToMonitor = () => { if (monitoringTarget) navigate('/monitoring', { state: monitoringTarget }); };
        const rangeNote = isOutsideWhoRange ? ` · Beyond WHO display range (${value > 6 ? 'above +6' : 'below -6'})` : '';
        return <circle key={`${beneficiaryName}-${timeline}-${pointIndex}`} className={monitoringTarget ? 'growth-report-data-point' : undefined} cx={xForTimeline(timeline)} cy={yForValue(displayedValue)} r={isLatestPoint ? '8' : '5'} fill={isOutsideWhoRange ? '#fff7ed' : '#fff'} stroke={isOutsideWhoRange ? '#c2410c' : color} strokeWidth={isLatestPoint || isOutsideWhoRange ? '4' : '3'} role={monitoringTarget ? 'link' : undefined} tabIndex={monitoringTarget ? 0 : undefined} aria-label={monitoringTarget ? `Open ${beneficiaryName} monitoring form, ${value.toFixed(2)} ${valueUnit}, ${timelineLabel(timeline)}${isLatestPoint ? ', latest measurement' : ''}${isOutsideWhoRange ? ', outside WHO display range' : ''}` : undefined} onClick={monitoringTarget ? navigateToMonitor : undefined} onKeyDown={monitoringTarget ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigateToMonitor(); } } : undefined}><title>{beneficiaryName}: {value.toFixed(2)} {valueUnit}{interpretation ? ` · ${interpretation}` : ''}{rangeNote} · {timelineLabel(timeline)}{isLatestPoint ? ' · Latest measurement' : ''}</title></circle>;
      });
      return <g key={`${beneficiaryName}-numeric-series`}>{polyline}{markers}</g>;
    });
    const yAxisLabel = isZScoreMetric ? metricLabel : metric === 'bmiForAge' ? 'BMI' : metric === 'weightForAge' ? 'Weight (kg)' : metric === 'heightForAge' ? 'Length (cm)' : metricLabel;
    return <div className="growth-report-line-chart"><svg ref={chartRef} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${width}px` }} role="img" aria-label={`${subjectLabel} ${metricLabel} over time`} preserveAspectRatio="none"><text className="growth-report-y-axis-label" x="18" y={height / 2} textAnchor="middle" transform={`rotate(-90 18 ${height / 2})`}>{yAxisLabel}</text>{timelineGridLines}{yAxisTicks.map(({ value, y }) => <g key={value}><line className={`growth-report-gridline${Math.abs(value) < 1e-9 ? ' zero-line' : ''}`} x1={chartPaddingX} x2={width} y1={y} y2={y} /><text className="growth-report-y-axis-tick" x={chartPaddingX - 8} y={y + 3} textAnchor="end" style={{ fontSize: '10px' }}>{value.toFixed(1)}</text></g>)}{chartSeries}</svg><div className="growth-report-line-labels" style={{ position: 'relative', minHeight: '1.2rem', minWidth: `${width}px`, paddingLeft: '1.3rem', paddingRight: '0.5rem', fontSize: '10px' }}>{monthLabels.map(({ timelineValue, xPosition, label }) => <span key={`label-${timelineValue}`} style={{ position: 'absolute', left: `${Math.max(4, Math.min(96, (xPosition / width) * 100))}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>)}</div><div className="growth-report-legend">{visibleSeriesRows.map((row, index) => <span key={`${row.child || row.mother}-line-legend`}><i style={{ background: seriesColors[index % seriesColors.length] }} />{row.child || row.mother}</span>)}</div></div>;
  }

  return <div className="growth-report-bars growth-report-bars-chart">{points.map(({ row, value }, index) => { const label = row.child || row.mother || row.batch || row.group || 'Report total'; return <div className="growth-report-bar-item" key={`${label}-${index}`}><strong>{value}</strong><span style={{ '--bar-height': `${Math.max(6, (value / maxValue) * 100)}%` }} title={`${label}: ${value} · ${chartDate(row.measurementDate)}`} /><small>{label}</small><small>{chartDate(row.measurementDate)}</small></div>; })}</div>;
}

export default function ProgressReport() {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const isSchoolAssignedUser = isHealthWorker || isCommunityOrganizer;
  const [options, setOptions] = useState({ schools: [], groups: [], batches: [], mothers: [] });
  const assignedSchoolId = currentUser?.school_id ?? currentUser?.schoolId ?? '';
  const assignedSchool = options.schools.find((item) => String(item.id) === String(assignedSchoolId));
  const [programs, setPrograms] = useState([]);
  const [selection, setSelection] = useState(EMPTY_SELECTIONS);
  const [granularity, setGranularity] = useState('child');
  const [visibleFields, setVisibleFields] = useState(DEFAULT_VISIBLE_FIELDS);
  const [report, setReport] = useState(null);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState(null);
  const [sort, setSort] = useState({ key: 'school', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [reportFocus, setReportFocus] = useState('beneficiary-batch');
  const [reportCategory, setReportCategory] = useState('monitor');
  const [beneficiaryType, setBeneficiaryType] = useState('child');
  const [growthMetrics, setGrowthMetrics] = useState(['weightForAge']);
  const [graphMetricType, setGraphMetricType] = useState('interpretation');
  const [profileMetrics, setProfileMetrics] = useState(CHILD_PROFILE_METRICS.map(([id]) => id));
  const [programMetrics, setProgramMetrics] = useState(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth']);
  const [resultsView, setResultsView] = useState('graph');
  const [tableDisplayMode, setTableDisplayMode] = useState('general');
  const [displayWeeks, setDisplayWeeks] = useState('all');
  const [profileGraphColumn, setProfileGraphColumn] = useState('gender');
  const [programName, setProgramName] = useState('');
  const [benefitPeriod, setBenefitPeriod] = useState('overall');
  const [benefitMonth, setBenefitMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    apiGetProgressReportOptions()
      .then(setOptions)
      .catch((loadError) => notifyAction(loadError.message || 'Unable to load report options.', 'error'))
      .finally(() => setLoadingOptions(false));
    apiGetPrograms().then((result) => setPrograms(result?.programs || [])).catch(() => setPrograms([]));
  }, []);

  useEffect(() => {
    if (!isSchoolAssignedUser) return;
    const assignedGroupId = currentUser.group_id ?? currentUser.groupId;
    const school = options.schools.find((item) => String(item.id) === String(assignedSchoolId));
    const group = isHealthWorker ? options.groups.find((item) => String(item.id) === String(assignedGroupId)) : null;
    if (!school || (isHealthWorker && !group)) return;

    setSelection((current) => {
      const groupId = isHealthWorker ? String(group.id) : '';
      if (String(current.schoolId) === String(school.id) && String(current.groupId) === groupId) return current;
      return { ...current, schoolId: String(school.id), groupId, batchId: '' };
    });
    setReportFocus(isHealthWorker ? 'beneficiary-group' : 'beneficiary-batch');
  }, [currentUser, isHealthWorker, isSchoolAssignedUser, options.groups, options.schools]);

  const displaySelection = finalizedSnapshot?.selection ?? selection;
  const displayGranularity = finalizedSnapshot?.granularity ?? granularity;
  const displaySort = finalizedSnapshot?.sort ?? sort;
  const displayPage = finalizedSnapshot?.page ?? page;
  const activeReport = finalizedSnapshot?.report ?? report;
  const displayReportFocus = finalizedSnapshot?.reportFocus ?? reportFocus;
  const baseDisplayVisibleFields = addGrowthScoresBeforeInterpretations((finalizedSnapshot?.visibleFields ?? visibleFields).filter((field) => (
    displayReportFocus === 'group-school'
      ? !['mother', 'child', 'group'].includes(field)
      : displayReportFocus === 'batch-group' || displayReportFocus === 'batch-school'
        ? !['mother', 'child'].includes(field)
        : true
  )));
  const displayReportCategory = finalizedSnapshot?.reportCategory ?? reportCategory;
  const displayBeneficiaryType = finalizedSnapshot?.beneficiaryType ?? beneficiaryType;
  const displayProfileGraphColumn = profileGraphColumn;
  const availableGrowthMetrics = displayBeneficiaryType === 'mother' ? MOTHER_GROWTH_METRICS : GROWTH_METRICS;
  const availableNumericGrowthMetrics = NUMERIC_GROWTH_METRICS(displayBeneficiaryType);
  const availableProfileMetrics = displayBeneficiaryType === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS;
  const graphMetricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
  const selectedGraphMetric = growthMetrics[0] || graphMetricOptions[0]?.[0] || '';
  const selectedTableGrowthFields = growthTableFieldsForMetric(selectedGraphMetric);
  const tableBaseFields = baseDisplayVisibleFields.filter((field) => !GROWTH_TABLE_FIELDS.has(field));
  const monitoringHierarchyFields = new Set([
    ...(displaySelection.schoolId ? ['school'] : []),
    ...(displaySelection.groupId ? ['group'] : []),
    ...(displaySelection.batchId ? ['batch'] : []),
  ]);
  const monitoringTableBaseFields = tableBaseFields.filter((field) => (
    !MONITORING_HISTORY_EXCLUDED_FIELDS.has(field) && !monitoringHierarchyFields.has(field)
  ));
  const displayVisibleFields = displayReportCategory === 'monitor'
    ? addGrowthScoresBeforeInterpretations([...tableBaseFields, ...selectedTableGrowthFields])
    : baseDisplayVisibleFields;
  const focusScope = selection.batchId ? 'batch' : selection.groupId ? 'group' : selection.schoolId ? 'school' : '';
  const focusOptions = REPORT_FOCUS_OPTIONS.filter(([, , scope]) => scope === focusScope);

  const groups = useMemo(() => options.groups.filter((item) => !selection.schoolId || String(item.schoolId) === String(selection.schoolId)), [options.groups, selection.schoolId]);
  const batches = useMemo(() => options.batches.filter((item) => {
    const matchesSchool = !selection.schoolId || String(item.schoolId) === String(selection.schoolId);
    if (!matchesSchool || !selection.groupId) return matchesSchool;
    return options.mothers.some((mother) => String(mother.groupId) === String(selection.groupId) && String(mother.batchId) === String(item.id));
  }), [options.batches, options.mothers, selection.groupId, selection.schoolId]);
  const updateSelection = (key, value) => {
    setPage(1);
    setError('');
    if (key === 'schoolId') {
      setSelection({ schoolId: value, groupId: '', batchId: '' });
      setFinalizedSnapshot(null);
      setActiveTab(1);
      setReportFocus('beneficiary-school');
    }
    else if (key === 'groupId') {
      setSelection((current) => ({ ...current, groupId: value, batchId: '' }));
      setReportFocus(value ? 'beneficiary-group' : 'beneficiary-school');
    } else {
      setSelection((current) => ({ ...current, [key]: value }));
      setReportFocus(value ? 'beneficiary-batch' : 'beneficiary-group');
    }
  };

  useEffect(() => {
    if (focusOptions.length && !focusOptions.some(([value]) => value === reportFocus)) {
      setReportFocus(focusOptions[0][0]);
    }
  }, [focusOptions, reportFocus]);

  const generateReport = async (nextPage = 1) => {
    if (!selection.schoolId) {
      notifyAction('Please select at least a School to view the report.', 'error');
      return;
    }
    setLoadingReport(true);
    try {
      const selectedProgram = programs.find((program) => program.name === programName);
      if (reportCategory === 'program') {
        setGrowthMetrics(['receivedBenefitAveragePerMonth']);
        setDisplayWeeks('receivedBenefitAveragePerMonth');
      }
      const reportGranularity = reportCategory === 'program'
        ? String(selectedProgram?.beneficiaryType || selectedProgram?.beneficiary_type || '').trim().toLowerCase() === 'mother' ? 'mother' : 'child'
        : beneficiaryType;
      const result = await apiGetProgressReport({ ...selection, granularity: reportGranularity, programName, benefitPeriod, benefitMonth, page: nextPage, perPage: 50 });
      setReport(result);
      setFinalizedSnapshot({
        report: result,
        selection: { ...selection },
        visibleFields: reportCategory === 'profile'
          ? [...new Set([...DEFAULT_VISIBLE_FIELDS.filter((field) => ['school', 'group', 'batch', 'mother', 'child', 'gender', 'dateOfBirth'].includes(field)), ...profileMetrics])]
          : reportCategory === 'program'
            ? [...new Set([...DEFAULT_VISIBLE_FIELDS.filter((field) => ['school', 'group', 'batch', 'mother', 'child'].includes(field)), ...programMetrics])]
          : [...new Set([...visibleFields.filter((field) => !GROWTH_METRICS.some(([id]) => id === field)), ...growthMetrics])],
        granularity: reportGranularity,
        sort: { ...sort },
        page: nextPage,
        reportFocus,
        reportCategory,
        beneficiaryType: reportGranularity,
        growthMetrics: [...growthMetrics],
        profileMetrics: [...profileMetrics],
        profileGraphColumn,
        programName,
      });
      setPage(nextPage);
      setActiveTab(4);
    } catch (reportError) {
      notifyAction(reportError.message || 'Unable to generate report.', 'error');
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const sortedRows = useMemo(() => {
    const rows = aggregateReportRows(activeReport?.rows || [], displayReportFocus);
    return rows.sort((left, right) => {
      const a = left[displaySort.key] ?? '';
      const b = right[displaySort.key] ?? '';
      const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
      return displaySort.direction === 'asc' ? result : -result;
    });
  }, [activeReport, displayReportFocus, displaySort]);

  const breadcrumb = [
    'Home',
    displaySelection.schoolId ? options.schools.find((item) => String(item.id) === String(displaySelection.schoolId))?.name : 'Select School',
    displaySelection.schoolId ? (displaySelection.groupId ? groups.find((item) => String(item.id) === String(displaySelection.groupId))?.name : 'All Groups') : null,
    displaySelection.groupId ? (displaySelection.batchId ? batches.find((item) => String(item.id) === String(displaySelection.batchId))?.name : 'All Batches') : null,
  ].filter(Boolean);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortLabel = (label, key) => <button type="button" className="progress-report-sort-button" onClick={() => changeSort(key)}>{label} {displaySort.key === key ? (displaySort.direction === 'asc' ? '↑' : '↓') : ''}</button>;

  const exportReport = async () => {
    if (!selection.schoolId) return;
    const selectedProgram = programs.find((program) => program.name === programName);
    const reportGranularity = reportCategory === 'program'
      ? String(selectedProgram?.beneficiaryType || selectedProgram?.beneficiary_type || '').trim().toLowerCase() === 'mother' ? 'mother' : 'child'
      : beneficiaryType;
    const result = activeReport || (await apiGetProgressReport({ ...selection, granularity: reportGranularity, programName, benefitPeriod, benefitMonth, export: 1, perPage: 100 }));
    const lines = [
      `# ${breadcrumb.join(' > ')}`,
      `# Generated ${new Date().toISOString()}`,
      REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([, label]) => label).map(csvValue).join(','),
      ...aggregateReportRows(result.rows, displayReportFocus).map((row) => REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => formatCellValue(id, row[id])).map(csvValue).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${beneficiaryType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedSchool = options.schools.find((item) => String(item.id) === String(displaySelection.schoolId));
  const resultsRows = sortedRows;
  const monitoringTableRows = useMemo(() => {
    if (displayReportCategory !== 'monitor') return resultsRows;
    return (activeReport?.rows || []).flatMap((row) => (row.growthSeries || []).map((point, index) => ({
      ...row,
      measurementDate: point.date || point.measurementDate || '',
      ...Object.fromEntries(selectedTableGrowthFields.map((field) => [field, pointValueForTableField(point, field)])),
      historyRowKey: `${row.childId || row.motherId || row.child || row.mother || index}-${point.date || point.measurementDate || index}`,
    })));
  }, [activeReport, displayReportCategory, resultsRows, selectedTableGrowthFields]);
  const tableRows = tableDisplayMode === 'monitoring-dates' ? monitoringTableRows : resultsRows;
  const tableVisibleFields = tableDisplayMode === 'general'
    ? displayVisibleFields
    : tableDisplayMode === 'monitoring-dates'
      ? addGrowthScoresBeforeInterpretations([...monitoringTableBaseFields, 'measurementDate', ...selectedTableGrowthFields])
      : displayVisibleFields;
  const graphSourceRows = displayReportCategory === 'program'
    ? aggregateReportRows(resultsRows, 'group-school')
    : displayReportCategory === 'monitor'
      ? (activeReport?.rows || [])
      : resultsRows;
  const graphAggregationFocus = displayReportCategory === 'monitor' && !INTERPRETATION_METRICS.has(growthMetrics[0])
    ? null
    : displaySelection.batchId
      ? 'batch-group'
      : displaySelection.schoolId
        ? 'group-school'
        : displayReportFocus;
  const graphRows = aggregateGrowthRows(
    graphSourceRows.filter((row) => growthMetrics.some((metric) => {
      if (INTERPRETATION_METRICS.has(metric)) {
        return row.growthSeries?.some((point) => getPointInterpretation(point, metric));
      }
      return row.growthSeries?.some((point) => Number.isFinite(getPointValue(point, metric))) || Number.isFinite(Number(row[metric]));
    })),
    graphAggregationFocus,
    displayBeneficiaryType,
  );
  const averageMetric = (field, rows = resultsRows) => {
    if (INTERPRETATION_METRICS.has(field)) return rows.map((row) => row[field]).find(Boolean) || '—';
    const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value));
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
  };
  const completedPercent = resultsRows.length
    ? Math.round(resultsRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / resultsRows.length)
    : 0;
  const canOpenTab = (tab) => tab === 1 || (tab === 2 && Boolean(selection.schoolId)) || (tab === 3 && Boolean(selection.schoolId)) || (tab === 4 && Boolean(activeReport));
  const goToTab = (tab) => {
    if (canOpenTab(tab)) setActiveTab(tab);
  };
  const resetSetup = () => {
    setSelection(isSchoolAssignedUser
      ? {
        schoolId: currentUser.school_id ?? currentUser.schoolId ?? '',
        groupId: isHealthWorker ? currentUser.group_id ?? currentUser.groupId ?? '' : '',
        batchId: '',
      }
      : EMPTY_SELECTIONS);
    setReport(null);
    setFinalizedSnapshot(null);
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
    setGrowthMetrics(['weightForLengthInterpretation']);
    setProfileMetrics(CHILD_PROFILE_METRICS.map(([id]) => id));
    setProgramMetrics(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth']);
    setReportFocus(isHealthWorker ? 'beneficiary-group' : 'beneficiary-batch');
    setReportCategory('monitor');
    setBeneficiaryType('child');
    setGraphMetricType('interpretation');
    setResultsView('graph');
    setTableDisplayMode('general');
    setDisplayWeeks('all');
    setProfileGraphColumn('gender');
    setProgramName('');
    setBenefitPeriod('overall');
    setBenefitMonth(new Date().toISOString().slice(0, 7));
    setActiveTab(1);
    setPage(1);
    setError('');
  };
  const selectGrowthMetric = (id) => {
    const nextType = INTERPRETATION_METRICS.has(id) ? 'interpretation' : 'numeric';
    setGraphMetricType(nextType);
    setGrowthMetrics([id]);
  };
  const toggleProfileMetric = (id) => setProfileMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const toggleProgramMetric = (id) => setProgramMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const selectBeneficiaryType = (type) => {
    setBeneficiaryType(type);
    setProfileMetrics((type === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS).map(([id]) => id));
    const initialMetric = type === 'mother' ? 'bmiForAge' : 'weightForLengthInterpretation';
    setGraphMetricType(type === 'mother' ? 'numeric' : 'interpretation');
    setGrowthMetrics([initialMetric]);
    setFinalizedSnapshot(null);
    setReport(null);
    setActiveTab(2);
  };
  const selectReportCategory = (category) => {
    setReportCategory(category);
    if (category === 'program') {
      setProgramMetrics(['receivedBenefitAveragePerMonth']);
      setGrowthMetrics(['receivedBenefitAveragePerMonth']);
      setDisplayWeeks('receivedBenefitAveragePerMonth');
      setResultsView('table');
    }
    if (category === 'profile') setResultsView('table');
  };

  useEffect(() => {
    if (reportCategory === 'program' && PROGRAM_METRICS.some(([id]) => id === displayWeeks) && growthMetrics[0] !== displayWeeks) {
      setGrowthMetrics([displayWeeks]);
    }
  }, [displayWeeks, growthMetrics, reportCategory]);

  useEffect(() => {
    const metricOptions = graphMetricType === 'interpretation' ? availableGrowthMetrics : availableNumericGrowthMetrics;
    if (!metricOptions.some(([id]) => id === growthMetrics[0])) {
      setGrowthMetrics([metricOptions[0]?.[0] || '']);
    }
  }, [availableGrowthMetrics, availableNumericGrowthMetrics, graphMetricType, growthMetrics]);

  useEffect(() => {
    if (activeTab !== 4) return undefined;
    const heading = document.querySelector('.growth-report-single-card h3');
    const subtitle = document.querySelector('.growth-report-single-card > p');
    const exportButton = document.querySelector('.progress-report-results-header > .secondary-btn')
      || [...document.querySelectorAll('.results-tab-panel button.secondary-btn')].find((button) => button.textContent.trim() === 'Export CSV');
    const resultsHeader = document.querySelector('.progress-report-results-header');
    const chartActions = document.querySelector('.program-average-chart-actions');
    if (exportButton && displayReportCategory === 'program' && chartActions) chartActions.appendChild(exportButton);
    if (exportButton && displayReportCategory !== 'program' && resultsHeader) resultsHeader.appendChild(exportButton);
    if (heading && beneficiaryType === 'mother') heading.textContent = '📈 BMI';
    if (subtitle && beneficiaryType === 'mother') subtitle.textContent = 'Latest mother BMI measurements · values are plotted by month';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'child') subtitle.textContent = 'Weight and length plotted against age in months';
    if (heading && displayReportCategory === 'monitor' && beneficiaryType === 'child') {
      const metricText = (availableGrowthMetrics.find(([id]) => id === growthMetrics[0])?.[1] || 'Weight-for-Length/Height')
        .replace(/\s+Z-Score$/i, '')
        .replace(/\s+Interpretation$/i, '');
      heading.textContent = metricText;
    }
    if (displayReportCategory === 'program') {
      const selectedMetric = PROGRAM_METRICS.find(([id]) => id === displayWeeks);
      const selectedMetricLabel = selectedMetric?.[1] || 'Program Benefits';
      if (heading) heading.textContent = selectedMetricLabel;
      if (subtitle) subtitle.textContent = `${selectedMetricLabel} by group`;
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.textContent = averageMetric(displayWeeks, graphRows);
      if (value) value.style.display = 'none';
    } else {
      const value = document.querySelector('.growth-report-single-card .growth-report-value');
      if (value) value.style.display = '';
    }
    return undefined;
  }, [activeTab, beneficiaryType, displayReportCategory, displayWeeks, graphRows]);

  return (
    <div className="community-page progress-report-shell">
      <div className="progress-report-panel hierarchical-progress-report">
        <PageHeader title="Progress Report" breadcrumbs={[{ label: 'Reports' }, { label: 'Progress Report' }]} actions={<button type="button" className="secondary-btn" onClick={resetSetup}>Reset Setup</button>} />
        <ReportTabBar tabs={REPORT_TABS} activeTab={activeTab} canOpenTab={canOpenTab} goToTab={goToTab} />

        <section className="progress-report-config" aria-label="Report parameters">
          {activeTab === 1 && (
            <CommunitySelectionStep
              isCommunityOrganizer={isCommunityOrganizer}
              assignedSchool={assignedSchool}
              selection={selection}
              groups={groups}
              batches={batches}
              isHealthWorker={isHealthWorker}
              options={options}
              updateSelection={updateSelection}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 2 && (
            <ReportFocusStep
              reportCategory={reportCategory}
              selectReportCategory={selectReportCategory}
              programName={programName}
              setProgramName={setProgramName}
              programs={programs}
              benefitPeriod={benefitPeriod}
              setBenefitPeriod={setBenefitPeriod}
              benefitMonth={benefitMonth}
              setBenefitMonth={setBenefitMonth}
              beneficiaryType={beneficiaryType}
              setBeneficiaryType={setBeneficiaryType}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 3 && (
            <GrowthMetricsStep
              reportCategory={reportCategory}
              availableProfileMetrics={availableProfileMetrics}
              profileMetrics={profileMetrics}
              toggleProfileMetric={toggleProfileMetric}
              programMetrics={PROGRAM_METRICS}
              toggleProgramMetric={toggleProgramMetric}
              beneficiaryType={beneficiaryType}
              availableGrowthMetrics={availableGrowthMetrics}
              growthMetrics={growthMetrics}
              selectGrowthMetric={selectGrowthMetric}
              setActiveTab={setActiveTab}
              generateReport={generateReport}
            />
          )}

          {activeTab === 4 && activeReport && (
            <ResultsPanel
              selectedSchool={selectedSchool}
              selection={selection}
              groups={groups}
              batches={batches}
              exportReport={exportReport}
              resultsView={resultsView}
              setResultsView={setResultsView}
              tableDisplayMode={tableDisplayMode}
              setTableDisplayMode={setTableDisplayMode}
              tableRows={tableRows}
              tableVisibleFields={tableVisibleFields}
              monitoringRows={monitoringTableRows}
              displayReportCategory={displayReportCategory}
              profileGraphColumn={profileGraphColumn}
              setProfileGraphColumn={setProfileGraphColumn}
              graphMetricType={graphMetricType}
              setGraphMetricType={setGraphMetricType}
              availableGrowthMetrics={availableGrowthMetrics}
              availableNumericGrowthMetrics={availableNumericGrowthMetrics}
              selectedGraphMetric={selectedGraphMetric}
              setGrowthMetrics={setGrowthMetrics}
              displayWeeks={displayWeeks}
              setDisplayWeeks={setDisplayWeeks}
              averageMetric={averageMetric}
              graphRows={graphRows}
              resultsRows={resultsRows}
              reportFields={REPORT_FIELDS}
              displayVisibleFields={displayVisibleFields}
              displaySort={displaySort}
              changeSort={changeSort}
              formatCellValue={formatCellValue}
              displayBeneficiaryType={displayBeneficiaryType}
              displayReportFocus={displayReportFocus}
              profileGraphFields={PROFILE_GRAPH_FIELDS}
              interpretationMetrics={INTERPRETATION_METRICS}
              programMetrics={PROGRAM_METRICS}
              GrowthChart={GrowthChart}
            />
          )}
        </section>
      </div>
    </div>
  );
}
