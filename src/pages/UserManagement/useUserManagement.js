import { useEffect, useMemo, useState } from 'react';
import { apiGetUsers, apiCreateUser, apiUpdateUser, apiPatchUserStatus, apiDeleteUser } from '../../api/users';
import { isValidName, isValidMiddleInitial, sanitizeDigits, normalizeContact, isValidContact, isValidEmail, formatDobForInput, isValidDob, getDobValidationMessage, generatePassword } from './lib';

const ROLE_OPTIONS = [
  'Superadmin',
  'Admin',
  'Partner',
  'Controller',
  'Community Organizer',
  'Health worker',
];

const STATUS_OPTIONS = ['Active', 'Suspended'];

const initialUsersData = [
  { id: 'USR-0001', name: 'Arielle Santos', role: 'Superadmin', status: 'Active' },
  { id: 'USR-0002', name: 'Jasmine Cruz', role: 'Admin', status: 'Active' },
  { id: 'USR-0003', name: 'Carlos Reyes', role: 'Partner', status: 'Suspended' },
  { id: 'USR-0004', name: 'Mia Lopez', role: 'Controller', status: 'Active' },
  { id: 'USR-0005', name: 'Noah Garcia', role: 'Community Organizer', status: 'Suspended' },
  { id: 'USR-0006', name: 'Selene Araneta', role: 'Health worker', status: 'Active' },
  { id: 'USR-0007', name: 'Bruno Delos', role: 'Partner', status: 'Active' },
  { id: 'USR-0008', name: 'Leah Mendoza', role: 'Admin', status: 'Active' },
  { id: 'USR-0009', name: 'Nico Tan', role: 'Controller', status: 'Suspended' },
  { id: 'USR-0010', name: 'Diana Villanueva', role: 'Health worker', status: 'Active' },
];

