import React from 'react';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import ModuleSelectionHint from '../../components/ui/ModuleSelectionHint';
import ActivityChart from './components/ActivityChart';
import ActivityReportTable from './components/ActivityReportTable';
import ReportFilters from './components/ReportFilters';
import useReportsPage from './hooks/useReportsPage';
import { exportReportCsv } from './utils/reportUtils.mjs';

export default function ReportsPage() {
  const reports = useReportsPage();
  const {
    selectedCard,
    scopeLevel,
    selectedSchoolId,
    selectedGroupId,
    selectedUserId,
    viewMode,
    schools,
    visibleGroups,
    visibleUsers,
    search,
    dateRangePreset,
    selectedGraphDate,
    page,
    perPage,
    report,
    loading,
    error,
    pageCount,
    start,
    end,
    selectCard,
    changeScopeLevel,
    changeSchool,
    changeGroup,
    changeUser,
    changeSearch,
    changeDateRangePreset,
    setViewMode,
    showGraph,
    selectGraphDate,
    clearGraphDate,
    setPage,
    changePerPage,
  } = reports;
  const dailyActivity = report.dailyActivity || [];
  const hasReportData = viewMode === 'graph'
    ? dailyActivity.some((item) => Number(item.count) > 0)
    : report.activities.length > 0;

  const downloadReport = () => {
    if (viewMode === 'graph') {
      exportReportCsv(dailyActivity, [
        { key: 'date', label: 'Date' },
        { key: 'count', label: 'Login Count' },
      ], 'f1kd-login-graph-data.csv');
      return;
    }
    exportReportCsv(report.activities, [
      { key: 'createdAt', label: 'Date & Time' },
      { key: 'actorName', label: 'User' },
      { key: 'actorEmail', label: 'Email' },
      { key: 'actorRole', label: 'Role' },
      { key: 'action', label: 'Activity' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'entityId', label: 'Entity ID' },
      { key: 'description', label: 'Details' },
    ], 'f1kd-login-table-data.csv');
  };

  return (
    <div className="community-page">
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]}
        actions={selectedCard ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={downloadReport}
            disabled={loading || !hasReportData}
          >
            Download {viewMode === 'graph' ? 'graph data' : 'table page'} CSV
          </button>
        ) : null}
      />
      <p className="reports-intro">
        Review successful user login records by school, group, or individual account. Super Admin accounts and their sign-ins are excluded from report users, totals, charts, and tables. School and group reports use users’ current assignments.
      </p>
      <div data-guide="reports-summary">
        <ModuleSummaryCards
          selected={selectedCard}
          toggleOnSelect
          onSelect={selectCard}
          cards={[
            { key: 'signIns', label: 'User Logins', value: report.counts.signIns, description: 'View login logs', selectedDescription: 'Hide login logs' },
          ]}
        />
      </div>

      {!selectedCard && <ModuleSelectionHint />}
      {selectedCard ? (
        <>
          {error && <div role="alert" className="error-message">{error}</div>}
          <ReportFilters
            scopeLevel={scopeLevel}
            selectedSchoolId={selectedSchoolId}
            selectedGroupId={selectedGroupId}
            selectedUserId={selectedUserId}
            visibleGroups={visibleGroups}
            visibleUsers={visibleUsers}
            schools={schools}
            search={search}
            dateRangePreset={dateRangePreset}
            viewMode={viewMode}
            onScopeLevelChange={changeScopeLevel}
            onSchoolChange={changeSchool}
            onGroupChange={changeGroup}
            onUserChange={changeUser}
            onSearchChange={changeSearch}
            onDateRangeChange={changeDateRangePreset}
            onViewModeChange={setViewMode}
            onShowGraph={showGraph}
          />
          {viewMode === 'graph' ? (
            <ActivityChart
              dailyActivity={dailyActivity}
              onPointSelect={selectGraphDate}
              title={scopeLevel === 'individual' && selectedUserId
                ? 'Individual user logins over time'
                : `${scopeLevel === 'individual' ? 'Individual' : scopeLevel === 'group' ? 'Group' : 'School'} logins over time`}
              ariaLabel={`Daily ${scopeLevel} user login activity`}
              itemLabel="login"
              description={dateRangePreset === 'all' && !selectedGraphDate
                ? 'Daily totals for the past 30 calendar days. Table view retains all matching records.'
                : 'Select a day to view its matching login records.'}
            />
          ) : (
            <ActivityReportTable
              report={report}
              loading={loading}
              selectedGraphDate={selectedGraphDate}
              page={page}
              pageCount={pageCount}
              perPage={perPage}
              start={start}
              end={end}
              onPageChange={setPage}
              onPerPageChange={changePerPage}
              onClearDayFilter={clearGraphDate}
            />
          )}
        </>
      ) : (
        <p className="reports-hint">Select the card to view user login logs.</p>
      )}
    </div>
  );
}
