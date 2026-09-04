/**
 * useCommunityData.js
 * Custom hook for fetching and managing community data
 * Responsibility: Fetch communities, groups, batches, coordinators, mothers
 */

import { useEffect, useState } from 'react';
import { getSummary } from '../communityService';
import { apiGetCoordinators } from '../../../api/users';

export const useCommunityData = () => {
  const [communities, setCommunities] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all community data
  useEffect(() => {
    const fetchCommunityData = async () => {
      console.info('[CommunityData] Fetching community data from database...');

      try {
        const data = await getSummary();
        const normalizedData = {
          communities: data.communities || [],
          batches: data.batches || [],
          groups: data.groups || [],
          mothers: data.mothers || [],
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
      } catch (error) {
        console.error('[CommunityData] Unable to load community data from database:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  // Fetch coordinators
  useEffect(() => {
    apiGetCoordinators()
      .then((data) => {
        const users = Array.isArray(data?.users) ? data.users : [];
        setCoordinators(
          users
            .filter((user) =>
              ['community organizer', 'co'].includes(
                String(user.role || '').trim().toLowerCase()
              )
            )
            .map((user) => ({
              id: user.id,
              name: user.full_name || user.username || `User ${user.id}`,
            }))
        );
      })
      .catch((error) =>
        console.error('[CommunityData] Unable to load community coordinators:', error)
      );
  }, []);

  return {
    communities,
    setCommunities,
    batches,
    setBatches,
    groups,
    setGroups,
    coordinators,
    mothers,
    setMothers,
    loading,
  };
};
