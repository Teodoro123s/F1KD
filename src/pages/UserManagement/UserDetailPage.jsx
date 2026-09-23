import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { generatePassword, formatDobForInput } from './lib';
import { apiGetUser, apiUpdateUser } from '../../api/users';
import { getSummary } from '../Community/communityService';

export default function UserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [groups, setGroups] = useState([]);
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
        const data = await apiGetUser(id);
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
  }, [id, location]);

  const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || id;
  const normalizedRole = String(user.role || '').trim().toLowerCase();
  const isCommunityOrganizer = normalizedRole === 'community organizer';
  const isHealthWorker = normalizedRole === 'health worker';
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
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isApplyingPassword, setIsApplyingPassword] = useState(false);

  const generateDefaultPassword = () => {
    const pwd = generatePassword(user);
    setGeneratedPwd(pwd);
  };

  const applyGenerated = async () => {
    if (!generatedPwd) return;
    const serverId = String(user.id || id).replace(/^USR-/, '');
    setIsApplyingPassword(true);
    setPasswordMessage('');
    try {
      await apiUpdateUser(serverId, { password: generatedPwd });
      setPasswordMessage('Password updated successfully.');
      setGeneratedPwd('');
    } catch (error) {
      setPasswordMessage(error?.message || 'Unable to update the password.');
    } finally {
      setIsApplyingPassword(false);
    }
  };

  return (
    <div className="community-page">
      <PageHeader
        title={displayName}
        breadcrumbs={[{ label: 'User Management', href: '/user-management' }, { label: user.role || 'User' }]}
        actions={<button type="button" className="view-btn view-btn--primary" onClick={handleEdit}>Edit</button>}
      />

      

      <main style={{ padding: '1rem' }}>
        <div className="checkup-card">
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

            

            <div style={{ marginTop: 18 }}>
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
              {passwordMessage && <div className="notification-banner" role="status" style={{ marginTop: 8 }}>{passwordMessage}</div>}

            <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={handleEdit}>Edit</button>
              <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
