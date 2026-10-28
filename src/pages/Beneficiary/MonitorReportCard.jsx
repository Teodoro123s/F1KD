import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '../../utils/formatting/dateFormat';
import { calculateWhoGrowthScores } from '../../utils/beneficiary/whoGrowthStandards';

const CHILD_METRICS = [
  { key: 'weightForAge', label: 'Weight-for-Age', score: 'weightForAgeZScore', interpretation: 'weightForAgeInterpretation' },
  { key: 'lengthForAge', label: 'Length/Height-for-Age', score: 'lengthForAgeZScore', interpretation: 'lengthForAgeInterpretation' },
  { key: 'weightForLength', label: 'Weight-for-Length/Height', score: 'weightForLengthZScore', interpretation: 'weightForLengthInterpretation' },
];

const getBmi = (checkup) => {
  const recordedBmi = Number(checkup.bmi);
  if (Number.isFinite(recordedBmi) && recordedBmi > 0) return recordedBmi;

  const weight = Number(checkup.weight ?? checkup.weight_kg);
  const heightCm = Number(checkup.height ?? checkup.height_cm);
  if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || weight <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
};

const getBmiInterpretation = (bmi) => {
  if (bmi === null) return 'Not available';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal range';
  if (bmi < 30) return 'Overweight';
  return 'Obesity range';
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const ReportTrendGraph = ({ rows, valueKey, valueGetter, label, unit, precision = 1, normalRange, axisRange, styleVariant, onPointSelect }) => {
  const points = rows
    .map((row) => ({ ...row, value: toFiniteNumber(valueGetter ? valueGetter(row) : row[valueKey]) }))
    .filter((row) => row.value !== null)
    .reverse();

  if (!points.length) {
    return <p className="monitor-report-empty">No numeric measurements are available to graph.</p>;
  }

  const width = 640;
  const height = 260;
  const padding = { top: 24, right: 22, bottom: 52, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const valuePadding = range === 0 ? Math.max(Math.abs(maxValue) * 0.1, 0.5) : range * 0.12;
  const axisMin = axisRange?.min ?? Math.min(minValue - valuePadding, normalRange?.min ?? Infinity);
  const axisMax = axisRange?.max ?? Math.max(maxValue + valuePadding, normalRange?.max ?? -Infinity);
  const axisSpan = axisMax - axisMin || 1;
  const getX = (index) => padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const getY = (value) => padding.top + ((axisMax - value) / axisSpan) * plotHeight;
  const linePoints = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');
  const labelInterval = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className={`monitor-report-graph${styleVariant === 'who' ? ' monitor-report-graph--who growth-report-line-chart' : ''}`} role={onPointSelect ? 'group' : 'img'} aria-label={`${label} trend graph with ${points.length} monitoring ${points.length === 1 ? 'visit' : 'visits'}${normalRange ? `. Shaded area shows the normal range from ${normalRange.min} to ${normalRange.max} Z-score` : ''}.${onPointSelect ? ' Select a data point to open its check-up record.' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMid meet" aria-hidden={onPointSelect ? undefined : true}>
        {normalRange && (
          <rect
            className="monitor-report-graph__normal-range"
            x={padding.left}
            y={getY(normalRange.max)}
            width={plotWidth}
            height={getY(normalRange.min) - getY(normalRange.max)}
          />
        )}
        {[0, 1, 2, 3, 4].map((index) => {
          const y = padding.top + (index / 4) * plotHeight;
          const value = axisMax - (index / 4) * axisSpan;
          return (
            <g key={index} className="monitor-report-graph__grid">
              <line className={styleVariant === 'who' ? 'growth-report-gridline' : undefined} x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
              <text className={styleVariant === 'who' ? 'growth-report-y-axis-tick' : undefined} x={padding.left - 10} y={y + 4} textAnchor="end">{value.toFixed(precision)}</text>
            </g>
          );
        })}
        {points.length > 1 && (
          <polyline points={linePoints} fill="none" stroke="#168447" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((point, index) => (
          <g
            key={point.key}
            className={onPointSelect ? 'monitor-report-graph__point is-routeable' : 'monitor-report-graph__point'}
            role={onPointSelect ? 'button' : undefined}
            tabIndex={onPointSelect ? 0 : undefined}
            aria-label={onPointSelect ? `Open ${formatDateForDisplay(point.date)} check-up form, ${label.toLowerCase()} ${point.value.toFixed(precision)} ${unit}` : undefined}
            onClick={onPointSelect ? () => onPointSelect(point) : undefined}
            onKeyDown={onPointSelect ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPointSelect(point);
              }
            } : undefined}
          >
            {onPointSelect && <circle className="monitor-report-graph__point-target" cx={getX(index)} cy={getY(point.value)} r="12" fill="transparent" />}
            <circle cx={getX(index)} cy={getY(point.value)} r="5" fill="#168447" stroke="white" strokeWidth="2">
              <title>{`${formatDateForDisplay(point.date)}: ${point.value.toFixed(precision)} ${unit}`}</title>
            </circle>
            {(index % labelInterval === 0 || index === points.length - 1) && (
              <text className={`monitor-report-graph__x-label${styleVariant === 'who' ? ' growth-report-x-axis-tick' : ''}`} x={getX(index)} y={height - 18} textAnchor="middle">
                {formatDateForDisplay(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p>{label} ({unit}) by visit date{onPointSelect ? '. Select a point to open its check-up form.' : ''}</p>
    </div>
  );
};

export default function MonitorReportCard({ beneficiaryType, beneficiary }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [metricKey, setMetricKey] = useState(CHILD_METRICS[0].key);
  const [displayMode, setDisplayMode] = useState('value');
  const [reportView, setReportView] = useState('table');

  const motherRows = useMemo(() => {
    if (beneficiaryType !== 'mother') return [];
    const checkups = Array.isArray(beneficiary?.checkups)
      ? beneficiary.checkups.flatMap((trimester, trimesterIndex) => (
        Array.isArray(trimester)
          ? trimester.map((checkup, checkupIndex) => ({ checkup, slotStep: trimesterIndex * 3 + checkupIndex }))
          : [{ checkup: trimester, slotStep: trimesterIndex }]
      )).filter(({ checkup }) => checkup)
      : [];
    return checkups
      .map(({ checkup, slotStep }, index) => {
        const bmi = getBmi(checkup);
        const trimester = String(checkup.trimester ?? '').toLowerCase();
        const trimesterIndex = trimester.includes('3rd') || trimester.includes('third')
          ? 2
          : trimester.includes('2nd') || trimester.includes('second') ? 1 : Math.floor(slotStep / 3);
        const checkupNumber = Number(checkup.checkupNumber ?? checkup.checkup_number);
        const checkupIndex = Number.isInteger(checkupNumber) && checkupNumber >= 1 && checkupNumber <= 3
          ? checkupNumber - 1
          : slotStep % 3;
        return {
          key: checkup.id || `${checkup.checkupDate || checkup.checkup_date || 'checkup'}-${index}`,
          date: checkup.checkupDate || checkup.checkup_date,
          trimester: checkup.trimester || '—',
          bmi,
          interpretation: getBmiInterpretation(bmi),
          stepIndex: trimesterIndex * 3 + checkupIndex,
        };
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [beneficiary, beneficiaryType]);

  const childRows = useMemo(() => {
    if (beneficiaryType !== 'child') return [];
    const checks = Array.isArray(beneficiary?.checkups) ? beneficiary.checkups : [];
    const birthDate = beneficiary.birthDate || beneficiary.birth_date;
    const sex = beneficiary.gender || beneficiary.sex;

    return checks
      .map((checkup, index) => {
        const date = checkup.checkupDate || checkup.visit_date || checkup.checkup_date;
        const scores = calculateWhoGrowthScores({
          weight: checkup.weight,
          lengthHeight: checkup.height ?? checkup.lengthHeight ?? checkup.length_height,
          sex,
          birthDate,
          measurementDate: date,
        });
        return {
          key: checkup.id || `${date || 'checkup'}-${index}`,
          date,
          week: checkup.weekNumber ?? checkup.week_number,
          weight: checkup.weight ?? null,
          height: checkup.height ?? checkup.lengthHeight ?? checkup.length_height ?? null,
          scores,
        };
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [beneficiary, beneficiaryType]);

  if (beneficiaryType === 'mother') {
    return (
      <section className="mother-detail-section monitor-report-card" aria-labelledby="mother-monitor-report-title">
        <div className="monitor-report-heading">
          <div>
            <h3 className="mother-detail-section-title" id="mother-monitor-report-title">Monitor Report</h3>
            <p>Maternal BMI values recorded during monitoring visits.</p>
          </div>
          <div className="monitor-report-views" role="group" aria-label="Choose monitor report view">
            <button type="button" className={reportView === 'table' ? 'active' : ''} aria-pressed={reportView === 'table'} onClick={() => setReportView('table')}>Table</button>
            <button type="button" className={reportView === 'graph' ? 'active' : ''} aria-pressed={reportView === 'graph'} onClick={() => setReportView('graph')}>Graph</button>
          </div>
        </div>
        {reportView === 'table' ? (
          <div className="monitor-report-table-wrap">
            <table className="mother-detail-table monitor-report-table">
              <thead>
                <tr>
                  <th>Visit date</th>
                  <th>Trimester</th>
                  <th>BMI</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {motherRows.length ? motherRows.map((row) => (
                  <tr key={row.key}>
                    <td>{formatDateForDisplay(row.date)}</td>
                    <td>{row.trimester}</td>
                    <td>{row.bmi === null ? '—' : row.bmi.toFixed(1)}</td>
                    <td>{row.interpretation}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="mother-detail-empty-row">No maternal monitoring BMI has been recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportTrendGraph
            rows={motherRows}
            valueKey="bmi"
            label="BMI"
            unit="kg/m²"
            onPointSelect={(point) => navigate('/monitoring', {
              state: {
                mother: beneficiary,
                checkupStep: point.stepIndex,
                returnTo: `${location.pathname}${location.search}`,
              },
            })}
          />
        )}
        <p className="monitor-report-note">BMI categories are informational adult ranges and are not a pregnancy-specific assessment. Interpret with the care provider.</p>
      </section>
    );
  }

  const selectedMetric = CHILD_METRICS.find((metric) => metric.key === metricKey) || CHILD_METRICS[0];
  const isWeightForLength = selectedMetric.key === 'weightForLength';
  const rowsWithValues = childRows.filter((row) => isWeightForLength
    ? toFiniteNumber(row.weight) !== null || toFiniteNumber(row.height) !== null
    : toFiniteNumber(row.scores[selectedMetric.score]) !== null || Boolean(row.scores[selectedMetric.interpretation]));

  return (
    <section className="mother-detail-section monitor-report-card" aria-labelledby="child-monitor-report-title">
      <div className="monitor-report-heading">
        <div>
          <h3 className="mother-detail-section-title" id="child-monitor-report-title">Monitor Report</h3>
          <p>WHO growth standards calculated from recorded monitoring measurements.</p>
        </div>
        <div className="monitor-report-filters">
          <label>
            <span>WHO indicator</span>
            <select value={metricKey} onChange={(event) => setMetricKey(event.target.value)}>
              {CHILD_METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
            </select>
          </label>
          {reportView === 'table' && !isWeightForLength && (
            <label>
              <span>Display</span>
              <select value={displayMode} onChange={(event) => setDisplayMode(event.target.value)}>
                <option value="value">WHO value (Z-score)</option>
                <option value="interpretation">Interpretation</option>
              </select>
            </label>
          )}
          <div className="monitor-report-views" role="group" aria-label="Choose monitor report view">
            <button type="button" className={reportView === 'table' ? 'active' : ''} aria-pressed={reportView === 'table'} onClick={() => setReportView('table')}>Table</button>
            <button type="button" className={reportView === 'graph' ? 'active' : ''} aria-pressed={reportView === 'graph'} onClick={() => setReportView('graph')}>Graph</button>
          </div>
        </div>
      </div>
      {reportView === 'table' ? (
        <div className="monitor-report-table-wrap">
          <table className="mother-detail-table monitor-report-table">
            <thead>
              <tr>
                <th>Visit date</th>
                <th>Age at visit</th>
                {isWeightForLength ? (
                  <>
                    <th>Weight (kg)</th>
                    <th>Length/Height (cm)</th>
                    <th>Interpretation</th>
                  </>
                ) : (
                  <th>{displayMode === 'value' ? 'WHO Z-score' : 'Interpretation'}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rowsWithValues.length ? rowsWithValues.map((row) => {
                const score = toFiniteNumber(row.scores[selectedMetric.score]);
                const interpretation = row.scores[selectedMetric.interpretation];
                const ageMonths = Number.isFinite(Number(row.scores.ageInDays))
                  ? Math.floor(Number(row.scores.ageInDays) / 30.4375)
                  : null;
                return (
                  <tr key={row.key}>
                    <td>{formatDateForDisplay(row.date)}</td>
                    <td>{ageMonths === null ? (row.week === null || row.week === undefined ? '—' : `${Math.round(Number(row.week) / 4.35)} mo`) : `${ageMonths} mo`}</td>
                    {isWeightForLength ? (
                      <>
                        <td>{toFiniteNumber(row.weight) === null ? '—' : row.weight}</td>
                        <td>{toFiniteNumber(row.height) === null ? '—' : row.height}</td>
                        <td>{interpretation || 'Not available'}</td>
                      </>
                    ) : (
                      <td>{displayMode === 'value' ? (score === null ? 'Not available' : score.toFixed(2)) : (interpretation || 'Not available')}</td>
                    )}
                  </tr>
                );
              }) : (
                <tr><td colSpan={isWeightForLength ? 5 : 3} className="mother-detail-empty-row">No eligible measurements are available for this WHO indicator.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {isWeightForLength ? (
            <>
              <p className="monitor-report-graph-caption">Graph view displays recorded weight and length/height. The Weight-for-Length/Height interpretation is available in the table.</p>
              <ReportTrendGraph rows={childRows} valueGetter={(row) => row.weight} label="Weight" unit="kg" precision={2} />
              <ReportTrendGraph rows={childRows} valueGetter={(row) => row.height} label="Length/Height" unit="cm" precision={1} />
            </>
          ) : (
            <>
              <p className="monitor-report-graph-caption">Graph view displays WHO Z-scores for the selected indicator.</p>
              <ReportTrendGraph rows={rowsWithValues} valueGetter={(row) => row.scores[selectedMetric.score]} label={`${selectedMetric.label} WHO Z-score`} unit="Z" precision={2} normalRange={{ min: -2, max: 2 }} axisRange={{ min: -5, max: 5 }} styleVariant="who" />
            </>
          )}
        </>
      )}
      <p className="monitor-report-note">WHO growth references apply through 60 months of age. Values are screening indicators and are not a diagnosis.</p>
    </section>
  );
}
