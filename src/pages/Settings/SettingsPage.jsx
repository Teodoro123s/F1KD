import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import ChangePasswordForm from '../../components/ChangePasswordForm';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('settings.darkMode') === 'true');

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('settings.darkMode', String(darkMode));
  }, [darkMode]);

  return (
    <div className="community-page">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <main style={{ padding: '1rem' }}>
        <div className="checkup-card">
          <div className="checkup-card-body">
            <div className="checkup-grid user-profile-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="checkup-field-label" htmlFor="dark-mode-toggle">Appearance</label>
                <label htmlFor="dark-mode-toggle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minHeight: '2.75rem', padding: '0.75rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#0f172a', fontWeight: 600 }}>
                  <span>Dark mode</span>
                  <input
                    id="dark-mode-toggle"
                    type="checkbox"
                    checked={darkMode}
                    onChange={(event) => setDarkMode(event.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
