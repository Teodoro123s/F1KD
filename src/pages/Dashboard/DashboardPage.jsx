import React from 'react';

const analyticsCards = [
  { label: 'Active mothers', value: '1,248', change: '+12.4%', tone: 'positive' },
  { label: 'Children under care', value: '842', change: '+8.1%', tone: 'positive' },
  { label: 'High-risk cases', value: '63', change: '-4.2%', tone: 'neutral' },
  { label: 'Completion rate', value: '86%', change: '+7.8%', tone: 'positive' },
];

const quickReports = [
  { title: 'Monthly progress summary', description: 'Aggregate maternal and child progress by group and batch.', action: 'Open summary' },
  { title: 'Nutrition status report', description: 'Track underweight, normal, overweight, and obese cohorts.', action: 'Open report' },
  { title: 'Monitoring checkup trends', description: 'Review checkup activity and follow-up completion trends.', action: 'View trends' },
  { title: 'Community performance', description: 'Compare school, group, and batch performance snapshots.', action: 'Compare groups' },
];

const shortcuts = [
  { label: 'Progress Report', to: '/progress-report', icon: '📝' },
  { label: 'Monitoring', to: '/monitoring', icon: '📈' },
  { label: 'Beneficiaries', to: '/beneficiary', icon: '🎯' },
  { label: 'Community', to: '/community', icon: '👥' },
  { label: 'Program Overview', to: '/program', icon: '📚' },
  { label: 'User Management', to: '/user-management', icon: '🔧' },
];

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Program Dashboard</h1>
        </div>
        <button type="button" className="primary-btn">Generate report</button>
      </div>

      <section className="dashboard-cards">
        {analyticsCards.map((card) => (
          <article key={card.label} className="stat-card">
            <span className="stat-label">{card.label}</span>
            <strong className="stat-value">{card.value}</strong>
            <span className={`stat-change ${card.tone}`}>{card.change}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Quick actions</h2>
          </div>
          <div className="shortcut-grid">
            {shortcuts.map((shortcut) => (
              <a key={shortcut.label} href={shortcut.to} className="shortcut-card">
                <span className="shortcut-icon">{shortcut.icon}</span>
                <span>{shortcut.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Summary reports</h2>
          </div>
          <div className="report-list">
            {quickReports.map((report) => (
              <div key={report.title} className="report-item">
                <div>
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                </div>
                <button type="button" className="ghost-btn">{report.action}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
