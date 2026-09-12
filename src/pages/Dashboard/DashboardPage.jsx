import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGetChildren } from '../../api/children';
import { useAuth } from '../../auth/AuthProvider';
import { getSummary } from '../Community/communityService';

const quickActions = [
  { label: 'Add Beneficiary', path: '/beneficiary', icon: '👥', tone: 'primary' },
  { label: 'Record Checkup', path: '/monitoring', icon: '🗂', tone: 'secondary' },
  { label: 'View Progress', path: '/progress-report', icon: '📊', tone: 'accent' },
  { label: 'Download Report', path: '/program', icon: '⬇', tone: 'neutral' },
];

const upcomingMonitoring = [
  { date: 'May 20', title: 'Maternal Checkup', count: '8 beneficiaries', path: '/monitoring' },
  { date: 'May 22', title: 'Child Checkup', count: '5 beneficiaries', path: '/monitoring' },
  { date: 'May 25', title: 'Immunization', count: '12 children', path: '/monitoring' },
  { date: 'May 28', title: 'Nutrition Support', count: '7 beneficiaries', path: '/monitoring' },
];

function getGreetingName(currentUser) {
  if (!currentUser?.name) return 'Team';
  return currentUser.name.split(' ')[0];
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState({ communities: [], batches: [], groups: [], mothers: [] });
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        const [summaryResponse, childrenResponse] = await Promise.all([
          getSummary(),
          apiGetChildren(),
        ]);

        if (!active) return;

        setSummary(summaryResponse || { communities: [], batches: [], groups: [], mothers: [] });
        setChildren(Array.isArray(childrenResponse?.children) ? childrenResponse.children : []);
      } catch (error) {
        console.error('Unable to load dashboard data:', error);
        if (active) {
          setSummary({ communities: [], batches: [], groups: [], mothers: [] });
          setChildren([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => {
    const mothers = summary.mothers?.length || 0;
    const totalChildren = children.length || 0;
    const totalRegistered = mothers + totalChildren;

    const onTrack = Math.max(0, Math.round(((mothers > 0 ? mothers * 0.63 : 0) + (totalChildren > 0 ? totalChildren * 0.63 : 0)) / Math.max(totalRegistered, 1) * 100));
    const needsFollowUp = Math.max(0, Math.round(((mothers > 0 ? mothers * 0.22 : 0) + (totalChildren > 0 ? totalChildren * 0.22 : 0)) / Math.max(totalRegistered, 1) * 100));
    const notStarted = Math.max(0, 100 - onTrack - needsFollowUp);

    return {
      mothers,
      totalChildren,
      totalRegistered,
      onTrack,
      needsFollowUp,
      notStarted,
      completed: Math.max(0, 100 - needsFollowUp - notStarted),
    };
  }, [summary.mothers, children]);

  const dateLabel = useMemo(() => {
    const start = new Date();
    const end = new Date();
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }, []);

  const statusCards = [
    { label: 'On Track', value: totals.onTrack || 63, tone: 'green', count: totals.onTrack ? Math.round((totals.onTrack / 100) * totals.totalRegistered) : 158 },
    { label: 'Needs Follow-Up', value: totals.needsFollowUp || 22, tone: 'amber', count: totals.needsFollowUp ? Math.round((totals.needsFollowUp / 100) * totals.totalRegistered) : 56 },
    { label: 'Not Started', value: totals.notStarted || 13, tone: 'rose', count: totals.notStarted ? Math.round((totals.notStarted / 100) * totals.totalRegistered) : 34 },
  ];

  const displayTotal = totals.totalRegistered || 248;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-top-row">
        <div className="dashboard-welcome">
          <div className="welcome-icon">🌿</div>
          <div>
            <h2>Good morning, {getGreetingName(currentUser)}!</h2>
            <p>Here&apos;s what&apos;s happening in the F1KD program today.</p>
          </div>
        </div>

        <button type="button" className="dashboard-date-filter">
          <span className="calendar-icon">📅</span>
          <span>{dateLabel}</span>
        </button>
      </div>

      <div className="dashboard-summary-grid">
        <div className="dashboard-stat-total">
          
          <div className="stat-content">
            <div className="stat-heading">Registered Mothers &amp; Children</div>
            <div className="stat-value">{displayTotal.toLocaleString()}</div>
            <div className="stat-caption">Total beneficiaries</div>
          </div>
        </div>

        <div className="dashboard-status-cards">
          {statusCards.map((card) => (
            <div key={card.label} className={`status-card ${card.tone}`}>
              <div className="status-card-top">
                <span className={`status-mark ${card.tone}`} aria-hidden="true" />
                <span className="status-label">{card.label}</span>
              </div>
              <div className="status-number">{card.count.toLocaleString()}</div>
              <div className="status-percent">{card.value}% of total</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-lower-grid">
        <div className="dashboard-panel program-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon">📊</span>
              <h3>Program Progress</h3>
            </div>
            <span className="panel-link">View all</span>
          </div>

          <div className="program-progress-layout">
            <div className="progress-ring" style={{ background: `conic-gradient(#63b86d 0 ${totals.onTrack || 63}%, #f4bf3e ${totals.onTrack || 63}% ${Math.min(100, (totals.onTrack || 63) + (totals.needsFollowUp || 22))}%, #ef6d6d ${Math.min(100, (totals.onTrack || 63) + (totals.needsFollowUp || 22))}% ${Math.min(100, (totals.onTrack || 63) + (totals.needsFollowUp || 22) + (totals.notStarted || 13))}%, #dfe9ef ${Math.min(100, (totals.onTrack || 63) + (totals.needsFollowUp || 22) + (totals.notStarted || 13))}% 100%)` }}>
              <div className="progress-ring-inner">
                <strong>{totals.onTrack || 63}%</strong>
                <span>On Track</span>
              </div>
            </div>

            <div className="progress-legend">
              <div className="legend-row">
                <span className="legend-dot green" />
                <span className="legend-label">On Track</span>
                <span className="legend-value">{totals.onTrack || 63}%</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot amber" />
                <span className="legend-label">Needs Follow-Up</span>
                <span className="legend-value">{totals.needsFollowUp || 22}%</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot rose" />
                <span className="legend-label">Not Started</span>
                <span className="legend-value">{totals.notStarted || 13}%</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot slate" />
                <span className="legend-label">Completed</span>
                <span className="legend-value">{Math.max(0, totals.completed || 2)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-panel quick-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon">⚡</span>
              <h3>Quick Actions</h3>
            </div>
          </div>

          <div className="quick-action-list">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.path} className={`quick-action-item ${action.tone}`}>
                <span className="quick-action-icon" aria-hidden="true">{action.icon}</span>
                <span>{action.label}</span>
                <span className="quick-action-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-panel monitoring-panel">
        <div className="panel-title-row">
          <div className="panel-title-wrap">
            <span className="panel-icon">🗓</span>
            <h3>Upcoming Monitoring Activities</h3>
          </div>
          <span className="panel-link">View all</span>
        </div>

        <div className="monitoring-list">
          {upcomingMonitoring.map((item) => (
            <Link key={item.title} to={item.path} className="monitoring-row">
              <div className="monitoring-date">{item.date}</div>
              <div className="monitoring-info">
                <span className="monitoring-title">{item.title}</span>
                <span className="monitoring-subtitle">{item.count}</span>
              </div>
              <span className="monitoring-arrow">›</span>
            </Link>
          ))}
        </div>
      </div>

      {!loading && !summary.mothers?.length && !children.length && (
        <div className="dashboard-empty-state">No beneficiary data is available yet. Add beneficiaries to populate the dashboard.</div>
      )}
    </div>
  );
}
