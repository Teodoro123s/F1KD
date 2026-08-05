import React, { useMemo, useState } from 'react';
import UserManagementTable from './UserManagementTable';
import { SearchIcon, PlusIcon, FilterIcon, UserCheckIcon, UserXIcon } from './UserManagementIcons';

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

export default function UserManagementPage() {
  const [users, setUsers] = useState(initialUsersData);
  const [query, setQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Active');
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const breadcrumbItems = [{ label: 'User Management', clickable: false }];

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = selectedRoleFilter ? user.role === selectedRoleFilter : true;
      const matchesStatus =
        selectedStatusFilter === 'All' ? true : user.status === selectedStatusFilter;
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [query, selectedRoleFilter, selectedStatusFilter, users]);

  const currentFilteredData = filteredData;
  const pageCount = Math.max(1, Math.ceil(currentFilteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = currentFilteredData.slice(currentStart, currentStart + perPage);
  const rangeStart = currentFilteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, currentFilteredData.length);

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const handlePerPageChange = (val) => {
    setPerPage(Number(val));
    setPage(1);
  };

  const toggleDropdown = (event, id) => {
    event.stopPropagation();
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  const toggleRoleFilter = () => {
    setIsRoleFilterOpen((open) => !open);
  };

  const selectRoleFilter = (role) => {
    setSelectedRoleFilter(role);
    setPage(1);
    setIsRoleFilterOpen(false);
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setActiveDropdownId(null);
    // Placeholder: replace with modal or edit page later
    window.alert(`Edit ${user.name}`);
  };

  const handleSuspendUser = (id) => {
    setActiveDropdownId(null);
    const user = users.find((item) => item.id === id);
    if (!user) return;
    window.alert(`Suspend ${user.name}`);
  };

  const handleDeleteUser = (id) => {
    setActiveDropdownId(null);
    const confirmDelete = window.confirm('Are you sure you want to delete this user?');
    if (!confirmDelete) return;
    setUsers((prev) => prev.filter((user) => user.id !== id));
  };

  const renderPaginationButtons = () => {
    const buttons = [];

    buttons.push(
      <button
        key="first"
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
        onClick={() => setPage(1)}
        disabled={currentPage === 1}
        aria-label="First page"
      >
        «
      </button>
    );

    const maxVisible = 5;
    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 3; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
      buttons.push(<span key="el-1" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    } else if (currentPage >= pageCount - 2) {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-2" className="pagination-btn ellipsis">...</span>);
      for (let i = pageCount - 2; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-3" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button key={currentPage} type="button" className="pagination-btn active">
          {currentPage}
        </button>
      );
      buttons.push(<span key="el-4" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    }

    buttons.push(
      <button
        key="last"
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
        onClick={() => setPage(pageCount)}
        disabled={currentPage === pageCount}
        aria-label="Last page"
      >
        »
      </button>
    );

    return buttons;
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>User Management</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={item.label} className="breadcrumb-item">
                {item.clickable ? (
                  <button type="button" className="breadcrumb-link">{item.label}</button>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && <span className="breadcrumb-separator">›</span>}
              </span>
            ))}
          </nav>
        </div>
        <button className="btn-create" type="button">
          <PlusIcon />
          <span>Add User</span>
        </button>
      </header>

      <section className="subheader-row">
        <div className="tabs-list" role="tablist" aria-label="Account status filter">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              role="tab"
              aria-selected={selectedStatusFilter === status}
              type="button"
              className={`tab-btn${selectedStatusFilter === status ? ' active' : ''}`}
              onClick={() => {
                setSelectedStatusFilter(status);
                setPage(1);
              }}
            >
              {status === 'Active' ? <UserCheckIcon /> : <UserXIcon />}
              <span>{status}</span>
            </button>
          ))}
        </div>

        <div className="subheader-right">
          <div className="role-filter-area">
            <button
              type="button"
              className={`role-filter-button${isRoleFilterOpen ? ' open' : ''}`}
              onClick={toggleRoleFilter}
              aria-label="Role filter"
            >
              <FilterIcon />
            </button>
            {isRoleFilterOpen && (
              <div className="role-filter-dropdown" role="menu">
                <button
                  type="button"
                  className={`role-filter-item${selectedRoleFilter === '' ? ' active' : ''}`}
                  onClick={() => selectRoleFilter('')}
                  role="menuitem"
                >
                  All roles
                </button>
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`role-filter-item${selectedRoleFilter === role ? ' active' : ''}`}
                    onClick={() => selectRoleFilter(role)}
                    role="menuitem"
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="search-container">
            <SearchIcon />
            <input
              type="text"
              className="search-input-field"
              placeholder="Search account name or role..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search accounts"
            />
          </div>
        </div>
      </section>

      <UserManagementTable
        currentRows={currentRows}
        filteredDataLength={currentFilteredData.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        renderPaginationButtons={renderPaginationButtons}
        activeDropdownId={activeDropdownId}
        toggleDropdown={toggleDropdown}
        openEditUser={openEditUser}
        handleSuspendUser={handleSuspendUser}
        handleDeleteUser={handleDeleteUser}
      />
    </div>
  );
}
