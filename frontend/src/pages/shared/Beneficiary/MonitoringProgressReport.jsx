import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay, formatDateForInput } from '../../../utils/dateFormat';
import { calculateWhoGrowthScores } from '../../../utils/whoGrowthStandards';
import './MonitoringProgressReport.css';

const valueOrDash = (value, suffix = '') => (
  value === null || value === undefined || String(value).trim() === '' ? '—' : `${value}${suffix}`
);

function getMotherRecords(mother) {
  return (Array.isArray(mother?.checkups) ? mother.checkups : [])
    .flatMap((trimester, trimesterIndex) => (Array.isArray(trimester) ? trimester : []).map((record, checkupIndex) => ({
      ...record,
      stepIndex: trimesterIndex * 3 + checkupIndex,
      period: `${['1st', '2nd', '3rd'][trimesterIndex] || `${trimesterIndex + 1}th`} Trimester · Check-up ${checkupIndex + 1}`,
      date: record?.checkupDate || record?.checkup_date || record?.visit_date,
      gestationalAge: record?.gestationalAge ?? record?.gestational_age,
      weight: record?.weight,
      height: record?.height ?? mother?.height ?? mother?.prenatalHeight ?? mother?.prenatal_height,
      bloodPressure: record?.bp || record?.bloodPressure || record?.blood_pressure,
      bmi: getBmi(
        record?.weight,
        record?.height ?? mother?.height ?? mother?.prenatalHeight ?? mother?.prenatal_height,
        record?.bmi,
      ),
    })))
    .filter((record) => record && (record.completed || record.date || record.weight || record.bloodPressure || record.bmi));
}

function getBmi(weight, height, storedBmi) {
  const storedValue = Number(storedBmi);
  if (storedBmi !== null && storedBmi !== undefined && storedBmi !== '' && Number.isFinite(storedValue) && storedValue > 0) {
    return storedValue;
  }
  const numericWeight = Number(weight);
  const numericHeight = Number(height);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0 || !Number.isFinite(numericHeight) || numericHeight <= 0) return null;
  return Number((numericWeight / ((numericHeight / 100) ** 2)).toFixed(1));
}

function getChildRecords(child) {
  return (Array.isArray(child?.checkups) ? child.checkups : [])
    .map((record) => ({
      ...record,
      stepIndex: record?.week_number ?? record?.weekNumber,
      period: `Month ${record?.week_number ?? record?.weekNumber ?? '—'}`,
      date: record?.visit_date || record?.checkupDate || record?.checkup_date,
      weight: record?.weight,
      height: record?.height,
      status: record?.developmental_status || record?.developmentalStatus,
    }))
    .filter((record) => record && (record.date || record.weight || record.height || record.status))
    .map((record) => ({
      ...record,
      growthScores: calculateWhoGrowthScores({
        weight: record.weight,
        lengthHeight: record.height,
        sex: child?.gender || child?.sex,
        birthDate: child?.birthDate || child?.birth_date || child?.dateOfBirth || child?.date_of_birth,
        measurementDate: record.date,
      }),
    }));
}

function getChartMetrics(isMother) {
  return isMother
    ? [{ id: 'bmi', label: 'BMI', unit: 'kg/m²', color: '#168348', series: 'bmi' }]
    : [
      { id: 'weightForLengthZScore', label: 'Weight-for-Length/Height', unit: 'Z-score', color: '#168348', series: 'who' },
      { id: 'weightForAgeZScore', label: 'Weight-for-Age', unit: 'Z-score', color: '#2563eb', series: 'who' },
      { id: 'lengthForAgeZScore', label: 'Length/Height-for-Age', unit: 'Z-score', color: '#d97706', series: 'who' },
    ];
}

function getChartValue(record, metric) {
  const rawValue = metric.series === 'who' ? record.growthScores?.[metric.id] : record[metric.id];
  const value = Number(rawValue);
  return rawValue === null || rawValue === undefined || rawValue === '' || !Number.isFinite(value)
    ? null
    : value;
}

