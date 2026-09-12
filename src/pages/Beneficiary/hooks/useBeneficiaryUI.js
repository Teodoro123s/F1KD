/**
 * useBeneficiaryUI.js
 * Custom hook for managing beneficiary page UI state
 * Responsibility: Handle dropdown state, modal state, navigation
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useBeneficiaryUI = () => {
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdowns on outside click
  useEffect(() => {
    function closeDropdowns() {
      setCreateDropdownOpen(false);
    }
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  // Determine current page state based on location
  const isCreateMother = location.pathname.includes('/beneficiary/create/mother');
  const isCreateChild = location.pathname.includes('/beneficiary/create/child');
  const isMotherDetail = location.pathname.startsWith('/beneficiary/mother/');
  const isListPage = !isCreateMother && !isCreateChild && !isMotherDetail;

  // Navigation handlers
  const openCreateModal = (e) => {
    e.stopPropagation();
    setCreateDropdownOpen((open) => !open);
  };

  const openCreateMother = () => {
    setCreateDropdownOpen(false);
    navigate('/beneficiary/create/mother');
  };

  const openCreateChild = () => {
    setCreateDropdownOpen(false);
    navigate('/beneficiary/create/child');
  };

  const goToMotherDetail = (mother) => {
    navigate(`/beneficiary/mother/${mother.id}`, { state: { mother } });
  };

  const goToList = () => {
    navigate('/beneficiary');
  };

  return {
    createDropdownOpen,
    setCreateDropdownOpen,
    isCreateMother,
    isCreateChild,
    isMotherDetail,
    isListPage,
    openCreateModal,
    openCreateMother,
    openCreateChild,
    goToMotherDetail,
    goToList,
  };
};
