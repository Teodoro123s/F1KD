import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DateInput from '../../components/ui/DateInput';
import FloatingLayer from '../../components/ui/FloatingLayer';
import { capitalizeFirstNameCharacter, capitalizeNameValue } from '../../utils/formatting/nameFormat';
import { formatDateForInput } from '../../utils/formatting/dateFormat';
import { generatePassword } from './lib';
import {
  CONTACT_NUMBER_POLICY,
  getContactNumberError,
  sanitizeContactNumber,
} from '../../utils/validation/contactNumber';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../utils/permissions';
import { getFirstNameValidationError, normalizeFirstName } from '../../utils/validation/firstNameValidation';
import useModalAccessibility from '../../components/ui/useModalAccessibility';

function FormDropdown({ id, label, name, options, value, onChange, required = false, disabled = false, emptyMessage = '', invalid = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value || ''));
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const listboxId = `${id}-options`;

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
    <div className="form-dropdown">
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
        aria-invalid={invalid || undefined}
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
      <FloatingLayer
        open={isOpen && options.length > 0}
        anchorRef={triggerRef}
        onDismiss={() => setIsOpen(false)}
        layer="modal"
        align="start"
        matchAnchorWidth
        id={listboxId}
        className="form-dropdown-options"
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
      </FloatingLayer>
      {!options.length && emptyMessage && <span className="form-dropdown-empty">{emptyMessage}</span>}
    </div>
  );
}

function ModalShell({ title, onClose, onSubmit, onInvalidCapture, children, submitLabel, isSubmitting = false, notification = '' }) {
  const titleId = React.useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const close = () => { if (!isSubmitting) onClose?.(); };
  useModalAccessibility({ open: true, onClose: close, dialogRef, initialFocusRef: closeButtonRef, closeDisabled: isSubmitting });
  return createPortal((
    <div className="modal-backdrop user-management-drawer-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div
        ref={dialogRef}
        className="modal-content user-management-modal user-management-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-section">
          <h3 id={titleId}>{title}</h3>
          <button ref={closeButtonRef} type="button" className="btn-close-modal" onClick={close} aria-label="Close modal" disabled={isSubmitting}>
            ✕
          </button>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!isSubmitting && onSubmit) onSubmit(event);
        }} onInvalidCapture={onInvalidCapture}>
          <div className="modal-body">
            {notification && <div className="notification-banner" role="alert">{notification}</div>}
            {children}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary back-action" onClick={close} disabled={isSubmitting}>Back</button>
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

