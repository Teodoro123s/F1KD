import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/nameFormat';
import { useAuth } from '../auth/AuthProvider';

export default function Topbar() {
  const navigate = useNavigate();
  const auth = useAuth();
  const current = auth?.currentUser;
  const user = current ? { name: current.name, email: current.email, role: current.role } : null;
  const [openNotif, setOpenNotif] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const notifications = [
    { id: 1, text: 'New user signed up' },
    { id: 2, text: 'Backup completed' },
    { id: 3, text: 'New comment on report' },
  ];

  useEffect(() => {
    function onDocClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
      if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!showSignOutModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !signingOut) setShowSignOutModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showSignOutModal, signingOut]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setShowSignOutModal(false);
      setOpenUser(false);
      setSigningOut(true);
      await Promise.resolve();
      auth.logout();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed', error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <span className="action-wrapper" ref={notifRef}>
          <button
            className="icon-button"
            aria-label="Notifications"
            onClick={() => { if (signingOut) return; setOpenNotif((s) => !s); setOpenUser(false); }}
            disabled={signingOut}
          >
            🔔
          </button>
          {openNotif && (
            <div className="dropdown notifications-dropdown" role="menu" aria-label="Notifications list">
              <div className="dropdown-header">Notifications</div>
              <div className="notifications-list">
                {notifications.map((n) => (
                  <div key={n.id} className="dropdown-item">{n.text}</div>
                ))}
                {notifications.length === 0 && <div className="dropdown-item muted">No notifications</div>}
              </div>
            </div>
          )}
        </span>

        <span className="action-wrapper user-profile" ref={userRef}>
          <button
            className="user-button"
            aria-label={`Account menu for ${user ? user.name : 'Account'}`}
            onClick={() => { if (signingOut) return; setOpenUser((s) => !s); setOpenNotif(false); }}
            title={user ? user.name : 'Account'}
            disabled={signingOut}
          >
            <span className="avatar">{getInitials(user ? user.name : 'Account')}</span>
          </button>
          {openUser && (
            <div className="dropdown user-dropdown" role="menu" aria-label="User menu" aria-busy={signingOut}>
              {user ? (
                <>
                  <div className="dropdown-item">{user.name}</div>
                  <div className="dropdown-separator" />
                  <div className="dropdown-item" role="button" onClick={() => { setOpenUser(false); navigate('/profile'); }}>Profile</div>
                  <div className="dropdown-item" role="button" onClick={() => { setOpenUser(false); navigate('/settings'); }}>Settings</div>
                  <div
                    className="dropdown-item"
                    onClick={() => { if (!signingOut) setShowSignOutModal(true); }}
                    aria-busy={signingOut}
                    role="button"
                    style={{ opacity: signingOut ? 0.6 : 1, pointerEvents: signingOut ? 'none' : 'auto' }}
                  >
                    {signingOut ? '⏳ Signing out...' : 'Sign out'}
                  </div>
                </>
              ) : (
                <>
                  <div className="dropdown-item">Not signed in</div>
                  <div className="dropdown-item" onClick={() => navigate('/login')}>Sign in</div>
                </>
              )}
            </div>
          )}
        </span>
      </div>

      {showSignOutModal && createPortal((
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !signingOut) setShowSignOutModal(false);
          }}
        >
          <div
            className="modal-content signout-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header-section">
              <h3 id="signout-confirm-title">Sign out?</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowSignOutModal(false)}
                aria-label="Close sign-out confirmation"
                disabled={signingOut}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to sign out of your account?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowSignOutModal(false)} disabled={signingOut}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </header>
  );
}
