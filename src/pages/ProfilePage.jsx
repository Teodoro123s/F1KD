import React from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.currentUser;

  if (auth.loading) return <div>Loading profile...</div>;

  return (
    <div className="page profile-page">
      <h1>My Profile</h1>
      {!user ? (
        <p>No user information available.</p>
      ) : (
        <div className="profile-card">
          <div><strong>Full name:</strong> {user.first_name} {user.middle_initial || ''} {user.last_name}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Role:</strong> {user.role}</div>
          <div><strong>Contact:</strong> {user.contact_number || '—'}</div>
          <div><strong>Location:</strong> {user.location || '—'}</div>
        </div>
      )}

      <section style={{ marginTop: 20 }}>
        <h2>Account status</h2>
        <p>Your account is currently {user?.status || 'Active'}.</p>
      </section>
    </div>
  );
}
