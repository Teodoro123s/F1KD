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
  batches,
  coordinators,
  onCreateCommunity,
  onEditCommunity,
  onCreateBatch,
  onEditBatch,
  onCreateGroup,
  onEditGroup,
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
        isSubmitting={isSubmitting}
      />
      <CreateBatchModal
        showModal={showModal === 'createBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleCreateBatch={onCreateBatch}
        communities={communities}
        isSubmitting={isSubmitting}
      />
      <EditBatchModal
        showModal={showModal === 'editBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleEditBatch={onEditBatch}
        communities={communities}
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
