import React from 'react';

function ModalShell({ title, onClose, onSubmit, children, submitLabel }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-section">
          <h3>{title}</h3>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <form onSubmit={onSubmit}>
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

export default function AddUserModal({ showModal, onClose, form, setForm, onSubmit, roleOptions }) {
  if (!showModal) return null;

  return (
    <ModalShell title="Add User" onClose={onClose} onSubmit={onSubmit} submitLabel="Create">
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="user-name">Account Name</label>
          <input
            id="user-name"
            type="text"
            className="form-input"
            placeholder="Enter account name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="form-select"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="user-status">Status</label>
          <select
            id="user-status"
            className="form-select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}
