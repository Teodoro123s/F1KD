import { useCallback, useEffect, useState } from 'react';
import { getSummary } from '../communityService';
import { apiGetCoordinators } from '../../../api/users';
import { useAuth } from '../../../auth/AuthProvider';
import { hasRole, ROLES } from '../../../utils/permissions';

export const useCommunityData = () => {
  const { currentUser } = useAuth();
  const canAssignCoordinators = hasRole(currentUser?.role, [ROLES.SUPER_ADMIN]);
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [mothers, setMothers] = useState([]);
  const [totalHealthWorkers, setTotalHealthWorkers] = useState(0);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryData = await getSummary();
      const normalizedData = {
        communities: summaryData.communities || [],
        batches: summaryData.batches || [],
        groups: summaryData.groups || [],
        mothers: summaryData.mothers || [],
        totalHealthWorkers: Number(summaryData.totalHealthWorkers || 0),
      };

      setCommunities(normalizedData.communities);
      setBatches(normalizedData.batches);
      setGroups(normalizedData.groups);
      setMothers(normalizedData.mothers);
      setTotalHealthWorkers(normalizedData.totalHealthWorkers);

      console.info('[CommunityData] Community data load succeeded', {
        communities: normalizedData.communities.length,
        batches: normalizedData.batches.length,
        groups: normalizedData.groups.length,
        mothers: normalizedData.mothers.length,
        totalHealthWorkers: normalizedData.totalHealthWorkers,
      });

      if (normalizedData.communities.length === 0) {
        console.warn('[CommunityData] No community records were returned from the database.');
      }

      if (canAssignCoordinators) {
        try {
          const coordinatorData = await apiGetCoordinators();
          const users = Array.isArray(coordinatorData?.users) ? coordinatorData.users : [];

          setCoordinators(
            users.map((user) => ({
              id: user.id,
              name: user.full_name || user.username || `User ${user.id}`,
              schoolId: user.school_id ?? user.schoolId ?? '',
            }))
          );
        } catch (coordinatorError) {
          console.error('[CommunityData] Unable to load community coordinators:', coordinatorError);
        }
      } else {
        setCoordinators([]);
      }
    } catch (dataError) {
      console.error('[CommunityData] Unable to load community data from database:', dataError);
      setError(dataError?.message || 'Unable to load community data.');
    } finally {
      setLoading(false);
    }
  }, [canAssignCoordinators]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    communities,
    batches,
    groups,
    mothers,
    totalHealthWorkers,
    coordinators,
    loading,
    error,
    refreshData,
  };
};