export function useUserManagement() {
  const [users, setUsers] = useState(initialUsersData);
  const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:4000';

  // Load from server when available, fallback to mock data
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // record the attempted fetch for debugging
        try { window.__last_user_fetch__ = { url: `${API_BASE}/api/users?page=1&perPage=100`, time: Date.now() }; } catch (e) {}
        const data = await apiGetUsers(1, 100);
        if (!mounted) return;
        if (Array.isArray(data.users)) {
          // normalize to existing shape
          const mapped = data.users.map((u) => ({
            id: `USR-${String(u.id).padStart(4, '0')}`,
            firstName: u.first_name,
            lastName: u.last_name,
            middleInitial: u.middle_initial,
            contactNumber: u.contact_number,
            email: u.email,
            gender: u.gender,
            dob: formatDobForInput(u.dob),
            location: u.location,
            role: u.role,
            status: u.status,
            password: '',
            name: `${u.first_name} ${u.middle_initial ? u.middle_initial + ' ' : ''}${u.last_name}`,
          }));
          // Merge server users with local seed data, avoiding duplicates by email
          setUsers((prev) => {
            const byEmail = new Map();
            // prefer server users first
            mapped.forEach((u) => { if (u.email) byEmail.set(u.email.toLowerCase(), u); });
            prev.forEach((u) => { if (u.email && !byEmail.has(u.email.toLowerCase())) byEmail.set(u.email.toLowerCase(), u); });
            return Array.from(byEmail.values());
          });
          try { console.log('Fetched users from server', mapped); } catch (e) { /* ignore console errors */ }
        }
      } catch (e) {
        try { console.log('Failed to fetch users from server, using mock data', e); } catch (c) {}
        // keep mocks if server not reachable
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const [query, setQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Active');
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
    role: 'Superadmin',
    status: 'Active',
    password: '',
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Prevent double submits
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = selectedRoleFilter ? user.role === selectedRoleFilter : true;
      const matchesStatus = selectedStatusFilter === 'All' ? true : user.status === selectedStatusFilter;
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [query, selectedRoleFilter, selectedStatusFilter, users]);

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
      if (next.lastName !== prev.lastName || next.contactNumber !== prev.contactNumber) {
        return { ...next, password: generatePassword(next) };
      }
      return next;
    });
  };

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const selectRoleFilter = (role) => {
    setSelectedRoleFilter(role);
    setPage(1);
  };

  const setStatusFilter = (status) => {
    setSelectedStatusFilter(status);
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
    role: 'Superadmin',
    status: 'Active',
    password: '',
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
      middleInitial: user.middleInitial || '',
      contactNumber: user.contactNumber || '',
      email: user.email || '',
      gender: user.gender || 'Male',
      dob: formatDobForInput(user.dob) || '',
      location: user.location || 'Poblacion',
      role: user.role || 'Superadmin',
      status: user.status || 'Active',
      password: user.password || generatePassword(user),
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

  const handleSubmitUser = async (event) => {
    event.preventDefault();

    // Prevent duplicate submissions when one is already in-flight
    if (isSubmitting) {
      setNotification('Submission already in progress. Please wait.');
      try { console.log('handleSubmitUser skipped because isSubmitting=true'); } catch(e){}
      return;
    }

    // Mark submission as in-flight immediately to avoid double-click races
    setIsSubmitting(true);

      // Read values from the submitted form to avoid relying on possibly stale React state
      const formEl = event.currentTarget;
      const fd = new FormData(formEl);
      const firstName = (fd.get('firstName') || '').toString().trim();
      const lastName = (fd.get('lastName') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const contactNumber = (fd.get('contactNumber') || '').toString().trim();
      const mi = (fd.get('middleInitial') || '').toString().trim();
      const dobVal = (fd.get('dob') || '').toString().trim();
      const genderVal = (fd.get('gender') || 'Male').toString();
      const locationVal = (fd.get('location') || 'Poblacion').toString();
      const roleVal = (fd.get('role') || 'Superadmin').toString();
      const statusVal = (fd.get('status') || 'Active').toString();
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
    // Use the provided email; rely on the server to signal duplicates and the retry logic to handle them.
    let emailToUse = email;
    const dobMsg = getDobValidationMessage(dobVal);
    if (dobMsg) {
      setNotification(dobMsg);
      try { console.log('Validation failed: invalid dob', { dobVal }); } catch(e){}
      try { const el = document.querySelector('input[name="dob"]'); if (el) el.focus(); } catch(e){}
      return;
    }

    const fullName = `${firstName}${mi ? ` ${mi}` : ''} ${lastName}`;

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
          gender: genderVal,
          dob: dobVal,
          location: locationVal,
          role: roleVal,
          status: statusVal,
          password: fdPassword || form.password,
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
        } : u)));
        setNotification(`Saved changes for ${fullName}.`);
        try { console.log('Saved changes for user', fullName); } catch(e) {}
        closeModal();
        setPage(1);
      } else {
        // Create new user
        const passwordToUse = (fdPassword && fdPassword.length >= 8) ? fdPassword : generatePassword({ lastName, contactNumber: contactNumberSan });
        try { console.log('Computed passwordToUse', { fdPasswordLength: (fdPassword || '').length, passwordToUse }); } catch(e) {}
        try { console.log('Password to use for new user (plaintext):', passwordToUse); } catch (e) {}
        if (!passwordToUse || passwordToUse.length < 8) { setNotification('Password must be at least 8 characters.'); try { console.log('Validation failed: password too short', { passwordToUse }); } catch(e){}; return; }

        // Log payload for debug (we'll retry up to 5 times on duplicate username/email)
        try { console.log('Creating user payload (initial)', {
          firstName,
          lastName,
          middleInitial: mi || null,
          contactNumber: contactNumberSan,
          email: emailToUse,
          gender: genderVal,
          dob: dobVal,
          location: locationVal,
          role: roleVal,
          status: statusVal,
          password: passwordToUse,
        }); } catch (e) {}

        // Use the normalized contact number as the username by default
        const baseUsername = contactNumberSan || `user${Date.now().toString().slice(-6)}`;
        let usernameToUse = baseUsername;
        let attempts = 0;
        let data = null;
        let lastErr = null;
        while (attempts < 5) {
          attempts += 1;
          try {
            const payload = {
              firstName,
              lastName,
              middleInitial: mi || null,
              contactNumber: contactNumberSan,
              email: emailToUse,
              username: usernameToUse,
              gender: genderVal,
              dob: dobVal,
              location: locationVal,
              role: roleVal,
              status: statusVal,
              password: passwordToUse,
            };
            try { console.log(`Attempt ${attempts}: creating user with username=${usernameToUse} and email=${emailToUse}`, payload); } catch(e){}
            data = await apiCreateUser(payload);
            try { console.log('Created user response', data); } catch(e) {}
            // success
            break;
          } catch (err) {
            lastErr = err;
            const msg = (err && err.message) ? err.message.toString().toLowerCase() : '';
            try { console.log(`Create attempt ${attempts} failed:`, msg); } catch(e){}
            // If the server complains about email already existing, generate a new fallback email and retry
            if (/email already exists|email.*already.*exists|duplicate email|email.*taken/.test(msg)) {
              try {
                const parts = (email || '').split('@');
                const local = parts[0] || 'user';
                const domain = parts[1] || 'example.com';
                const suffix = Date.now().toString().slice(-5) + attempts;
                emailToUse = `${local}+${suffix}@${domain}`;
                setNotification(`Email already registered — using ${emailToUse} instead (attempt ${attempts}).`);
                try { console.log('Email duplicate detected; using fallback', { original: email, fallback: emailToUse }); } catch (e) {}
                // continue to retry with new email
                continue;
              } catch (e) {
                // can't generate fallback, break and rethrow
                try { console.log('Failed generating fallback email during retry', e); } catch (e2) {}
                break;
              }
            }
            // If the server complains about username already existing, append a small suffix and retry
            if (/username already exists|username.*already.*exists|duplicate username|username.*taken/.test(msg) || /already exists/.test(msg)) {
              // generate a slightly different username
              usernameToUse = `${baseUsername}_${Date.now().toString().slice(-4)}${attempts}`;
              try { console.log('Username duplicate detected; trying new username', usernameToUse); } catch(e){}
              setNotification(`Username conflict, retrying (attempt ${attempts}).`);
              continue;
            }
            // For any other error, stop retrying
            break;
          }
        }
        if (!data) {
          // All attempts failed
          throw lastErr || new Error('Failed to create user after multiple attempts');
        }
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
          password: data.plaintextPassword || passwordToUse,
          name: `${created.first_name} ${created.middle_initial ? created.middle_initial + ' ' : ''}${created.last_name}`,
        };
        setUsers((prev) => [newUser, ...prev]);
        setNotification(`Created ${fullName}.`);
        try { console.log('Created and added user to UI', publicId, fullName); } catch(e) {}
        try { console.log('Plaintext password for created user:', newUser.password); } catch(e) {}
        closeModal();
        setPage(1);
      }
    } catch (err) {
      console.error('User submit error:', err);
      setNotification(err.message || 'An error occurred while saving the user.');
    } finally {
      // allow new submissions after this attempt completes
      setIsSubmitting(false);
    }
  };



  const handleSuspendUser = async (id) => {
    try {
      const serverId = parseServerId(id);
      // determine desired new status by reading current users state
      const user = users.find((u) => u.id === id);
      if (!user) {
        setNotification('User not found.');
        return;
      }
      const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';

      await apiPatchUserStatus(serverId, newStatus);

      // update local state only after server confirms
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
      setNotification('User status updated.');
      try { console.log('Updated user status on server', serverId, newStatus); } catch (e) {}
    } catch (e) {
      console.error('Failed to update user status:', e);
      setNotification(e.message || 'Failed to update user status.');
    }
  };

  const requestDeleteUser = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;

    try {
      const serverId = parseServerId(id);
      await apiDeleteUser(serverId);
      // remove from UI only after server confirms deletion
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setNotification('User deleted.');
      try { console.log('Deleted user on server', serverId); } catch (e) {}
    } catch (e) {
      console.error('Failed to delete user:', e);
      setNotification(e.message || 'Failed to delete user.');
    } finally {
      setConfirmDeleteId(null);
    }
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
    selectedRoleFilter,
    selectedStatusFilter,
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
    selectRoleFilter,
    setStatusFilter,
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
  };
}
