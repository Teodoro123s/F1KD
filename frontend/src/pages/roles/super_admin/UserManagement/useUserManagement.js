import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGetUsers, apiCreateUser, apiResendUserCredentials, apiUpdateUser, apiPatchUserStatus, apiDeleteUser } from '../../../../api/users';
import { isValidName, isValidMiddleInitial, sanitizeDigits, normalizeContact, isValidContact, isValidEmail, formatDobForInput, isValidDob, getDobValidationMessage } from './lib';
import { getSummary } from '../Community/communityService';
import { isCommunityCoordinatorRole, isHealthWorkerRole } from '../../../../utils/permissions';
import { getApiBaseUrl } from '../../../../api/authHeader';
import { notifyAction } from '../../../../components/ActionFeedback';

const API_BASE = getApiBaseUrl();

const ROLE_OPTIONS = [
  'Admin',
  'Partner',
  'Community Organizer',
  'Health worker',
];

const STATUS_OPTIONS = ['Active', 'Suspended'];

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return 'Active';
  if (['active', 'enabled'].includes(value)) return 'Active';
  if (['suspended', 'inactive', 'disabled'].includes(value)) return 'Suspended';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeRole(role) {
  const value = String(role || '').trim();
  if (!value) return 'User';
  const lower = value.toLowerCase();
  if (lower === 'superadmin') return 'Superadmin';
  if (lower === 'admin') return 'Admin';
  if (['community organizer', 'community coordinator', 'community_coordinator', 'coordinator'].includes(lower)) return 'Community Organizer';
  if (lower === 'health worker') return 'Health worker';
  return value;
}

function buildDisplayName(user) {
  const safeName = String(user?.full_name || '').trim();
  if (safeName) return safeName;
  const parts = [user?.first_name, user?.middle_initial, user?.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(user?.username || 'Unnamed user').trim();
}

const USER_PAGE_SIZE = 100;

async function fetchAllUsers() {
  const firstPage = await apiGetUsers(1, USER_PAGE_SIZE);
  const firstPageUsers = Array.isArray(firstPage.users) ? firstPage.users : [];
  const total = Number(firstPage.total) || firstPageUsers.length;
  const pageCount = Math.ceil(total / USER_PAGE_SIZE);
  const remainingPages = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => apiGetUsers(index + 2, USER_PAGE_SIZE)));
  return [...firstPageUsers, ...remainingPages.flatMap((page) => Array.isArray(page.users) ? page.users : [])].map((user) => ({
    id: `USR-${String(user.id).padStart(4, '0')}`,
    firstName: user.first_name,
    lastName: user.last_name,
    middleInitial: user.middle_initial,
    contactNumber: user.contact_number,
    email: user.email,
    gender: user.gender,
    dob: formatDobForInput(user.dob),
    location: user.location,
    schoolId: user.school_id,
    groupId: user.group_id,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
    password: '',
    name: buildDisplayName(user),
  }));
}

