import { useCallback, useState } from 'react';
import {
  createCommunity as createCommunityApi,
  updateCommunity as updateCommunityApi,
  deleteCommunity as deleteCommunityApi,
  createBatch as createBatchApi,
  updateBatch as updateBatchApi,
  deleteBatch as deleteBatchApi,
  createGroup as createGroupApi,
  updateGroup as updateGroupApi,
  deleteGroup as deleteGroupApi,
} from '../communityService';

export const useCommunityMutations = ({ refreshData }) => {
  const [loading, setLoading] = useState(false);

  const runMutation = useCallback(
    async ({ label, request, successMessage }) => {
      setLoading(true);

      try {
        const result = await request();

        if (typeof refreshData === 'function') {
          await refreshData();
        }

        console.info(`[CommunityMutations] ${successMessage}`, result);
        return result;
      } catch (error) {
        console.error(`[CommunityMutations] Failed to ${label}:`, error);
        window.alert(error?.message || `Unable to ${label}.`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [refreshData]
  );

  const createCommunity = useCallback(
    async (payload) => {
      const normalized = {
        name: payload.name.trim(),
        area: payload.area,
        coordinator: payload.coordinator,
      };

      return runMutation({
        label: 'create community',
        successMessage: 'Community created successfully',
        request: () => createCommunityApi(normalized),
      });
    },
    [runMutation]
  );

  const updateCommunity = useCallback(
    async (id, payload) => {
      const normalized = {
        name: payload.name.trim(),
        area: payload.area,
      };

      return runMutation({
        label: 'update community',
        successMessage: 'Community updated successfully',
        request: () => updateCommunityApi(id, normalized),
      });
    },
    [runMutation]
  );

  const deleteCommunity = useCallback(
    async (id) => {
      return runMutation({
        label: 'delete community',
        successMessage: 'Community deleted successfully',
        request: () => deleteCommunityApi(id),
      });
    },
    [runMutation]
  );

  const createBatch = useCallback(
    async (payload) => {
      const normalized = {
        name: payload.name.trim(),
        community: payload.community,
        records: Number(payload.records) || 0,
        progress: Number(payload.progress) || 0,
        status: payload.status,
      };

      return runMutation({
        label: 'create batch',
        successMessage: 'Batch created successfully',
        request: () => createBatchApi(normalized),
      });
    },
    [runMutation]
  );

  const updateBatch = useCallback(
    async (id, payload) => {
      const normalized = {
        name: payload.name.trim(),
        community: payload.community,
        records: Number(payload.records) || 0,
        progress: Number(payload.progress) || 0,
        status: payload.status,
      };

      return runMutation({
        label: 'update batch',
        successMessage: 'Batch updated successfully',
        request: () => updateBatchApi(id, normalized),
      });
    },
    [runMutation]
  );

  const deleteBatch = useCallback(
    async (id) => {
      return runMutation({
        label: 'delete batch',
        successMessage: 'Batch deleted successfully',
        request: () => deleteBatchApi(id),
      });
    },
    [runMutation]
  );

  const createGroup = useCallback(
    async (payload) => {
      const normalized = {
        name: payload.name.trim(),
        community: payload.community,
        leader: payload.leader.trim(),
        members: Number(payload.members) || 0,
        status: payload.status,
      };

      return runMutation({
        label: 'create group',
        successMessage: 'Group created successfully',
        request: () => createGroupApi(normalized),
      });
    },
    [runMutation]
  );

  const updateGroup = useCallback(
    async (id, payload) => {
      const normalized = {
        name: payload.name.trim(),
        community: payload.community,
        leader: payload.leader.trim(),
        members: Number(payload.members) || 0,
        status: payload.status,
      };

      return runMutation({
        label: 'update group',
        successMessage: 'Group updated successfully',
        request: () => updateGroupApi(id, normalized),
      });
    },
    [runMutation]
  );

  const deleteGroup = useCallback(
    async (id) => {
      return runMutation({
        label: 'delete group',
        successMessage: 'Group deleted successfully',
        request: () => deleteGroupApi(id),
      });
    },
    [runMutation]
  );

  return {
    loading,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    createBatch,
    updateBatch,
    deleteBatch,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};
