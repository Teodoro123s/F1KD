import { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { apiUpdateUser } from '../../../api/users';
import { notifyAction } from '../../../components/ActionFeedback';
import { isCommunityCoordinatorRole, isHealthWorkerRole, normalizeRole, ROLES } from '../../../utils/permissions';
import useProfileAssignments from './useProfileAssignments';
import {
  getContactNumberError,
  sanitizeContactNumber,
} from '../../../utils/validation/contactNumber';

export default function useProfile() {
  const auth = useAuth();
  const user = auth.currentUser;
  const { assignedSchoolName, assignedGroupName } = useProfileAssignments(user);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [profileContactTouched, setProfileContactTouched] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const canEditProfile = normalizeRole(user?.role) === ROLES.SUPER_ADMIN;

  const firstName = user?.first_name || user?.firstName || '';
  const middleInitial = user?.middle_initial || user?.middleInitial || '';
  const surname = user?.last_name || user?.lastName || '';
  const profileContactError = profileContactTouched
    ? getContactNumberError(profileForm?.contactNumber)
    : '';
  const isCommunityOrganizer = isCommunityCoordinatorRole(user?.role);
  const isHealthWorker = isHealthWorkerRole(user?.role);
  const requiresSchoolAssignment = isCommunityOrganizer || isHealthWorker;

  const openEditDrawer = () => {
    setProfileContactTouched(false);
    setProfileForm({
      firstName,
      middleInitial: middleInitial.trim().charAt(0).toUpperCase(),
      lastName: surname,
      contactNumber: user?.contact_number || user?.contact || '',
    });
    setEditDrawerOpen(true);
  };

  const closeEditDrawer = () => {
    if (savingProfile) return;
    setEditDrawerOpen(false);
  };

  useEffect(() => {
    if (!editDrawerOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !confirmSaveOpen) closeEditDrawer();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('profile-edit-drawer-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('profile-edit-drawer-open');
    };
  }, [editDrawerOpen, savingProfile, confirmSaveOpen]);

  const updateProfileField = (field, value) => {
    const nextValue = field === 'contactNumber' ? sanitizeContactNumber(value) : value;
    setProfileForm((current) => ({ ...current, [field]: nextValue }));
  };

  const requestProfileSave = (event) => {
    event.preventDefault();
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      notifyAction('Unable to identify your account. Please sign in again.', 'error');
      return;
    }
    const contactError = getContactNumberError(profileForm?.contactNumber);
    if (contactError) {
      setProfileContactTouched(true);
      notifyAction(`Contact number: ${contactError}`, 'error');
      return;
    }
    setConfirmSaveOpen(true);
  };

  const saveProfile = async () => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      setConfirmSaveOpen(false);
      notifyAction('Unable to identify your account. Please sign in again.', 'error');
      return;
    }
    const contactError = getContactNumberError(profileForm?.contactNumber);
    if (contactError) {
      setConfirmSaveOpen(false);
      setProfileContactTouched(true);
      notifyAction(`Contact number: ${contactError}`, 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedUser = await apiUpdateUser(userId, {
        firstName: profileForm.firstName.trim(),
        middleInitial: profileForm.middleInitial.trim(),
        lastName: profileForm.lastName.trim(),
        contactNumber: profileForm.contactNumber.trim(),
      });
      auth.updateCurrentUser(updatedUser);
      setConfirmSaveOpen(false);
      setEditDrawerOpen(false);
      notifyAction('Profile updated successfully.');
    } catch (error) {
      setConfirmSaveOpen(false);
      notifyAction(error.message || 'Unable to update your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    loading: auth.loading,
    user,
    firstName,
    middleInitial,
    surname,
    assignedSchoolName,
    assignedGroupName,
    canEditProfile,
    isHealthWorker,
    requiresSchoolAssignment,
    editDrawerOpen,
    profileForm,
    profileContactError,
    profileContactTouched,
    confirmSaveOpen,
    savingProfile,
    openEditDrawer,
    closeEditDrawer,
    updateProfileField,
    requestProfileSave,
    saveProfile,
    setProfileContactTouched,
    setConfirmSaveOpen,
  };
}
