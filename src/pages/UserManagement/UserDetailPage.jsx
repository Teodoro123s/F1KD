import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { generatePassword, formatDobForInput } from './lib';
import { apiGetUser } from '../../api/users';
import { getSummary } from '../Community/communityService';

export default function UserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
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
  const requiresSchoolAssignment = ['health worker', 'community organizer'].includes(String(user.role || '').trim().toLowerCase());
  const schoolLabel = (() => {
    if (!requiresSchoolAssignment) return 'Not required';
    if (!user.schoolId) return 'Not assigned';
    const match = communities.find((school) => String(school.id) === String(user.schoolId));
    return match?.name || `School ID ${user.schoolId}`;
  })();
  const handleEdit = () => {
    // Navigate back to list and signal the list to open edit modal
    navigate('/user-management', { state: { editUser: user } });
  };

  const [generatedPwd, setGeneratedPwd] = useState('');

  const generateDefaultPassword = () => {
    const pwd = generatePassword(user);
    setGeneratedPwd(pwd);
  };

  const applyGenerated = () => {
    if (!generatedPwd) return;
    navigate('/user-management', { state: { editUser: { ...user, password: generatedPwd } } });
  };

  return (
    <div className="community-page">
      <header className="community-header" style={{ background: '#F8FAFC', paddingBottom: 12 }}>
        <div className="community-title-section">
          <h1 style={{ margin: 0, fontSize: '2rem' }}>{displayName}</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb" style={{ marginTop: 8 }}>
            <span className="breadcrumb-item">
              <Link to="/user-management" className="breadcrumb-current">User Management</Link>
              <span className="breadcrumb-separator">›</span>
            </span>
            <span className="breadcrumb-item">
              <span className="breadcrumb-current">{user.role || 'User'}</span>
            </span>
          </nav>
        </div>
        <div style={{ marginLeft: 'auto', padding: 16 }}>
          <button type="button" className="btn-primary" onClick={handleEdit}>Edit</button>
        </div>
      </header>

      

      <main style={{ padding: '1rem' }}>
        <div className="checkup-card">
          <div className="checkup-card-body">
            <div className="checkup-section-title">Profile</div>

            <div className="checkup-grid">
              <div className="form-row-3 full-width">
                <div className="form-group">
                  <label className="checkup-field-label">First Name</label>
                  <input className="checkup-field-input" value={user.firstName || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Last Name</label>
                  <input className="checkup-field-input" value={user.lastName || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Middle Initial</label>
                  <input className="checkup-field-input" value={user.middleInitial || ''} readOnly />
                </div>
              </div>

              <div className="form-row-3 full-width">
                <div className="form-group">
                  <label className="checkup-field-label">Contact Number</label>
                  <input className="checkup-field-input" value={user.contactNumber || user.contact || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Email</label>
                  <input className="checkup-field-input" value={user.email || ''} readOnly />
                </div>
                <div className="form-group" aria-hidden="true" />
              </div>

              <div className="form-row-3 full-width">
                <div className="form-group">
                  <label className="checkup-field-label">Gender</label>
                  <input className="checkup-field-input" value={user.gender || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Date of Birth</label>
                  <input className="checkup-field-input" value={user.dob || user.dateOfBirth || ''} readOnly />
                </div>
                <div className="form-group" aria-hidden="true" />
              </div>

              <div className="form-row-3 full-width">
                <div className="form-group">
                  <label className="checkup-field-label">Location</label>
                  <input className="checkup-field-input" value={user.location || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Role</label>
                  <input className="checkup-field-input" value={user.role || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="checkup-field-label">Status</label>
                  <input className="checkup-field-input" value={user.status || ''} readOnly />
                </div>
              </div>

              {requiresSchoolAssignment && (
                <div className="form-row-3 full-width">
                  <div className="form-group">
                    <label className="checkup-field-label">Assigned School</label>
                    <input className="checkup-field-input" value={schoolLabel} readOnly />
                  </div>
                  <div className="form-group" aria-hidden="true" />
                  <div className="form-group" aria-hidden="true" />
                </div>
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
                <button type="button" className="btn-small" onClick={applyGenerated} disabled={!generatedPwd}>Apply</button>
              </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={handleEdit}>Edit</button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/user-management')}>Back</button>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