function ProgressGraph({ records, metric }) {
  const height = 300;
  const width = Math.max(720, records.length * 82 + 88);
  const left = 64;
  const right = width - 24;
  const top = 20;
  const bottom = height - 68;
  const plotRecords = [...records].reverse();
  const points = plotRecords.flatMap((record, index) => {
    const value = getChartValue(record, metric);
    return value === null ? [] : [{ record, index, value }];
  });

  if (!points.length) {
    const requirement = metric.series === 'who'
      ? 'WHO growth scores need dated check-ups with weight, length/height, birth date, and sex recorded.'
      : 'BMI needs a recorded check-up weight and height.';
    return <p className="monitoring-progress-report-empty">No {metric.label.toLowerCase()} measurements are available to graph. {requirement}</p>;
  }

  const minimum = Math.min(...points.map(({ value }) => value));
  const maximum = Math.max(...points.map(({ value }) => value));
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.1, 1);
  const min = metric.series === 'who'
    ? Math.min(-4, Math.floor(minimum - 0.5))
    : minimum - span * 0.1;
  const max = metric.series === 'who'
    ? Math.max(4, Math.ceil(maximum + 0.5))
    : maximum + span * 0.1;
  const x = (index) => plotRecords.length === 1
    ? (left + right) / 2
    : left + (index / (plotRecords.length - 1)) * (right - left);
  const y = (value) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const tickStep = metric.series === 'who'
    ? Math.max(1, Math.ceil((max - min) / 12))
    : null;
  const ticks = metric.series === 'who'
    ? Array.from(
      { length: Math.floor((max - min) / tickStep) + 1 },
      (_, index) => Math.ceil(min / tickStep) * tickStep + index * tickStep,
    ).filter((tick) => tick <= max)
    : Array.from({ length: 4 }, (_, index) => min + ((max - min) * index) / 3);
  const linePoints = points.map(({ index, value }) => `${x(index)},${y(value)}`).join(' ');

  return (
    <div className="monitoring-progress-report-graph-scroll">
      <svg
        className="monitoring-progress-report-graph"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: `max(100%, ${width}px)` }}
        role="img"
        aria-label={`${metric.label} progress graph`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
              className={`monitoring-progress-report-gridline${metric.series === 'who' && [0, -2, 2, -3, 3].includes(tick) ? ` is-reference is-reference-${Math.abs(tick)}` : ''}${metric.series === 'who' && tick === 0 ? ' is-zero' : ''}`}
            />
            <text className="monitoring-progress-report-y-label" x={left - 10} y={y(tick) + 4} textAnchor="end">
              {metric.series === 'who' ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}
        {plotRecords.map((record, index) => (
          <text className="monitoring-progress-report-x-label" key={`${record.period}-${index}`} x={x(index)} y={bottom + 22} textAnchor="middle">
            {record.period.replace(' Trimester · Check-up ', ' · ')}
          </text>
        ))}
        {points.length > 1 && <polyline className="monitoring-progress-report-line" points={linePoints} fill="none" stroke={metric.color} strokeWidth="3" />}
        {points.map(({ record, index, value }) => (
          <circle className="monitoring-progress-report-point" key={`${record.period}-${index}`} cx={x(index)} cy={y(value)} r="5" style={{ fill: metric.color }}>
            <title>{`${record.period}: ${value.toFixed(2)} ${metric.unit}`}</title>
          </circle>
        ))}
        <text x={left} y={height - 8} className="monitoring-progress-report-axis-label">{metric.label} ({metric.unit})</text>
      </svg>
    </div>
  );
}

