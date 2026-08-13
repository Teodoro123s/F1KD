import React, { useState } from 'react';

function ModalShell({ title, onClose, onSubmit, children, submitLabel }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-section">
          <h3>{title}</h3>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <form onSubmit={(e) => {
            // prevent default and defer calling the handler to let controlled inputs flush state
            e.preventDefault();
            try { window.__modal_on_submit_called__ = window.__modal_on_submit_called__ || []; window.__modal_on_submit_called__.push(Date.now()); } catch (err) {}
            if (onSubmit) setTimeout(() => onSubmit(e), 0);
          }}>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddUserModal({ showModal, onClose, form, setForm, onSubmit, roleOptions, mode = 'add' }) {

  if (!showModal) return null;

  const title = mode === 'edit' ? 'Edit User' : 'Add User';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create';

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const regeneratePassword = () => {
    const lastName = (form.lastName || '').trim();
    const year = form.dob ? new Date(form.dob).getFullYear() : '1990';
    setForm((prev) => ({ ...prev, password: `${lastName}${year}`.toLowerCase() }));
  };

  const [copied, setCopied] = useState(false);
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // fallback: select the input (no-op in modal without ref)
    }
  };

  return (
    <ModalShell title={title} onClose={onClose} onSubmit={onSubmit} submitLabel={submitLabel}>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="first-name">First Name *</label>
          <input
            id="first-name"
            type="text"
            className="form-input"
            placeholder="Enter first name"
            value={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="last-name">Last Name *</label>
          <input
            id="last-name"
            type="text"
            className="form-input"
            placeholder="Enter last name"
            value={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="middle-initial">Middle Initial</label>
          <input
            id="middle-initial"
            type="text"
            className="form-input"
            placeholder="A"
            maxLength={1}
            value={form.middleInitial}
            onChange={(e) => handleChange('middleInitial', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="contact-number">Contact Number *</label>
          <input
            id="contact-number"
            type="tel"
            className="form-input"
            placeholder="09171234567"
            value={form.contactNumber}
            onChange={(e) => handleChange('contactNumber', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="user@example.com"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="gender">Gender *</label>
          <select
            id="gender"
            className="form-select"
            value={form.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dob">Date of Birth *</label>
          <input
            id="dob"
            type="date"
            className="form-input"
            value={form.dob}
            onChange={(e) => handleChange('dob', e.target.value)}
            required
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="location">Location *</label>
          <select
            id="location"
            className="form-select"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            required
          >
            <option value="Poblacion">Poblacion</option>
            <option value="Upland">Upland</option>
            <option value="Downtown">Downtown</option>
            <option value="Coastal">Coastal</option>
            <option value="Highland">Highland</option>
            <option value="Lowland">Lowland</option>
            <option value="Riverside">Riverside</option>
            <option value="Forest">Forest</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="role">Role *</label>
          <select
            id="role"
            className="form-select"
            value={form.role}
            onChange={(e) => handleChange('role', e.target.value)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

    </ModalShell>
  );
}
