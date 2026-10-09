import React from 'react';
import {
  buildAssistanceAmountBins,
  collectReferralVisits,
  countReferralCategories,
  getReferralMonthCounts,
  REFERRAL_GRAPH_FIELDS,
} from '../referralGraphData';

const COLORS = ['#15803d', '#e07a45', '#2563eb', '#9333ea', '#0891b2', '#ca8a04', '#db2777', '#475569'];
const formatCurrency = (value) => `₱${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function CategoryPieChart({ visits, field }) {
  const categories = countReferralCategories(visits, field);
  let offset = 0;
  const total = visits.length || 1;
  const gradient = categories.map(({ label, count }, index) => {
    const start = offset;
    offset += (count / total) * 100;
    return `${COLORS[index % COLORS.length]} ${start}% ${offset}%`;
  }).join(', ');

  return (
    <div className="referral-pie-layout">
      <div className="growth-report-pie referral-pie" role="img" aria-label={`${REFERRAL_GRAPH_FIELDS.find(([id]) => id === field)?.[1]} distribution`}>
        <span style={{ background: `conic-gradient(${gradient})` }} />
      </div>
      <div className="referral-chart-legend">
        {categories.map(({ label, count }, index) => (
          <div key={label}>
            <span><i style={{ backgroundColor: COLORS[index % COLORS.length] }} />{label}</span>
            <strong>{count} ({Math.round((count / total) * 100)}%)</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistanceHistogram({ visits }) {
  const { bins, includedCount, excludedCount } = buildAssistanceAmountBins(visits);
  if (!includedCount) return <p className="growth-report-empty">No assistance amounts are recorded for these referrals.</p>;

  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  return (
    <>
      <div className="profile-histogram-shell">
        <span className="profile-histogram-axis-label profile-histogram-y-label">Referrals</span>
        <div className={`growth-report-bars growth-report-bars-chart profile-histogram-chart${bins.length === 1 ? ' single-bin' : ''}`}>
          {bins.map((bin) => (
            <div className="growth-report-bar-item" key={`${bin.start}-${bin.end}`}>
              <strong>{bin.count}</strong>
              <span style={{ '--bar-height': `${Math.max(6, (bin.count / maxCount) * 100)}%` }} title={`${bin.count} referrals`} />
              <small>{bins.length === 1 ? formatCurrency(bin.start) : `${formatCurrency(bin.start)}–${formatCurrency(bin.end)}`}</small>
            </div>
          ))}
        </div>
        <span className="profile-histogram-axis-label profile-histogram-x-label">Assistance amount</span>
      </div>
      <p className="referral-chart-note">{includedCount} amount{includedCount === 1 ? '' : 's'} included{excludedCount ? ` · ${excludedCount} referral${excludedCount === 1 ? '' : 's'} without an amount excluded` : ''}.</p>
    </>
  );
}

function ReferralMonthChart({ visits }) {
  const months = getReferralMonthCounts(visits);
  const maxCount = Math.max(...months.map(({ count }) => count), 1);
  return (
    <div className="referral-month-chart" role="img" aria-label="Hospital referrals by month">
      {months.map(({ label, count }) => (
        <div className="referral-month-bar" key={label}>
          <strong>{count}</strong>
          <span style={{ '--bar-height': `${Math.max(6, (count / maxCount) * 100)}%` }} title={`${count} referrals`} />
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

export function ReferralAssistanceGraph({ rows }) {
  const [field, setField] = React.useState('labAssistanceProvided');
  const visits = collectReferralVisits(rows);
  const selected = REFERRAL_GRAPH_FIELDS.find(([id]) => id === field) || REFERRAL_GRAPH_FIELDS[0];

  if (!visits.length) return <p className="growth-report-empty">No hospital referrals are recorded for this date range.</p>;

  return (
    <section className="referral-assistance-graph" aria-label="Referral graph">
      <div className="graph-controls">
        <label className="report-chart-select">
          Graph field
          <select value={field} onChange={(event) => setField(event.target.value)}>
            {REFERRAL_GRAPH_FIELDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <span className="referral-graph-summary">{visits.length} referral check-up{visits.length === 1 ? '' : 's'}</span>
      </div>
      {selected[2] === 'histogram'
        ? <AssistanceHistogram visits={visits} />
        : selected[2] === 'bar'
          ? <ReferralMonthChart visits={visits} />
          : <CategoryPieChart visits={visits} field={field} />}
    </section>
  );
}
