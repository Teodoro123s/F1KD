import { formFieldClasses, formLabelClasses } from '../../utils/formFieldClasses';
import React, { useEffect, useId, useRef, useState } from 'react';
import { getModalBackdropClasses, getModalSurfaceClasses, modalHeaderSectionClasses, communityDrawerHeaderClasses, communityModalFooterClasses, modalCloseClasses, modalBodyClasses, modalFooterClasses, confirmationSurfaceClasses, confirmationBodyClasses, confirmationFooterClasses, confirmationCloseClasses } from '../../components/ui/modalClasses';
import { createPortal } from 'react-dom';
import FloatingLayer from '../../components/ui/FloatingLayer';
import useModalAccessibility from '../../components/ui/useModalAccessibility';
import usePresence from '../../components/ui/usePresence';

const PHINMA_ED_SCHOOLS = [
  'PHINMA Araullo University (AU)',
  'PHINMA Cagayan de Oro College (COC)',
  'PHINMA University of Pangasinan (UPang)',
  'PHINMA University of Iloilo (UI)',
  'PHINMA UPang College of Urdaneta',
  'Southwestern University (SWU) PHINMA',
  'PHINMA Saint Jude College Manila (SJCM)',
  'PHINMA Saint Jude College Quezon City (SJCQC)',
  'PHINMA Rizal College of Laguna (RCL)',
  'PHINMA Union College of Laguna (UCL)',
  'PHINMA Saint Jude College Cavite (SJC Dasma)',
  'PHINMA Southeastern College',
];

