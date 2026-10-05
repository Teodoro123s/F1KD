import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMothers } from '../../context/MothersContext';
import { getSummary } from '../Community/communityService';
import { apiGetChildren } from '../../api/children';
import { apiGetPrograms } from '../../api/programs';
import { apiGetUsers } from '../../api/users';
import { apiGetNotifications } from '../../api/notifications';
import { ROLES, can, normalizeRole } from '../../utils/permissions';
import { getDashboardProfile } from './dashboardProfiles';
import { ActivityIcon, BatchesIcon, BuildingIcon, DashboardIcon, GroupsIcon, UsersIcon } from '../Community/CommunityIcons';
import './dashboards.css';

const MODULE_ICONS = {
  Community: BuildingIcon,
  Beneficiaries: UsersIcon,
  Monitoring: ActivityIcon,
  Programs: GroupsIcon,
  Reports: BatchesIcon,
  Notifications: ActivityIcon,
  'User Management': UsersIcon,
};

function listFrom(response, key) {
  if (Array.isArray(response?.[key])) return response[key];
  return Array.isArray(response) ? response : [];
}

function getDisplayName(user) {
  return user?.name || user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'there';
}

export default function DashboardsPage() {
  const { currentUser } = useAuth();
  const { mothers, loading: mothersLoading } = useMothers();
  const role = normalizeRole(currentUser?.role);
  const profile = getDashboardProfile(role);
  const [data, setData] = useState({ communities: [], groups: [], batches: [], children: [], programs: [], users: [], notifications: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const requests = await Promise.allSettled([
        getSummary(),
        apiGetChildren(),
        apiGetPrograms(),
        role === ROLES.SUPER_ADMIN ? apiGetUsers(1, 100) : Promise.resolve(null),
        apiGetNotifications({ page: 1, perPage: 5 }),
      ]);
      if (!active) return;
      const summary = requests[0].status === 'fulfilled' ? requests[0].value || {} : {};
      setData({
        communities: listFrom(summary.communities, 'communities'),
        groups: listFrom(summary.groups, 'groups'),
        batches: listFrom(summary.batches, 'batches'),
        children: requests[1].status === 'fulfilled' ? listFrom(requests[1].value, 'children') : [],
        programs: requests[2].status === 'fulfilled' ? listFrom(requests[2].value, 'programs') : [],
        users: requests[3].status === 'fulfilled' ? listFrom(requests[3].value, 'users') : [],
        notifications: requests[4].status === 'fulfilled' ? listFrom(requests[4].value, 'notifications') : [],
      });
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [role]);

  const values = useMemo(() => {
    const motherList = Array.isArray(mothers) ? mothers : [];
    const beneficiaries = motherList.length + data.children.length;
    const followUp = motherList.filter((mother) => Number(mother.progress) > 0 && Number(mother.progress) < 100).length
      + data.children.filter((child) => Number(child.progress) > 0 && Number(child.progress) < 48).length;
    return {
      communities: data.communities.length,
      groups: data.groups.length,
      batches: data.batches.length,
      children: data.children.length,
      beneficiaries,
      programs: data.programs.length,
      users: data.users.length,
      notifications: data.notifications.length,
      followUp,
    };
  }, [data, mothers]);

  const canCreateBeneficiary = can(role, 'beneficiary-resources', 'create');
  const shortcuts = [...profile.modules]
    .filter((module) => module.label !== 'Reports' || can(role, 'progress-report', 'read'))
    .sort((left, right) => Number(Boolean(right.priority)) - Number(Boolean(left.priority)));
  const metricPaths = { beneficiaries: '/beneficiary', children: '/beneficiary', followUp: '/monitoring', programs: '/program', communities: '/community', users: '/user-management', groups: '/community', batches: '/community', notifications: '/notifications' };

  return (
    <main className="role-dashboard">
      <section className="role-dashboard__hero">
        <div className="role-dashboard__hero-copy">
          <span className="role-dashboard__eyebrow">{profile.eyebrow}</span>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
        </div>
        <div className="role-dashboard__identity">
          <DashboardIcon />
          <span>{getDisplayName(currentUser)}</span>
          <small>{currentUser?.role || 'Staff'}</small>
        </div>
      </section>

      <section className="role-dashboard__shortcuts" aria-label="Available module shortcuts">
        <div className="role-dashboard__section-heading">
          <div><span className="role-dashboard__eyebrow">Your access</span><h2>Shortcuts</h2></div>
          <span>{shortcuts.length} modules available</span>
        </div>
        <div className="role-dashboard__shortcut-grid">
          {shortcuts.map((module) => {
            const Icon = MODULE_ICONS[module.label] || DashboardIcon;
            return <Link to={module.path} className={`role-dashboard__shortcut${module.priority ? ' role-dashboard__shortcut--priority' : ''}`} key={module.path}><span className="role-dashboard__shortcut-icon"><Icon /></span><span><strong>{module.label}</strong><small>{module.description}</small></span><span className="role-dashboard__shortcut-arrow">→</span></Link>;
          })}
        </div>
      </section>

      <section className="role-dashboard__metrics" aria-label="Dashboard summary">
        {profile.cards.map((card) => <Link to={metricPaths[card.key] || '/community'} className="role-dashboard__metric" key={card.key}><span>{card.label}</span><strong>{loading || mothersLoading ? '...' : values[card.source]}</strong><small>{card.source === 'followUp' ? 'Needs review' : 'Current records'}</small></Link>)}
      </section>

      <section className="role-dashboard__workspace">
        <div className="role-dashboard__panel">
          <div className="role-dashboard__section-heading"><div><span className="role-dashboard__eyebrow">Module availability</span><h2>What you can do</h2></div></div>
          <div className="role-dashboard__permission-list">
            <div><span className="role-dashboard__status-dot is-live" />Read assigned data across your available modules.</div>
            <div><span className={`role-dashboard__status-dot ${canCreateBeneficiary ? 'is-live' : 'is-muted'}`} />{canCreateBeneficiary ? 'Register and update beneficiary records.' : 'Review beneficiary records and follow-up needs.'}</div>
            <div><span className={`role-dashboard__status-dot ${can(role, 'program-resources', 'update') ? 'is-live' : 'is-muted'}`} />{can(role, 'program-resources', 'update') ? 'Manage program delivery.' : 'Review program delivery.'}</div>
          </div>
        </div>
        <div className="role-dashboard__panel role-dashboard__panel--accent">
          <span className="role-dashboard__eyebrow">Next action</span>
          <h2>{role === ROLES.HEALTH_WORKER ? 'Open monitoring' : role === ROLES.SUPER_ADMIN ? 'Review user access' : 'Review beneficiaries'}</h2>
          <p>Use the shortcut above to continue with the work assigned to your role.</p>
          <Link className="role-dashboard__primary-action" to={role === ROLES.HEALTH_WORKER ? '/monitoring' : role === ROLES.SUPER_ADMIN ? '/user-management' : '/beneficiary'}>Open workspace <span>→</span></Link>
        </div>
      </section>
    </main>
  );
}