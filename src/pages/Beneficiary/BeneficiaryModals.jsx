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

export function CreateCommunityModal({ showModal, onClose, communityForm, setCommunityForm, handleCreateCommunity }) {
  if (!showModal) return null;
  return (
    <ModalShell title="Create Mother" onClose={onClose} onSubmit={handleCreateCommunity} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="comm-name">Mother Name</label>
        <input
          id="comm-name"
          type="text"
          className="form-input"
          placeholder="e.g. Maria Santos"
          value={communityForm.name}
          onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
    </ModalShell>
  );
}

export function EditCommunityModal({ showModal, onClose, communityForm, setCommunityForm, handleEditCommunity }) {
  if (!showModal) return null;
  return (
    <ModalShell title="Edit Mother" onClose={onClose} onSubmit={handleEditCommunity} submitLabel="Save Changes">
      <div className="form-group">
        <label className="form-label" htmlFor="edit-comm-name">Mother Name</label>
        <input
          id="edit-comm-name"
          type="text"
          className="form-input"
          value={communityForm.name}
          onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-comm-area">Area</label>
        <select
          id="edit-comm-area"
          className="form-select"
          value={communityForm.area}
          onChange={(e) => setCommunityForm({ ...communityForm, area: e.target.value })}
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
    </ModalShell>
  );
}

export function CreateBatchModal({ showModal, onClose, batchForm, setBatchForm, handleCreateBatch, communities }) {
  if (!showModal) return null;
  return (
    <ModalShell title="Create Record" onClose={onClose} onSubmit={handleCreateBatch} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="batch-name">Record Name</label>
        <input
          id="batch-name"
          type="text"
          className="form-input"
          placeholder="e.g. Mother-Child Record 1"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="batch-comm">Mother</label>
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
      <div className="form-group">
        <label className="form-label" htmlFor="batch-records">Total Mothers</label>
        <input
          id="batch-records"
          type="number"
          min="0"
          className="form-input"
          value={batchForm.records}
          onChange={(e) => setBatchForm({ ...batchForm, records: Number(e.target.value) })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="batch-progress">Progress (%)</label>
        <input
          id="batch-progress"
          type="number"
          min="0"
          max="100"
          className="form-input"
          value={batchForm.progress}
          onChange={(e) => setBatchForm({ ...batchForm, progress: Number(e.target.value) })}
          required
        />
      </div>
    </ModalShell>
  );
}

export function EditBatchModal({ showModal, onClose, batchForm, setBatchForm, handleEditBatch, communities }) {
  if (!showModal) return null;
  return (
    <ModalShell title="Edit Batch" onClose={onClose} onSubmit={handleEditBatch} submitLabel="Save Changes">
      <div className="form-group">
        <label className="form-label" htmlFor="edit-batch-name">Batch Name</label>
        <input
          id="edit-batch-name"
          type="text"
          className="form-input"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-batch-comm">School</label>
        <select
          id="edit-batch-comm"
          className="form-select"
          value={batchForm.community}
          onChange={(e) => setBatchForm({ ...batchForm, community: e.target.value })}
        >
          {communities.map((comm) => (
            <option key={comm.id} value={comm.name}>{comm.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-batch-records">Total Mothers</label>
        <input
          id="edit-batch-records"
          type="number"
          min="0"
          className="form-input"
          value={batchForm.records}
          onChange={(e) => setBatchForm({ ...batchForm, records: Number(e.target.value) })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-batch-progress">Progress (%)</label>
        <input
          id="edit-batch-progress"
          type="number"
          min="0"
          max="100"
          className="form-input"
          value={batchForm.progress}
          onChange={(e) => setBatchForm({ ...batchForm, progress: Number(e.target.value) })}
          required
        />
      </div>
    </ModalShell>
  );
}

export function CreateGroupModal({ showModal, onClose, groupForm, setGroupForm, handleCreateGroup, communities, batches }) {
  if (!showModal) return null;
  const availableBatches = batches.filter((batch) => batch.community === groupForm.community);

  return (
    <ModalShell title="Create Child" onClose={onClose} onSubmit={handleCreateGroup} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="group-name">Child Name</label>
        <input
          id="group-name"
          type="text"
          className="form-input"
          placeholder="e.g. Child Alpha"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="group-school">Mother</label>
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
      <div className="form-group">
        <label className="form-label" htmlFor="group-batches">Assigned Records</label>
        <select
          id="group-batches"
          className="form-select"
          multiple
          value={groupForm.assignedBatchIds}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) => option.value);
            setGroupForm({ ...groupForm, assignedBatchIds: selected });
          }}
          size={Math.min(5, availableBatches.length || 1)}
        >
          {availableBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>{batch.name}</option>
          ))}
        </select>
        <small className="form-hint">Select records for this child.</small>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="group-leader">Guardian</label>
        <input
          id="group-leader"
          type="text"
          className="form-input"
          value={groupForm.leader}
          onChange={(e) => setGroupForm({ ...groupForm, leader: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="group-members">Children</label>
        <input
          id="group-members"
          type="number"
          min="1"
          className="form-input"
          value={groupForm.members}
          onChange={(e) => setGroupForm({ ...groupForm, members: Number(e.target.value) })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="group-status">Status</label>
        <select
          id="group-status"
          className="form-select"
          value={groupForm.status}
          onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value })}
        >
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </ModalShell>
  );
}

export function EditGroupModal({ showModal, onClose, groupForm, setGroupForm, handleEditGroup, communities, batches }) {
  if (!showModal) return null;
  const availableBatches = batches.filter((batch) => batch.community === groupForm.community);

  return (
    <ModalShell title="Edit Group" onClose={onClose} onSubmit={handleEditGroup} submitLabel="Save Changes">
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-name">Group Name</label>
        <input
          id="edit-group-name"
          type="text"
          className="form-input"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="form-group">
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
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-batches">Assigned Batches</label>
        <select
          id="edit-group-batches"
          className="form-select"
          multiple
          value={groupForm.assignedBatchIds}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) => option.value);
            setGroupForm({ ...groupForm, assignedBatchIds: selected });
          }}
          size={Math.min(5, availableBatches.length || 1)}
        >
          {availableBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>{batch.name}</option>
          ))}
        </select>
        <small className="form-hint">Select batches for this group.</small>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-leader">Group Leader</label>
        <input
          id="edit-group-leader"
          type="text"
          className="form-input"
          value={groupForm.leader}
          onChange={(e) => setGroupForm({ ...groupForm, leader: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-members">Members</label>
        <input
          id="edit-group-members"
          type="number"
          min="1"
          className="form-input"
          value={groupForm.members}
          onChange={(e) => setGroupForm({ ...groupForm, members: Number(e.target.value) })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="edit-group-status">Status</label>
        <select
          id="edit-group-status"
          className="form-select"
          value={groupForm.status}
          onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value })}
        >
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </ModalShell>
  );
}
