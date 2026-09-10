import { useCallback, useEffect, useState } from 'react';
import { getSummary } from '../communityService';
import { apiGetCoordinators } from '../../../api/users';

export const useCommunityData = () => {
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [mothers, setMothers] = useState([]);
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
      };

      setCommunities(normalizedData.communities);
      setBatches(normalizedData.batches);
      setGroups(normalizedData.groups);
      setMothers(normalizedData.mothers);

      console.info('[CommunityData] Community data load succeeded', {
        communities: normalizedData.communities.length,
        batches: normalizedData.batches.length,
        groups: normalizedData.groups.length,
        mothers: normalizedData.mothers.length,
      });

      if (normalizedData.communities.length === 0) {
        console.warn('[CommunityData] No community records were returned from the database.');
      }

      try {
        const coordinatorData = await apiGetCoordinators();
        const users = Array.isArray(coordinatorData?.users) ? coordinatorData.users : [];

        setCoordinators(
          users
            .filter((user) => ['community organizer', 'co'].includes(String(user.role || '').trim().toLowerCase()))
            .map((user) => ({
              id: user.id,
              name: user.full_name || user.username || `User ${user.id}`,
            }))
        );
      } catch (coordinatorError) {
        console.error('[CommunityData] Unable to load community coordinators:', coordinatorError);
      }
    } catch (dataError) {
      console.error('[CommunityData] Unable to load community data from database:', dataError);
      setError(dataError?.message || 'Unable to load community data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    communities,
    batches,
    groups,
    mothers,
    coordinators,
    loading,
    error,
    refreshData,
  };
};