export default function AddUserModal({ showModal, onClose, form, setForm, onSubmit, roleOptions, communities = [], groups = [], mode = 'add', isSubmitting = false, notification = '', managedHealthWorker = false, validationField = '', setValidationField = () => {} }) {
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [contactNumberTouched, setContactNumberTouched] = useState(false);
  const [nativeInvalidFields, setNativeInvalidFields] = useState([]);
  useEffect(() => {
    if (showModal) {
      setFirstNameTouched(false);
      setContactNumberTouched(false);
      setNativeInvalidFields([]);
    }
  }, [showModal, mode]);
  if (!showModal) return null;

  const title = mode === 'edit' ? 'Edit User' : 'Add User';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create';
  const firstNameError = firstNameTouched ? getFirstNameValidationError(form.firstName) : '';

  const isInvalid = (field) => validationField === field || nativeInvalidFields.includes(field);
  const showContactNumberError = contactNumberTouched || isInvalid('contactNumber');
  const contactNumberError = showContactNumberError
    ? getContactNumberError(form.contactNumber, { required: true })
    : '';
  const clearInvalidField = (field, nativeIsValid = true) => {
    if (nativeIsValid) {
      setNativeInvalidFields((current) => current.filter((invalidField) => invalidField !== field));
    }
    if (validationField === field) setValidationField('');
  };

  const handleChange = (field, value, nativeIsValid = true) => {
    clearInvalidField(field, nativeIsValid);
    const nextValue = field === 'contactNumber'
      ? sanitizeContactNumber(value)
      : field === 'firstName'
        ? capitalizeFirstNameCharacter(value)
      : ['lastName', 'middleInitial'].includes(field)
        ? capitalizeNameValue(value)
        : value;
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
    <ModalShell title={title} onClose={onClose} onInvalidCapture={(event) => {
      const field = event.target.name || event.target.id;
      if (field) {
        setNativeInvalidFields((current) => current.includes(field) ? current : [...current, field]);
      }
    }} onSubmit={(event) => {
      setNativeInvalidFields([]);
      setFirstNameTouched(true);
      onSubmit(event);
    }} submitLabel={submitLabel} isSubmitting={isSubmitting} notification={notification}>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="first-name">First Name <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <input
            id="first-name"
                      name="firstName"
                      type="text"
                      className="form-input"
                      placeholder="Enter first name"
                      value={form.firstName}
                      maxLength={50}
                      onChange={(e) => handleChange('firstName', e.target.value, e.target.validity.valid)}
                      onBlur={() => {
                        setFirstNameTouched(true);
                        const normalized = normalizeFirstName(form.firstName);
                        if (normalized !== form.firstName) handleChange('firstName', normalized);
                      }}
                      required
                      aria-invalid={Boolean(firstNameError) || isInvalid('firstName')}
                      aria-describedby={firstNameError ? 'first-name-error' : undefined}
                      autoFocus
                    />
          {firstNameError && <small id="first-name-error" className="field-validation-error" role="alert">{firstNameError}</small>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="last-name">Last Name <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <input
            id="last-name"
                      name="lastName"
                      type="text"
                      className="form-input"
                      placeholder="Enter last name"
                      value={form.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value, e.target.validity.valid)}
                      aria-invalid={isInvalid('lastName')}
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
                      onChange={(e) => handleChange('middleInitial', e.target.value, e.target.validity.valid)}
                      aria-invalid={isInvalid('middleInitial')}
                    />
        </div>
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="contact-number">Contact Number <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <input
            id="contact-number"
                      name="contactNumber"
                      type="tel"
                      className="form-input"
                      placeholder="09171234567"
                      inputMode="numeric"
                      maxLength={20}
                      pattern="09[0-9]{9}"
                      value={form.contactNumber}
                      onChange={(e) => handleChange('contactNumber', e.target.value, e.target.validity.valid)}
                      onBlur={(event) => {
                        handleChange('contactNumber', event.target.value, event.target.validity.valid);
                        setContactNumberTouched(true);
                      }}
                      aria-invalid={Boolean(contactNumberError)}
                      aria-describedby={contactNumberError ? 'contact-number-error' : 'contact-number-hint'}
                      required
                    />
          <small
            id={contactNumberError ? 'contact-number-error' : 'contact-number-hint'}
            className={contactNumberError ? 'field-validation-error' : undefined}
            role={contactNumberError ? 'alert' : undefined}
          >
            {contactNumberError || CONTACT_NUMBER_POLICY}
          </small>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <input
            id="email"
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="user@example.com"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value, e.target.validity.valid)}
                      aria-invalid={isInvalid('email')}
                      required
                    />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group date-input-group">
          <label className="form-label" htmlFor="dob">Date of Birth <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <DateInput
            id="dob"
            className="form-input"
            value={form.dob}
            onChange={(value) => handleChange('dob', value)}
            ariaInvalid={isInvalid('dob')}
            required
            max={formatDateForInput(new Date())}
            autoComplete="bday"
            ariaLabel="Date of birth"
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="role">Role <span className="form-required-indicator" aria-hidden="true">*</span></label>
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
              invalid={isInvalid('role')}
              onChange={(role) => handleChange('role', role)}
            />
          )}
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>

      {requiresSchool && (
        <>
          <div className="form-group full-width">
            <label className="form-label" htmlFor="school-id">Assigned School{schoolIsRequired && <span className="form-required-indicator" aria-hidden="true">*</span>}</label>
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
                invalid={isInvalid('schoolId')}
                emptyMessage="Create a school in Community before assigning this role."
                onChange={(schoolId) => {
                  clearInvalidField('schoolId');
                  setForm((prev) => ({ ...prev, schoolId, groupId: requiresGroup ? '' : prev.groupId }));
                }}
              />
            )}
          </div>

          {requiresGroup && (
            <div className="form-group full-width">
              <label className="form-label" htmlFor="group-id">Assigned Group <span className="form-required-indicator" aria-hidden="true">*</span></label>
              <FormDropdown
                id="group-id"
                label="Assigned Group"
                name="groupId"
                options={groupOptions.map((group) => ({ value: group.id, label: group.name }))}
                value={form.groupId || ''}
                required
                invalid={isInvalid('groupId')}
                emptyMessage="No groups are available for the selected school."
                onChange={(groupId) => handleChange('groupId', groupId)}
              />
            </div>
          )}

        </>
      )}

      {!managedHealthWorker && (
        <div className="form-group full-width">
          <label className="form-label" htmlFor="status">Status <span className="form-required-indicator" aria-hidden="true">*</span></label>
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
