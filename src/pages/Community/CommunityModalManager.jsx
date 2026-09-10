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
      />
      <EditCommunityModal
        showModal={showModal === 'editCommunity'}
        onClose={onClose}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleEditCommunity={onEditCommunity}
      />
      <CreateBatchModal
        showModal={showModal === 'createBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleCreateBatch={onCreateBatch}
        communities={communities}
      />
      <EditBatchModal
        showModal={showModal === 'editBatch'}
        onClose={onClose}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleEditBatch={onEditBatch}
        communities={communities}
      />
      <CreateGroupModal
        showModal={showModal === 'createGroup'}
        onClose={onClose}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleCreateGroup={onCreateGroup}
        communities={communities}
        batches={batches}
      />
      <EditGroupModal
        showModal={showModal === 'editGroup'}
        onClose={onClose}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleEditGroup={onEditGroup}
        communities={communities}
        batches={batches}
      />
    </>
  );
}
