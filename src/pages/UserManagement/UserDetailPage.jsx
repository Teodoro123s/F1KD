import React from 'react';
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

      <section className="subheader-row" aria-hidden="true" style={{ borderBottom: '1px solid #E6EEF6', marginTop: 12 }}>
        <div style={{ height: 18 }} />
      </section>

      <main style={{ padding: '1rem' }}>
        <div className="modal-content" style={{ padding: '1rem' }}>
          <div style={{ minHeight: 200 }}>
            <h3 style={{ marginTop: 0 }}>Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div><strong>First Name:</strong> {user.firstName || '-'}</div>
              <div><strong>Last Name:</strong> {user.lastName || '-'}</div>
              <div><strong>Middle Initial:</strong> {user.middleInitial || '-'}</div>
              <div><strong>Contact:</strong> {user.contactNumber || user.contact || '-'}</div>
              <div><strong>Email:</strong> {user.email || '-'}</div>
              <div><strong>Gender:</strong> {user.gender || '-'}</div>
              <div><strong>Location:</strong> {user.location || '-'}</div>
              <div><strong>Role:</strong> {user.role || '-'}</div>
              <div><strong>Status:</strong> {user.status || '-'}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
