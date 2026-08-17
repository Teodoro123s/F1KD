import React from 'react';

export default function SettingsPage() {
  return (
    <div className="page settings-page">
      <h1>Settings</h1>
      <p>This is a template settings page. Add settings such as notification preferences, account management, and application options here.</p>

      <section style={{marginTop:20}}>
        <h2>Account</h2>
        <p>Change password, two-factor authentication, and account preferences will be here.</p>
        <button disabled>Save (not implemented)</button>
      </section>
    </div>
  );
}
