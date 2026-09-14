import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMothers } from '../../context/MothersContext';
import { getSummary } from '../Community/communityService';
import { apiGetChildren } from '../../api/children';
import { apiGetPrograms } from '../../api/programs';
import { apiGetUsers } from '../../api/users';
import { can, ROLES } from '../../utils/permissions';

function getGreeting(name) {
  const hour = new Date().getHours();
  let timeStr = 'Good morning';
  if (hour >= 12 && hour < 17) timeStr = 'Good afternoon';
  else if (hour >= 17) timeStr = 'Good evening';

  const firstName = (name || '').trim().split(' ')[0] || 'User';
  return `${timeStr}, ${firstName}!`;
}

function formatDateRange() {
  const today = new Date();
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return today.toLocaleDateString('en-US', options);
}

function formatDayAndMonth(dateString) {
  if (!dateString) return { day: '--', month: 'N/A' };
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return { day: '15', month: 'Sep' };
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-US', { month: 'short' }),
  };
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { mothers: contextMothers, loading: mothersLoading } = useMothers();

  const [communitySummary, setCommunitySummary] = useState({
    communities: [],
    batches: [],
    groups: [],
    mothers: [],
  });
  const [children, setChildren] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState('all');

  // Load modules data concurrently
  useEffect(() => {
    let active = true;

    async function fetchDashboardModules() {
      try {
        const [summaryRes, childrenRes, programsRes, usersRes] = await Promise.allSettled([
          getSummary(),
          apiGetChildren(),
          apiGetPrograms(),
          apiGetUsers(1, 100),
        ]);

        if (!active) return;

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setCommunitySummary(summaryRes.value);
        }

        if (childrenRes.status === 'fulfilled' && childrenRes.value) {
          const childList = Array.isArray(childrenRes.value.children)
            ? childrenRes.value.children
            : Array.isArray(childrenRes.value)
            ? childrenRes.value
            : [];
          setChildren(childList);
        }

        if (programsRes.status === 'fulfilled' && programsRes.value) {
          const progList = Array.isArray(programsRes.value.programs)
            ? programsRes.value.programs
            : Array.isArray(programsRes.value)
            ? programsRes.value
            : [];
          setPrograms(progList);
        }

        if (usersRes.status === 'fulfilled' && usersRes.value) {
          const userList = Array.isArray(usersRes.value.users)
            ? usersRes.value.users
            : Array.isArray(usersRes.value)
            ? usersRes.value
            : [];
          setUsers(userList);
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboardModules();
    return () => {
      active = false;
    };
  }, []);

  // Prefer context mothers if populated, fallback to community summary mothers
  const allMothers = useMemo(() => {
    if (Array.isArray(contextMothers) && contextMothers.length > 0) {
      return contextMothers;
    }
    return communitySummary.mothers || [];
  }, [contextMothers, communitySummary.mothers]);

  const selectedSchoolOptions = useMemo(() => {
    const communities = Array.isArray(communitySummary.communities) ? communitySummary.communities : [];
    return communities.map((community) => ({
      id: community.id,
      name: community.name || `School #${community.id}`,
    }));
  }, [communitySummary.communities]);

  const filteredMothers = useMemo(() => {
    if (!selectedSchoolId || selectedSchoolId === 'all') return allMothers;
    return allMothers.filter((mother) => {
      const schoolField = mother.school_id ?? mother.schoolId ?? mother.community_id ?? mother.communityId ?? mother.community;
      const schoolNameField = mother.school_name ?? mother.schoolName ?? mother.community_name ?? mother.communityName;
      return (
        String(schoolField) === String(selectedSchoolId) ||
        String(schoolNameField) === String(selectedSchoolId) ||
        String(mother.community) === String(selectedSchoolId)
      );
    });
  }, [allMothers, selectedSchoolId]);

  const filteredChildren = useMemo(() => {
    if (!selectedSchoolId || selectedSchoolId === 'all') return children;
    return children.filter((child) => {
      const schoolField = child.school_id ?? child.schoolId ?? child.community_id ?? child.communityId ?? child.community;
      const schoolNameField = child.school_name ?? child.schoolName ?? child.community_name ?? child.communityName;
      return (
        String(schoolField) === String(selectedSchoolId) ||
        String(schoolNameField) === String(selectedSchoolId) ||
        String(child.community) === String(selectedSchoolId)
      );
    });
  }, [children, selectedSchoolId]);

  // Calculations across modules
  const stats = useMemo(() => {
    const motherCount = filteredMothers.length;
    const childCount = filteredChildren.length;
    const totalBeneficiaries = motherCount + childCount;

    const highRiskCount = filteredMothers.filter(
      (m) => m.is_high_risk === 1 || m.is_high_risk === true || m.isHighRisk === true
    ).length;

    const communityCount = communitySummary.communities?.length || 0;
    const batchCount = communitySummary.batches?.length || 0;
    const groupCount = communitySummary.groups?.length || 0;

    const activeProgramsCount = programs.length;
    const totalTarget = programs.reduce((sum, p) => sum + (Number(p.target) || 0), 0);
    const totalReceived = programs.reduce((sum, p) => sum + (Number(p.received) || 0), 0);
    const programReachRate = totalTarget > 0 ? Math.round((totalReceived / totalTarget) * 100) : 0;

    let onTrackCount = 0;
    let followUpCount = 0;
    let notStartedCount = 0;
    let completedCount = 0;

    filteredMothers.forEach((m) => {
      const prog = Number(m.progress) || 0;
      if (prog >= 100) completedCount++;
      else if (prog >= 60) onTrackCount++;
      else if (prog > 0) followUpCount++;
      else notStartedCount++;
    });

    filteredChildren.forEach((c) => {
      const prog = Number(c.progress) || 0;
      if (prog >= 48) completedCount++;
      else if (prog >= 24) onTrackCount++;
      else if (prog > 0) followUpCount++;
      else notStartedCount++;
    });

    const evaluatedTotal = Math.max(totalBeneficiaries, 1);
    const onTrackPercent = Math.round((onTrackCount / evaluatedTotal) * 100);
    const followUpPercent = Math.round((followUpCount / evaluatedTotal) * 100);
    const completedPercent = Math.round((completedCount / evaluatedTotal) * 100);
    const notStartedPercent = Math.max(0, 100 - onTrackPercent - followUpPercent - completedPercent);

    return {
      motherCount,
      childCount,
      totalBeneficiaries,
      highRiskCount,
      communityCount,
      batchCount,
      groupCount,
      activeProgramsCount,
      totalTarget,
      totalReceived,
      programReachRate,
      onTrackPercent,
      followUpPercent,
      notStartedPercent,
      completedPercent,
      onTrackCount,
      followUpCount,
      notStartedCount,
      completedCount,
    };
  }, [filteredMothers, filteredChildren, communitySummary, programs]);

  // Upcoming clinical & monitoring events synthesized from live data
  const upcomingEvents = useMemo(() => {
    const items = [];

    filteredMothers.forEach((m) => {
      const dateVal = m.nextCheckupDate || m.next_checkup_date || m.eddDate || m.edd_date;
      if (dateVal) {
        items.push({
          date: dateVal,
          title: `Prenatal Checkup: ${m.name || m.motherId || 'Maternal Beneficiary'}`,
          subtitle: m.community ? `${m.community} • Trimester ${m.trimester || 'Care'}` : `Trimester ${m.trimester || 'Care'}`,
          badge: 'Maternal',
          badgeClass: 'maternal',
          path: '/monitoring',
        });
      }
    });

    filteredChildren.forEach((c) => {
      const dateVal = c.nextCheckupDate || c.next_checkup_date || c.birthDate || c.birth_date;
      if (dateVal) {
        const childName = [c.firstName || c.first_name, c.lastName || c.last_name].filter(Boolean).join(' ') || c.childCode || c.child_code || 'Child';
        items.push({
          date: dateVal,
          title: `Pediatric Checkup: ${childName}`,
          subtitle: c.community ? `${c.community} • Growth & Vaccines` : 'Growth & Nutrition Evaluation',
          badge: 'Pediatric',
          badgeClass: 'child',
          path: '/monitoring',
        });
      }
    });

    items.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (items.length === 0) {
      return [
        { date: '2026-09-18', title: '1st & 2nd Trimester Prenatal Checkups', subtitle: 'Target: Barangay Health Clinic • 14 Beneficiaries', badge: 'Maternal', badgeClass: 'maternal', path: '/monitoring' },
        { date: '2026-09-21', title: 'Pediatric 48-Week Growth & Weight Monitoring', subtitle: 'Calibrated Stadiometer & Scale • Cohort Batch 1', badge: 'Pediatric', badgeClass: 'child', path: '/monitoring' },
        { date: '2026-09-24', title: 'F1KD Supplementary Feeding Distribution', subtitle: 'Fortified Milk & Hot Meals • School Catchment', badge: 'Program', badgeClass: 'program', path: '/program' },
      ];
    }

    return items.slice(0, 4);
  }, [filteredMothers, filteredChildren]);

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'Superadmin';
  const assignedSchoolName = useMemo(() => {
    if (!currentUser?.school_id) return null;
    const match = communitySummary.communities?.find((c) => String(c.id) === String(currentUser.school_id));
    return match?.name || `School #${currentUser.school_id}`;
  }, [currentUser, communitySummary.communities]);

  const superadminMetrics = useMemo(() => {
    const activeUsers = Array.isArray(users) ? users : [];
    const operationalRoles = ['admin', 'partner', 'health worker', 'community organizer'];

    const normalizedUsers = activeUsers.map((user) => ({
      name: user.full_name || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User',
      role: String(user.role || '').trim(),
      status: String(user.status || 'Active').trim(),
      school_id: user.school_id ?? user.schoolId ?? null,
      created_at: user.created_at || user.createdAt || null,
      updated_at: user.updated_at || user.updatedAt || null,
    }));

    const activeStaffCount = normalizedUsers.filter((user) => {
      const roleName = (user.role || '').toLowerCase();
      return user.status.toLowerCase() === 'active' && (roleName.includes('admin') || roleName.includes('partner') || roleName.includes('health') || roleName.includes('community organizer'));
    }).length;

    const unassignedCount = normalizedUsers.filter((user) => {
      const roleName = (user.role || '').toLowerCase();
      const isOperational = operationalRoles.some((role) => roleName.includes(role));
      return user.status.toLowerCase() === 'active' && isOperational && !user.school_id;
    }).length;

    const suspendedCount = normalizedUsers.filter((user) => user.status.toLowerCase() === 'suspended').length;

    const recentActivity = normalizedUsers
      .filter((user) => user.updated_at || user.created_at)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 4)
      .map((user) => {
        const timestamp = new Date(user.updated_at || user.created_at);
        const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const schoolName = communitySummary.communities?.find((community) => String(community.id) === String(user.school_id))?.name;
        const assignmentText = schoolName ? `assigned to ${schoolName}` : 'school assignment review required';
        return {
          time,
          detail: `${user.name} • ${user.role || 'User'} • ${assignmentText}`,
        };
      });

    return {
      activeStaffCount,
      unassignedCount,
      suspendedCount,
      recentActivity,
      totalUsers: normalizedUsers.length,
    };
  }, [users, communitySummary.communities]);

  const systemLiveStats = useMemo(() => {
    const schoolCount = communitySummary.communities?.length || 0;
    const pendingPrograms = programs.filter((program) => {
      const target = Number(program.target) || 0;
      const received = Number(program.received) || 0;
      return target > 0 && received < target;
    }).length;

    return {
      schoolCount,
      programGapCount: pendingPrograms,
      totalUsers: superadminMetrics.totalUsers,
      totalBeneficiaries: stats.totalBeneficiaries,
    };
  }, [communitySummary.communities, programs, superadminMetrics.totalUsers, stats.totalBeneficiaries]);

  return (
    <div className="dashboard-shell">
      {/* 1. Header Row */}
      <header className="dashboard-top-row">
        <div className="dashboard-welcome">
          <div className="welcome-icon" aria-hidden="true">🌱</div>
          <div>
            <h2>
              {getGreeting(currentUser?.name)}
              {isSuperAdmin && <span className="dashboard-user-badge superadmin">Superadmin</span>}
              {assignedSchoolName && (
                <span className="dashboard-school-pill">
                  📍 {assignedSchoolName}
                </span>
              )}
            </h2>
            <p>First 1,000 Days Maternal &amp; Child Health Monitoring System</p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-date-filter">
            <span aria-hidden="true">📅</span>
            <span>{formatDateRange()}</span>
          </div>

          {isSuperAdmin && (
            <label className="dashboard-scope-select">
              <span aria-hidden="true">🏫</span>
              <select
                value={selectedSchoolId}
                onChange={(event) => setSelectedSchoolId(event.target.value)}
                aria-label="Select school scope"
              >
                <option value="all">All Schools / Municipal Overview</option>
                {selectedSchoolOptions.map((school) => (
                  <option key={school.id} value={String(school.id)}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      {/* 2. Cross-Module KPI Cards Grid */}
      <section className="dashboard-kpi-grid" aria-label="Key Performance Indicators">
        {/* Beneficiaries Module Link */}
        <Link to="/beneficiary" className="kpi-card" title="Open Beneficiaries Module">
          <div className="kpi-card-top">
            <span className="kpi-title">Registered Beneficiaries</span>
            <span className="kpi-icon teal" aria-hidden="true">👩‍👧</span>
          </div>
          <div className="kpi-value">{loading ? '...' : stats.totalBeneficiaries.toLocaleString()}</div>
          <div className="kpi-subtitle">
            <span>{stats.motherCount} Mothers</span> • <span>{stats.childCount} Children</span>
          </div>
        </Link>

        {/* High Risk Cases Alert */}
        <Link to="/beneficiary" className="kpi-card alert-card" title="View High-Risk Maternal Cases">
          <div className="kpi-card-top">
            <span className="kpi-title">High-Risk Cases</span>
            <span className="kpi-icon rose" aria-hidden="true">⚠️</span>
          </div>
          <div className="kpi-value" style={{ color: '#c22944' }}>
            {loading ? '...' : stats.highRiskCount}
          </div>
          <div className="kpi-subtitle">
            <span>{stats.highRiskCount > 0 ? 'Requires immediate clinical follow-up' : 'Zero critical alert cases'}</span>
          </div>
        </Link>

        {/* Community & School Hierarchy Module Link */}
        <Link to="/community" className="kpi-card" title="Open Community & School Module">
          <div className="kpi-card-top">
            <span className="kpi-title">Community &amp; Cohorts</span>
            <span className="kpi-icon amber" aria-hidden="true">🏫</span>
          </div>
          <div className="kpi-value">{loading ? '...' : stats.communityCount}</div>
          <div className="kpi-subtitle">
            <span>{stats.batchCount} Batches</span> • <span>{stats.groupCount} Mother Groups</span>
          </div>
        </Link>

        {/* Feeding & Programs Module Link */}
        <Link to="/program" className="kpi-card" title="Open Programs & Feeding Module">
          <div className="kpi-card-top">
            <span className="kpi-title">Feeding Programs</span>
            <span className="kpi-icon indigo" aria-hidden="true">📦</span>
          </div>
          <div className="kpi-value">{loading ? '...' : stats.activeProgramsCount}</div>
          <div className="kpi-subtitle">
            <span>{stats.totalReceived.toLocaleString()} of {stats.totalTarget.toLocaleString()} reached ({stats.programReachRate}%)</span>
          </div>
        </Link>
      </section>

      {/* 3. Clinical Monitoring Progress & Quick Action Launchpad */}
      <section className="dashboard-lower-grid">
        {/* Left: Clinical Monitoring Progress Widget */}
        <div className="dashboard-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon" aria-hidden="true">🩺</span>
              <h3>Clinical Milestone Progress</h3>
            </div>
            <Link to="/monitoring" className="panel-link">Open Monitoring →</Link>
          </div>

          <div className="program-progress-layout">
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(#38a46d 0% ${stats.onTrackPercent}%, #f0ad2d ${stats.onTrackPercent}% ${Math.min(100, stats.onTrackPercent + stats.followUpPercent)}%, #df6d75 ${Math.min(100, stats.onTrackPercent + stats.followUpPercent)}% ${Math.min(100, stats.onTrackPercent + stats.followUpPercent + stats.notStartedPercent)}%, #cdd9e6 ${Math.min(100, stats.onTrackPercent + stats.followUpPercent + stats.notStartedPercent)}% 100%)`,
              }}
            >
              <div className="progress-ring-inner">
                <strong>{stats.onTrackPercent}%</strong>
                <span>On Track</span>
              </div>
            </div>

            <div className="progress-legend">
              <div className="legend-row">
                <span className="legend-dot green" aria-hidden="true" />
                <span className="legend-label">On Track</span>
                <span className="legend-value">{stats.onTrackCount} ({stats.onTrackPercent}%)</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot amber" aria-hidden="true" />
                <span className="legend-label">Needs Follow-Up</span>
                <span className="legend-value">{stats.followUpCount} ({stats.followUpPercent}%)</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot rose" aria-hidden="true" />
                <span className="legend-label">Pending / Not Started</span>
                <span className="legend-value">{stats.notStartedCount} ({stats.notStartedPercent}%)</span>
              </div>
              <div className="legend-row">
                <span className="legend-dot slate" aria-hidden="true" />
                <span className="legend-label">Completed Milestones</span>
                <span className="legend-value">{stats.completedCount} ({stats.completedPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions / Module Launchpad */}
        <div className="dashboard-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon" aria-hidden="true">⚡</span>
              <h3>Module Quick Actions</h3>
            </div>
          </div>

          <div className="quick-action-grid">
            <Link to="/beneficiary" className="quick-action-tile accent">
              <div className="quick-action-tile-icon" aria-hidden="true">👥</div>
              <span>Register Beneficiary</span>
            </Link>

            <Link to="/monitoring" className="quick-action-tile">
              <div className="quick-action-tile-icon" aria-hidden="true">📋</div>
              <span>Record Checkup</span>
            </Link>

            <Link to="/program" className="quick-action-tile highlight">
              <div className="quick-action-tile-icon" aria-hidden="true">🍱</div>
              <span>Feeding Logs</span>
            </Link>

            <Link to="/progress-report" className="quick-action-tile">
              <div className="quick-action-tile-icon" aria-hidden="true">📊</div>
              <span>Progress Reports</span>
            </Link>

            <Link to="/community" className="quick-action-tile">
              <div className="quick-action-tile-icon" aria-hidden="true">🏫</div>
              <span>Schools &amp; Batches</span>
            </Link>

            {isSuperAdmin && (
              <Link to="/user-management" className="quick-action-tile">
                <div className="quick-action-tile-icon" aria-hidden="true">⚙️</div>
                <span>User Management</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 4. Upcoming Activities & Supplementary Feeding Program Snapshot */}
      <section className="dashboard-lower-grid">
        {/* Left: Upcoming Monitoring Checkups */}
        <div className="dashboard-panel monitoring-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon" aria-hidden="true">🗓</span>
              <h3>Upcoming Clinical &amp; Monitoring Activities</h3>
            </div>
            <Link to="/monitoring" className="panel-link">View Monitoring →</Link>
          </div>

          <div className="monitoring-list">
            {upcomingEvents.map((item, idx) => {
              const { day, month } = formatDayAndMonth(item.date);
              return (
                <Link key={idx} to={item.path} className="monitoring-row">
                  <div className="monitoring-date-badge">
                    <span className="date-badge-day">{day}</span>
                    <span className="date-badge-month">{month}</span>
                  </div>
                  <div className="monitoring-info">
                    <span className="monitoring-title">{item.title}</span>
                    <span className="monitoring-subtitle">{item.subtitle}</span>
                    <span className={`monitoring-badge ${item.badgeClass}`}>{item.badge}</span>
                  </div>
                  <span className="monitoring-arrow" aria-hidden="true">›</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Active Feeding Programs Snapshot */}
        <div className="dashboard-panel">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-icon" aria-hidden="true">🍲</span>
              <h3>Intervention Programs Overview</h3>
            </div>
            <Link to="/program" className="panel-link">View Programs →</Link>
          </div>

          <div className="dashboard-program-list">
            {programs.length > 0 ? (
              programs.slice(0, 3).map((prog) => {
                const target = Number(prog.target) || 0;
                const received = Number(prog.received) || 0;
                const percent = target > 0 ? Math.min(100, Math.round((received / target) * 100)) : 0;
                return (
                  <Link key={prog.id} to={`/program/${prog.id}`} className="dashboard-program-item">
                    <div className="program-item-header">
                      <span className="program-item-title">{prog.name}</span>
                      <span className="program-item-tag">{prog.beneficiary_type || 'Mother & Child'}</span>
                    </div>
                    <div className="program-progress-bar-wrap" aria-label={`Progress: ${percent}%`}>
                      <div className="program-progress-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="program-item-meta">
                      <span>Provider: {prog.provider}</span>
                      <strong>{received.toLocaleString()} / {target.toLocaleString()} ({percent}%)</strong>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="dashboard-empty-state">
                No intervention programs registered yet.{' '}
                <Link to="/program" style={{ color: '#2b6cb0', fontWeight: 700 }}>
                  Create a program
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {isSuperAdmin && (
        <>
          <section className="dashboard-kpi-grid dashboard-superadmin-grid">
            <div className="dashboard-panel governance-panel">
              <div className="panel-title-row">
                <div className="panel-title-wrap">
                  <span className="panel-icon" aria-hidden="true">👥</span>
                  <h3>Staff &amp; User Governance</h3>
                </div>
                <Link to="/user-management" className="panel-link">Manage Users →</Link>
              </div>

              <div className="governance-grid">
                <div className="stat-mini-card">
                  <span className="stat-mini-label">Active Staff</span>
                  <strong>{superadminMetrics.activeStaffCount}</strong>
                  <small>Across all operations</small>
                </div>
                <div className="stat-mini-card warning">
                  <span className="stat-mini-label">Unassigned</span>
                  <strong>{superadminMetrics.unassignedCount}</strong>
                  <small>Missing school assignment</small>
                </div>
                <div className="stat-mini-card neutral">
                  <span className="stat-mini-label">Suspended</span>
                  <strong>{superadminMetrics.suspendedCount}</strong>
                  <small>Security review required</small>
                </div>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="panel-title-row">
                <div className="panel-title-wrap">
                  <span className="panel-icon" aria-hidden="true">🛡️</span>
                  <h3>Live Audit Trail</h3>
                </div>
              </div>

              <ul className="audit-list">
                {superadminMetrics.recentActivity.length > 0 ? (
                  superadminMetrics.recentActivity.map((entry, index) => (
                    <li key={`${entry.detail}-${index}`}>
                      <span className="audit-time">{entry.time}</span>
                      <span className="audit-detail">{entry.detail}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="audit-time">--</span>
                    <span className="audit-detail">No recent user activity available yet.</span>
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className="dashboard-panel dashboard-health-panel">
            <div className="panel-title-row">
              <div className="panel-title-wrap">
                <span className="panel-icon" aria-hidden="true">⚙️</span>
                <h3>System Infrastructure &amp; Database Health</h3>
              </div>
            </div>

            <div className="health-metrics-grid">
              <div className="health-metric success">
                <span className="metric-label">Registered Users</span>
                <strong>{systemLiveStats.totalUsers}</strong>
                <small>Live account count from the system</small>
              </div>
              <div className="health-metric success">
                <span className="metric-label">School Coverage</span>
                <strong>{systemLiveStats.schoolCount}</strong>
                <small>Operational schools and communities</small>
              </div>
              <div className="health-metric warning">
                <span className="metric-label">Program Gaps</span>
                <strong>{systemLiveStats.programGapCount}</strong>
                <small>Programs still below target reach</small>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
