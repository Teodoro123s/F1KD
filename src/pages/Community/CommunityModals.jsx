import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { capitalizeNameValue } from '../../utils/formatting/nameFormat';
import useModalAccessibility from '../../components/ui/useModalAccessibility';

export function ConfirmActionModal({ show, title, message, confirmLabel = 'OK', onConfirm, onCancel, isSubmitting = false }) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const close = () => { if (!isSubmitting) onCancel?.(); };
  useModalAccessibility({ open: show, onClose: close, dialogRef, initialFocusRef: cancelRef, closeDisabled: isSubmitting });
  if (!show) return null;

  return createPortal((
    <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} className="modal-content signout-confirm-modal confirmation-modal-content" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header-section confirmation-modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-close-modal" onClick={onCancel} aria-label="Close confirmation" disabled={isSubmitting}>✕</button>
        </div>
        <div className="modal-body confirmation-modal-body">
          <p id={messageId}>{message}</p>
        </div>
        <div className="modal-footer confirmation-modal-footer">
          <button ref={cancelRef} type="button" className="btn-secondary confirmation-cancel-btn" onClick={close} disabled={isSubmitting}>Cancel</button>
          <button type="button" className="btn-primary confirmation-confirm-btn" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

function ModalShell({ title, onClose, onSubmit, children, submitLabel, isSubmitting = false, notification = '' }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const close = () => { if (!isSubmitting) onClose?.(); };
  useModalAccessibility({ open: true, onClose: close, dialogRef, initialFocusRef: closeButtonRef, closeDisabled: isSubmitting });
  return createPortal((
    <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} className="modal-content community-modal-content" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-section community-modal-header-section">
          <h3 id={titleId}>{title}</h3>
          <button ref={closeButtonRef} type="button" className="btn-close-modal" onClick={close} aria-label="Close modal" disabled={isSubmitting}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {notification && <div className="notification-banner" role="alert">{notification}</div>}
            {children}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={close} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={submitLabel === 'Create' ? 'btn-create-action' : 'btn-primary'} disabled={isSubmitting}>
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
        <label className="form-label" htmlFor="comm-name">School Name</label>
        <input
          id="comm-name"
          type="text"
          className="form-input"
          placeholder="e.g. San Isidro High School"
          value={communityForm.name}
          onChange={(e) => setCommunityForm({ ...communityForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="comm-coordinator">Assigned Community Coordinator</label>
        <select
          id="comm-coordinator"
          className="form-select"
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
  if (!showModal) return null;
  const availableCoordinators = (coordinators || []).filter((coordinator) => {
    if (String(coordinator.id) === String(communityForm.coordinator || '')) return true;
    const linkedSchool = communities.find((community) => String(community.coordinatorId || '') === String(coordinator.id))?.id;
    const assignedSchool = coordinator.schoolId || linkedSchool || '';
    return !assignedSchool || String(assignedSchool) === String(selectedCommunityId || '');
  });
  return (
    <ModalShell title="Edit School" onClose={onClose} onSubmit={handleEditCommunity} submitLabel="Save Changes" isSubmitting={isSubmitting} notification={notification}>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-comm-name">School Name</label>
        <input
          id="edit-comm-name"
          type="text"
          className="form-input"
          value={communityForm.name}
          onChange={(e) => setCommunityForm({ ...communityForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-comm-coordinator">Assigned Community Coordinator</label>
        <select
          id="edit-comm-coordinator"
          className="form-select"
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
  const availableGroups = groups.filter((group) => group.community === batchForm.community);
  return (
    <ModalShell title="Create Batch" onClose={onClose} onSubmit={handleCreateBatch} submitLabel="Create" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className="form-label" htmlFor="batch-name">Batch Name</label>
        <input
          id="batch-name"
          type="text"
          className="form-input"
          placeholder="e.g. Batch 1"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && (
        <div className="form-group">
          <label className="form-label" htmlFor="batch-comm">School</label>
          <select
            id="batch-comm"
            className="form-select"
            value={batchForm.community}
            onChange={(e) => setBatchForm({ ...batchForm, community: e.target.value })}
          >
            {communities.map((comm) => (
              <option key={comm.id} value={comm.name}>{comm.name}</option>
            ))}
          </select>
        </div>
      )}
      {showGroupField && (
        <div className="form-group">
          <label className="form-label" htmlFor="batch-group">Group</label>
          <select
            id="batch-group"
            className="form-select"
            value={batchForm.groupId || ''}
            onChange={(event) => setBatchForm({ ...batchForm, groupId: event.target.value })}
            required
          >
            {availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

export function EditBatchModal({ showModal, onClose, batchForm, setBatchForm, handleEditBatch, communities, groups = [], showGroupField = false, isSubmitting }) {
  if (!showModal) return null;
  const availableGroups = groups.filter((group) => group.community === batchForm.community);
  return (
    <ModalShell title="Edit Batch" onClose={onClose} onSubmit={handleEditBatch} submitLabel="Save Changes" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-batch-name">Batch Name</label>
        <input
          id="edit-batch-name"
          type="text"
          className="form-input"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {showGroupField && (
        <div className="form-group">
          <label className="form-label" htmlFor="edit-batch-group">Group</label>
          <select
            id="edit-batch-group"
            className="form-select"
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
  const availableBatches = batches.filter((batch) => batch.community === groupForm.community);

  return (
    <ModalShell title="Create Group" onClose={onClose} onSubmit={handleCreateGroup} submitLabel="Create" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className="form-label" htmlFor="group-name">Group Name</label>
        <input
          id="group-name"
          type="text"
          className="form-input"
          placeholder="e.g. Group Alpha"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && (
        <div className="form-group">
          <label className="form-label" htmlFor="group-school">School</label>
          <select
            id="group-school"
            className="form-select"
            value={groupForm.community}
            onChange={(e) => setGroupForm({ ...groupForm, community: e.target.value, assignedBatchIds: [] })}
            required
          >
            {communities.map((comm) => (
              <option key={comm.id} value={comm.name}>{comm.name}</option>
            ))}
          </select>
        </div>
      )}
    </ModalShell>
  );
}

export function EditGroupModal({ showModal, onClose, groupForm, setGroupForm, handleEditGroup, communities, batches, hideSchoolField = false, isSubmitting }) {
  if (!showModal) return null;
  const availableBatches = batches.filter((batch) => batch.community === groupForm.community);

  return (
    <ModalShell title="Edit Group" onClose={onClose} onSubmit={handleEditGroup} submitLabel="Save Changes" isSubmitting={isSubmitting}>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-name">Group Name</label>
        <input
          id="edit-group-name"
          type="text"
          className="form-input"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: capitalizeNameValue(e.target.value) })}
          required
          autoFocus
        />
      </div>
      {!hideSchoolField && <div className="form-group">
        <label className="form-label" htmlFor="edit-group-school">School</label>
        <select
          id="edit-group-school"
          className="form-select"
          value={groupForm.community}
          onChange={(e) => setGroupForm({ ...groupForm, community: e.target.value, assignedBatchIds: [] })}
          required
        >
          {communities.map((comm) => (
            <option key={comm.id} value={comm.name}>{comm.name}</option>
          ))}
        </select>
      </div>}
    </ModalShell>
  );
}