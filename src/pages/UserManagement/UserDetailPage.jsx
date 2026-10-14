import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { notifyAction } from '../../components/ActionFeedback';
import { generatePassword, formatDobForInput } from './lib';
import { apiGetManagedHealthWorker, apiGetUser, apiUpdateUser } from '../../api/users';
import { apiGetActivityReport } from '../../api/reports';
import { getSummary } from '../Community/communityService';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../utils/permissions';
import { useAuth } from '../../auth/AuthProvider';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { ActivityChart } from '../Reports/ReportsPage';

function formatActivityDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatActivityAction(action) {
  if (action === 'sign_in') return 'Signed in';
  return String(action || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isCoordinator = isCommunityCoordinatorRole(currentUser?.role);
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
        const serverId = String(id).replace(/^USR-/, '');
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

  const activityUserId = String(user.id || id).replace(/^USR-/, '');

  useEffect(() => {
    if (isCoordinator || selectedCard !== 'activity' || !/^\d+$/.test(activityUserId)) return undefined;
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
  }, [isCoordinator, selectedCard, activityUserId, activityPage, activityPerPage]);

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
    const serverId = String(user.id || id).replace(/^USR-/, '');
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
          {row.description && <div className="user-activity-muted">{row.description}</div>}
        </div>
      ),
    },
    { key: 'entityType', header: 'Record type' },
  ];
  const activityRangeStart = activityReport.total ? (activityPage - 1) * activityPerPage + 1 : 0;
  const activityRangeEnd = Math.min(activityPage * activityPerPage, activityReport.total || 0);

  return (
    <div className="community-page">
      <PageHeader
        title={displayName}
        breadcrumbs={[{ label: 'User Management', href: '/user-management' }, { label: user.role || 'User' }]}
        actions={(
          <>
            {!isCoordinator && <button type="button" className="view-btn view-btn--primary" onClick={handleEdit}>Edit</button>}
            <button type="button" className="view-btn view-btn--secondary back-action" onClick={() => navigate(-1)}>Back</button>
          </>
        )}
      />

      

      <main style={{ padding: '1rem' }}>
        <ModuleSummaryCards
          selected={selectedCard}
          toggleOnSelect
          onSelect={(key) => {
            setSelectedCard(key);
            setActivityPage(1);
          }}
          cards={[
            { key: 'profile', label: 'User Profile', value: 'Bio', description: 'View profile details', selectedDescription: 'Hide profile' },
            ...(!isCoordinator ? [{ key: 'activity', label: 'Actions Performed', value: activityReport.total ?? '—', description: 'View actions performed by this user', selectedDescription: 'Hide activity' }] : []),
          ]}
        />

        {!selectedCard && <p className="user-detail-hint">Select a card to view this user’s profile or activity.</p>}

        {selectedCard === 'profile' && <div className="checkup-card">
          <div className="checkup-card-body">
            <div className="checkup-section-title">Profile</div>

            <div className="checkup-grid user-profile-grid">
              <div className="form-group">
                <label className="checkup-field-label">First Name</label>
                <input className="checkup-field-input" value={user.firstName || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Middle Initial</label>
                <input className="checkup-field-input" value={user.middleInitial || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Surname</label>
                <input className="checkup-field-input" value={user.lastName || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Email</label>
                <input className="checkup-field-input" value={user.email || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Role</label>
                <input className="checkup-field-input" value={user.role || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Status</label>
                <input className="checkup-field-input" value={user.status || 'Active'} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Contact Number</label>
                <input className="checkup-field-input" value={user.contactNumber || user.contact || '—'} readOnly />
              </div>
              <div className="form-group">
                <label className="checkup-field-label">Date of Birth</label>
                <input className="checkup-field-input" value={user.dob || '—'} readOnly />
              </div>

              {requiresSchoolAssignment && (
                <>
                  <div className="form-group">
                    <label className="checkup-field-label">School</label>
                    <input className="checkup-field-input" value={schoolLabel} readOnly />
                  </div>
                  {isHealthWorker && (
                    <div className="form-group">
                      <label className="checkup-field-label">Group</label>
                      <input className="checkup-field-input" value={groupLabel} readOnly />
                    </div>
                  )}
                </>
              )}
            </div>

            

            {!isCoordinator && <div style={{ marginTop: 18 }}>
              <div className="checkup-section-title">Password</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
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
          </div>
        </div>}

        {selectedCard === 'activity' && (
          <section className="user-activity-panel" aria-label={`${displayName} activity report`}>
            <h2>Actions performed by {displayName}</h2>
            {activityError && <div role="alert" className="error-message">{activityError}</div>}
            <div className="user-activity-view-switch" role="group" aria-label="User activity view">
              <button type="button" aria-pressed={activityView === 'graph'} className={activityView === 'graph' ? 'is-active' : ''} onClick={() => setActivityView('graph')}>Graph view</button>
              <button type="button" aria-pressed={activityView === 'table'} className={activityView === 'table' ? 'is-active' : ''} onClick={() => setActivityView('table')}>Table view</button>
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
                  tableTitle={activityLoading ? 'Loading activity…' : 'User logs and activity'}
                  emptyMessage={activityLoading ? 'Loading activity…' : 'No activity recorded for this user.'}
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
      </main>
      <style>{`
        .user-detail-hint { margin: 1.25rem 0; color: #64748b; text-align: center; }
        .user-activity-panel { margin-top: 1rem; }
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
      `}</style>
    </div>
  );
}
