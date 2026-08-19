import React, { useState } from 'react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('settings.emailNotifications') !== 'false');
  const [saved, setSaved] = useState(false);

  const handleSave = (event) => {
    event.preventDefault();
    localStorage.setItem('settings.emailNotifications', String(emailNotifications));
    setSaved(true);
  };

  return (
    <div className="page settings-page">
      <h1>Settings</h1>
      <p>Manage your application preferences.</p>

      <form onSubmit={handleSave} style={{ marginTop: 20 }}>
        <h2>Account</h2>
        <label>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(event) => {
              setEmailNotifications(event.target.checked);
              setSaved(false);
            }}
          />
          Receive email notifications
        </label>
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary">Save</button>
          {saved && <span role="status" style={{ marginLeft: 12 }}>Settings saved.</span>}
        </div>
      </form>
    </div>
  );
}
