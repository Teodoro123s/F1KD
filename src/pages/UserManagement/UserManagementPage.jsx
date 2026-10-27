import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import UserManagementTable from './UserManagementTable';
import { PlusIcon } from './UserManagementIcons';
import AddUserModal from './UserManagementModal';
import { useUserManagement } from './useUserManagement';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES, hasRole, isHealthWorkerRole, normalizeRole } from '../../utils/permissions';
import RoleFilter from './RoleFilter';
import Pagination from './Pagination';
import ConfirmModal from './ConfirmModal';
import NotificationBanner from './NotificationBanner';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';

export default function UserManagementPage() {
  const { schoolId, batchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const organizerHealthWorkerScope = hasRole(auth?.currentUser?.role, [ROLES.COMMUNITY_COORDINATOR]);
  const organizerSchoolId = auth?.currentUser?.school_id ?? auth?.currentUser?.schoolId ?? '';
  const {
    form,
    query,
    users,
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
    usersLoading,
    usersLoadError,
    breadcrumbItems,
    ROLE_OPTIONS,
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
    suspendLoadingIds,
    deletingId,
    apiOnline,
    retryLoad,
    oneTimeCredentials,
    clearOneTimeCredentials,
    communities,
    groups,
    batches,
  } = useUserManagement({
    schoolId: organizerHealthWorkerScope ? organizerSchoolId : schoolId,
    batchId: organizerHealthWorkerScope ? '' : batchId,
    healthWorkerManagement: organizerHealthWorkerScope,
  });

  const canCreate = hasRole(auth?.currentUser?.role, [ROLES.SUPER_ADMIN])
    || (organizerHealthWorkerScope && Boolean(organizerSchoolId));
  const [copyNotice, setCopyNotice] = useState('');
  const [selectedSummaryCard, setSelectedSummaryCard] = useState(organizerHealthWorkerScope ? 'all' : null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const selectedBatch = batches.find((batch) => String(batch.id || batch.code) === String(batchId)) || null;
  const batchSchool = selectedBatch
    ? communities.find((community) => community.name === selectedBatch.community) || null
    : null;
  const scopedSchoolId = schoolId || batchSchool?.id || location.state?.schoolId || '';
  const selectedSchool = communities.find((community) => String(community.id) === String(scopedSchoolId)) || null;
  const schoolName = selectedSchool?.name || location.state?.schoolName || selectedBatch?.community || 'School';
  const batchName = selectedBatch?.name || location.state?.batchName || 'Batch';
  const pageTitle = organizerHealthWorkerScope
    ? 'User Management'
    : batchId ? `Users in ${batchName}` : schoolId ? `Users at ${schoolName}` : 'User Management';
  const pageBreadcrumbs = organizerHealthWorkerScope
    ? [{ label: 'Community', href: '/community' }, { label: 'User Management' }]
    : batchId
    ? [{ label: 'Schools', href: '/community' }, { label: schoolName, href: `/community/school/${scopedSchoolId}` }, { label: batchName, href: `/community/group/${String(selectedBatch?.groupIds || '').split(',')[0] || ''}` }, { label: 'Users' }]
    : schoolId
    ? [{ label: 'Schools', href: '/community' }, { label: schoolName, href: `/community/school/${schoolId}` }, { label: 'Users' }]
    : breadcrumbItems;
  const countedUsers = organizerHealthWorkerScope
    ? users.filter((user) => isHealthWorkerRole(user.role))
    : users.filter((user) => normalizeRole(user.role) !== ROLES.SUPER_ADMIN);
  const userStatusCounts = {
    all: countedUsers.length,
    active: countedUsers.filter((user) => user.status === 'Active').length,
    suspended: countedUsers.filter((user) => user.status === 'Suspended').length,
  };
  useEffect(() => {
    if (!copyNotice) return undefined;
    const timer = window.setTimeout(() => setCopyNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [copyNotice]);

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
      <NotificationBanner
        message={notification}
        actionLabel={!apiOnline || usersLoadError ? 'Retry' : null}
        onAction={!apiOnline || usersLoadError ? retryLoad : null}
      />

      <PageHeader
        title={pageTitle}
        breadcrumbs={pageBreadcrumbs}
        actions={
          <button className="view-btn view-btn--primary module-create-button" type="button" onClick={openAddModal} disabled={!canCreate}>
            <PlusIcon />
            <span>{organizerHealthWorkerScope ? 'Add Health Worker' : canCreate ? 'Add User' : 'Add User (requires Admin)'}</span>
          </button>
        }
      />

      <ModuleSummaryCards
        selected={selectedSummaryCard}
        toggleOnSelect={!organizerHealthWorkerScope}
        onSelect={(key) => {
          setSelectedSummaryCard(key);
          setStatusFilter(key ? key === 'all' ? 'All' : key === 'active' ? 'Active' : 'Suspended' : 'All');
        }}
        cards={[
          {
            key: 'all',
            label: 'Total Accounts',
            value: organizerHealthWorkerScope && (usersLoading || usersLoadError) ? '—' : userStatusCounts.all,
            description: 'View list',
          },
          {
            key: 'active',
            label: 'Active Accounts',
            value: organizerHealthWorkerScope && (usersLoading || usersLoadError) ? '—' : userStatusCounts.active,
            description: 'View list',
          },
          {
            key: 'suspended',
            label: 'Suspended Accounts',
            value: organizerHealthWorkerScope && (usersLoading || usersLoadError) ? '—' : userStatusCounts.suspended,
            description: 'View list',
          },
        ]}
      />

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
        managedHealthWorker={organizerHealthWorkerScope}
      />

      {oneTimeCredentials && (
        <div className="one-time-credentials">
          <div className="one-time-credentials-header">
            <h3>{oneTimeCredentials.emailSent ? 'Credentials sent' : 'Email could not be sent'}</h3>
            <span>{oneTimeCredentials.emailSent ? 'The account details were emailed.' : 'Share the temporary password securely.'}</span>
          </div>
          <div className="cred-row">
            <div><strong>Email:</strong> {oneTimeCredentials.email}</div>
            {oneTimeCredentials.password && <div><strong>Temporary password:</strong> <code>{oneTimeCredentials.password}</code></div>}
          </div>
          <div className="cred-actions">
            {oneTimeCredentials.password && (
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(oneTimeCredentials.password);
                  }
                  setCopyNotice('Password copied to clipboard.');
                }}
              >
                Copy password
              </button>
            )}
            <button type="button" className="btn-primary" onClick={clearOneTimeCredentials}>Dismiss</button>
          </div>
        </div>
      )}

      {copyNotice && (
        <div className="inline-toast" role="status" aria-live="polite">{copyNotice}</div>
      )}

      {(organizerHealthWorkerScope || selectedSummaryCard) && (
        <>
      <UserManagementTable
        currentRows={currentRows}
        onRowClick={(row) => navigate(`/user-management/user/${encodeURIComponent(row.id)}`, { state: { user: row } })}
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
        allowDelete={!organizerHealthWorkerScope}
        showGroup={organizerHealthWorkerScope}
        healthWorkerManagement={organizerHealthWorkerScope}
        statusFilter={selectedStatusFilter}
        onStatusFilterChange={(status) => {
          setStatusFilter(status);
          setSelectedSummaryCard(status.toLowerCase());
        }}
        onClearFilters={() => {
          handleSearch('');
          setStatusFilter('All');
          setSelectedSummaryCard('all');
        }}
        onRequestStatusChange={organizerHealthWorkerScope ? setPendingStatusChange : undefined}
        loading={organizerHealthWorkerScope && usersLoading}
        loadError={organizerHealthWorkerScope ? usersLoadError : ''}
        groups={groups}
        searchValue={query}
        onSearchChange={handleSearch}
        toolbarActions={!organizerHealthWorkerScope && (
          <div className="user-summary-filters" aria-label="Additional user filters">
            <RoleFilter
              options={ROLE_OPTIONS}
              selected={selectedRoleFilter}
              onSelect={selectRoleFilter}
            />
            {!schoolId && !batchId && (
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
            )}
          </div>
        )}
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
        </>
      )}

      <ConfirmModal
        show={!organizerHealthWorkerScope && Boolean(confirmDeleteId)}
        message="Are you sure you want to delete this user?"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <ConfirmModal
        show={organizerHealthWorkerScope && Boolean(pendingStatusChange)}
        title={pendingStatusChange?.status === 'Suspended' ? 'Reactivate Health Worker' : 'Suspend Health Worker'}
        message={pendingStatusChange?.status === 'Suspended'
          ? `Reactivate ${pendingStatusChange?.name || 'this Health Worker'}? They will be able to sign in again.`
          : `Suspend ${pendingStatusChange?.name || 'this Health Worker'}? They will no longer be able to sign in.`}
        confirmLabel={pendingStatusChange?.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
        variant={pendingStatusChange?.status === 'Suspended' ? 'primary' : 'destructive'}
        onConfirm={async () => {
          if (!pendingStatusChange) return;
          await handleSuspendUser(pendingStatusChange.id);
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}
