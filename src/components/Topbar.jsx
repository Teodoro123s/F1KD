import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCompactName, getInitials } from '../utils/nameFormat';
import { signOut } from '../utils/auth';

const user = {
  name: 'Jonathan Alexander Smith',
  email: 'jonathan.smith@example.com',
};

export default function Topbar() {
  const navigate = useNavigate();
  const [openNotif, setOpenNotif] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const displayName = formatCompactName(user.name);

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

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* placeholder for breadcrumbs or page title */}
      </div>

      <div className="topbar-actions">
        <span className="action-wrapper" ref={notifRef}>
          <button
            className="icon-button"
            aria-label="Notifications"
            onClick={() => { setOpenNotif((s) => !s); setOpenUser(false); }}
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
            aria-label={`Account menu for ${user.name}`}
            onClick={() => { setOpenUser((s) => !s); setOpenNotif(false); }}
            title={user.name}
          >
            <span className="avatar">{getInitials(user.name)}</span>
            <span className="compact-user-name">{displayName}</span>
          </button>
          {openUser && (
            <div className="dropdown user-dropdown" role="menu" aria-label="User menu">
              <div className="dropdown-item">Profile</div>
              <div className="dropdown-item">Settings</div>
              <div
                className="dropdown-item"
                onClick={() => {
                  signOut();
                  setOpenUser(false);
                  navigate('/login');
                }}
              >
                Sign out
              </div>
            </div>
          )}
        </span>
      </div>
    </header>
  );
}
