/**
 * useBeneficiaryData.js
 * Custom hook for fetching and managing beneficiary data
 * Responsibility: Fetch communities, groups, batches, mothers
 */

import { useEffect, useState } from 'react';
import { getSummary } from '../../Community/communityService';

export const useBeneficiaryData = () => {
  const [communities, setCommunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSummary()
      .then((summary) => {
        setCommunities(summary.communities || []);
        setGroups(summary.groups || []);
        setBatches(summary.batches || []);
      })
      .catch((error) =>
        console.error('[BeneficiaryData] Unable to load community options:', error)
      )
      .finally(() => setLoading(false));
  }, []);

  return {
    communities,
    groups,
    batches,
    loading,
  };
};
