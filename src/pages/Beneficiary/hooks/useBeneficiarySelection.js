/**
 * useBeneficiarySelection.js
 * Custom hook for managing selected beneficiary and navigation state
 * Responsibility: Handle mother selection, detail loading, deep linking
 */

import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { apiGetMother } from '../../../api/mothers';
import { apiGetChildrenByMother } from '../../../api/children';

export const useBeneficiarySelection = () => {
  const [selectedMother, setSelectedMother] = useState(null);
  const [loading, setLoading] = useState(false);

  const { id: motherRouteId } = useParams();
  const location = useLocation();

  // Handle location state changes (from navigation or deep links)
  useEffect(() => {
    const navMother = location.state?.mother || null;
    const updatedMother = location.state?.updatedMother || null;

    if (updatedMother) {
      setSelectedMother((current) => ({ ...(current || {}), ...updatedMother }));
      return;
    }

    if (location.pathname.startsWith('/beneficiary/mother/') && navMother) {
      setSelectedMother(navMother);
      return;
    }

    if (location.pathname.startsWith('/beneficiary/mother/') && motherRouteId) {
      setLoading(true);
      apiGetMother(motherRouteId)
        .then(async (response) => {
          const loadedMother = response?.mother || null;
          if (!loadedMother) {
            setLoading(false);
            return;
          }
          const childrenResponse = await apiGetChildrenByMother(
            loadedMother.raw?.id || loadedMother.id || motherRouteId
          );
          setSelectedMother({
            ...loadedMother,
            children: childrenResponse?.children || [],
          });
        })
        .catch((error) => {
          console.error('[BeneficiarySelection] Unable to load mother deep link:', error);
          setSelectedMother(null);
        })
        .finally(() => setLoading(false));
    }
  }, [location.pathname, location.state, motherRouteId]);

  // Load mother detail when selected
  const loadMotherDetail = async (mother) => {
    setLoading(true);
    try {
      const [motherResponse, childrenResponse] = await Promise.all([
        apiGetMother(mother.id || mother.motherId),
        apiGetChildrenByMother(mother.raw?.id || mother.original?.raw?.id || mother.id || mother.motherId),
      ]);
      setSelectedMother({
        ...mother,
        ...(motherResponse?.mother || {}),
        children: childrenResponse?.children || [],
      });
    } catch (error) {
      console.error('[BeneficiarySelection] Unable to load mother detail:', error);
      setSelectedMother(mother);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedMother(null);
  };

  return {
    selectedMother,
    setSelectedMother,
    loading,
    loadMotherDetail,
    clearSelection,
  };
};
