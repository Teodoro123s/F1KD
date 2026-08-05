import React from 'react';

function ModalShell({ title, onClose, onSubmit, children, submitLabel, contentClassName = '' }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-content ${contentClassName}`} onClick={(e) => e.stopPropagation()}>
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

export function CreateCommunityModal({ showModal, onClose, communityForm, setCommunityForm, handleCreateCommunity, communities, groups, batches }) {
  if (!showModal) return null;

  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);

  return (
    <ModalShell title="Create Mother" onClose={onClose} onSubmit={handleCreateCommunity} submitLabel="Create" contentClassName="wide-modal">
      <h4 className="form-section-title">Personal Information</h4>
      <div className="form-row-4 full-width name-row">
        <div className="form-group">
          <label className="form-label" htmlFor="mother-first-name">First name</label>
          <input
            id="mother-first-name"
            type="text"
            className="form-input"
            placeholder="First name"
            value={communityForm.firstName}
            onChange={(e) => setCommunityForm({ ...communityForm, firstName: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-middle-name">Middle name</label>
          <input
            id="mother-middle-name"
            type="text"
            className="form-input"
            placeholder="Middle name"
            value={communityForm.middleName}
            onChange={(e) => setCommunityForm({ ...communityForm, middleName: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-last-name">Last name</label>
          <input
            id="mother-last-name"
            type="text"
            className="form-input"
            placeholder="Last name"
            value={communityForm.lastName}
            onChange={(e) => setCommunityForm({ ...communityForm, lastName: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-suffix">Suffix</label>
          <input
            id="mother-suffix"
            type="text"
            className="form-input"
            placeholder="Suffix"
            value={communityForm.suffix}
            onChange={(e) => setCommunityForm({ ...communityForm, suffix: e.target.value })}
          />
        </div>
      </div>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="mother-dob">Date of birth</label>
          <input
            id="mother-dob"
            type="date"
            className="form-input"
            value={communityForm.dob}
            onChange={(e) => setCommunityForm({ ...communityForm, dob: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-contact-number">Contact number</label>
          <input
            id="mother-contact-number"
            type="tel"
            className="form-input"
            placeholder="0917 123 4567"
            value={communityForm.contactNumber}
            onChange={(e) => setCommunityForm({ ...communityForm, contactNumber: e.target.value })}
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>
      <div className="form-group full-width">
        <label className="form-label" htmlFor="mother-address">Address</label>
        <input
          id="mother-address"
          type="text"
          className="form-input"
          placeholder="Address"
          value={communityForm.address}
          onChange={(e) => setCommunityForm({ ...communityForm, address: e.target.value })}
        />
      </div>
      <h4 className="form-section-title">Categorization</h4>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="mother-community">School</label>
          <select
            id="mother-community"
            className="form-select"
            value={communityForm.community}
            onChange={(e) => setCommunityForm({ ...communityForm, community: e.target.value })}
          >
            <option value="">Select school</option>
            {uniqueCommunities.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-group">Group</label>
          <select
            id="mother-group"
            className="form-select"
            value={communityForm.group}
            onChange={(e) => setCommunityForm({ ...communityForm, group: e.target.value })}
          >
            <option value="">Select group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.name}>{group.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-batch">Batch</label>
          <select
            id="mother-batch"
            className="form-select"
            value={communityForm.batch}
            onChange={(e) => setCommunityForm({ ...communityForm, batch: e.target.value })}
          >
            <option value="">Select batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.name}>{batch.name}</option>
            ))}
          </select>
        </div>
      </div>
      <h4 className="form-section-title">Medical Information</h4>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="mother-height">Height</label>
          <input
            id="mother-height"
            type="text"
            className="form-input"
            placeholder="Height"
            value={communityForm.height}
            onChange={(e) => setCommunityForm({ ...communityForm, height: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mother-weight">Weight</label>
          <input
            id="mother-weight"
            type="text"
            className="form-input"
            placeholder="Weight"
            value={communityForm.weight}
            onChange={(e) => setCommunityForm({ ...communityForm, weight: e.target.value })}
          />
        </div>
        <div className="form-group" aria-hidden="true" />
      </div>
      <div className="form-group full-width">
        <label className="form-label" htmlFor="mother-medical-history">Medical history</label>
        <textarea
          id="mother-medical-history"
          className="form-input"
          rows="4"
          placeholder="Medical history"
          value={communityForm.medicalHistory}
          onChange={(e) => setCommunityForm({ ...communityForm, medicalHistory: e.target.value })}
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
      <h4 className="form-section-title">Child Information</h4>
      <div className="form-group narrow-field">
        <label className="form-label" htmlFor="group-mother">Select Mother</label>
        <select
          id="group-mother"
          className="form-select"
          value={groupForm.community}
          onChange={(e) => setGroupForm({ ...groupForm, community: e.target.value })}
          required
        >
          {communities.map((comm) => (
            <option key={comm.id} value={comm.name}>{comm.name}</option>
          ))}
        </select>
      </div>
      <div className="form-row-4 full-width name-row">
        <div className="form-group">
          <label className="form-label" htmlFor="group-first-name">First name</label>
          <input
            id="group-first-name"
            type="text"
            className="form-input"
            placeholder="First name"
            value={groupForm.firstName}
            onChange={(e) => setGroupForm({ ...groupForm, firstName: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-middle-name">Middle name</label>
          <input
            id="group-middle-name"
            type="text"
            className="form-input"
            placeholder="Middle name"
            value={groupForm.middleName}
            onChange={(e) => setGroupForm({ ...groupForm, middleName: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-last-name">Surname</label>
          <input
            id="group-last-name"
            type="text"
            className="form-input"
            placeholder="Surname"
            value={groupForm.lastName}
            onChange={(e) => setGroupForm({ ...groupForm, lastName: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-suffix">Suffix</label>
          <input
            id="group-suffix"
            type="text"
            className="form-input"
            placeholder="Suffix"
            value={groupForm.suffix}
            onChange={(e) => setGroupForm({ ...groupForm, suffix: e.target.value })}
          />
        </div>
      </div>

      <h4 className="form-section-title">Birth Details</h4>
      <div className="form-row-4 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="group-birth-date">Birth date</label>
          <input
            id="group-birth-date"
            type="date"
            className="form-input"
            value={groupForm.birthDate}
            onChange={(e) => setGroupForm({ ...groupForm, birthDate: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-birth-weight">Birth weight</label>
          <input
            id="group-birth-weight"
            type="text"
            className="form-input"
            placeholder="e.g. 3.2 kg"
            value={groupForm.birthWeight}
            onChange={(e) => setGroupForm({ ...groupForm, birthWeight: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-birth-length">Birth length</label>
          <input
            id="group-birth-length"
            type="text"
            className="form-input"
            placeholder="e.g. 51 cm"
            value={groupForm.birthLength}
            onChange={(e) => setGroupForm({ ...groupForm, birthLength: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-gender">Gender</label>
          <select
            id="group-gender"
            className="form-select"
            value={groupForm.gender}
            onChange={(e) => setGroupForm({ ...groupForm, gender: e.target.value })}
            required
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <h4 className="form-section-title">Categorization</h4>
      <div className="form-row-3 full-width">
        <div className="form-group">
          <label className="form-label" htmlFor="group-delivery-type">Delivery type</label>
          <select
            id="group-delivery-type"
            className="form-select"
            value={groupForm.deliveryType}
            onChange={(e) => setGroupForm({ ...groupForm, deliveryType: e.target.value })}
          >
            <option value="">Select delivery type</option>
            <option value="Vaginal">Vaginal</option>
            <option value="Cesarean">Cesarean</option>
            <option value="Assisted">Assisted</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="group-health-status">Health status</label>
          <select
            id="group-health-status"
            className="form-select"
            value={groupForm.healthStatus}
            onChange={(e) => setGroupForm({ ...groupForm, healthStatus: e.target.value })}
          >
            <option value="">Select health status</option>
            <option value="Healthy">Healthy</option>
            <option value="Needs Follow-up">Needs Follow-up</option>
            <option value="At Risk">At Risk</option>
          </select>
        </div>
        <div className="form-group" aria-hidden="true" />
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
