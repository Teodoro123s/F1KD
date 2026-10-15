import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DateInput from '../../components/ui/DateInput';
import { capitalizeNameValue } from '../../utils/nameFormat';
import { generatePassword } from './lib';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../utils/permissions';

function FormDropdown({ id, label, name, options, value, onChange, required = false, disabled = false, emptyMessage = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const optionsRef = useRef(null);
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value || ''));
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const listboxId = `${id}-options`;

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return undefined;
    }

    const closeOnOutsideClick = (event) => {
      if (!selectRef.current?.contains(event.target) && !optionsRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const positionMenu = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const belowSpace = window.innerHeight - bounds.bottom - 8;
      const estimatedHeight = Math.min(220, options.length * 40 + 8);
      const openAbove = belowSpace < estimatedHeight && bounds.top > belowSpace;
      const availableSpace = openAbove ? bounds.top - 8 : belowSpace;
      const height = Math.min(220, availableSpace);
      setMenuStyle({
        position: 'fixed',
        top: openAbove ? Math.max(8, bounds.top - height - 6) : bounds.bottom + 6,
        left: bounds.left,
        width: bounds.width,
        maxHeight: height,
      });
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const chooseOption = (option) => {
    onChange(String(option.value));
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
    } else if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && isOpen) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0) chooseOption(options[activeIndex]);
      else {
        setIsOpen(true);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
    }
  };

  return (
    <div className="form-dropdown" ref={selectRef}>
      <input type="hidden" name={name} value={value || ''} />
      <button
        id={id}
        type="button"
        className="form-select form-dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-required={required}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        disabled={disabled || !options.length}
        ref={triggerRef}
        onClick={() => {
          setIsOpen((open) => !open);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label || (options.length ? `Select ${label.toLowerCase()}` : `No ${label.toLowerCase()} options available`)}</span>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && options.length > 0 && menuStyle && createPortal(
        <div
          id={listboxId}
          ref={optionsRef}
          className="form-dropdown-options"
          style={menuStyle}
          role="listbox"
          aria-label={`${label} options`}
        >
          {options.map((option, index) => (
            <div
              id={`${listboxId}-${index}`}
              key={option.value}
              className={`form-dropdown-option${String(option.value) === String(value) ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
              role="option"
              aria-selected={String(option.value) === String(value)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body,
      )}
      {!options.length && emptyMessage && <span className="form-dropdown-empty">{emptyMessage}</span>}
    </div>
  );
}

function ModalShell({ title, onClose, onSubmit, children, submitLabel, isSubmitting = false, notification = '' }) {
  return createPortal((
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content user-management-modal" onClick={(e) => e.stopPropagation()}>
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
            <button type="button" className="btn-secondary back-action" onClick={onClose}>Back</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >{isSubmitting ? `${submitLabel}...` : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
}

export default function AddUserModal({ showModal, onClose, form, setForm, onSubmit, roleOptions, communities = [], groups = [], mode = 'add', isSubmitting = false, notification = '', managedHealthWorker = false }) {
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
          <DateInput
            id="dob"
            className="form-input"
            value={form.dob}
            onChange={(value) => handleChange('dob', value)}
            required
            max={new Date().toISOString().split('T')[0]}
            autoComplete="bday"
            ariaLabel="Date of birth"
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="role">Role *</label>
          {managedHealthWorker ? (
            <>
              <input id="role" className="form-input" value="Health worker" readOnly />
              <input type="hidden" name="role" value="Health worker" />
            </>
          ) : (
            <FormDropdown
              id="role"
              label="Role"
              name="role"
              options={roleOptions.map((role) => ({ value: role, label: role }))}
              value={form.role}
              onChange={(role) => handleChange('role', role)}
            />
          )}
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      {requiresSchool && (
        <>
          <div className="form-group full-width">
            <label className="form-label" htmlFor="school-id">Assigned School{schoolIsRequired ? ' *' : ''}</label>
            {managedHealthWorker ? (
              <>
                <input id="school-id" className="form-input" value={selectedSchoolName || 'Assigned school'} readOnly />
                <input type="hidden" name="schoolId" value={form.schoolId || ''} />
              </>
            ) : (
              <FormDropdown
                id="school-id"
                label="Assigned School"
                name="schoolId"
                options={communities.map((school) => ({ value: school.id, label: school.name }))}
                value={form.schoolId || ''}
                required={schoolIsRequired}
                emptyMessage="Create a school in Community before assigning this role."
                onChange={(schoolId) => setForm((prev) => ({ ...prev, schoolId, groupId: requiresGroup ? '' : prev.groupId }))}
              />
            )}
          </div>

          {requiresGroup && (
            <div className="form-group full-width">
              <label className="form-label" htmlFor="group-id">Assigned Group *</label>
              <FormDropdown
                id="group-id"
                label="Assigned Group"
                name="groupId"
                options={groupOptions.map((group) => ({ value: group.id, label: group.name }))}
                value={form.groupId || ''}
                required
                emptyMessage="No groups are available for the selected school."
                onChange={(groupId) => handleChange('groupId', groupId)}
              />
            </div>
          )}

        </>
      )}

      {!managedHealthWorker && (
        <div className="form-group full-width">
          <label className="form-label" htmlFor="status">Status *</label>
          <FormDropdown
            id="status"
            label="Status"
            name="status"
            options={[{ value: 'Active', label: 'Active' }, { value: 'Suspended', label: 'Suspended' }]}
            value={form.status || 'Active'}
            required
            onChange={(status) => handleChange('status', status)}
          />
        </div>
      )}

    </ModalShell>
  );
}