export function useUserManagement({ schoolId = '', batchId = '' } = {}) {
  const [users, setUsers] = useState([]);
  const [apiOnline, setApiOnline] = useState(true);
  const [communities, setCommunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    getSummary()
      .then((summary) => {
        setCommunities(summary.communities || []);
        setGroups(summary.groups || []);
        setBatches(summary.batches || []);
      })
      .catch(() => {
        setCommunities([]);
        setGroups([]);
        setBatches([]);
      });
  }, []);

  // Load the database as the single source of truth.
  useEffect(() => {
    let mounted = true;
    async function load(attempts = 0) {
      try {
        // record the attempted fetch for debugging
        try { window.__last_user_fetch__ = { url: `${API_BASE}/api/users?page=1&perPage=100`, time: Date.now() }; } catch (e) {}
        const mapped = await fetchAllUsers();
        if (!mounted) return;
        setApiOnline(true);
        setUsers(schoolId ? mapped.filter((user) => String(user.schoolId || '') === String(schoolId)) : mapped);
        try { console.log('Fetched users from server', mapped); } catch (e) { /* ignore console errors */ }
      } catch (e) {
        try { console.error('Failed to fetch users from server', e?.message || e); } catch (c) {}
        // If a transient network error occurred, retry a couple of times
        if (attempts < 2) {
          try { console.log('Retrying user fetch (attempt)', attempts + 1); } catch (e2) {}
          try { await sleep(300 * (attempts + 1)); } catch (e3) {}
          return load(attempts + 1);
        }
        // Mark API as offline and leave the list empty rather than showing fabricated users.
        setApiOnline(false);
        setUsers([]);
        setNotification('Backend unreachable — user list is unavailable. Click Retry to try again.');
      }
    }
    load();
    return () => { mounted = false; };
  }, [schoolId]);

  const [query, setQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(schoolId || batchId ? 'All' : 'Active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setFormState] = useState({
    firstName: '',
    lastName: '',
    middleInitial: '',
    contactNumber: '',
    email: '',
    gender: 'Male',
    dob: '',
    location: 'Poblacion',
    role: 'Admin',
    status: 'Active',
    password: '',
    schoolId: '',
    groupId: '',
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Prevent double submits
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingCredentials, setIsResendingCredentials] = useState(false);
  const submitLock = useRef(false);
  // Loading flags for individual actions
  const [suspendLoadingIds, setSuspendLoadingIds] = useState(() => new Set());
  const [deletingId, setDeletingId] = useState(null);
  // One-time plaintext credential shown after creation (dev only)
  const [oneTimeCredentials, setOneTimeCredentials] = useState(null);

  useEffect(() => {
    setSelectedStatusFilter(schoolId || batchId ? 'All' : 'Active');
    setPage(1);
  }, [batchId, schoolId]);

  const clearOneTimeCredentials = () => setOneTimeCredentials(null);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    const selectedBatch = batches.find((batch) => String(batch.id || batch.code) === String(batchId));
    const batchGroupIds = String(selectedBatch?.groupIds || '').split(',').map((id) => id.trim()).filter(Boolean);
    return users.filter((user) => {
      if (user.role === 'Superadmin') {
        return false;
      }

      const matchesSchoolScope = !schoolId || String(user.schoolId || '') === String(schoolId);
      const matchesBatch = !batchId || batchGroupIds.includes(String(user.groupId || ''));

      // Compare normalized status so UI filters work regardless of server casing/enum values
      const matchesStatus = selectedStatusFilter === 'All'
        ? true
        : (typeof user.status === 'string' && (user.status === selectedStatusFilter || (typeof normalizeStatus === 'function' && normalizeStatus(user.status) === selectedStatusFilter)));
      const matchesRole = !selectedRoleFilter || user.role === selectedRoleFilter;
      const matchesSelectedSchool = !selectedSchoolFilter || (selectedSchoolFilter === '__unassigned__'
        ? !user.schoolId
        : String(user.schoolId || '') === String(selectedSchoolFilter));
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term);
      return matchesSchoolScope && matchesBatch && matchesStatus && matchesRole && matchesSelectedSchool && matchesSearch;
    });
  }, [batchId, batches, query, schoolId, selectedRoleFilter, selectedSchoolFilter, selectedStatusFilter, users]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredData.length / perPage)),
    [filteredData.length, perPage]
  );

  const currentPage = useMemo(() => Math.min(page, pageCount), [page, pageCount]);

  const currentStart = useMemo(() => (currentPage - 1) * perPage, [currentPage, perPage]);

  const currentRows = useMemo(
    () => filteredData.slice(currentStart, currentStart + perPage),
    [filteredData, currentStart, perPage]
  );

  const rangeStart = currentRows.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, filteredData.length);

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const setStatusFilter = (status) => {
    setSelectedStatusFilter(status);
    setPage(1);
  };

  const selectRoleFilter = (role) => {
    setSelectedRoleFilter(role);
    setPage(1);
  };

  const selectSchoolFilter = (selectedSchoolId) => {
    setSelectedSchoolFilter(selectedSchoolId);
    setPage(1);
  };

  const handlePerPageChange = (val) => {
    setPerPage(Number(val));
    setPage(1);
  };

  const initialFormState = () => ({
    firstName: '',
    lastName: '',
    middleInitial: '',
    contactNumber: '',
    email: '',
    gender: 'Male',
    dob: '',
    location: 'Poblacion',
    role: 'Admin',
    status: 'Active',
    password: '',
    schoolId: '',
    groupId: '',
  });

  const openAddModal = () => {
    setSelectedUser(null);
    setFormState(initialFormState());
    setShowAddModal(true);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setShowAddModal(false);
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setFormState({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleInitial: user.middleInitial ?? user.middle_initial ?? '',
      contactNumber: user.contactNumber ?? user.contact_number ?? user.contact ?? '',
      email: user.email || '',
      gender: user.gender || 'Male',
      dob: formatDobForInput(user.dob ?? user.dateOfBirth ?? user.date_of_birth) || '',
      location: user.location || 'Poblacion',
      role: user.role || 'Admin',
      status: user.status || 'Active',
      password: user.password || '',
      schoolId: user.schoolId || '',
      groupId: user.groupId || '',
    });
    setShowAddModal(true);
  };

  // Validation and normalization helpers imported from ./lib (keeps hook tidy)
  // See src/pages/UserManagement/lib.js for implementations
  // (helpers are imported at the top of the file)


  const parseServerId = (id) => {
    if (!id) return id;
    if (typeof id === 'number') return id;
    const m = String(id).match(/USR-(\d+)/);
    return m ? Number(m[1]) : Number(id) || null;
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const retryLoad = async () => {
    setNotification('Retrying connection to server...');
    try {
      const mapped = await fetchAllUsers();
      setUsers(schoolId ? mapped.filter((user) => String(user.schoolId || '') === String(schoolId)) : mapped);
      setApiOnline(true);
      setNotification('Reconnected to server. User list refreshed.');
    } catch (err) {
      setApiOnline(false);
      setNotification('Retry failed. Server still unreachable.');
    }
  };

  const handleSubmitUser = async (event) => {
    event.preventDefault();

    // Prevent duplicate submissions when one is already in-flight
    if (submitLock.current || isSubmitting) {
      setNotification('Submission already in progress. Please wait.');
      return;
    }

      // Read values from the submitted form to avoid relying on possibly stale React state
      const formEl = event.currentTarget;
      const fd = new FormData(formEl);
      const firstName = (fd.get('firstName') || '').toString().trim();
      const lastName = (fd.get('lastName') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const contactNumber = (fd.get('contactNumber') || '').toString().trim();
      const mi = (fd.get('middleInitial') || '').toString().trim();
      const dobVal = (fd.get('dob') || form.dob || '').toString().trim();
      const normalizedDob = formatDobForInput(dobVal);
      const roleVal = (fd.get('role') || 'Admin').toString();
      const statusVal = (fd.get('status') || 'Active').toString();
      const schoolIdVal = (fd.get('schoolId') || '').toString();
      const groupIdVal = (fd.get('groupId') || '').toString();
      // Prefer password provided by the submitted form (FormData). Falls back to state-derived password if missing.
      const fdPassword = (fd.get('password') || '').toString();

      // Instrumentation: log that submit was triggered and the form-derived snapshot
      try { console.log('handleSubmitUser called (from form)', { firstName, lastName, email }); } catch (e) {}

      // Basic validation
    if (!firstName) { setNotification('First Name is required.'); try { console.log('Validation failed: missing firstName', { firstName, lastName, email, contactNumber, dobVal }); } catch(e){}; return; }
    if (!isValidName(firstName)) { setNotification('First Name may contain letters and spaces only.'); try { console.log('Validation failed: invalid firstName', { firstName }); } catch(e){}; return; }
    if (!lastName) { setNotification('Last Name is required.'); try { console.log('Validation failed: missing lastName', { firstName, lastName }); } catch(e){}; return; }
    if (!isValidName(lastName)) { setNotification('Last Name may contain letters and spaces only.'); try { console.log('Validation failed: invalid lastName', { lastName }); } catch(e){}; return; }
    if (!isValidMiddleInitial(mi)) { setNotification('Middle Initial must be a single letter.'); try { console.log('Validation failed: invalid middleInitial', { middleInitial: mi }); } catch(e){}; return; }
    const contactNumberSan = normalizeContact(contactNumber);
    if (!isValidContact(contactNumberSan)) {
      const msg = 'Contact number must be a Philippine mobile number. Accepted formats: 09171234567, 9171234567, +639171234567, or 639171234567.';
      setNotification(msg);
      try { console.log('Validation failed: invalid contactNumber', { contactNumber, contactNumberSan }); } catch(e){}
      // Try to focus the contact input so the user can correct it quickly
      try { const el = document.querySelector('input[name="contactNumber"]'); if (el) { el.focus(); el.select(); } } catch (e) {}
      return;
    }
    if (!email) { setNotification('Email is required.'); try { console.log('Validation failed: missing email', { email }); } catch(e){}; return; }
    if (!isValidEmail(email)) { setNotification('Please enter a valid email address.'); try { console.log('Validation failed: invalid email', { email }); } catch(e){}; return; }
    if (roleVal === 'Superadmin' || normalizeRole(roleVal) === 'Superadmin') {
      setNotification('Creating a Superadmin account is not allowed. Please choose another role.');
      return;
    }

    // Keep client validation aligned with the server's role assignment rules.
    if ((isHealthWorkerRole(roleVal) || isCommunityCoordinatorRole(roleVal)) && !schoolIdVal) {
      setNotification(`Assigned school is required for ${roleVal} accounts.`);
      return;
    }
    if (isHealthWorkerRole(roleVal) && !groupIdVal) {
      setNotification('Assigned group is required for Health worker accounts.');
      return;
    }
    const dobToSave = normalizedDob || dobVal;
    const dobMsg = getDobValidationMessage(dobToSave);
    if (dobMsg) {
      setNotification(dobMsg);
      try { console.log('Validation failed: invalid dob', { dobVal, normalizedDob, dobToSave }); } catch(e){}
      try { const el = document.querySelector('input[name="dob"]'); if (el) el.focus(); } catch(e){}
      return;
    }

    const fullName = `${firstName}${mi ? ` ${mi}` : ''} ${lastName}`;

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      if (selectedUser) {
        // Update existing user
        const serverId = parseServerId(selectedUser.id);
        const updated = await apiUpdateUser(serverId, {
          firstName,
          lastName,
          middleInitial: mi || null,
          contactNumber: contactNumberSan,
          email,
          dob: dobToSave,
          role: roleVal,
          status: statusVal,
          password: fdPassword || form.password,
          schoolId: schoolIdVal || null,
          groupId: groupIdVal || null,
        });
        try { console.log('Updated user from server', updated); } catch(e) {}
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? {
          ...u,
          name: `${updated.first_name} ${updated.middle_initial ? updated.middle_initial + ' ' : ''}${updated.last_name}`,
          firstName: updated.first_name,
          lastName: updated.last_name,
          middleInitial: updated.middle_initial,
          contactNumber: updated.contact_number,
          email: updated.email,
          gender: updated.gender,
          dob: formatDobForInput(updated.dob),
          location: updated.location,
          role: updated.role,
          status: updated.status,
          schoolId: updated.school_id ?? u.schoolId,
          groupId: updated.group_id ?? u.groupId,
        } : u)));
        setNotification(`Saved changes for ${fullName}.`);
        notifyAction(`Saved changes for ${fullName}.`);
        try { console.log('Saved changes for user', fullName); } catch(e) {}
        closeModal();
        setPage(1);
      } else {
        // Create new user
        const data = await apiCreateUser({
          firstName,
          lastName,
          middleInitial: mi || null,
          contactNumber: contactNumberSan,
          email,
          username: contactNumberSan || `user${Date.now().toString().slice(-6)}`,
          dob: dobToSave,
          role: roleVal,
          status: statusVal,
          ...(fdPassword && fdPassword.length >= 8 ? { password: fdPassword } : {}),
          schoolId: schoolIdVal || null,
          groupId: groupIdVal || null,
        });
        const created = data.user || data;
        const serverId = created.id;
        const publicId = `USR-${String(serverId).padStart(4, '0')}`;
        const newUser = {
          id: publicId,
          firstName: created.first_name,
          lastName: created.last_name,
          middleInitial: created.middle_initial,
          contactNumber: created.contact_number,
          email: created.email,
          gender: created.gender,
          dob: formatDobForInput(created.dob),
          location: created.location,
          role: created.role,
          status: created.status,
          schoolId: created.school_id ?? null,
          groupId: created.group_id ?? null,
          // Do not persist plaintext password in UI list. Store one-time credentials separately to display to the user once.
          name: `${created.first_name} ${created.middle_initial ? created.middle_initial + ' ' : ''}${created.last_name}`,
        };
            setUsers((prev) => [newUser, ...prev]);
        setOneTimeCredentials({ id: serverId, email, emailSent: data.emailSent });
        setNotification(data.emailSent
          ? `Created ${fullName}. Temporary credentials were emailed to ${email}.`
          : `Created ${fullName}, but the credential email was not sent.`);
        try { console.log('Created and added user to UI', publicId, fullName); } catch(e) {}
        closeModal();
        setPage(1);
      }
    } catch (err) {
      console.error('User submit error:', err);
      setNotification(err.message || 'An error occurred while saving the user.');
      if (selectedUser) notifyAction(err.message || 'Unable to save user changes.', 'error');
    } finally {
      // allow new submissions after this attempt completes
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const resendCredentials = async () => {
    if (!oneTimeCredentials?.id || isResendingCredentials) return;
    setIsResendingCredentials(true);
    try {
      await apiResendUserCredentials(oneTimeCredentials.id);
      setOneTimeCredentials((current) => current ? { ...current, emailSent: true } : current);
      setNotification(`Temporary credentials were sent to ${oneTimeCredentials.email}.`);
    } catch (error) {
      setNotification(error.message || 'Unable to resend credentials.');
    } finally {
      setIsResendingCredentials(false);
    }
  };


  const handleSuspendUser = async (id) => {
    // prevent duplicate suspend toggles on same id
    if (suspendLoadingIds.has(id)) {
      notifyAction('Status change already in progress for this user.', 'error');
      return;
    }

    const user = users.find((u) => u.id === id);
    if (!user) {
      notifyAction('User not found.', 'error');
      return;
    }

    const prevStatus = user.status;
    const targetStatus = prevStatus === 'Active' ? 'Suspended' : 'Active';

    // optimistic update
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: targetStatus } : u)));
    setSuspendLoadingIds((prev) => new Set(prev).add(id));

    let attempts = 0;
    let lastErr = null;
    while (attempts < 3) {
      attempts += 1;
      try {
        const serverId = parseServerId(id);
        await apiPatchUserStatus(serverId, targetStatus);
        notifyAction(`User ${targetStatus === 'Suspended' ? 'suspended' : 'unsuspended'} successfully.`);
        try { console.log('Updated user status on server', serverId, targetStatus); } catch (e) {}
        break;
      } catch (err) {
        lastErr = err;
        const msg = (err && err.message) ? err.message.toString().toLowerCase() : '';
        try { console.log(`Attempt ${attempts} to update status failed:`, msg); } catch (e) {}
        if (attempts < 3 && (/failed to fetch|networkerror|network error|timeout|502|503|504/.test(msg) || (err && err.status && err.status >= 500))) {
          try { await sleep(300 * attempts); } catch (e) {}
          continue;
        }
        // non-recoverable - rollback optimistic update
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: prevStatus } : u)));
        notifyAction(err.message || 'Failed to update user status.', 'error');
        try { console.error('Failed to update user status after retries', err); } catch (e) {}
        break;
      }
    }

    // done, remove loading flag
    setSuspendLoadingIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  };

  const requestDeleteUser = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setDeletingId(id);

    let attempts = 0;
    let lastErr = null;
    while (attempts < 3) {
      attempts += 1;
      try {
        const serverId = parseServerId(id);
        await apiDeleteUser(serverId);
        // remove from UI only after server confirms deletion
        setUsers((prev) => prev.filter((user) => user.id !== id));
        setNotification('User deleted.');
        notifyAction('User deleted successfully.');
        try { console.log('Deleted user on server', serverId); } catch (e) {}
        break;
      } catch (err) {
        lastErr = err;
        const msg = (err && err.message) ? err.message.toString().toLowerCase() : '';
        try { console.log(`Delete attempt ${attempts} failed:`, msg); } catch (e) {}
        if (attempts < 3 && (/failed to fetch|networkerror|network error|timeout|502|503|504/.test(msg) || (err && err.status && err.status >= 500))) {
          setNotification(`Delete failed due to network/server error, retrying (attempt ${attempts + 1})...`);
          try { await sleep(400 * attempts); } catch (e) {}
          continue;
        }
        setNotification(err.message || 'Failed to delete user.');
        notifyAction(err.message || 'Failed to delete user.', 'error');
        try { console.error('Failed to delete user after retries', err); } catch (e) {}
        break;
      }
    }

    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'User Management', clickable: false }];
    if (selectedUser) {
      items.push({ label: selectedUser.name, clickable: false });
    }
    return items;
  }, [selectedUser]);

  const handlePageChange = (nextPage) => {
    setPage(Number(nextPage));
  };

  return {
    users,
    form,
    query,
    selectedStatusFilter,
    selectedRoleFilter,
    selectedSchoolFilter,
    showAddModal,
    page,
    perPage,
    selectedUser,
    notification,
    confirmDeleteId,
    filteredData,
    currentRows,
    rangeStart,
    rangeEnd,
    pageCount,
    currentPage,
    breadcrumbItems,
    ROLE_OPTIONS,
    STATUS_OPTIONS,
    handleSearch,
    setStatusFilter,
    selectRoleFilter,
    selectSchoolFilter,
    handlePerPageChange,
    handlePageChange,
    openAddModal,
    closeModal,
    openEditUser,
    handleSubmitUser,
    handleSuspendUser,
    requestDeleteUser,
    confirmDelete,
    cancelDelete,
    setForm,
    isSubmitting,
    isResendingCredentials,
    resendCredentials,
    // loading indicators for row-level actions
    suspendLoadingIds: Array.from(suspendLoadingIds),
    deletingId,
    // one-time dev credentials for display
    oneTimeCredentials,
    clearOneTimeCredentials,
    communities,
    groups,
    batches,
  };
}
