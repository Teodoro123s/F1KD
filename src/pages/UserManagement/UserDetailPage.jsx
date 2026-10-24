import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import { notifyAction } from '../../components/ActionFeedback';
import { generatePassword, formatDobForInput } from './lib';
import { apiGetManagedHealthWorker, apiGetUser, apiUpdateUser } from '../../api/users';
import { apiGetActivityReport } from '../../api/reports';
import { getSummary } from '../Community/communityService';
import { hasRole, isCommunityCoordinatorRole, isHealthWorkerRole, ROLES } from '../../utils/permissions';
import { useAuth } from '../../auth/AuthProvider';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { ActivityChart } from '../Reports/ReportsPage';
import { navigateBack } from '../../utils/navigation';

function formatActivityDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function toApiUserId(value) {
  const match = String(value ?? '').trim().match(/^(?:USR-)?(\d+)$/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

function formatActivityAction(action) {
  const labels = {
    create: 'Created',
    update: 'Edited',
    delete: 'Deleted',
    sign_in: 'Signed in',
    suspend: 'Suspended',
    reactivate: 'Reactivated',
  };
  if (labels[action]) return labels[action];
  return String(action || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function exportActivityCsv(rows, fields, filename) {
  const csv = [
    fields.map((field) => field.label),
    ...rows.map((row) => fields.map(({ key }) => row[key] ?? '')),
  ].map((line) => line.map((value) => {
    const text = String(value);
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ProfileField({ label, value }) {
  return (
    <div className="detail-form-field">
      <div className="detail-form-label">{label}</div>
      <div className={`detail-form-value${value ? '' : ' empty'}`}>{value || '—'}</div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isCoordinator = isCommunityCoordinatorRole(currentUser?.role);
  const isSuperAdmin = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const canViewUserActivity = isCoordinator || isSuperAdmin;
  const [communities, setCommunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedCard, setSelectedCard] = useState('profile');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPerPage, setActivityPerPage] = useState(10);
  const [activityView, setActivityView] = useState('graph');
  const [activityReport, setActivityReport] = useState({ activities: [], dailyActivity: [], total: null });
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const getInitialUser = () => {
    const initial = location?.state?.user || { id };
    if (initial.name && !initial.firstName) {
      const parts = initial.name.trim().split(/\s+/);
      initial.firstName = parts[0] || '';
      initial.lastName = parts.slice(1).join(' ') || '';
      initial.middleInitial = '';
    }
    return initial;
  };

  const [user, setUser] = useState(getInitialUser);

  useEffect(() => {
    let mounted = true;
    getSummary()
      .then((summary) => {
        if (!mounted) return;
        setCommunities(summary.communities || []);
        setGroups(summary.groups || []);
      })
      .catch(() => {
        if (!mounted) return;
        setCommunities([]);
      });

    async function load() {
      // If navigated with full user details in state, keep it. Otherwise fetch by id.
      if (location?.state?.user && location.state.user.firstName) return; 
      try {
        const serverId = toApiUserId(id);
        if (!serverId) throw new Error('Invalid user ID');
        const data = isCoordinator
          ? await apiGetManagedHealthWorker(serverId)
          : await apiGetUser(serverId);
        if (!mounted) return;
        // server returns full_name. Try to split into first/last if available
        const full = data.full_name || '';
        let firstName = data.first_name || '';
        let lastName = data.last_name || '';
        let middleInitial = data.middle_initial || '';
        if (!firstName && full) {
          const parts = full.trim().split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }

        setUser({
          id: data.id ? `USR-${String(data.id).padStart(4, '0')}` : id,
          firstName,
          lastName,
          middleInitial,
          contactNumber: data.contact_number || data.contact || '',
          email: data.email || '',
          gender: data.gender || '',
          dob: formatDobForInput(data.dob),
          location: data.location || '',
          role: data.role || '',
          status: (data.status || '').toString(),
          schoolId: data.school_id ?? '',
          groupId: data.group_id ?? '',
          name: data.full_name || `${firstName} ${lastName}`.trim(),
        });
      } catch (e) {
        console.error('Failed to load user detail', e);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, location, isCoordinator]);

  const activityUserId = toApiUserId(user.id || id) || '';

  useEffect(() => {
    if (!canViewUserActivity || selectedCard !== 'activity' || !/^\d+$/.test(activityUserId)) return undefined;
    let active = true;
    setActivityLoading(true);
    setActivityError('');
    setActivityReport({ activities: [], dailyActivity: [], total: null });
    apiGetActivityReport({ actorUserId: activityUserId, page: activityPage, perPage: activityPerPage })
      .then((response) => {
        if (!active) return;
        setActivityReport({
          activities: response.activities || [],
          dailyActivity: response.dailyActivity || [],
          total: Number(response.total) || 0,
        });
      })
      .catch((error) => {
        if (!active) return;
        setActivityError(error.message || 'Unable to load this user’s activity.');
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });
    return () => { active = false; };
  }, [canViewUserActivity, selectedCard, activityUserId, activityPage, activityPerPage]);

  const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || id;
  const isCommunityOrganizer = isCommunityCoordinatorRole(user.role);
  const isHealthWorker = isHealthWorkerRole(user.role);
  const requiresSchoolAssignment = isCommunityOrganizer || isHealthWorker;
  const schoolLabel = (() => {
    if (!requiresSchoolAssignment) return 'Not required';
    if (!user.schoolId) return 'Not assigned';
    const match = communities.find((school) => String(school.id) === String(user.schoolId));
    return match?.name || `School ID ${user.schoolId}`;
  })();
  const groupLabel = (() => {
    if (!isHealthWorker) return 'Not required';
    if (!user.groupId) return 'Not assigned';
    const match = groups.find((group) => String(group.id) === String(user.groupId));
    return match?.name || `Group ID ${user.groupId}`;
  })();
  const handleEdit = () => {
    // Navigate back to list and signal the list to open edit modal
    navigate('/user-management', { state: { editUser: user } });
  };

  const [generatedPwd, setGeneratedPwd] = useState('');
  const [isApplyingPassword, setIsApplyingPassword] = useState(false);

  const generateDefaultPassword = () => {
    const pwd = generatePassword(user);
    setGeneratedPwd(pwd);
  };

  const applyGenerated = async () => {
    if (!generatedPwd) return;
    const serverId = toApiUserId(user.id || id);
    if (!serverId) {
      notifyAction('Unable to update the password: invalid user ID.', 'error');
      return;
    }
    setIsApplyingPassword(true);
    try {
      await apiUpdateUser(serverId, { password: generatedPwd });
      notifyAction('Password updated successfully.');
      setGeneratedPwd('');
    } catch (error) {
      notifyAction(error?.message || 'Unable to update the password.', 'error');
    } finally {
      setIsApplyingPassword(false);
    }
  };
  const activityPageCount = Math.max(1, Math.ceil((activityReport.total || 0) / activityPerPage));
  const activityColumns = [
    { key: 'createdAt', header: 'Date & time', renderCell: (row) => formatActivityDate(row.createdAt) },
    {
      key: 'activity',
      header: 'Activity',
      renderCell: (row) => (
        <div>
          <strong>{formatActivityAction(row.action)}</strong>
          {row.category && <div className="user-activity-muted">{row.category}</div>}
          {row.description && <div className="user-activity-muted">{row.description}</div>}
        </div>
      ),
    },
    {
      key: 'signature',
      header: 'Signed by',
      renderCell: (row) => (
        <div>
          <strong>{row.actorName || 'Unknown user'}</strong>
          {row.actorRole && <div className="user-activity-muted">{row.actorRole}</div>}
        </div>
      ),
    },
    {
      key: 'record',
      header: 'Record',
      renderCell: (row) => [row.entityType, row.entityId ? `#${row.entityId}` : ''].filter(Boolean).join(' ') || '—',
    },
  ];
  const activityRangeStart = activityReport.total ? (activityPage - 1) * activityPerPage + 1 : 0;
  const activityRangeEnd = Math.min(activityPage * activityPerPage, activityReport.total || 0);

  return (
    <section className="mother-detail-page user-detail-page">
      <PageHeader
        title={displayName}
        breadcrumbs={[{ label: 'User Management', href: '/user-management' }, { label: user.role || 'User' }]}
        actions={(
          <>
            {!isCoordinator && <button type="button" className="view-btn view-btn--primary" onClick={handleEdit}>Edit</button>}
            <button type="button" className="view-btn view-btn--secondary back-action" onClick={() => navigateBack(navigate, location, '/user-management')}>Back</button>
          </>
        )}
      />

      <ModuleSummaryCards
        selected={selectedCard}
        onSelect={(key) => {
          setSelectedCard(key);
          if (key === 'activity') {
            setActivityPage(1);
            if (isHealthWorker) setActivityView('table');
          }
        }}
        cards={[
          {
            key: 'profile',
            label: 'User Profile',
            value: 'Profile',
            description: 'View account details',
          },
          ...(canViewUserActivity ? [{
            key: 'activity',
            label: 'Activity Logs',
            value: 'Activity',
            description: 'Review account activity',
          }] : []),
        ]}
      />

      {selectedCard === 'profile' && (
        <section className="mother-detail-section">
          <h3 className="mother-detail-section-title">{isHealthWorker ? 'Health Worker Profile' : 'User Profile'}</h3>
          <div className="mother-detail-grid user-detail-profile-grid">
            <ProfileField label="First Name" value={user.firstName} />
            <ProfileField label="Middle Initial" value={user.middleInitial} />
            <ProfileField label="Surname" value={user.lastName} />
            <ProfileField label="Email" value={user.email} />
            <ProfileField label="Role" value={user.role} />
            <ProfileField label="Status" value={user.status || 'Active'} />
            <ProfileField label="Contact Number" value={user.contactNumber || user.contact} />
            <ProfileField label="Date of Birth" value={user.dob} />
            {requiresSchoolAssignment && <ProfileField label="School" value={schoolLabel} />}
            {isHealthWorker && <ProfileField label="Group" value={groupLabel} />}
          </div>

          {!isCoordinator && <div className="user-detail-password">
            <div className="mother-detail-section-title">Password</div>
            <div className="user-detail-password-controls">
              <input
                type="text"
                className="checkup-field-input"
                value={generatedPwd}
                readOnly
                placeholder="Generate default password"
                aria-label="Generated password"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-small" onClick={generateDefaultPassword}>Generate default password</button>
              <button type="button" className="btn-small" onClick={applyGenerated} disabled={!generatedPwd || isApplyingPassword}>{isApplyingPassword ? 'Applying...' : 'Apply'}</button>
            </div>
          </div>}
        </section>
      )}

      {selectedCard === 'activity' && (
        <section className="user-activity-panel" aria-label={`${displayName} activity report`}>
          <h2>Activity logs for {displayName}</h2>
          <p>Recorded changes show who created, edited, or deleted a record. Older actions are available only when the system stored an audit event or signature.</p>
          {activityError && <div role="alert" className="error-message">{activityError}</div>}
          <div className="user-activity-view-switch" role="group" aria-label="User activity view">
            <button type="button" aria-pressed={activityView === 'graph'} className={activityView === 'graph' ? 'is-active' : ''} onClick={() => setActivityView('graph')}>Graph view</button>
            <button type="button" aria-pressed={activityView === 'table'} className={activityView === 'table' ? 'is-active' : ''} onClick={() => setActivityView('table')}>Table view</button>
            <button
              type="button"
              className="btn-secondary"
              disabled={activityLoading || (activityView === 'graph' ? !activityReport.dailyActivity.length : !activityReport.activities.length)}
              onClick={() => activityView === 'graph'
                ? exportActivityCsv(activityReport.dailyActivity, [
                  { key: 'date', label: 'Date' },
                  { key: 'count', label: 'Activity Count' },
                ], `user-activity-graph-${activityUserId}.csv`)
                : exportActivityCsv(activityReport.activities.map((row) => ({
                  ...row,
                  signature: [row.actorName, row.actorRole].filter(Boolean).join(' · '),
                  record: [row.entityType, row.entityId ? `#${row.entityId}` : ''].filter(Boolean).join(' ') || '—',
                  activity: [formatActivityAction(row.action), row.category, row.description].filter(Boolean).join(' — '),
                  })), [
                    { key: 'createdAt', label: 'Date & Time' },
                    { key: 'activity', label: 'Activity' },
                    { key: 'signature', label: 'Signature' },
                    { key: 'record', label: 'Record' },
                  ], `user-activity-table-${activityUserId}.csv`)}
            >
              Download {activityView === 'graph' ? 'graph data' : 'table page'} CSV
            </button>
          </div>
          {activityLoading ? <p role="status">Loading user activity…</p> : activityView === 'graph' ? (
            <ActivityChart
              dailyActivity={activityReport.dailyActivity}
              title="Actions performed over time"
              ariaLabel={`Daily actions performed by ${displayName}`}
              emptyMessage="No activity recorded for this user during the selected period."
            />
          ) : (
            <>
              <CommunityTable
                columns={activityColumns}
                data={activityReport.activities}
                rowKey="id"
                tableTitle={activityLoading ? 'Loading activity…' : isHealthWorker ? 'Individual user logs' : 'User logs and activity'}
                emptyMessage={activityLoading ? 'Loading activity…' : isHealthWorker ? 'No user logs found for this account.' : 'No activity recorded for this user.'}
              />
              <CommunityPagination
                currentPage={activityPage}
                pageCount={activityPageCount}
                onPageChange={setActivityPage}
                perPage={activityPerPage}
                onPerPageChange={(value) => { setActivityPerPage(Number(value)); setActivityPage(1); }}
                rangeStart={activityRangeStart}
                rangeEnd={activityRangeEnd}
                totalItems={activityReport.total}
              />
            </>
          )}
        </section>
      )}

      <style>{`
        .user-detail-page .user-detail-profile-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .user-detail-page .user-detail-password { margin-top: 1.25rem; }
        .user-detail-page .user-detail-password-controls { display: flex; gap: 0.5rem; align-items: center; }
        .user-detail-page .user-detail-password-controls input { min-width: 0; }
        .user-detail-page .user-activity-panel { margin-top: 0; padding: 1rem 1.15rem 1.1rem; border: 1px solid #e2e8f0; border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%); }
        .user-activity-panel > h2 { margin: 0 0 0.75rem; color: #0f172a; font-size: 1.1rem; }
        .user-activity-view-switch { display: flex; gap: 0.5rem; margin: 1rem 0; }
        .user-activity-view-switch button { padding: 0.55rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; cursor: pointer; }
        .user-activity-view-switch button.is-active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 600; }
        .user-activity-muted { color: #64748b; font-size: 0.82rem; margin-top: 0.2rem; }
        .user-activity-panel .report-chart-card { margin-top: 0; }
        .user-activity-panel .report-chart-card { padding: 1rem 1.25rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
        .user-activity-panel .report-chart-card h2 { margin: 0 0 0.75rem; font-size: 1rem; color: #0f172a; }
        .user-activity-panel .report-chart-scroll { overflow-x: auto; }
        .user-activity-panel .report-activity-chart { display: block; width: 100%; min-width: 540px; height: auto; }
        .user-activity-panel .report-activity-chart g[tabindex="0"] { outline: none; cursor: pointer; }
        .user-activity-panel .report-activity-chart g[tabindex="0"]:focus circle:nth-of-type(2) { stroke: #0f172a; stroke-width: 2.5; }
        @media (max-width: 900px) { .user-detail-page .user-detail-profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) {
          .user-detail-page .user-detail-profile-grid { grid-template-columns: 1fr; }
          .user-detail-page .user-detail-password-controls { align-items: stretch; flex-direction: column; }
          .user-detail-page .user-detail-password-controls > * { width: 100%; }
        }
      `}</style>
    </section>
  );
}
