import React, { useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';

export default function UserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = location?.state?.user || { id };

  const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || id;
  const handleEdit = () => {
    // Navigate back to list and signal the list to open edit modal
    navigate('/user-management', { state: { editUser: user } });
  };

  const [generatedPwd, setGeneratedPwd] = useState('');
  const [copied, setCopied] = useState(false);

  const generateDefaultPassword = () => {
    const lastName = (user.lastName || '').trim();
    const year = user.dob ? new Date(user.dob).getFullYear() : '1990';
    const pwd = `${lastName}${year}`.toLowerCase();
    setGeneratedPwd(pwd);
  };

  const copyGenerated = async () => {
    if (!generatedPwd) return;
    try {
      await navigator.clipboard.writeText(generatedPwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // ignore clipboard failures
    }
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
            </div>

            

            <div style={{ marginTop: 18 }}>
              <div className="checkup-section-title">Password</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <button type="button" className="btn-small" onClick={() => navigate('/user-management')}>Back</button>
                  <button type="button" className="btn-small" onClick={copyGenerated}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <input
                  type="text"
                  className="checkup-field-input"
                  value={generatedPwd}
                  readOnly
                  placeholder="Generate default password"
                  aria-label="Generated password"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-small" onClick={applyGenerated}>Apply</button>
              </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={handleEdit}>Edit</button>
              <button type="button" className="btn-secondary" onClick={generateDefaultPassword}>Generate</button>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
