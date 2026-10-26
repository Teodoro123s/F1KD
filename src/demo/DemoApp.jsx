import React, { useEffect, useMemo, useState } from 'react';
import logo from '../assets/f1kd-logo.png';
import {
  DEMO_BENEFICIARIES,
  DEMO_NOTIFICATIONS,
  DEMO_PROGRAMS,
  DEMO_REPORTS,
  DEMO_SCHOOLS,
} from './demoData.mjs';
import './demo.css';

const NAV_ITEMS = [
  ['overview', 'Overview', '◫'],
  ['beneficiaries', 'Beneficiaries', '♙'],
  ['monitoring', 'Monitoring', '⌁'],
  ['programs', 'Programs', '▣'],
  ['reports', 'Reports', '▤'],
  ['notifications', 'Notifications', '♧'],
];

const formatCount = (value) => String(value).padStart(2, '0');

function DemoTable({ columns, rows, onSelect }) {
  return (
    <div className="demo-table-wrap">
      <table className="demo-table">
        <thead>
          <tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect?.(row)}
              onKeyDown={(event) => {
                if (onSelect && ['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  onSelect(row);
                }
              }}
              tabIndex={onSelect ? 0 : undefined}
            >
              {columns.map(([key]) => <td key={key}>{row[key] ?? '—'}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={columns.length} className="demo-empty">No demo records match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, note, tone = 'green' }) {
  return (
    <article className={`demo-stat demo-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Overview({ setSection, setSelectedRecord }) {
  const childCount = DEMO_BENEFICIARIES.filter(({ type }) => type === 'Child').length;
  const motherCount = DEMO_BENEFICIARIES.filter(({ type }) => type === 'Mother').length;
  const attention = DEMO_BENEFICIARIES.filter(({ growth }) => growth === 'Follow-up recommended');
  const recentRecords = DEMO_BENEFICIARIES
    .slice()
    .sort((left, right) => right.latestCheckup.localeCompare(left.latestCheckup))
    .slice(0, 5)
    .map((record) => ({ ...record, checkupDate: record.latestCheckup }));

  return (
    <>
      <div className="demo-welcome">
        <div>
          <p className="demo-eyebrow">COMMUNITY HEALTH AT A GLANCE</p>
          <h2>Welcome to the F1KD system demo</h2>
          <p>Explore sample beneficiary records, monitoring activity, and program participation.</p>
        </div>
        <button className="demo-button demo-button-light" onClick={() => setSection('beneficiaries')}>Browse beneficiaries</button>
      </div>
      <div className="demo-stats">
        <StatCard label="Beneficiaries" value={formatCount(DEMO_BENEFICIARIES.length)} note={`${childCount} children · ${motherCount} mothers`} />
        <StatCard label="Demo schools" value={formatCount(DEMO_SCHOOLS.length)} note="Sample community scope" tone="blue" />
        <StatCard label="Check-ups this month" value="24" note="Synthetic monitoring activity" tone="purple" />
        <StatCard label="Needs follow-up" value={formatCount(attention.length)} note="Sample child growth record" tone="amber" />
      </div>
      <div className="demo-grid-two">
        <section className="demo-panel">
          <div className="demo-panel-heading">
            <div><h3>Recent check-ups</h3><p>Latest sample monitoring activity</p></div>
            <button className="demo-link-button" onClick={() => setSection('monitoring')}>View monitoring</button>
          </div>
          <DemoTable
            columns={ [['name', 'Beneficiary'], ['type', 'Type'], ['checkupDate', 'Date'], ['growth', 'Follow-up']] }
            rows={recentRecords}
            onSelect={setSelectedRecord}
          />
        </section>
        <section className="demo-panel">
          <div className="demo-panel-heading">
            <div><h3>Program participation</h3><p>October 2026 sample period</p></div>
            <button className="demo-link-button" onClick={() => setSection('programs')}>View programs</button>
          </div>
          <div className="demo-program-list">
            {DEMO_PROGRAMS.map((program) => (
              <article className="demo-program-row" key={program.id}>
                <span className="demo-program-icon">▣</span>
                <div><strong>{program.name}</strong><small>{program.beneficiaryType} · {program.period}</small></div>
                <span className="demo-program-count">{program.received}/{program.eligible}</span>
              </article>
            ))}
          </div>
          <div className="demo-note">Demo data only. No real beneficiary information is shown.</div>
        </section>
      </div>
    </>
  );
}

function SectionPage({ section, setSelectedRecord }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const filteredBeneficiaries = useMemo(() => DEMO_BENEFICIARIES.filter((row) => (
    (typeFilter === 'All' || row.type === typeFilter)
    && `${row.name} ${row.school} ${row.group}`.toLowerCase().includes(search.toLowerCase())
  )), [search, typeFilter]);
  const sortedCheckups = useMemo(() => filteredBeneficiaries
    .slice()
    .sort((left, right) => right.latestCheckup.localeCompare(left.latestCheckup)), [filteredBeneficiaries]);

  const sectionMeta = {
    beneficiaries: ['Beneficiaries', 'Browse synthetic child and mother profile examples.'],
    monitoring: ['Monitoring', 'Review sample check-up dates, measurements, and growth summaries.'],
    programs: ['Programs', 'Explore sample benefit participation and documentation status.'],
    reports: ['Reports', 'Preview example reports available in the F1KD system.'],
    notifications: ['Notifications', 'Sample updates from community, monitoring, and program activity.'],
  };
  const [title, description] = sectionMeta[section] || sectionMeta.beneficiaries;

  return (
    <section className="demo-panel demo-section-panel">
      <div className="demo-panel-heading demo-section-heading">
        <div><p className="demo-eyebrow">DEMO WORKSPACE</p><h2>{title}</h2><p>{description}</p></div>
        {['beneficiaries', 'monitoring'].includes(section) && (
          <div className="demo-filters">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search demo records" aria-label="Search demo records" />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter beneficiary type">
              <option>All</option><option>Child</option><option>Mother</option>
            </select>
          </div>
        )}
      </div>
      {section === 'beneficiaries' && (
        <DemoTable columns={[
          ['name', 'Beneficiary'], ['type', 'Type'], ['age', 'Age'], ['sex', 'Sex'],
          ['school', 'School'], ['group', 'Group'], ['status', 'Status'],
        ]} rows={filteredBeneficiaries} onSelect={setSelectedRecord} />
      )}
      {section === 'monitoring' && (
        <DemoTable columns={[
          ['name', 'Beneficiary'], ['type', 'Type'], ['latestCheckup', 'Check-up date'],
          ['weight', 'Weight'], ['height', 'Height'], ['growth', 'Growth summary'],
        ]} rows={sortedCheckups} onSelect={setSelectedRecord} />
      )}
      {section === 'programs' && (
        <DemoTable columns={[
          ['name', 'Program'], ['beneficiaryType', 'Beneficiary type'], ['period', 'Period'],
          ['eligible', 'Eligible'], ['received', 'Received'], ['documentation', 'Documentation'], ['status', 'Status'],
        ]} rows={DEMO_PROGRAMS.map((program) => ({ ...program, name: program.name }))} />
      )}
      {section === 'reports' && (
        <DemoTable columns={[
          ['name', 'Example report'], ['scope', 'Scope'], ['updated', 'Last updated'], ['fields', 'Fields included'],
        ]} rows={DEMO_REPORTS} />
      )}
      {section === 'notifications' && (
        <div className="demo-notifications">
          {DEMO_NOTIFICATIONS.map((notification) => (
            <article className="demo-notification" key={notification.id}>
              <span className="demo-notification-dot" />
              <div><small>{notification.category} · {notification.date}</small><strong>{notification.title}</strong><p>{notification.detail}</p></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RecordDialog({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="demo-dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="demo-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-record-title" onClick={(event) => event.stopPropagation()}>
        <button className="demo-dialog-close" aria-label="Close profile details" onClick={onClose}>×</button>
        <p className="demo-eyebrow">SYNTHETIC SAMPLE RECORD</p>
        <h2 id="demo-record-title">{record.name}</h2>
        <p>{record.type} · {record.age} · {record.sex}</p>
        <dl>
          <div><dt>School</dt><dd>{record.school}</dd></div>
          <div><dt>Group</dt><dd>{record.group}</dd></div>
          <div><dt>Latest check-up</dt><dd>{record.latestCheckup}</dd></div>
          <div><dt>Weight</dt><dd>{record.weight}</dd></div>
          <div><dt>Height</dt><dd>{record.height}</dd></div>
          <div><dt>Summary</dt><dd>{record.growth}</dd></div>
        </dl>
        <button className="demo-button" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}

export default function DemoApp() {
  const [section, setSection] = useState('overview');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const selectedLabel = NAV_ITEMS.find(([id]) => id === section)?.[1] || 'Overview';

  useEffect(() => {
    document.title = 'F1KD System Demo';
  }, []);

  return (
    <div className="demo-shell">
      <aside className="demo-sidebar">
        <div className="demo-brand"><img src={logo} alt="F1KD" /><span>F1KD <small>Community Health</small></span></div>
        <p className="demo-nav-label">WORKSPACE</p>
        <nav aria-label="Demo navigation">
          {NAV_ITEMS.map(([id, label, icon]) => (
            <button className={section === id ? 'active' : ''} key={id} onClick={() => setSection(id)}>
              <span className="demo-nav-icon" aria-hidden="true">{icon}</span>{label}
              {id === 'notifications' && <span className="demo-nav-count">{DEMO_NOTIFICATIONS.length}</span>}
            </button>
          ))}
        </nav>
        <div className="demo-sidebar-footer"><span className="demo-avatar">TD</span><span><strong>Teacher Demo</strong><small>Read-only preview</small></span></div>
      </aside>
      <main className="demo-main">
        <div className="demo-banner"><strong>DEMO MODE</strong><span>All records are synthetic examples. Changes are not saved, and no backend or real beneficiary data is connected.</span></div>
        <header className="demo-topbar"><div><span>F1KD Demo</span><span className="demo-crumb">/</span><strong>{selectedLabel}</strong></div><span className="demo-online"><i /> Sample workspace</span></header>
        <div className="demo-content">
          {section === 'overview'
            ? <Overview setSection={setSection} setSelectedRecord={setSelectedRecord} />
            : <SectionPage section={section} setSelectedRecord={setSelectedRecord} />}
          <footer className="demo-footer">F1KD system preview · Synthetic data for demonstration only</footer>
        </div>
      </main>
      <RecordDialog record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
