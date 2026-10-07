import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import UserManagementTable from './UserManagementTable';
import { SearchIcon, PlusIcon, UserCheckIcon, UserXIcon } from './UserManagementIcons';
import AddUserModal from './UserManagementModal';
import { useUserManagement } from './useUserManagement';
import { useAuth } from '../../../../auth/AuthProvider';
import { ROLES, hasRole } from '../../../../utils/permissions';
import RoleFilter from './RoleFilter';
import Pagination from './Pagination';
import ConfirmModal from './ConfirmModal';
import NotificationBanner from './NotificationBanner';
import PageHeader from '../../../../components/ui/PageHeader';
import './user-management.css';

export default function UserManagementPage() {
  const { schoolId, batchId } = useParams();
  const {
    form,
    query,
    selectedStatusFilter,
    selectedRoleFilter,
    selectedSchoolFilter,
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
    suspendLoadingIds,
    deletingId,
    apiOnline,
    retryLoad,
    oneTimeCredentials,
    clearOneTimeCredentials,
    communities,
    groups,
    batches,
  } = useUserManagement({ schoolId, batchId });

  const location = useLocation();
  const auth = useAuth();
  const canCreate = hasRole(auth?.currentUser?.role, [ROLES.SUPER_ADMIN]);
  const selectedBatch = batches.find((batch) => String(batch.id || batch.code) === String(batchId)) || null;
  const batchSchool = selectedBatch
    ? communities.find((community) => community.name === selectedBatch.community) || null
    : null;
  const scopedSchoolId = schoolId || batchSchool?.id || location.state?.schoolId || '';
  const selectedSchool = communities.find((community) => String(community.id) === String(scopedSchoolId)) || null;
  const schoolName = selectedSchool?.name || location.state?.schoolName || selectedBatch?.community || 'School';
  const batchName = selectedBatch?.name || location.state?.batchName || 'Batch';
  const pageTitle = batchId ? `Users in ${batchName}` : schoolId ? `Users at ${schoolName}` : 'User Management';
  const pageBreadcrumbs = batchId
    ? [{ label: 'Schools', href: '/community' }, { label: schoolName, href: `/community/school/${scopedSchoolId}` }, { label: batchName, href: `/community/group/${String(selectedBatch?.groupIds || '').split(',')[0] || ''}` }, { label: 'Users' }]
    : schoolId
    ? [{ label: 'Schools', href: '/community' }, { label: schoolName, href: `/community/school/${schoolId}` }, { label: 'Users' }]
    : breadcrumbItems;

  useEffect(() => {
    // If navigated here with an editUser in state, open edit modal
    if (location?.state?.editUser) {
      openEditUser(location.state.editUser);
      // replace history state to avoid reopening
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  return (
    <div className="community-page user-management-page">
      <NotificationBanner message={notification} actionLabel={!apiOnline ? 'Retry' : null} onAction={!apiOnline ? retryLoad : null} />

      <PageHeader
        title={pageTitle}
        breadcrumbs={pageBreadcrumbs}
        actions={
          <button className="view-btn view-btn--primary module-create-button" type="button" onClick={openAddModal} disabled={!canCreate}>
            <PlusIcon />
            <span>{canCreate ? 'Add User' : 'Add User (requires Admin)'}</span>
          </button>
        }
      />

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
          <RoleFilter
            options={[
              ...communities.map((school) => ({ value: String(school.id), label: school.name })),
              { value: '__unassigned__', label: 'Unassigned' },
            ]}
            selected={selectedSchoolFilter}
            onSelect={selectSchoolFilter}
            filterLabel="School"
            allLabel="All schools"
          />

          <div className="search-container">
            <SearchIcon />
            <div className="search-field-container">
              <input
                type="text"
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Search account name or role..."
                className="search-input-field"
                aria-label="Search users"
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
        communities={communities}
        groups={groups}
        mode={selectedUser ? 'edit' : 'add'}
        isSubmitting={isSubmitting}
        notification={notification}
      />

      {oneTimeCredentials && (
        <div className="one-time-credentials">
          <div className="one-time-credentials-header">
            <h3>{oneTimeCredentials.emailSent ? 'Temporary access emailed' : 'Email delivery failed'}</h3>
            <span>{oneTimeCredentials.emailSent ? 'The temporary password was sent to this address.' : 'The account exists, but the password email was not confirmed. Retry sending credentials.'}</span>
          </div>
          <div className="cred-row">
            <div><strong>Email:</strong> {oneTimeCredentials.email}</div>
          </div>
          <div className="cred-actions">
            {!oneTimeCredentials.emailSent && (
              <button type="button" className="btn-secondary" onClick={resendCredentials} disabled={isResendingCredentials}>
                {isResendingCredentials ? 'Sending...' : 'Resend credentials'}
              </button>
            )}
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
