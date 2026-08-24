import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import UserManagementTable from './UserManagementTable';
import { SearchIcon, PlusIcon, UserCheckIcon, UserXIcon } from './UserManagementIcons';
import AddUserModal from './UserManagementModal';
import { useUserManagement } from './useUserManagement';
import { useAuth } from '../../auth/AuthProvider';
import RoleFilter from './RoleFilter';
import Pagination from './Pagination';
import ConfirmModal from './ConfirmModal';
import NotificationBanner from './NotificationBanner';

export default function UserManagementPage() {
  const {
    form,
    query,
    selectedStatusFilter,
    selectedRoleFilter,
    showAddModal,
    page,
    perPage,
    currentPage,
    selectedUser,
    notification,
    confirmDeleteId,
    currentRows,
    rangeStart,
    rangeEnd,
    pageCount,
    filteredData,
    breadcrumbItems,
    ROLE_OPTIONS,
    STATUS_OPTIONS,
    handleSearch,
    setStatusFilter,
    selectRoleFilter,
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
    suspendLoadingIds,
    deletingId,
    apiOnline,
    retryLoad,
    oneTimeCredentials,
    clearOneTimeCredentials,
  } = useUserManagement();

  const location = useLocation();
  const auth = useAuth();
  const canCreate = auth?.currentUser && ['Superadmin','Admin'].includes(auth.currentUser.role);

  useEffect(() => {
    // If navigated here with an editUser in state, open edit modal
    if (location?.state?.editUser) {
      openEditUser(location.state.editUser);
      // replace history state to avoid reopening
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  return (
    <div className="community-page">
      <NotificationBanner message={notification} actionLabel={!apiOnline ? 'Retry' : null} onAction={!apiOnline ? retryLoad : null} />

      <header className="community-header">
        <div className="community-title-section">
          <h1>User Management</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={item.label} className="breadcrumb-item">
                <span className="breadcrumb-current">{item.label}</span>
                {index < breadcrumbItems.length - 1 && (
                  <span className="breadcrumb-separator">›</span>
                )}
              </span>
            ))}
          </nav>
        </div>
        <button className="btn-create-action" type="button" onClick={openAddModal} disabled={!canCreate}>
          <PlusIcon />
          <span>{canCreate ? 'Add User' : 'Add User (requires Admin)'}</span>
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
              onClick={() => setStatusFilter(status)}
            >
              {status === 'Active' ? <UserCheckIcon /> : <UserXIcon />}
              <span>{status}</span>
            </button>
          ))}
        </div>

        <div className="subheader-right">
          <RoleFilter
            options={ROLE_OPTIONS}
            selected={selectedRoleFilter}
            onSelect={selectRoleFilter}
          />

          <div className="search-container">
            <div className="search-field-container">
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
        </div>
      </section>

      <AddUserModal
        showModal={showAddModal}
        onClose={closeModal}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmitUser}
        roleOptions={ROLE_OPTIONS}
        mode={selectedUser ? 'edit' : 'add'}
        isSubmitting={isSubmitting}
      />

      {oneTimeCredentials && (
        <div className="one-time-credentials">
          <h3>One-time credentials (development)</h3>
          <p>Please copy these credentials now. They will not be shown again.</p>
          <div className="cred-row">
            <div><strong>Email:</strong> {oneTimeCredentials.email}</div>
            <div><strong>Password:</strong> <code>{oneTimeCredentials.password}</code></div>
          </div>
          <div className="cred-actions">
            <button type="button" className="btn-secondary" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(oneTimeCredentials.password); alert('Password copied to clipboard'); }}>Copy password</button>
            <button type="button" className="btn-primary" onClick={clearOneTimeCredentials}>Dismiss</button>
          </div>
        </div>
      )}

      <UserManagementTable
        currentRows={currentRows}
        filteredDataLength={filteredData.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        currentPage={currentPage}
        pageCount={pageCount}
        onChangePage={handlePageChange}
        openEditUser={openEditUser}
        handleSuspendUser={handleSuspendUser}
        handleDeleteUser={requestDeleteUser}
        suspendLoadingIds={suspendLoadingIds}
        deletingId={deletingId}
      />

      <Pagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={filteredData.length}
      />

      <ConfirmModal
        show={Boolean(confirmDeleteId)}
        message="Are you sure you want to delete this user?"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
