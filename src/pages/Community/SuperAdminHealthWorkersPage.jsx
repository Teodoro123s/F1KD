import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import CommunityTable from './CommunityTable';
import { getGroupHealthWorkers } from './communityService';
import { useCommunityData } from './hooks/useCommunityData';

export default function SuperAdminHealthWorkersPage() {
  const { groupId } = useParams();
  const { groups, loading: groupLoading } = useCommunityData();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const group = groups.find((item) => String(item.id) === String(groupId));
  const schoolName = group?.community || 'School';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getGroupHealthWorkers(groupId)
      .then((response) => {
        if (active) setWorkers(response.users || response.healthWorkers || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load group users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [groupId]);

  const columns = [
    { key: 'name', header: 'Name', renderCell: (row) => <span className="community-title-text">{row.name || 'Unnamed user'}</span> },
    { key: 'role', header: 'Role', renderCell: (row) => row.role || '—' },
    { key: 'email', header: 'Email', renderCell: (row) => row.email || '—' },
    { key: 'contact_number', header: 'Contact Number', renderCell: (row) => row.contact_number || '—' },
    { key: 'status', header: 'Status', renderCell: (row) => row.status || 'Active' },
  ];

  return (
    <div className="community-page">
      <PageHeader
        title="Group Users"
        breadcrumbs={[
          { label: 'Schools', to: '/community' },
          { label: schoolName, to: group ? `/community/school/${group.communityId || ''}` : '/community' },
          { label: group?.name || 'Group', to: group ? `/community/group/${group.id}` : undefined },
          { label: 'Assigned Users' },
        ]}
        actions={<Link className="view-btn view-btn--secondary back-action" to={group?.communityId ? `/community/school/${group.communityId}` : '/community'}>Back to School Groups</Link>}
      />
      {groupLoading || loading ? <p>Loading group users...</p> : error ? <p className="error-message">{error}</p> : (
        <CommunityTable
          columns={columns}
          data={workers}
          tableTitle={`Health Workers and Community Organizers for ${group?.name || 'Group'}`}
          emptyMessage="No health workers or community organizers are assigned to this group."
        />
      )}
    </div>
  );
}
