import React from 'react';
import {
  CreateCommunityModal,
  EditCommunityModal,
  CreateBatchModal,
  EditBatchModal,
  CreateGroupModal,
  EditGroupModal,
} from './CommunityModals';

export default function CommunityModalManager({
  showModal,
  onClose,
  communityForm,
  setCommunityForm,
  groupForm,
  setGroupForm,
  batchForm,
  setBatchForm,
  communities,
  groups,
  batches,
  coordinators,
  onCreateCommunity,
  onEditCommunity,
  onCreateBatch,
  onEditBatch,
  hideBatchSchoolField = false,
  onCreateGroup,
  onEditGroup,
  hideGroupSchoolField = false,
  isSubmitting,
}) {
  return (
    <>
      <CreateCommunityModal
        showModal={showModal === 'createCommunity'}
        onClose={onClose}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleCreateCommunity={onCreateCommunity}
        coordinators={coordinators}
        isSubmitting={isSubmitting}
      />
      <EditCommunityModal
        showModal={showModal === 'editCommunity'}
        onClose={onClose}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleEditCommunity={onEditCommunity}
        coordinators={coordinators}
        isSubmitting={isSubmitting}
      />
      <CreateBatchModal
        showModal={showModal === 'createBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleCreateBatch={onCreateBatch}
        communities={communities}
        hideSchoolField={hideBatchSchoolField}
        isSubmitting={isSubmitting}
      />
      <EditBatchModal
        showModal={showModal === 'editBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleEditBatch={onEditBatch}
        communities={communities}
        groups={groups}
        showGroupField={hideBatchSchoolField}
        isSubmitting={isSubmitting}
      />
      <CreateGroupModal
        showModal={showModal === 'createGroup'}
        onClose={onClose}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleCreateGroup={onCreateGroup}
        communities={communities}
        batches={batches}
        hideSchoolField={hideGroupSchoolField}
        isSubmitting={isSubmitting}
      />
      <EditGroupModal
        showModal={showModal === 'editGroup'}
        onClose={onClose}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleEditGroup={onEditGroup}
        communities={communities}
        batches={batches}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
