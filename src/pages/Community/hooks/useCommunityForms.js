/**
 * useCommunityForms.js
 * Custom hook for managing community form state and CRUD operations
 * Responsibility: Handle community, group, batch form state, modal state, CRUD operations
 */

import { useState } from 'react';
import {
  createCommunity,
  updateCommunity,
  deleteCommunity,
  createBatch,
  updateBatch,
  deleteBatch,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../communityService';

export const useCommunityForms = ({ communities, onDataRefresh }) => {
  // Form states
  const [communityForm, setCommunityForm] = useState({
    name: '',
    area: 'Poblacion',
    coordinator: '',
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    community: communities[0]?.name || '',
    assignedBatchIds: [],
    leader: '',
    members: 1,
    status: 'Active',
  });

  const [batchForm, setBatchForm] = useState({
    name: '',
    community: communities[0]?.name || '',
    records: 1,
    progress: 0,
    status: 'Active',
  });

  // Modal and UI state
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [loading, setLoading] = useState(false);

  // CRUD operations
  const handleCreateCommunity = async () => {
    setLoading(true);
    try {
      await createCommunity(communityForm);
      setCommunityForm({ name: '', area: 'Poblacion', coordinator: '' });
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to create community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCommunity = async () => {
    setLoading(true);
    try {
      await updateCommunity(selectedItem.id, communityForm);
      setCommunityForm({ name: '', area: 'Poblacion', coordinator: '' });
      setSelectedItem(null);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to update community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommunity = async (id) => {
    setLoading(true);
    try {
      await deleteCommunity(id);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to delete community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    setLoading(true);
    try {
      await createGroup(groupForm);
      setGroupForm({
        name: '',
        community: communities[0]?.name || '',
        assignedBatchIds: [],
        leader: '',
        members: 1,
        status: 'Active',
      });
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to create group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    setLoading(true);
    try {
      await updateGroup(selectedItem.id, groupForm);
      setGroupForm({
        name: '',
        community: communities[0]?.name || '',
        assignedBatchIds: [],
        leader: '',
        members: 1,
        status: 'Active',
      });
      setSelectedItem(null);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to update group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id) => {
    setLoading(true);
    try {
      await deleteGroup(id);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to delete group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    setLoading(true);
    try {
      await createBatch(batchForm);
      setBatchForm({
        name: '',
        community: communities[0]?.name || '',
        records: 1,
        progress: 0,
        status: 'Active',
      });
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to create batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatch = async () => {
    setLoading(true);
    try {
      await updateBatch(selectedItem.id, batchForm);
      setBatchForm({
        name: '',
        community: communities[0]?.name || '',
        records: 1,
        progress: 0,
        status: 'Active',
      });
      setSelectedItem(null);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to update batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    setLoading(true);
    try {
      await deleteBatch(id);
      setShowModal(null);
      await onDataRefresh?.();
    } catch (error) {
      console.error('[CommunityForms] Failed to delete batch:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    // Form state
    communityForm,
    setCommunityForm,
    groupForm,
    setGroupForm,
    batchForm,
    setBatchForm,
    // UI state
    showModal,
    setShowModal,
    selectedItem,
    setSelectedItem,
    activeDropdownId,
    setActiveDropdownId,
    loading,
    // CRUD operations
    handleCreateCommunity,
    handleUpdateCommunity,
    handleDeleteCommunity,
    handleCreateGroup,
    handleUpdateGroup,
    handleDeleteGroup,
    handleCreateBatch,
    handleUpdateBatch,
    handleDeleteBatch,
  };
};
