import React from 'react';
import { createPortal } from 'react-dom';
import {
  getModalBackdropClasses,
  getModalSurfaceClasses,
  modalHeaderSectionClasses,
  modalCloseClasses,
  modalBodyClasses,
  modalFooterClasses,
} from '../../../components/ui/modalClasses';

export default function AddProgramBeneficiariesModal({
  program,
  beneficiaryScope,
  setBeneficiaryScope,
  scopeSchoolIds,
  setScopeSchoolIds,
  scopeGroupIds,
  setScopeGroupIds,
  scopeBatchIds,
  setScopeBatchIds,
  scopeError,
  setScopeError,
  communityHierarchyGroups,
  selectedScopeNames,
  previewRecipients,
  onSubmit,
  onClose,
}) {
  if (!program) return null;

  const resetScopeSelection = () => {
    setScopeSchoolIds([]);
    setScopeGroupIds([]);
    setScopeBatchIds([]);
    setScopeError('');
  };

  return createPortal(
    <div
      className={`modal-backdrop ${getModalBackdropClasses()}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className={`modal program-product-modal program-beneficiary-modal ${getModalSurfaceClasses()}`}
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`modal-header ${modalHeaderSectionClasses}`}>
          <h2>Add project beneficiary cluster</h2>
          <button type="button" className={`modal-close ${modalCloseClasses}`} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={`modal-body ${modalBodyClasses}`}>
          <p className="program-modal-context">{program.name} · Choose the coverage cluster for this project.</p>
          <div className="program-scope-options" aria-label="Beneficiary scope options">
            {[
              { value: 'School', label: 'Whole school / community', detail: 'Cover all eligible beneficiaries in this school or community.' },
              { value: 'Group', label: 'Group', detail: 'Cover one group within the school or community.' },
              { value: 'Batch', label: 'Batch', detail: 'Cover one batch within the selected group.' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`program-scope-pill${beneficiaryScope === option.value ? ' active' : ''}`}
                aria-pressed={beneficiaryScope === option.value}
                onClick={() => {
                  if (beneficiaryScope === option.value) return;
                  setBeneficiaryScope(option.value);
                  resetScopeSelection();
                }}
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>

          <div className="program-hierarchy-field">
            <span className="program-hierarchy-label">
              Select {beneficiaryScope === 'School' ? 'schools or communities' : beneficiaryScope === 'Group' ? 'groups' : 'batches'} for this project
            </span>
            {scopeError && <p className="program-scope-error" role="alert">{scopeError}</p>}
            <div className="program-hierarchy-options program-community-hierarchy" role="group" aria-label="Community hierarchy selector">
              {communityHierarchyGroups.length ? communityHierarchyGroups.map(({ school, groups, batches }) => {
                const schoolId = String(school.id || school.school_id || school.community_id);
                const schoolChecked = scopeSchoolIds.includes(schoolId);
                const schoolGroups = groups.filter((group) => String(group.name || group.group_name || '').trim());
                const schoolBatches = batches.filter((batch) => String(batch.name || batch.batch_code || batch.code || '').trim());

                return (
                  <div key={school.id} className="program-community-cluster">
                    {beneficiaryScope === 'School' ? (
                      <label className="program-recipient program-recipient--school">
                        <input
                          id={`scope-school-${schoolId}`}
                          name="scopeSchools"
                          type="checkbox"
                          checked={schoolChecked}
                          onChange={() => {
                            setScopeSchoolIds((current) => current.includes(schoolId) ? current.filter((value) => value !== schoolId) : [...current, schoolId]);
                            setScopeError('');
                          }}
                        />
                        <span>{school.name}</span>
                      </label>
                    ) : (
                      <div className="program-recipient-heading"><strong>{school.name}</strong></div>
                    )}

                    {beneficiaryScope !== 'School' && (
                      <div className="program-community-subgroups">
                        {schoolGroups.length ? schoolGroups.map((group) => {
                          const groupId = String(group.id);
                          const groupChecked = scopeGroupIds.includes(groupId);
                          const groupName = String(group.name || group.group_name || '').trim().toLowerCase();
                          const groupBatches = schoolBatches.filter((batch) => {
                            const batchGroupIds = String(batch.groupIds || '').split(',').map((value) => value.trim());
                            const batchGroupNames = String(batch.groupNames || '').split(',').map((value) => value.trim().toLowerCase());
                            return String(batch.group_id || '') === groupId
                              || batchGroupIds.includes(groupId)
                              || String(batch.group || batch.group_name || '').trim().toLowerCase() === groupName
                              || batchGroupNames.includes(groupName);
                          });
                          return (
                            <div key={group.id} className="program-community-subgroup">
                              {beneficiaryScope === 'Group' ? (
                                <label className="program-recipient">
                                  <input
                                    id={`scope-group-${group.id}`}
                                    name="scopeGroups"
                                    type="checkbox"
                                    checked={groupChecked}
                                    onChange={() => {
                                      setScopeGroupIds((current) => current.includes(groupId) ? current.filter((value) => value !== groupId) : [...current, groupId]);
                                      setScopeError('');
                                    }}
                                  />
                                  <span>{group.name || group.group_name}</span>
                                </label>
                              ) : (
                                <div className="program-recipient-heading"><strong>{group.name || group.group_name}</strong></div>
                              )}

                              {beneficiaryScope === 'Batch' && (
                                <div className="program-community-batches">
                                  {groupBatches.length ? groupBatches.map((batch) => {
                                    const batchId = String(batch.id);
                                    const batchChecked = scopeBatchIds.includes(batchId);
                                    return (
                                      <label key={batch.id} className="program-recipient program-recipient--batch">
                                        <input
                                          id={`scope-batch-${batch.id}`}
                                          name="scopeBatches"
                                          type="checkbox"
                                          checked={batchChecked}
                                          onChange={() => {
                                            setScopeBatchIds((current) => current.includes(batchId) ? current.filter((value) => value !== batchId) : [...current, batchId]);
                                            setScopeError('');
                                          }}
                                        />
                                        <span>{batch.name || batch.batch_code || batch.code}</span>
                                      </label>
                                    );
                                  }) : <small className="program-hierarchy-empty">No batches in this group.</small>}
                                </div>
                              )}
                            </div>
                          );
                        }) : <small className="program-hierarchy-empty">No groups under this school.</small>}
                      </div>
                    )}
                  </div>
                );
              }) : <small>No communities available yet.</small>}
            </div>
          </div>
          <section className="program-recipient-preview" aria-label="Recipient preview">
            <div className="program-recipient-preview-header">
              <div>
                <strong>Automatically included beneficiaries</strong>
                <span>{previewRecipients.length} eligible beneficiaries will be included in this scope.</span>
              </div>
            </div>
            {!selectedScopeNames.length ? (
              <p className="program-recipient-preview-empty">Choose a school, group, or batch. All eligible beneficiaries in the selected scope will be included automatically.</p>
            ) : previewRecipients.length ? (
              <div className="program-recipient-preview-list">
                {previewRecipients.map((record) => (
                  <div key={`${record.sourceType}:${record.sourceId}`} className="program-recipient">
                    <span>{record.name}</span>
                    <small>{record.type}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="program-recipient-preview-empty">No eligible beneficiaries were found in the selected scope.</p>
            )}
          </section>
        </div>
        <div className={`modal-footer ${modalFooterClasses}`}>
          <button type="button" className="btn-secondary" onClick={() => { onClose(); setScopeError(''); }}>Cancel</button>
          <button type="submit" className="btn-primary">Add scope with {previewRecipients.length} beneficiaries</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
