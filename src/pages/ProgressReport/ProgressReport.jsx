import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetProgressReport, apiGetProgressReportOptions } from '../../api/progressReport';
import { apiGetPrograms } from '../../api/programs';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/AuthProvider';
import { isHealthWorkerRole } from '../../utils/permissions';

const EMPTY_SELECTIONS = { schoolId: '', groupId: '', batchId: '' };
const REPORT_FIELDS = [
  ['school', 'School', 'Hierarchy'],
  ['group', 'Group', 'Hierarchy'],
  ['batch', 'Batch', 'Hierarchy'],
  ['mother', 'Mother Name', 'Identity'],
  ['child', 'Child Name', 'Identity'],
  ['age', 'Age', 'Identity'],
  ['pediatricAgeWeeks', 'Pedia Age (weeks)', 'Identity'],
  ['gender', 'Sex', 'Identity'],
  ['dateOfBirth', 'Date of Birth', 'Identity'],
  ['contact', 'Contact Number', 'Identity'],
  ['status', 'Status', 'Health & Status'],
  ['risk', 'Risk Level', 'Health & Status'],
  ['program', 'Program', 'Health & Status'],
  ['deliveryType', 'Delivery Type', 'Health & Status'],
  ['liveBirthDocument', 'Live Birth Document', 'Profile'],
  ['birthWeight', 'Birth Weight (kg)', 'Profile'],
  ['birthLength', 'Birth Length (cm)', 'Profile'],
  ['bloodType', 'Blood Type', 'Profile'],
  ['multipleBirth', 'Multiple Birth', 'Profile'],
  ['contactNumber', 'Contact Number', 'Profile'],
  ['addressDetails', 'Address Details', 'Profile'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Profile'],
  ['programConsentDocument', 'Program Consent Form', 'Profile'],
  ['gravida', 'Gravida', 'Profile'],
  ['abortion', 'Abortion', 'Profile'],
  ['stillbirth', 'Stillbirth', 'Profile'],
  ['weightForAge', 'Weight-for-Age (kg)', 'Growth & Monitoring'],
  ['heightForAge', 'Length-for-Age (cm)', 'Growth & Monitoring'],
  ['bmiForAge', 'BMI-for-Age', 'Growth & Monitoring'],
  ['bmiInterpretation', 'BMI Interpretation', 'Growth & Monitoring'],
  ['weightForLengthInterpretation', 'Weight-for-Length Interpretation', 'Growth & Monitoring'],
  ['weightForAgeInterpretation', 'Weight-for-Age Interpretation', 'Growth & Monitoring'],
  ['lengthForAgeInterpretation', 'Length-for-Age Interpretation', 'Growth & Monitoring'],
  ['initialWeight', 'Initial Weight (kg)', 'Profile'],
  ['initialHeight', 'Initial Height (cm)', 'Profile'],
  ['initialBmi', 'Initial BMI', 'Profile'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the beneficiary profile is registered as a PhilHealth member.'],
  ['activitiesCompleted', 'Activities Completed', 'Monitoring'],
  ['totalActivities', 'Total Activities', 'Monitoring'],
  ['progress', 'Progress %', 'Monitoring'],
  ['receivedBenefitTotal', 'Total Received Benefits', 'Program Report'],
  ['receivedBenefitFrequency', 'Benefit Receipt Frequency', 'Program Report'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Program Report'],
  ['lastActivityDate', 'Last Activity', 'Monitoring'],
  ['nextCheckupDate', 'Next Check-up', 'Monitoring'],
  ['measurementDate', 'Measurement Date', 'Monitoring'],
];
const DEFAULT_VISIBLE_FIELDS = ['school', 'group', 'batch', 'mother', 'child', 'pediatricAgeWeeks', 'weightForLengthInterpretation', 'weightForAgeInterpretation', 'lengthForAgeInterpretation', 'activitiesCompleted', 'totalActivities', 'progress'];
const GROWTH_METRICS = [
  ['weightForLengthInterpretation', 'Weight-for-Length', 'Primary proportionality interpretation for children under 24 months.'],
  ['weightForAgeInterpretation', 'Weight-for-Age', 'Supporting sex-specific weight interpretation by age.'],
  ['lengthForAgeInterpretation', 'Length-for-Age', 'Supporting sex-specific linear-growth interpretation by age.'],
];
const INTERPRETATION_METRICS = new Set(GROWTH_METRICS.map(([id]) => id));
const MOTHER_GROWTH_METRICS = [['bmiForAge', 'BMI', 'Latest BMI recorded by Mother Monitoring.']];
const PROFILE_METRICS = [
  ['age', 'Age', 'Age calculated from the beneficiary profile date of birth.'],
  ['initialWeight', 'Initial Weight (kg)', 'Birth weight for children or prenatal baseline weight for mothers.'],
  ['initialHeight', 'Initial Height (cm)', 'Birth length for children or prenatal baseline height for mothers.'],
  ['initialBmi', 'Initial BMI', 'Baseline BMI recorded or calculated from the profile measurements.'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the beneficiary profile is registered as a PhilHealth member.'],
  ['gender', 'Sex', 'Sex recorded in the child profile.'],
  ['liveBirthDocument', 'Live Birth Document', 'Uploaded live birth document for the child.'],
  ['birthWeight', 'Birth Weight (kg)', 'Birth weight recorded in the child profile.'],
  ['birthLength', 'Birth Length (cm)', 'Birth length recorded in the child profile.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the child profile.'],
  ['multipleBirth', 'Multiple Birth', 'Multiple-birth classification recorded in the child profile.'],
  ['deliveryType', 'Delivery Type', 'Delivery type recorded in the child profile.'],
  ['contactNumber', 'Contact Number', 'Contact number recorded in the mother profile.'],
  ['addressDetails', 'Address Details', 'Address details recorded in the mother profile.'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Whether the mother birth certificate is uploaded.'],
  ['programConsentDocument', 'Program Consent Form', 'Whether the program consent form is uploaded.'],
  ['gravida', 'Gravida', 'Number of pregnancies recorded in the mother profile.'],
  ['abortion', 'Abortion', 'Abortion count recorded in the mother profile.'],
  ['stillbirth', 'Stillbirth', 'Stillbirth count recorded in the mother profile.'],
];
const CHILD_PROFILE_METRICS = [
  ['age', 'Age', 'Age calculated from the child profile date of birth.'],
  ['gender', 'Sex', 'Sex recorded in the child profile.'],
  ['liveBirthDocument', 'Live Birth Document', 'Uploaded live birth document for the child.'],
  ['birthWeight', 'Birth Weight (kg)', 'Birth weight recorded in the child profile.'],
  ['birthLength', 'Birth Length (cm)', 'Birth length recorded in the child profile.'],
  ['bloodType', 'Blood Type', 'Blood type recorded in the child profile.'],
  ['multipleBirth', 'Multiple Birth', 'Multiple-birth classification recorded in the child profile.'],
  ['deliveryType', 'Delivery Type', 'Delivery type recorded in the child profile.'],
];
const MOTHER_PROFILE_METRICS = [
  ['age', 'Age', 'Age calculated from the beneficiary profile date of birth.'],
  ['contactNumber', 'Contact Number', 'Contact number recorded in the mother profile.'],
  ['addressDetails', 'Address Details', 'Whether address details are recorded in the mother profile.'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'Whether the mother birth certificate is uploaded.'],
  ['programConsentDocument', 'Program Consent Form', 'Whether the program consent form is uploaded.'],
  ['philhealthMember', 'PhilHealth Member', 'Whether the mother is registered as a PhilHealth member.'],
  ['initialWeight', 'Initial Weight (kg)', 'Prenatal baseline weight.'],
  ['initialHeight', 'Initial Height (cm)', 'Prenatal baseline height.'],
  ['gravida', 'Gravida', 'Number of pregnancies.'],
  ['abortion', 'Abortion', 'Recorded abortion count.'],
  ['stillbirth', 'Stillbirth', 'Recorded stillbirth count.'],
];
const PROFILE_GRAPH_FIELDS = [
  ['gender', 'Sex', 'categorical'],
  ['deliveryType', 'Delivery Type', 'categorical'],
  ['liveBirthDocument', 'Live Birth Document', 'categorical'],
  ['bloodType', 'Blood Type', 'categorical'],
  ['philhealthMember', 'PhilHealth Member', 'categorical'],
  ['age', 'Age', 'measurement'],
  ['birthWeight', 'Birth Weight (kg)', 'measurement'],
  ['birthLength', 'Birth Length (cm)', 'measurement'],
  ['initialBmi', 'Initial BMI', 'measurement'],
  ['contactNumber', 'Contact Number', 'categorical'],
  ['addressDetails', 'Address Details', 'categorical'],
  ['motherBirthCertificate', "Mother's Birth Certificate", 'categorical'],
  ['programConsentDocument', 'Program Consent Form', 'categorical'],
  ['gravida', 'Gravida', 'measurement'],
  ['abortion', 'Abortion', 'measurement'],
  ['stillbirth', 'Stillbirth', 'measurement'],
];
const PROFILE_GRAPH_FIELD_MAP = new Map(PROFILE_GRAPH_FIELDS.map(([id, label, type]) => [id, { label, type }]));
const PRESENCE_PROFILE_FIELDS = new Set(['contactNumber', 'addressDetails', 'liveBirthDocument', 'motherBirthCertificate', 'programConsentDocument', 'philhealthMember']);
const PROGRAM_METRICS = [
  ['receivedBenefitTotal', 'Total Received Benefits', 'Total true benefit-receipt events in the selected period.'],
  ['receivedBenefitFrequency', 'Receipt Frequency', 'Number of true receipt events in the selected period.'],
  ['receivedBenefitAveragePerMonth', 'Average Received per Month', 'Average true receipt events per active month.'],
];
const REPORT_TABS = ['Community', 'Report Focus', 'Growth Metrics', 'Results'];
const REPORT_FOCUS_OPTIONS = [
  ['beneficiary-batch', 'Individual Report', 'batch'],
  ['beneficiary-group', 'Individual Report', 'group'],
  ['beneficiary-school', 'Individual Report', 'school'],
  ['batch-group', 'Batch Report', 'group'],
  ['batch-school', 'Batch Report', 'school'],
  ['group-school', 'Group Report', 'school'],
];
const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const getBmiInterpretation = (value) => {
  const bmi = Number(value);
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Underweight screening range';
  if (bmi < 25) return 'Normal screening range';
  if (bmi < 30) return 'Overweight screening range';
  return 'Obese screening range';
};
const formatCellValue = (field, value) => {
  if (PRESENCE_PROFILE_FIELDS.has(field)) return value === null || value === undefined || String(value).trim() === '' ? 'No' : 'Yes';
  if (value === null || value === undefined || value === '') return '—';
  if (['dateOfBirth', 'lastActivityDate', 'nextCheckupDate', 'measurementDate'].includes(field)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }
  return String(value);
};

const chartDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

const getPointValue = (point, metric) => {
  const direct = point?.[metric];
  if (Number.isFinite(Number(direct))) return Number(direct);
  const aliases = {
    weightForAge: point?.weight,
    heightForAge: point?.height,
    bmiForAge: point?.bmi,
  };
  const aliasValue = aliases[metric];
  return Number.isFinite(Number(aliasValue)) ? Number(aliasValue) : null;
};

const getPointInterpretation = (point, metric) => String(point?.[metric] || '').trim();

const averageNumeric = (values) => {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  return numbers.length ? Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1)) : null;
};

const getMode = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
};

const getProfileGraphValue = (row, field) => {
  if (field === 'liveBirthDocument') return row?.liveBirthDocument ? 'Yes' : 'No';
  if (['contactNumber', 'addressDetails', 'motherBirthCertificate', 'programConsentDocument'].includes(field)) return row?.[field] ? 'Yes' : 'No';
  if (field === 'philhealthMember') return row?.philhealthMember || 'No';
  return row?.[field] === undefined || row?.[field] === null || row?.[field] === '' ? 'Not recorded' : String(row[field]);
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

const aggregateGrowthRows = (rows, focus) => {
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
    const pointsByWeek = new Map();
    groupRows.forEach((row) => {
      (row.growthSeries || []).forEach((point) => {
        if (!Number.isFinite(Number(point.ageWeeks))) return;
        const weekPoints = pointsByWeek.get(Number(point.ageWeeks)) || [];
        weekPoints.push(point);
        pointsByWeek.set(Number(point.ageWeeks), weekPoints);
      });
    });
    const growthSeries = [...pointsByWeek.entries()].sort(([left], [right]) => left - right).map(([ageWeeks, points]) => ({
      ageWeeks,
      date: points.map((point) => point.date).filter(Boolean).sort().at(-1) || '',
      weight: averageNumeric(points.map((point) => point.weight)),
      height: averageNumeric(points.map((point) => point.height)),
      bmi: averageNumeric(points.map((point) => point.bmi)),
      weightForLengthInterpretation: getMode(points.map((point) => point.weightForLengthInterpretation)),
      weightForAgeInterpretation: getMode(points.map((point) => point.weightForAgeInterpretation)),
      lengthForAgeInterpretation: getMode(points.map((point) => point.lengthForAgeInterpretation)),
    }));
    return {
      ...groupRows[0],
      child: groupName,
      mother: groupName,
      weightForAge: averageNumeric(groupRows.map((row) => row.weightForAge)),
      heightForAge: averageNumeric(groupRows.map((row) => row.heightForAge)),
      bmiForAge: averageNumeric(groupRows.map((row) => row.bmiForAge)),
      bmiInterpretation: getBmiInterpretation(averageNumeric(groupRows.map((row) => row.bmiForAge))),
      weightForLengthInterpretation: getMode(groupRows.map((row) => row.weightForLengthInterpretation)),
      weightForAgeInterpretation: getMode(groupRows.map((row) => row.weightForAgeInterpretation)),
      lengthForAgeInterpretation: getMode(groupRows.map((row) => row.lengthForAgeInterpretation)),
      growthSeries,
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
  const isMother = beneficiaryType === 'mother';
  const monthKey = (dateValue) => {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const timelineKey = (point) => isMother ? monthKey(point.date) : Number.isFinite(Number(point.ageWeeks)) ? Number(point.ageWeeks) : null;
  const timelineLabel = (value) => isMother ? new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : `W${value}`;
  const entries = rows.flatMap((row) => (row.growthSeries || []).map((point) => ({ row, point, interpretation: getPointInterpretation(point, metric), timeline: timelineKey(point) })))
    .filter((entry) => entry.interpretation && entry.timeline !== null);
  const timelines = [...new Set(entries.map((entry) => entry.timeline))].sort((left, right) => isMother ? left.localeCompare(right) : left - right);
  const requestedWeeks = Number(displayWeeks);
  const visibleTimelines = String(displayWeeks) === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0
    ? timelines
    : timelines.slice(-requestedWeeks);
  const visibleSet = new Set(visibleTimelines);
  const visibleEntries = entries.filter((entry) => visibleSet.has(entry.timeline));
  if (!visibleEntries.length) return <p className="growth-report-empty">No interpretation data available.</p>;

  const categories = [...new Set(visibleEntries.map((entry) => entry.interpretation))];
  const width = 720;
  const height = 220;
  const paddingX = 160;
  const xForTimeline = (timeline) => visibleTimelines.length <= 1 ? width / 2 : paddingX + (visibleTimelines.indexOf(timeline) / (visibleTimelines.length - 1)) * (width - paddingX * 2);
  const yForCategory = (category) => categories.length === 1 ? height / 2 : 24 + (categories.indexOf(category) / (categories.length - 1)) * (height - 48);
  const colors = ['#15803d', '#b7791f', '#dc2626', '#2563eb', '#7d1e2e'];
  const entriesByRow = new Map();
  visibleEntries.forEach((entry) => {
    const key = entry.row.child || entry.row.mother || 'Beneficiary';
    const points = entriesByRow.get(key) || [];
    points.push(entry);
    entriesByRow.set(key, points);
  });
  const interpretationLines = [...entriesByRow.entries()].map(([key, points], index) => {
    const sortedPoints = [...points].sort((left, right) => visibleTimelines.indexOf(left.timeline) - visibleTimelines.indexOf(right.timeline));
    return <polyline key={`interpretation-series-${key}`} points={sortedPoints.map(({ interpretation, timeline }) => `${xForTimeline(timeline)},${yForCategory(interpretation)}`).join(' ')} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
  });
  return <div className="growth-report-line-chart interpretation-growth-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Growth interpretation over time"><text className="growth-report-y-axis-label" x="24" y={height / 2} textAnchor="middle" transform={`rotate(-90 24 ${height / 2})`}>Interpretation</text>{categories.map((category) => <line key={`category-line-${category}`} className="growth-report-gridline" x1={paddingX} x2={width - 24} y1={yForCategory(category)} y2={yForCategory(category)} />)}{visibleTimelines.map((timeline) => <line key={`interpretation-line-${timeline}`} className="growth-report-weekline" x1={xForTimeline(timeline)} x2={xForTimeline(timeline)} y1="24" y2={height - 24} />)}{categories.map((category) => <text key={category} className="growth-report-y-axis-tick" x={paddingX - 8} y={yForCategory(category) + 4} textAnchor="end">{category}</text>)}{interpretationLines}{visibleEntries.map(({ row, point, interpretation, timeline }, index) => <circle key={`${row.child || row.mother}-${timeline}-${index}`} cx={xForTimeline(timeline)} cy={yForCategory(interpretation)} r="6" fill={colors[categories.indexOf(interpretation) % colors.length]} stroke="#fff" strokeWidth="2"><title>{row.child || row.mother}: {interpretation} · {timelineLabel(timeline)}</title></circle>)} </svg><div className="growth-report-line-labels">{visibleTimelines.map((timeline) => <span key={timeline}>{timelineLabel(timeline)}</span>)}</div><div className="growth-report-legend">{categories.map((category, index) => <span key={category}><i style={{ background: colors[index % colors.length] }} />{category}</span>)}</div></div>;
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
    <div className="program-average-chart-actions"><button type="button" className="secondary-btn" onClick={() => downloadChart('image')}>Download image</button></div>
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
  if (INTERPRETATION_METRICS.has(metric)) return <GrowthInterpretationChart rows={rows} metric={metric} displayWeeks={displayWeeks} beneficiaryType={beneficiaryType} />;
  if (PROGRAM_METRICS.some(([id]) => id === metric)) return <ProgramAverageChart rows={rows} />;
  const chartRef = useRef(null);
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
    const width = 720;
    const height = 220;
    const seriesRows = rows.filter((row) => row.growthSeries?.some((point) => Number.isFinite(getPointValue(point, metric))));
    if (!seriesRows.length) return <p className="growth-report-empty">No monitored measurements available.</p>;

    const isMother = beneficiaryType === 'mother';
    const monthKey = (dateValue) => {
      const date = new Date(dateValue);
      return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    const monthLabel = (month) => {
      if (!month) return 'Unknown month';
      const [year, monthNumber] = month.split('-').map(Number);
      return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };
    const weekKey = (point) => Number.isFinite(Number(point.ageWeeks)) ? Number(point.ageWeeks) : null;
    const weekLabel = (week) => Number.isFinite(week) ? `W${week}` : 'Unknown week';
    const accessibleWeekLabel = (week) => Number.isFinite(week) ? `Week ${week}` : 'Unknown week';
    const timelineKey = (point) => isMother ? monthKey(point.date) : weekKey(point);
    const timelineLabel = (value) => isMother ? monthLabel(value) : weekLabel(value);
    const accessibleTimelineLabel = (value) => isMother ? `Month ${monthLabel(value)}` : accessibleWeekLabel(value);
    const allTimelineDates = [...new Set(seriesRows.flatMap((row) => row.growthSeries
      .filter((point) => Number.isFinite(getPointValue(point, metric)) && timelineKey(point) !== null)
      .map(timelineKey)))].sort((left, right) => isMother ? left.localeCompare(right) : left - right);

    const normalizedDisplayWeeks = String(displayWeeks ?? 'all').toLowerCase();
    const requestedWeeks = Number(normalizedDisplayWeeks);
    const visibleTimelineDates = normalizedDisplayWeeks === 'all' || !Number.isFinite(requestedWeeks) || requestedWeeks <= 0 || requestedWeeks >= allTimelineDates.length
      ? allTimelineDates
      : allTimelineDates.slice(-requestedWeeks);
    const visibleTimelineSet = new Set(visibleTimelineDates);
    const visibleSeriesRows = seriesRows
      .map((row) => ({ ...row, visibleGrowthSeries: row.growthSeries.filter((point) => visibleTimelineSet.has(timelineKey(point)) && Number.isFinite(getPointValue(point, metric))) }))
      .filter((row) => row.visibleGrowthSeries.length);

    if (!visibleTimelineDates.length) {
      return <p className="growth-report-empty">No monitored measurements with timeline data available.</p>;
    };

    const lineMax = Math.max(...visibleSeriesRows.flatMap((row) => row.visibleGrowthSeries.map((point) => getPointValue(point, metric))), 1);
    const chartPaddingX = 44;
    const xForTimeline = (timelineValue) => {
      if (visibleTimelineDates.length <= 1) return width / 2;
      const index = visibleTimelineDates.indexOf(timelineValue);
      const usableWidth = width - (chartPaddingX * 2);
      return chartPaddingX + (index / (visibleTimelineDates.length - 1)) * usableWidth;
    };
    const yForValue = (value) => height - (value / lineMax) * (height - 24) - 12;
    const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: lineMax * ratio,
      y: yForValue(lineMax * ratio),
    }));

    if (!visibleSeriesRows.length) return <p className="growth-report-empty">No monitored measurements available for the selected period.</p>;

    const periodLabel = normalizedDisplayWeeks === 'all' ? `all available ${isMother ? 'months' : 'monitoring weeks'}` : `the last ${requestedWeeks} ${isMother ? 'months' : 'weeks'}`;
    const metricLabel = (isMother ? MOTHER_GROWTH_METRICS : GROWTH_METRICS).find(([id]) => id === metric)?.[1] || metric;
    const subjectLabel = isMother ? 'Mother' : 'Child';
    const timelineGridLines = visibleTimelineDates.map((timelineValue) => <line key={`timeline-line-${timelineValue}`} className="growth-report-weekline" x1={xForTimeline(timelineValue)} x2={xForTimeline(timelineValue)} y1="12" y2={height - 12} />);
    const chartSeries = visibleSeriesRows.map((row, rowIndex) => {
      const series = row.visibleGrowthSeries;
      const color = `hsl(${rowIndex * 67 % 360} 62% 42%)`;
      const linePoints = series.map((point) => {
        const timelineValue = timelineKey(point);
        const value = getPointValue(point, metric);
        return `${xForTimeline(timelineValue)},${yForValue(value)}`;
      }).join(' ');
      return <g key={`${row.child || row.mother}-line`}><polyline points={linePoints} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{series.map((point, pointIndex) => { const timelineValue = timelineKey(point); const value = getPointValue(point, metric); return <circle key={`${row.child || row.mother}-point-${pointIndex}`} cx={xForTimeline(timelineValue)} cy={yForValue(value)} r="4" fill="#fff" stroke={color} strokeWidth="2"><title>{row.child || row.mother}: {value} · {accessibleTimelineLabel(timelineValue)}</title></circle>; })}</g>;
    });
    return <div className="growth-report-line-chart"><div className="growth-report-chart-actions"><button type="button" className="secondary-btn" onClick={() => downloadChartImage(chartRef.current, metricLabel)}>Download image</button></div><svg ref={chartRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${subjectLabel} growth measurements over ${periodLabel}`} preserveAspectRatio="none"><text className="growth-report-y-axis-label" x="14" y={height / 2} textAnchor="middle" transform={`rotate(-90 14 ${height / 2})`}>{metricLabel}</text>{timelineGridLines}{yAxisTicks.map(({ value, y }) => <g key={value}><line className={`growth-report-gridline${value === 0 ? ' zero-line' : ''}`} x1={chartPaddingX} x2={width} y1={y} y2={y} /><text className="growth-report-y-axis-tick" x={chartPaddingX - 6} y={y + 4} textAnchor="end">{value.toFixed(1)}</text></g>)}{chartSeries}</svg><div className="growth-report-line-labels">{visibleTimelineDates.map((timelineValue) => <span key={timelineValue}>{timelineLabel(timelineValue)}</span>)}</div><div className="growth-report-legend">{visibleSeriesRows.map((row, index) => <span key={`${row.child || row.mother}-line-legend`}><i style={{ background: `hsl(${index * 67 % 360} 62% 42%)` }} />{row.child || row.mother}</span>)}</div></div>;
  }

  return <div className="growth-report-bars growth-report-bars-chart">{points.map(({ row, value }, index) => { const label = row.child || row.mother || row.batch || row.group || 'Report total'; return <div className="growth-report-bar-item" key={`${label}-${index}`}><strong>{value}</strong><span style={{ '--bar-height': `${Math.max(6, (value / maxValue) * 100)}%` }} title={`${label}: ${value} · ${chartDate(row.measurementDate)}`} /><small>{label}</small><small>{chartDate(row.measurementDate)}</small></div>; })}</div>;
}

export default function ProgressReport() {
  const { currentUser } = useAuth();
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const [options, setOptions] = useState({ schools: [], groups: [], batches: [], mothers: [] });
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
  const [profileMetrics, setProfileMetrics] = useState(CHILD_PROFILE_METRICS.map(([id]) => id));
  const [programMetrics, setProgramMetrics] = useState(['receivedBenefitTotal', 'receivedBenefitFrequency', 'receivedBenefitAveragePerMonth']);
  const [resultsView, setResultsView] = useState('graph');
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
    if (!isHealthWorkerRole(currentUser?.role)) return;
    const assignedSchoolId = currentUser.school_id ?? currentUser.schoolId;
    const assignedGroupId = currentUser.group_id ?? currentUser.groupId;
    const school = options.schools.find((item) => String(item.id) === String(assignedSchoolId));
    const group = options.groups.find((item) => String(item.id) === String(assignedGroupId));
    if (!school || !group) return;

    setSelection((current) => {
      if (String(current.schoolId) === String(school.id) && String(current.groupId) === String(group.id)) return current;
      return { ...current, schoolId: String(school.id), groupId: String(group.id), batchId: '' };
    });
    setReportFocus('beneficiary-group');
  }, [currentUser, options.groups, options.schools]);

  const displaySelection = finalizedSnapshot?.selection ?? selection;
  const displayGranularity = finalizedSnapshot?.granularity ?? granularity;
  const displaySort = finalizedSnapshot?.sort ?? sort;
  const displayPage = finalizedSnapshot?.page ?? page;
  const activeReport = finalizedSnapshot?.report ?? report;
  const displayReportFocus = finalizedSnapshot?.reportFocus ?? reportFocus;
  const displayVisibleFields = (finalizedSnapshot?.visibleFields ?? visibleFields).filter((field) => (
    displayReportFocus === 'group-school'
      ? !['mother', 'child', 'group'].includes(field)
      : displayReportFocus === 'batch-group' || displayReportFocus === 'batch-school'
        ? !['mother', 'child'].includes(field)
        : true
  ));
  const displayReportCategory = finalizedSnapshot?.reportCategory ?? reportCategory;
  const displayBeneficiaryType = finalizedSnapshot?.beneficiaryType ?? beneficiaryType;
  const displayProfileGraphColumn = profileGraphColumn;
  const availableGrowthMetrics = displayBeneficiaryType === 'mother' ? MOTHER_GROWTH_METRICS : GROWTH_METRICS;
  const availableProfileMetrics = displayBeneficiaryType === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS;
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
  const graphSourceRows = displayReportCategory === 'program' ? aggregateReportRows(resultsRows, 'group-school') : resultsRows;
  const graphRows = aggregateGrowthRows(
    graphSourceRows.filter((row) => growthMetrics.some((metric) => INTERPRETATION_METRICS.has(metric)
      ? row.growthSeries?.some((point) => getPointInterpretation(point, metric))
      : Number.isFinite(Number(row[metric])) && Number(row[metric]) > 0)),
    displayReportFocus,
  );
  const averageMetric = (field, rows = resultsRows) => {
    if (INTERPRETATION_METRICS.has(field)) return rows.map((row) => row[field]).find(Boolean) || '—';
    const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value) && value > 0);
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
    setSelection(isHealthWorker
      ? {
        schoolId: currentUser.school_id ?? currentUser.schoolId ?? '',
        groupId: currentUser.group_id ?? currentUser.groupId ?? '',
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
    setResultsView('graph');
    setDisplayWeeks('all');
    setProfileGraphColumn('gender');
    setProgramName('');
    setBenefitPeriod('overall');
    setBenefitMonth(new Date().toISOString().slice(0, 7));
    setActiveTab(1);
    setPage(1);
    setError('');
  };
  const selectGrowthMetric = (id) => setGrowthMetrics([id]);
  const toggleProfileMetric = (id) => setProfileMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const toggleProgramMetric = (id) => setProgramMetrics((current) => current.includes(id) ? current.filter((field) => field !== id) : [...current, id]);
  const selectBeneficiaryType = (type) => {
    setBeneficiaryType(type);
    setProfileMetrics((type === 'mother' ? MOTHER_PROFILE_METRICS : CHILD_PROFILE_METRICS).map(([id]) => id));
    setGrowthMetrics(type === 'mother' ? ['bmiForAge'] : ['weightForLengthInterpretation']);
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
    if (activeTab !== 4) return undefined;
    const selector = document.querySelector('.graph-controls select');
    const selectorWrap = selector?.closest('.report-chart-select');
    const heading = document.querySelector('.growth-report-single-card h3');
    const subtitle = document.querySelector('.growth-report-single-card > p');
    const exportButton = document.querySelector('.progress-report-results-header > .secondary-btn')
      || [...document.querySelectorAll('.results-tab-panel button.secondary-btn')].find((button) => button.textContent.trim() === 'Export CSV');
    const resultsHeader = document.querySelector('.progress-report-results-header');
    const chartActions = document.querySelector('.program-average-chart-actions');
    if (exportButton && displayReportCategory === 'program' && chartActions) chartActions.appendChild(exportButton);
    if (exportButton && displayReportCategory !== 'program' && resultsHeader) resultsHeader.appendChild(exportButton);
    if (selectorWrap) selectorWrap.style.display = '';
    if (selector && displayReportCategory === 'program') {
      PROGRAM_METRICS.forEach(([id, label], index) => {
        const option = selector.options[index];
        if (!option) return;
        option.value = id;
        option.textContent = label;
        option.style.display = '';
      });
      Array.from(selector.options).slice(PROGRAM_METRICS.length).forEach((option) => { option.style.display = 'none'; });
      selector.value = displayWeeks;
    } else if (selector && displayReportCategory !== 'profile') {
      const labels = beneficiaryType === 'mother'
        ? ['3 months', '6 months', '9 months', '12 months', 'All months']
        : ['4 weeks', '12 weeks', '24 weeks', '48 weeks', 'All weeks'];
      const values = beneficiaryType === 'mother' ? ['3', '6', '9', '12', 'all'] : ['4', '12', '24', '48', 'all'];
      Array.from(selector.options).forEach((option, index) => { option.value = values[index]; option.textContent = labels[index]; option.style.display = ''; });
    }
    if (heading && beneficiaryType === 'mother') heading.textContent = '📈 BMI';
    if (subtitle && beneficiaryType === 'mother') subtitle.textContent = 'Latest mother BMI measurements · values are plotted by month';
    if (subtitle && displayReportCategory === 'monitor' && beneficiaryType === 'child') subtitle.textContent = 'Growth interpretations plotted by monitoring week';
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
        <div className="progress-report-tab-bar" role="tablist" aria-label="Progress report steps">
          {REPORT_TABS.map((tab, index) => { const number = index + 1; return <button key={tab} type="button" role="tab" aria-selected={activeTab === number} disabled={!canOpenTab(number)} className={activeTab === number ? 'active' : ''} onClick={() => goToTab(number)}><span>{number}</span>{tab}</button>; })}
        </div>

        <section className="progress-report-config" aria-label="Report parameters">
          {activeTab === 1 && <div className="progress-report-tab-panel"><h1>I. Community Selection</h1><div className="progress-report-config-grid"><label>School<select value={selection.schoolId} onChange={(event) => updateSelection('schoolId', event.target.value)} disabled={isHealthWorker}><option value="">Select school</option>{options.schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Group<select value={selection.groupId} onChange={(event) => updateSelection('groupId', event.target.value)} disabled={!selection.schoolId || isHealthWorker}><option value="">All groups</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Batch<select value={selection.batchId} onChange={(event) => updateSelection('batchId', event.target.value)} disabled={!selection.groupId}><option value="">All batches</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><p className="progress-report-note">{isHealthWorker ? 'School and group are assigned to your account. Batch is an optional filter.' : 'Select a School to begin. Group and Batch are optional filters.'}</p><div className="progress-report-tab-actions"><button type="button" className="primary-btn" disabled={!selection.schoolId} onClick={() => setActiveTab(2)}>Next: Report Focus →</button></div></div>}
          {activeTab === 2 && <div className="progress-report-tab-panel"><h1>II. Report Focus</h1><fieldset className="progress-report-report-category"><legend>Report category</legend><label className={reportCategory === 'profile' ? 'selected' : ''}><input type="radio" name="report-category" value="profile" checked={reportCategory === 'profile'} onChange={() => selectReportCategory('profile')} />Profile Report</label><label className={reportCategory === 'monitor' ? 'selected' : ''}><input type="radio" name="report-category" value="monitor" checked={reportCategory === 'monitor'} onChange={() => selectReportCategory('monitor')} />Monitor Report</label><label className={reportCategory === 'program' ? 'selected' : ''}><input type="radio" name="report-category" value="program" checked={reportCategory === 'program'} onChange={() => selectReportCategory('program')} />Program Report</label></fieldset><p className="progress-report-note">Monitor Report is selected by default and uses details from the Monitor module.</p>{reportCategory === 'program' ? <fieldset className="progress-report-beneficiary-type"><legend>Program Name</legend><div className="program-report-controls"><label><span>Program</span><select value={programName} onChange={(event) => setProgramName(event.target.value)}><option value="">Select program</option>{programs.map((program) => <option key={program.id} value={program.name}>{program.name}</option>)}</select></label><label><span>Benefit period</span><select value={benefitPeriod} onChange={(event) => setBenefitPeriod(event.target.value)}><option value="overall">Overall</option><option value="month">Monthly</option></select></label>{benefitPeriod === 'month' && <label><span>Month</span><input type="month" value={benefitMonth} onChange={(event) => setBenefitMonth(event.target.value)} /></label>}</div></fieldset> : <fieldset className="progress-report-beneficiary-type"><legend>Beneficiary type</legend><label className={beneficiaryType === 'child' ? 'selected' : ''}><input type="radio" name="report-beneficiary-type" checked={beneficiaryType === 'child'} onChange={() => selectBeneficiaryType('child')} />Child</label><label className={beneficiaryType === 'mother' ? 'selected' : ''}><input type="radio" name="report-beneficiary-type" checked={beneficiaryType === 'mother'} onChange={() => selectBeneficiaryType('mother')} />Mother</label></fieldset>}<div className="progress-report-focus-section"><p>Choose the aggregation level for the selected community scope:</p>{!selection.schoolId ? <p className="progress-report-note">Select a school first to see valid focus options.</p> : <fieldset className="progress-report-focus-options">{focusOptions.map(([value, label]) => <label key={value}><input type="radio" name="report-focus" value={value} checked={reportFocus === value} onChange={() => setReportFocus(value)} />{label}</label>)}</fieldset>}</div><p className="progress-report-note">{reportCategory === 'program' ? 'Program reports show true received-benefit events for the selected period.' : beneficiaryType === 'mother' ? 'Mother reports use BMI from Mother Monitoring checkups.' : 'Child reports use growth measurements from Child Monitoring checkups.'}</p><div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(1)}>← Previous</button><button type="button" className="primary-btn" disabled={!selection.schoolId || (reportCategory === 'program' && !programName)} onClick={() => setActiveTab(3)}>Next: Growth Metrics →</button></div></div>}
          {activeTab === 3 && <div className="progress-report-tab-panel"><h1>III. Growth Metrics</h1>{reportCategory === 'profile' ? <><p>Choose the beneficiary profile fields to include in the report:</p><div className="growth-metric-cards profile-metric-cards">{availableProfileMetrics.map(([id, label, description]) => <label key={id} className={profileMetrics.includes(id) ? 'selected' : ''}><input type="checkbox" name="profile-metric" checked={profileMetrics.includes(id)} onChange={() => toggleProfileMetric(id)} /><strong>{label}</strong><span>{description}</span></label>)}</div><p className="progress-report-note">Profile values come from the Beneficiary module. Child baselines use birth weight and birth length; mother baselines use prenatal weight and height.</p></> : reportCategory === 'program' ? <><p>Choose the program progress fields to include in the report:</p><div className="growth-metric-cards profile-metric-cards">{PROGRAM_METRICS.map(([id, label, description]) => <label key={id} className={programMetrics.includes(id) ? 'selected' : ''}><input type="checkbox" name="program-metric" checked={programMetrics.includes(id)} onChange={() => toggleProgramMetric(id)} /><strong>{label}</strong><span>{description}</span></label>)}</div><p className="progress-report-note">Program values come from the Program and monitoring activity records for the selected community scope.</p></> : <><p>{beneficiaryType === 'mother' ? 'Review mother BMI from Mother Monitoring.' : 'Choose one child growth indicator to display and export:'}</p><div className="growth-metric-cards">{availableGrowthMetrics.map(([id, label, description]) => <label key={id} className={growthMetrics.includes(id) ? 'selected' : ''}><input type="radio" name="growth-metric" checked={growthMetrics.includes(id)} onChange={() => selectGrowthMetric(id)} /><strong>{label}</strong><span>{description}</span></label>)}</div><p className="progress-report-note warning">This field reports the latest recorded measurement. It is not an age- and sex-standardized WHO z-score.</p></>}<div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(2)}>← Previous</button><button type="button" className="primary-btn" onClick={() => generateReport(1)} disabled={loadingOptions || loadingReport || !selection.schoolId || (reportCategory === 'profile' ? !profileMetrics.length : reportCategory === 'program' ? !programMetrics.length : !growthMetrics.length)}>{loadingReport ? 'Generating...' : 'Generate Report →'}</button></div></div>}
          {activeTab === 4 && activeReport && <div className="progress-report-tab-panel results-tab-panel"><div className="progress-report-results-header"><div><h1>IV. Report Results</h1><p>{selectedSchool?.name || 'School'} &gt; {selection.groupId ? groups.find((item) => String(item.id) === String(selection.groupId))?.name : 'All Groups'} &gt; {selection.batchId ? batches.find((item) => String(item.id) === String(selection.batchId))?.name : 'All Batches'}</p></div><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div><div className="results-view-toggle"><button type="button" className={resultsView === 'table' ? 'active' : ''} onClick={() => setResultsView('table')}>Table View</button><button type="button" className={resultsView === 'graph' ? 'active' : ''} onClick={() => setResultsView('graph')}>Graph View</button>{resultsView === 'graph' && <div className="graph-controls">{displayReportCategory === 'profile' ? <label className="report-chart-select">Graph column<select value={profileGraphColumn} onChange={(event) => setProfileGraphColumn(event.target.value)}>{PROFILE_GRAPH_FIELDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label> : <label className="report-chart-select">Display<select value={displayWeeks} onChange={(event) => setDisplayWeeks(event.target.value)}><option value="4">4 weeks</option><option value="12">12 weeks</option><option value="24">24 weeks</option><option value="48">48 weeks</option><option value="all">All weeks</option></select></label>}</div>}</div>{resultsView === 'graph' ? displayReportCategory === 'profile' ? <article className="growth-report-card growth-report-single-card"><h3>📊 {PROFILE_GRAPH_FIELD_MAP.get(displayProfileGraphColumn)?.label || 'Profile distribution'}</h3><p>Distribution across the selected report results.</p><ProfileGraph rows={resultsRows} field={displayProfileGraphColumn} /></article> : <article className="growth-report-card growth-report-single-card"><h3>📈 {GROWTH_METRICS.find(([id]) => id === growthMetrics[0])?.[1]}</h3><div className="growth-report-value">{averageMetric(growthMetrics[0], graphRows)}</div><p>{beneficiaryType === 'mother' ? 'Latest mother BMI measurements · values are plotted by gestational week' : 'Latest monitored measurements · values are plotted by monitoring week'}</p><GrowthChart rows={graphRows} metric={growthMetrics[0]} chartType="line" displayWeeks={displayWeeks} beneficiaryType={beneficiaryType} /></article> : <div className="progress-report-table-scroll"><table className="progress-report-flat-table"><thead><tr>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id, label]) => <th key={id}>{sortLabel(label, id)}</th>)}</tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.motherId}-${row.child || 'mother'}`}>{REPORT_FIELDS.filter(([id]) => displayVisibleFields.includes(id)).map(([id]) => <td key={id}>{id === 'child' && displayGranularity === 'mother' ? row.mother : id === 'progress' ? <strong>{row[id]}%</strong> : formatCellValue(id, row[id])}</td>)}</tr>)}</tbody></table></div>}{resultsView === 'table' && <div className="progress-report-pagination"><button type="button" onClick={() => generateReport(displayPage - 1)} disabled={displayPage <= 1 || loadingReport}>Previous</button><span>Page {displayPage} of {activeReport.pagination.totalPages}</span><button type="button" onClick={() => generateReport(displayPage + 1)} disabled={displayPage >= activeReport.pagination.totalPages || loadingReport}>Next</button></div>}<div className="progress-report-tab-actions"><button type="button" className="secondary-btn" onClick={() => setActiveTab(3)}>← Previous</button><button type="button" className="secondary-btn" onClick={exportReport}>Export CSV</button></div></div>}
        </section>
      </div>
    </div>
  );
}
