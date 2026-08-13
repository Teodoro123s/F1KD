import { useEffect, useMemo, useState } from 'react';

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
  const API_BASE = process.env.REACT_APP_API_URL || '';

  // Load from server when available, fallback to mock data
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/users?page=1&perPage=100`);
        if (!res.ok) throw new Error('no server');
        const data = await res.json();
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
            dob: u.dob,
            location: u.location,
            role: u.role,
            status: u.status,
            password: '',
            name: `${u.first_name} ${u.middle_initial ? u.middle_initial + ' ' : ''}${u.last_name}`,
          }));
          setUsers(mapped);
        }
      } catch (e) {
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

  const generatePassword = (nextForm) => {
    const lastName = (nextForm.lastName || '').trim();
    const year = nextForm.dob ? new Date(nextForm.dob).getFullYear() : '1990';
    return `${lastName}${year}`.toLowerCase();
  };

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.lastName !== prev.lastName || next.dob !== prev.dob) {
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
      dob: user.dob || '',
      location: user.location || 'Poblacion',
      role: user.role || 'Superadmin',
      status: user.status || 'Active',
      password: user.password || generatePassword(user),
    });
    setShowAddModal(true);
  };

  const isValidName = (value) => /^[A-Za-z ]+$/.test(value.trim());
  const isValidMiddleInitial = (value) => value === '' || /^[A-Za-z]$/.test(value.trim());
  const isValidContact = (value) => /^09\d{9}$/.test(value.trim());
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const isValidDob = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const age = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24 * 365.25));
    return age >= 18;
  };

  const parseServerId = (id) => {
    if (!id) return id;
    if (typeof id === 'number') return id;
    const m = String(id).match(/USR-(\d+)/);
    return m ? Number(m[1]) : Number(id) || null;
  };

  const handleSubmitUser = async (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const contactNumber = form.contactNumber.trim();

    if (!firstName) {
      setNotification('First Name is required.');
      return;
    }
    if (!isValidName(firstName)) {
      setNotification('First Name may contain letters and spaces only.');
      return;
    }
    if (!lastName) {
      setNotification('Last Name is required.');
      return;
    }
    if (!isValidName(lastName)) {
      setNotification('Last Name may contain letters and spaces only.');
      return;
    }
    if (!isValidMiddleInitial(form.middleInitial)) {
      setNotification('Middle Initial must be a single letter.');
      return;
    }
    if (!isValidContact(contactNumber)) {
      setNotification('Contact Number must be 11 digits and start with 09.');
      return;
    }
    if (!email) {
      setNotification('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setNotification('Please enter a valid email address.');
      return;
    }
    const emailExists = users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase() && (!selectedUser || user.id !== selectedUser.id)
    );
    if (emailExists) {
      setNotification('This email is already registered.');
      return;
    }
    if (!form.gender) {
      setNotification('Please select a gender.');
      return;
    }
    if (!isValidDob(form.dob)) {
      setNotification('Please enter a valid date of birth and ensure the user is at least 18 years old.');
      return;
    }
    if (!form.location) {
      setNotification('Please select a location.');
      return;
    }
    if (!form.role) {
      setNotification('Please select a role.');
      return;
    }
    if (!form.password || form.password.length < 8) {
      setNotification('Password must be at least 8 characters.');
      return;
    }

    const fullName = `${firstName}${form.middleInitial.trim() ? ` ${form.middleInitial.trim()}` : ''} ${lastName}`;

    // Try server-side create/update; if it fails, fallback to local mutations
    if (selectedUser) {
      const serverId = parseServerId(selectedUser.id);
      try {
        const res = await fetch(`${API_BASE}/api/users/${serverId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            middleInitial: form.middleInitial.trim() || null,
            contactNumber,
            email,
            gender: form.gender,
            dob: form.dob,
            location: form.location,
            role: form.role,
            status: form.status,
            password: form.password,
          }),
        });
        if (!res.ok) throw new Error('server error');
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? {
          ...u,
          name: `${updated.first_name} ${updated.middle_initial ? updated.middle_initial + ' ' : ''}${updated.last_name}`,
          firstName: updated.first_name,
          lastName: updated.last_name,
          middleInitial: updated.middle_initial,
          contactNumber: updated.contact_number,
          email: updated.email,
          gender: updated.gender,
          dob: updated.dob,
          location: updated.location,
          role: updated.role,
          status: updated.status,
        } : u)));
        setNotification(`Saved changes for ${fullName}.`);
      } catch (e) {
        // fallback local
        setUsers((prev) =>
          prev.map((user) =>
            user.id === selectedUser.id
              ? {
                  ...user,
                  name: fullName,
                  firstName,
                  lastName,
                  middleInitial: form.middleInitial.trim() || null,
                  contactNumber,
                  email,
                  gender: form.gender,
                  dob: form.dob,
                  location: form.location,
                  role: form.role,
                  status: form.status,
                  password: form.password,
                }
              : user
          )
        );
        setNotification(`Saved changes for ${fullName} (local).`);
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            middleInitial: form.middleInitial.trim() || null,
            contactNumber,
            email,
            gender: form.gender,
            dob: form.dob,
            location: form.location,
            role: form.role,
            status: form.status,
            password: form.password,
          }),
        });
        if (!res.ok) throw new Error('server error');
        const data = await res.json();
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
          dob: created.dob,
          location: created.location,
          role: created.role,
          status: created.status,
          password: data.plaintextPassword || form.password,
          name: `${created.first_name} ${created.middle_initial ? created.middle_initial + ' ' : ''}${created.last_name}`,
        };
        setUsers((prev) => [newUser, ...prev]);
        setNotification(`Created ${fullName}.`);
      } catch (e) {
        // fallback local
        const nextId = `USR-${String(users.length + 1).padStart(4, '0')}`;
        setUsers((prev) => [
          {
            id: nextId,
            name: fullName,
            firstName,
            lastName,
            middleInitial: form.middleInitial.trim() || null,
            contactNumber,
            email,
            gender: form.gender,
            dob: form.dob,
            location: form.location,
            role: form.role,
            status: form.status,
            password: form.password,
          },
          ...prev,
        ]);
        setNotification(`Created ${fullName} (local).`);
      }
    }

    closeModal();
    setPage(1);
  };

  const handleSuspendUser = async (id) => {
    // toggle locally
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' }
          : user
      )
    );

    // attempt server update
    try {
      const serverId = parseServerId(id);
      const user = users.find((u) => u.id === id);
      const newStatus = user && user.status === 'Active' ? 'Suspended' : 'Active';
      await fetch(`${API_BASE}/api/users/${serverId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setNotification('User status updated.');
    } catch (e) {
      setNotification('User status updated (local).');
    }
  };

  const requestDeleteUser = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    // optimistic local deletion
    setUsers((prev) => prev.filter((user) => user.id !== id));
    setNotification('User deleted.');
    setConfirmDeleteId(null);

    try {
      const serverId = parseServerId(id);
      await fetch(`${API_BASE}/api/users/${serverId}`, { method: 'DELETE' });
    } catch (e) {
      // failed — keep local deletion but inform
      setNotification('User deleted (local).');
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
    openAddModal,
    closeModal,
    openEditUser,
    handleSubmitUser,
    handleSuspendUser,
    requestDeleteUser,
    confirmDelete,
    cancelDelete,
    setForm,
  };
}
