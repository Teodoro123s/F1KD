import React, { useEffect, useState } from 'react';
import { formatDateForInput } from '../../utils/dateFormat';
import { capitalizeNameValue } from '../../utils/nameFormat';
import { generatePassword } from './lib';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../utils/permissions';

function formatDobForDisplay(value) {
  const inputDate = formatDateForInput(value);
  if (!inputDate) return '';
  const [year, month, day] = inputDate.split('-');
  return `${day}/${month}/${year}`;
}

function parseDobInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDobTyping(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function ModalShell({ title, onClose, onSubmit, children, submitLabel, isSubmitting = false, notification = '' }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-section">
          <h3>{title}</h3>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!isSubmitting && onSubmit) onSubmit(event);
        }}>
          <div className="modal-body">
            {notification && <div className="notification-banner" role="alert">{notification}</div>}
            {children}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Back</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >{isSubmitting ? `${submitLabel}...` : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddUserModal({ showModal, onClose, form, setForm, onSubmit, roleOptions, communities = [], groups = [], mode = 'add', isSubmitting = false, notification = '' }) {
  const [dobInput, setDobInput] = useState(() => formatDobForDisplay(form.dob));

  useEffect(() => {
    if (parseDobInput(dobInput) !== formatDateForInput(form.dob)) {
      setDobInput(formatDobForDisplay(form.dob));
    }
  }, [form.dob]);

  if (!showModal) return null;

  const title = mode === 'edit' ? 'Edit User' : 'Add User';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create';

  const handleChange = (field, value) => {
    const nextValue = ['firstName', 'lastName', 'middleInitial'].includes(field) ? capitalizeNameValue(value) : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };
  const requiresSchool = isCommunityCoordinatorRole(form.role) || isHealthWorkerRole(form.role);
  const requiresGroup = isHealthWorkerRole(form.role);
  const schoolIsRequired = requiresSchool;
  const selectedSchoolName = communities.find((school) => String(school.id) === String(form.schoolId || ''))?.name || '';
  const groupOptions = groups.filter((group) => {
    if (!form.schoolId) return true;
    const groupCommunity = group.community || group.communityName || group.schoolName || '';
    const schoolIdValues = [group.community_id, group.schoolId, group.school_id, group.communityId];
    return !groupCommunity || groupCommunity.toLowerCase() === selectedSchoolName.toLowerCase() || schoolIdValues.some((value) => String(value) === String(form.schoolId));
  });

  return (
    <ModalShell title={title} onClose={onClose} onSubmit={onSubmit} submitLabel={submitLabel} isSubmitting={isSubmitting} notification={notification}>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="first-name">First Name *</label>
          <input
            id="first-name"
                      name="firstName"
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
                      name="lastName"
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
                      name="middleInitial"
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
                      name="contactNumber"
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
                      name="email"
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
        <div className="form-group date-input-group">
          <label className="form-label" htmlFor="dob">Date of Birth *</label>
          <div className="date-input-container">
            <input
              id="dob"
              name="dob"
              type="text"
              className="form-input"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="DD/MM/YYYY"
              maxLength={10}
              value={dobInput}
              onChange={(e) => {
                const nextValue = formatDobTyping(e.target.value);
                setDobInput(nextValue);
                handleChange('dob', parseDobInput(nextValue));
              }}
              required
            />
            <input
              id="dob-picker"
              type="date"
              className="native-date-picker-input"
              value={formatDateForInput(form.dob)}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleChange('dob', e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              className="calendar-toggle-btn"
              onClick={() => {
                const el = document.getElementById('dob-picker');
                if (el) {
                  try {
                    if (typeof el.showPicker === 'function') el.showPicker();
                    else el.focus();
                  } catch (_) {
                    el.focus();
                  }
                }
              }}
              aria-label="Open calendar picker for Date of Birth"
              tabIndex={-1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </div>
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="role">Role *</label>
          <select
            id="role"
                      name="role"
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

      {requiresSchool && (
        <>
          <div className="form-group full-width">
            <label className="form-label" htmlFor="school-id">Assigned School{schoolIsRequired ? ' *' : ''}</label>
            <select id="school-id" name="schoolId" className="form-select" value={form.schoolId || ''} onChange={(e) => setForm((prev) => ({ ...prev, schoolId: e.target.value, groupId: requiresGroup ? '' : prev.groupId }))}>
              <option value="">Select assigned school</option>
              {communities.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </div>

          {requiresGroup && (
            <div className="form-group full-width">
              <label className="form-label" htmlFor="group-id">Assigned Group *</label>
              <select id="group-id" name="groupId" className="form-select" value={form.groupId || ''} onChange={(e) => handleChange('groupId', e.target.value)} required>
                <option value="">Select assigned group</option>
                {groupOptions.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          )}

        </>
      )}

      <div className="form-group full-width">
        <label className="form-label" htmlFor="status">Status *</label>
        <select id="status" name="status" className="form-select" value={form.status || 'Active'} onChange={(e) => handleChange('status', e.target.value)} required>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

    </ModalShell>
  );
}