export default function MonitoringProgressReport({ beneficiaryType, beneficiary }) {
  const navigate = useNavigate();
  const [view, setView] = useState('table');
  const isMother = beneficiaryType === 'Mother';
  const metrics = getChartMetrics(isMother);
  const [metricId, setMetricId] = useState(isMother ? 'bmi' : 'weightForLengthZScore');
  const records = (isMother ? getMotherRecords(beneficiary) : getChildRecords(beneficiary))
    .sort((left, right) => formatDateForInput(right.date).localeCompare(formatDateForInput(left.date)));
  const total = isMother ? 9 : 24;
  const latest = records[0];
  const progress = Math.min(100, Math.round((records.length / total) * 100));
  const selectedMetric = metrics.find(({ id }) => id === metricId) || metrics[0];
  const openCheckup = (record) => {
    if (isMother) {
      const motherId = beneficiary?.id || beneficiary?.motherId || beneficiary?.mother_id;
      if (!motherId || !Number.isInteger(record.stepIndex)) return;
      navigate(`/beneficiary/mother/${motherId}/monitoring`, {
        state: { mother: beneficiary, checkupStep: record.stepIndex },
      });
      return;
    }

    const childId = beneficiary?.id || beneficiary?.childId || beneficiary?.child_id || beneficiary?.child_code;
    const week = Number(record.stepIndex);
    if (!childId || !Number.isInteger(week) || week < 1 || week > total) return;
    navigate('/monitoring', { state: { child: beneficiary, week } });
  };

  return (
    <section className="monitoring-progress-report" aria-labelledby="monitoring-progress-report-title">
      <header className="monitoring-progress-report-header">
        <div>
          <span className="checkup-module-kicker">Monitoring summary</span>
          <h2 id="monitoring-progress-report-title">Current Progress Report</h2>
          <p>{beneficiary?.name || beneficiary?.full_name || 'Beneficiary'} · {beneficiaryType}</p>
        </div>
        <div className="monitoring-progress-report-count" aria-label={`${records.length} of ${total} check-ups recorded`}>
          <strong>{records.length}/{total}</strong>
          <span>check-ups recorded</span>
        </div>
      </header>

      <div className="monitoring-progress-report-meter" role="progressbar" aria-label="Monitoring check-up progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {latest && (
        <div className="monitoring-progress-report-latest">
          <strong>Latest report</strong>
          <span>{latest.period}</span>
          <span>{formatDateForDisplay(latest.date)}</span>
          {isMother ? (
            <>
              <span>Gestational age: {valueOrDash(latest.gestationalAge, ' weeks')}</span>
              <span>Weight: {valueOrDash(latest.weight, ' kg')}</span>
              <span>BMI: {valueOrDash(latest.bmi)}</span>
            </>
          ) : (
            <>
              <span>Weight: {valueOrDash(latest.weight, ' kg')}</span>
              <span>Length: {valueOrDash(latest.height, ' cm')}</span>
              <span>Development: {valueOrDash(latest.status)}</span>
            </>
          )}
        </div>
      )}

      <div className="monitoring-progress-report-view-controls" role="group" aria-label="Progress report view">
        <button type="button" className={view === 'table' ? 'active' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}>Table View</button>
        <button type="button" className={view === 'graph' ? 'active' : ''} aria-pressed={view === 'graph'} onClick={() => setView('graph')}>Graph View</button>
      </div>

      {records.length ? (
        view === 'table' ? (
          <div className="monitoring-progress-report-table-wrap">
            <table className="monitoring-progress-report-table">
              <thead>
                <tr>
                  <th scope="col">Check-up</th>
                  <th scope="col">Date</th>
                  {isMother ? (
                    <>
                      <th scope="col">Gestational age</th>
                      <th scope="col">Weight</th>
                      <th scope="col">Blood pressure</th>
                      <th scope="col">Remarks</th>
                    </>
                  ) : (
                    <>
                      <th scope="col">Weight</th>
                      <th scope="col">Length</th>
                      <th scope="col">Development</th>
                      <th scope="col">Notes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const isClickable = isMother
                    ? Boolean((beneficiary?.id || beneficiary?.motherId || beneficiary?.mother_id) && Number.isInteger(record.stepIndex))
                    : Boolean(
                      (beneficiary?.id || beneficiary?.childId || beneficiary?.child_id || beneficiary?.child_code)
                      && Number.isInteger(Number(record.stepIndex))
                      && Number(record.stepIndex) >= 1
                      && Number(record.stepIndex) <= total,
                    );

                  return (
                    <tr
                      key={`${record.period}-${record.date || index}`}
                      className={isClickable ? 'is-clickable' : ''}
                      onClick={isClickable ? () => openCheckup(record) : undefined}
                      onKeyDown={isClickable ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openCheckup(record);
                        }
                      } : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      role={isClickable ? 'link' : undefined}
                      aria-label={isClickable ? `Open ${record.period} monitoring check-up` : undefined}
                    >
                      <td>{record.period}</td>
                      <td>{formatDateForDisplay(record.date)}</td>
                      {isMother ? (
                        <>
                          <td>{valueOrDash(record.gestationalAge, ' weeks')}</td>
                          <td>{valueOrDash(record.weight, ' kg')}</td>
                          <td>{valueOrDash(record.bloodPressure)}</td>
                          <td>{valueOrDash(record.remarks || record.notes)}</td>
                        </>
                      ) : (
                        <>
                          <td>{valueOrDash(record.weight, ' kg')}</td>
                          <td>{valueOrDash(record.height, ' cm')}</td>
                          <td>{valueOrDash(record.status)}</td>
                          <td>{valueOrDash(record.notes || record.remarks)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="monitoring-progress-report-graph-panel">
            {isMother ? (
              <p className="monitoring-progress-report-graph-metric"><span>Maternal monitoring metric</span><strong>BMI</strong></p>
            ) : (
              <label>
                Growth indicator
                <select value={selectedMetric.id} onChange={(event) => setMetricId(event.target.value)}>
                  {metrics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            )}
            <ProgressGraph records={records} metric={selectedMetric} />
          </div>
        )
      ) : (
        <p className="monitoring-progress-report-empty">No check-up progress has been recorded yet.</p>
      )}
    </section>
  );
}
