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
    <ModalShell title="Create School" onClose={onClose} onSubmit={handleCreateCommunity} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="comm-name">School Name</label>
        <input
          id="comm-name"
          type="text"
          className="form-input"
          placeholder="e.g. San Isidro High School"
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
    <ModalShell title="Edit School" onClose={onClose} onSubmit={handleEditCommunity} submitLabel="Save Changes">
      <div className="form-group">
        <label className="form-label" htmlFor="edit-comm-name">School Name</label>
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
    <ModalShell title="Create Batch" onClose={onClose} onSubmit={handleCreateBatch} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="batch-name">Batch Name</label>
        <input
          id="batch-name"
          type="text"
          className="form-input"
          placeholder="e.g. Batch 1"
          value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
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
      <div className="form-group">
        <label className="form-label" htmlFor="batch-records">Total Records</label>
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
        <label className="form-label" htmlFor="batch-status">Status</label>
        <select
          id="batch-status"
          className="form-select"
          value={batchForm.status}
          onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
        >
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
        </select>
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
        <label className="form-label" htmlFor="edit-batch-records">Total Records</label>
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
        <label className="form-label" htmlFor="edit-batch-status">Status</label>
        <select
          id="edit-batch-status"
          className="form-select"
          value={batchForm.status}
          onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
        >
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
        </select>
      </div>
    </ModalShell>
  );
}

export function CreateGroupModal({ showModal, onClose, groupForm, setGroupForm, handleCreateGroup }) {
  if (!showModal) return null;
  return (
    <ModalShell title="Create Group" onClose={onClose} onSubmit={handleCreateGroup} submitLabel="Create">
      <div className="form-group">
        <label className="form-label" htmlFor="group-name">Group Name</label>
        <input
          id="group-name"
          type="text"
          className="form-input"
          placeholder="e.g. Group Alpha"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
          required
          autoFocus
        />
      </div>
    </ModalShell>
  );
}

export function EditGroupModal({ showModal, onClose, groupForm, setGroupForm, handleEditGroup }) {
  if (!showModal) return null;
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
    </ModalShell>
  );
}