function SchoolNameCombobox({ value, onChange }) {
  const id = useId();
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = `${id}-school-options`;
  const filteredSchools = PHINMA_ED_SCHOOLS.filter((school) => (
    school.toLowerCase().includes(query.trim().toLowerCase())
  ));

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listboxId]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      PHINMA_ED_SCHOOLS.includes(value) ? '' : 'Choose a school from the suggestions.',
    );
  }, [value]);

  const closeOptions = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const chooseSchool = (school) => {
    onChange(school);
    inputRef.current?.setCustomValidity('');
    closeOptions();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeOptions();
      return;
    }
    if (event.key === 'Tab') {
      closeOptions();
      return;
    }
    if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      if (activeIndex >= 0 && filteredSchools[activeIndex]) chooseSchool(filteredSchools[activeIndex]);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      setQuery('');
      setActiveIndex(0);
      return;
    }
    if (!filteredSchools.length) return;
    if (event.key === 'Home') setActiveIndex(0);
    else if (event.key === 'End') setActiveIndex(filteredSchools.length - 1);
    else {
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + direction + filteredSchools.length) % filteredSchools.length);
    }
  };

  return (
    <div className="form-dropdown">
      <input
        ref={inputRef}
        id="comm-name"
        type="text"
        role="combobox"
        className={`${formFieldClasses} form-input`}
        value={isOpen && query ? query : value}
        placeholder="Search PHINMA schools..."
        autoComplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && filteredSchools.length > 0 && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-required="true"
        required
        onFocus={() => {
          if (!isOpen) {
            setQuery('');
            setActiveIndex(0);
            setIsOpen(true);
          }
        }}
        onChange={(event) => {
          onChange('');
          inputRef.current?.setCustomValidity('Choose a school from the suggestions.');
          setQuery(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      <FloatingLayer
        open={isOpen && filteredSchools.length > 0}
        anchorRef={inputRef}
        onDismiss={closeOptions}
        layer="modal"
        align="start"
        matchAnchorWidth
        id={listboxId}
        className="form-dropdown-options"
        role="listbox"
        aria-label="PHINMA Education schools"
      >
        {filteredSchools.map((school, index) => (
          <div
            id={`${listboxId}-${index}`}
            key={school}
            className={`form-dropdown-option${school === value ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
            role="option"
            aria-selected={school === value}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseSchool(school)}
          >
            {school}
          </div>
        ))}
      </FloatingLayer>
      {isOpen && filteredSchools.length === 0 && (
        <span className="form-dropdown-empty" role="status">No PHINMA schools match that search.</span>
      )}
      <span className="form-dropdown-empty">Type to search, then choose a school from the list.</span>
    </div>
  );
}

// Keep a trailing space while the user is typing so they can enter multiword names.
function formatCommunityNameInput(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/(^|\s|[-'])([a-z])/g, (match, prefix, character) => `${prefix}${character.toUpperCase()}`);
}

function getSchoolOptionLabel(school) {
  const details = [school.area, school.code || `ID ${school.id}`].filter(Boolean).join(' · ');
  return details ? `${school.name} — ${details}` : school.name;
}

function belongsToSchool(item, schoolId) {
  return String(item.communityId ?? item.community_id ?? '') === String(schoolId ?? '');
}

export function ConfirmActionModal({ show, title, message, confirmLabel = 'OK', onConfirm, onCancel, isSubmitting = false }) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const close = () => { if (!isSubmitting) onCancel?.(); };
  useModalAccessibility({ open: show, onClose: close, dialogRef, initialFocusRef: cancelRef, closeDisabled: isSubmitting });
  if (!show) return null;

  return createPortal((
    <div className={`modal-backdrop ${getModalBackdropClasses()}`} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} className={`modal-content signout-confirm-modal confirmation-modal-content ${getModalSurfaceClasses()} ${confirmationSurfaceClasses}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className={`modal-header-section confirmation-modal-header ${modalHeaderSectionClasses}`}>
          <h3 id={titleId}>{title}</h3>
          <button type="button" className={`btn-close-modal ${confirmationCloseClasses}`} onClick={onCancel} aria-label="Close confirmation" disabled={isSubmitting}>✕</button>
        </div>
        <div className={`modal-body confirmation-modal-body ${modalBodyClasses} ${confirmationBodyClasses}`}>
          <p id={messageId}>{message}</p>
        </div>
        <div className={`modal-footer confirmation-modal-footer ${modalFooterClasses} ${confirmationFooterClasses}`}>
          <button ref={cancelRef} type="button" className="btn-secondary confirmation-cancel-btn" onClick={close} disabled={isSubmitting}>Cancel</button>
          <button type="button" className="btn-primary confirmation-confirm-btn" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

function ModalShell({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel,
  isSubmitting = false,
  submitDisabled = false,
  notification = '',
  open = true,
  drawer = false,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const close = () => { if (!isSubmitting) onClose?.(); };
  const isPresent = usePresence(open, drawer ? '--motion-drawer-duration' : '--motion-modal-duration');
  useModalAccessibility({
    open: isPresent,
    onClose: close,
    dialogRef,
    initialFocusRef: closeButtonRef,
    closeDisabled: isSubmitting || !open,
  });
  if (!isPresent) return null;

  return createPortal((
    <div
      className={`modal-backdrop${drawer ? ' community-edit-drawer-backdrop' : ''}${!open ? ' motion-exiting' : ''} ${getModalBackdropClasses({ exiting: !open, drawer })}`}
      role="presentation"
      onMouseDown={(event) => { if (open && event.target === event.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        className={`modal-content community-modal-content${drawer ? ' community-edit-drawer' : ''}${!open ? ' motion-exiting' : ''} ${getModalSurfaceClasses({ exiting: !open, drawer, variant: drawer ? 'communityDrawer' : 'community' })}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        inert={!open}
      >
        <div className={`modal-header-section community-modal-header-section ${drawer ? communityDrawerHeaderClasses : modalHeaderSectionClasses}`}>
          <h3 id={titleId}>{title}</h3>
          <button ref={closeButtonRef} type="button" className={`btn-close-modal ${modalCloseClasses}`} onClick={close} aria-label={`Close ${title}`} disabled={isSubmitting || !open}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className={`modal-body ${modalBodyClasses}`}>
            {notification && <div className="notification-banner" role="alert">{notification}</div>}
            {children}
          </div>
          <div className={`modal-footer ${drawer ? communityModalFooterClasses : modalFooterClasses}`}>
            <button type="button" className="btn-secondary" onClick={close} disabled={isSubmitting || !open}>Cancel</button>
            <button type="submit" className={submitLabel === 'Create' ? 'btn-create-action' : 'btn-primary'} disabled={isSubmitting || submitDisabled || !open}>
              {isSubmitting ? `${submitLabel}...` : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
}

export function CreateCommunityModal({ showModal, onClose, communityForm, setCommunityForm, handleCreateCommunity, coordinators, communities = [], isSubmitting, notification }) {
  if (!showModal) return null;
  const availableCoordinators = (coordinators || []).filter((coordinator) => {
    const linkedSchool = communities.find((community) => String(community.coordinatorId || '') === String(coordinator.id))?.id;
    return !coordinator.schoolId && !linkedSchool;
  });
  return (
    <ModalShell title="Create School" onClose={onClose} onSubmit={handleCreateCommunity} submitLabel="Create" isSubmitting={isSubmitting} notification={notification}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="comm-name">School Name <span className="form-required-indicator" aria-hidden="true">*</span></label>
        <SchoolNameCombobox
          value={communityForm.name}
          onChange={(name) => setCommunityForm((current) => ({ ...current, name }))}
        />
      </div>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="comm-coordinator">Assigned Community Coordinator (optional)</label>
        <select
          id="comm-coordinator"
          className={`${formFieldClasses} form-select`}
          value={communityForm.coordinator}
          onChange={(e) => setCommunityForm({ ...communityForm, coordinator: e.target.value })}
        >
          <option value="">Select a community coordinator</option>
          {availableCoordinators.map((coordinator) => (
            <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}

export function EditCommunityModal({ showModal, onClose, communityForm, setCommunityForm, handleEditCommunity, coordinators, communities = [], selectedCommunityId, isSubmitting, notification }) {
  const availableCoordinators = (coordinators || []).filter((coordinator) => {
    if (String(coordinator.id) === String(communityForm.coordinator || '')) return true;
    const linkedSchool = communities.find((community) => String(community.coordinatorId || '') === String(coordinator.id))?.id;
    const assignedSchool = coordinator.schoolId || linkedSchool || '';
    return !assignedSchool || String(assignedSchool) === String(selectedCommunityId || '');
  });
  return (
    <ModalShell open={showModal} drawer title="Edit School" onClose={onClose} onSubmit={handleEditCommunity} submitLabel="Save Changes" isSubmitting={isSubmitting} notification={notification}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="edit-comm-name">School Name <span className="form-required-indicator" aria-hidden="true">*</span></label>
        <input
          id="edit-comm-name"
          type="text"
          className={`${formFieldClasses} form-input`}
          value={communityForm.name}
          onChange={(e) => setCommunityForm({ ...communityForm, name: formatCommunityNameInput(e.target.value) })}
          maxLength={150}
          pattern=".*\S.*"
          title="Enter a school name with at least one non-space character."
          aria-required="true"
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="edit-comm-coordinator">Assigned Community Coordinator (optional)</label>
        <select
          id="edit-comm-coordinator"
          className={`${formFieldClasses} form-select`}
          value={communityForm.coordinator || ''}
          onChange={(e) => setCommunityForm({ ...communityForm, coordinator: e.target.value })}
        >
          <option value="">No coordinator assigned</option>
          {availableCoordinators.map((coordinator) => (
            <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
          ))}
        </select>
        <small className="field-help-note">Transfers and replacements require two saves: unassign the coordinator from their current school, then assign an unassigned coordinator to the destination school.</small>
      </div>
    </ModalShell>
  );
}

export function CreateBatchModal({ showModal, onClose, batchForm, setBatchForm, handleCreateBatch, communities, groups = [], showGroupField = false, hideSchoolField = false, isSubmitting }) {
  if (!showModal) return null;
  const availableGroups = groups.filter((group) => belongsToSchool(group, batchForm.community));
  return (
    <ModalShell title="Create Batch" onClose={onClose} onSubmit={handleCreateBatch} submitLabel="Create" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="batch-name">Batch Name</label>
        <input
          id="batch-name"
          type="text"
          className={`${formFieldClasses} form-input`}
          placeholder="e.g. Batch 1"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: formatCommunityNameInput(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && (
        <div className="form-group">
          <label className={`${formLabelClasses} form-label`} htmlFor="batch-comm">School</label>
          <select
            id="batch-comm"
            className={`${formFieldClasses} form-select`}
            value={batchForm.community}
            onChange={(e) => setBatchForm({ ...batchForm, community: e.target.value, groupId: '' })}
          >
            {communities.map((comm) => (
              <option key={comm.id} value={comm.id}>{getSchoolOptionLabel(comm)}</option>
            ))}
          </select>
        </div>
      )}
      {showGroupField && (
        <div className="form-group">
          <label className={`${formLabelClasses} form-label`} htmlFor="batch-group">Group <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <select
            id="batch-group"
            className={`${formFieldClasses} form-select`}
            value={batchForm.groupId || ''}
            onChange={(event) => setBatchForm({ ...batchForm, groupId: event.target.value })}
            required
          >
            <option value="">Select a group</option>
            {availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

export function EditBatchModal({ showModal, onClose, batchForm, setBatchForm, handleEditBatch, communities, groups = [], showGroupField = false, isSubmitting }) {
  const availableGroups = groups.filter((group) => belongsToSchool(group, batchForm.community));
  return (
    <ModalShell open={showModal} drawer title="Edit Batch" onClose={onClose} onSubmit={handleEditBatch} submitLabel="Save Changes" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="edit-batch-name">Batch Name</label>
        <input
          id="edit-batch-name"
          type="text"
          className={`${formFieldClasses} form-input`}
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: formatCommunityNameInput(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {showGroupField && (
        <div className="form-group">
          <label className={`${formLabelClasses} form-label`} htmlFor="edit-batch-group">Group</label>
          <select
            id="edit-batch-group"
            className={`${formFieldClasses} form-select`}
            value={batchForm.groupId || ''}
            onChange={(e) => setBatchForm({ ...batchForm, groupId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {availableGroups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

export function CreateGroupModal({ showModal, onClose, groupForm, setGroupForm, handleCreateGroup, communities, batches, hideSchoolField = false, isSubmitting }) {
  if (!showModal) return null;
  const availableBatches = batches.filter((batch) => belongsToSchool(batch, groupForm.community));

  return (
    <ModalShell title="Create Group" onClose={onClose} onSubmit={handleCreateGroup} submitLabel="Create" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="group-name">Group Name</label>
        <input
          id="group-name"
          type="text"
          className={`${formFieldClasses} form-input`}
          placeholder="e.g. Group Alpha"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: formatCommunityNameInput(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && (
        <div className="form-group">
          <label className={`${formLabelClasses} form-label`} htmlFor="group-school">School</label>
          <select
            id="group-school"
            className={`${formFieldClasses} form-select`}
            value={groupForm.community}
            onChange={(e) => setGroupForm({ ...groupForm, community: e.target.value, assignedBatchIds: [] })}
            required
          >
            {communities.map((comm) => (
              <option key={comm.id} value={comm.id}>{getSchoolOptionLabel(comm)}</option>
            ))}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

export function EditGroupModal({ showModal, onClose, groupForm, setGroupForm, handleEditGroup, communities, batches, hideSchoolField = false, isSubmitting }) {
  const availableBatches = batches.filter((batch) => belongsToSchool(batch, groupForm.community));

  return (
    <ModalShell open={showModal} drawer title="Edit Group" onClose={onClose} onSubmit={handleEditGroup} submitLabel="Save Changes" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="edit-group-name">Group Name</label>
        <input
          id="edit-group-name"
          type="text"
          className={`${formFieldClasses} form-input`}
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: formatCommunityNameInput(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="edit-group-school">School</label>
        <select
          id="edit-group-school"
          className={`${formFieldClasses} form-select`}
          value={groupForm.community}
          onChange={(e) => setGroupForm({ ...groupForm, community: e.target.value, assignedBatchIds: [] })}
          required
        >
          {communities.map((comm) => (
            <option key={comm.id} value={comm.id}>{getSchoolOptionLabel(comm)}</option>
          ))}
        </select>
      </div>}
    </ModalShell>
  );
}

export function TransferMotherModal({
  showModal,
  onClose,
  mother,
  batches = [],
  batchId,
  setBatchId,
  onSubmit,
  isSubmitting,
  notification = '',
}) {
  if (!showModal || !mother) return null;
  const availableBatches = batches.filter((batch) => (
    String(batch.communityId ?? '') === String(mother.communityId ?? '')
    && (!mother.groupId || String(batch.groupIds || '')
      .split(',')
      .map((id) => id.trim())
      .includes(String(mother.groupId)))
    && String(batch.databaseId ?? '') !== String(mother.batchDatabaseId ?? '')
  ));

  return (
    <ModalShell
      title={`Transfer ${mother.name || 'Mother'} to another batch`}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel="Transfer"
      isSubmitting={isSubmitting}
      submitDisabled={!batchId || availableBatches.length === 0}
      notification={notification}
    >
      <p className="form-field-help">
        Any children linked to this mother will be transferred with her.
      </p>
      <div className="form-group">
        <label className={`${formLabelClasses} form-label`} htmlFor="transfer-mother-batch">
          Destination batch <span className="form-required-indicator" aria-hidden="true">*</span>
        </label>
        <select
          id="transfer-mother-batch"
          className={`${formFieldClasses} form-select`}
          value={batchId}
          onChange={(event) => setBatchId(event.target.value)}
          required
          disabled={isSubmitting || availableBatches.length === 0}
        >
          <option value="">Select a batch</option>
          {availableBatches.map((batch) => (
            <option key={batch.databaseId || batch.id} value={batch.databaseId || batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
        {availableBatches.length === 0 && (
          <small className="form-field-help">No other batch is available in this mother's school and group.</small>
        )}
      </div>
    </ModalShell>
  );
}
