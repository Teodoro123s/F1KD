import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { apiGetSchoolPerformanceDetails, apiGetSchoolPerformanceReport } from '../../api/reports';
import { exportReportCsv } from './utils/reportUtils.mjs';
import './SchoolPerformancePage.css';

const percentage = (completed, expected) => (
  expected > 0 ? `${Math.min(100, Math.round((completed / expected) * 100))}%` : '—'
);
const percentageValue = (completed, expected) => (
  expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0
);

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
const formatMonth = (month) => {
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? month
    : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
};

function getSchoolStatus(school) {
  const expected = school.monitoring.mothers.expectedVisits + school.monitoring.children.expectedVisits;
  const complete = school.monitoring.mothers.completeForms + school.monitoring.children.completeForms;
  const unscheduled = school.monitoring.mothers.unscheduledBeneficiaries
    + school.monitoring.children.unscheduledBeneficiaries;
  if (expected === 0) return unscheduled > 0 ? 'schedule' : 'no-due';
  if (complete < expected) return 'attention';
  if (unscheduled > 0) return 'schedule';
  return 'complete';
}

function CheckupSummary({ summary, beneficiaryLabel }) {
  const progress = percentageValue(summary.completeForms, summary.expectedVisits);
  if (summary.expectedVisits === 0) {
    return (
      <div className="school-performance-checkup">
        <strong className="school-performance-no-due">No check-ups due</strong>
      </div>
    );
  }

  return (
    <div className="school-performance-checkup">
      <small>{summary.beneficiariesDue} {beneficiaryLabel} due</small>
      <strong>{summary.recordedVisits}/{summary.expectedVisits} forms entered</strong>
      <span>{summary.completeForms}/{summary.expectedVisits} with complete data</span>
      <div
        className="school-performance-progress"
        role="progressbar"
        aria-label={`${progress}% ${beneficiaryLabel} check-up data completeness`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function SchoolDetailsTable({ title, rows, emptyMessage, beneficiaryType }) {
  return (
    <section className="school-performance-detail-section">
      <h3>{title}</h3>
      <div className="school-performance-table-wrap school-performance-details-table-wrap">
        <table className="data-table school-performance-details-table">
          <thead>
            <tr>
              <th>Beneficiary</th>
              <th>Check-up</th>
              <th>Due date</th>
              <th>Form status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={`${row.beneficiaryId}-${row.visit}`}>
                <td>
                  {row.beneficiaryId != null ? (
                    <Link
                      className="school-performance-beneficiary-link"
                      to="/monitoring"
                      state={{
                        ...(beneficiaryType === 'mother'
                          ? { mother: { id: row.beneficiaryId, name: row.beneficiaryName } }
                          : { child: { id: row.beneficiaryId, name: row.beneficiaryName } }),
                        returnTo: '/school-performance',
                      }}
                      aria-label={`Open ${beneficiaryType} monitoring for ${row.beneficiaryName}`}
                    >
                      {row.beneficiaryName}
                    </Link>
                  ) : row.beneficiaryName}
                </td>
                <td>{row.visit}</td>
                <td>{row.dueDate}</td>
                <td>
                  <span className={`school-performance-detail-status school-performance-detail-status--${row.status}`}>
                    {row.status === 'not-entered' ? 'Not entered' : row.status === 'incomplete' ? 'Incomplete' : 'Complete'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td className="no-data" colSpan={4}>{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchoolMonitoringDetails({ schoolId, schoolName, month }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [activeBeneficiaryType, setActiveBeneficiaryType] = useState('mothers');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetSchoolPerformanceDetails(schoolId, month)
      .then((response) => {
        if (
          response?.month !== month
          || !Array.isArray(response?.mothers?.due)
          || !Array.isArray(response?.children?.due)
        ) {
          throw new Error('School monitoring details returned an unexpected response.');
        }
        if (active) setDetails(response);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load school monitoring details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [schoolId, month, retry]);

  if (loading) return <p className="school-performance-detail-state" role="status">Loading monitoring details…</p>;
  if (error) {
    return (
      <div className="school-performance-detail-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn-secondary" onClick={() => setRetry((current) => current + 1)}>Retry</button>
      </div>
    );
  }

  return (
    <div className="school-performance-details">
      <h3 className="school-performance-details-title">
        {schoolName} — {formatMonth(month)} monitoring details
      </h3>
      <div className="school-performance-detail-toggle" role="group" aria-label="Beneficiary type">
        <button
          type="button"
          className={activeBeneficiaryType === 'mothers' ? 'is-active' : ''}
          aria-pressed={activeBeneficiaryType === 'mothers'}
          onClick={() => setActiveBeneficiaryType('mothers')}
        >
          Mothers ({details.mothers.due.length})
        </button>
        <button
          type="button"
          className={activeBeneficiaryType === 'children' ? 'is-active' : ''}
          aria-pressed={activeBeneficiaryType === 'children'}
          onClick={() => setActiveBeneficiaryType('children')}
        >
          Children ({details.children.due.length})
        </button>
      </div>
      {activeBeneficiaryType === 'mothers' ? (
        <SchoolDetailsTable
          title={`Maternal check-ups due (${details.mothers.due.length})`}
          rows={details.mothers.due}
          emptyMessage="No maternal check-ups are due this month."
          beneficiaryType="mother"
        />
      ) : (
        <SchoolDetailsTable
          title={`Child check-ups due (${details.children.due.length})`}
          rows={details.children.due}
          emptyMessage="No child check-ups are due this month."
          beneficiaryType="child"
        />
      )}
    </div>
  );
}

function TableSection({
  title,
  description,
  rows,
  columns,
  csvFields,
  filename,
  emptyMessage,
  expandedRowId,
  renderExpandedRow,
}) {
  return (
    <section className="school-performance-section">
      <div className="school-performance-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => exportReportCsv(rows, csvFields, filename)}
          disabled={!rows.length}
        >
          Download CSV
        </button>
      </div>
      <div className="school-performance-table-wrap">
        <table className="data-table school-performance-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr>
                  {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
                </tr>
                {expandedRowId === String(row.id) && renderExpandedRow && (
                  <tr className="school-performance-expanded-row">
                    <td colSpan={columns.length}>{renderExpandedRow(row)}</td>
                  </tr>
                )}
              </React.Fragment>
            )) : (
              <tr><td className="no-data" colSpan={columns.length}>{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SchoolPerformancePage() {
  const location = useLocation();
  const requestedMonth = location.state?.month;
  const initialMonth = typeof requestedMonth === 'string'
    && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    && requestedMonth <= getCurrentMonth()
    ? requestedMonth
    : getCurrentMonth();
  const [schools, setSchools] = useState([]);
  const [expandedSchoolId, setExpandedSchoolId] = useState(
    () => location.state?.schoolId == null ? null : String(location.state.schoolId),
  );
  const [month, setMonth] = useState(initialMonth);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetSchoolPerformanceReport(month)
      .then((response) => {
        if (typeof response?.month !== 'string' || !Array.isArray(response?.schools)) {
          throw new Error('The school performance report returned an unexpected response.');
        }
        if (active) setSchools(response.schools);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load school performance report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [month, retry]);

  const visibleSchools = useMemo(() => {
    const query = search.trim().toLowerCase();
    return schools.filter((school) => (
      !query || `${school.name} ${school.organizerName}`.toLowerCase().includes(query)
    ));
  }, [schools, search]);

  const monitoringRows = visibleSchools.map((school) => ({
    ...school,
    status: getSchoolStatus(school),
    motherFormEntryRate: percentage(
      school.monitoring.mothers.recordedVisits,
      school.monitoring.mothers.expectedVisits,
    ),
    motherFormCompleteness: percentage(
      school.monitoring.mothers.completeForms,
      school.monitoring.mothers.expectedVisits,
    ),
    childFormEntryRate: percentage(
      school.monitoring.children.recordedVisits,
      school.monitoring.children.expectedVisits,
    ),
    childFormCompleteness: percentage(
      school.monitoring.children.completeForms,
      school.monitoring.children.expectedVisits,
    ),
  }));
  const sortedMonitoringRows = monitoringRows.sort((left, right) => {
    const priority = { attention: 0, schedule: 1, 'no-due': 2, complete: 3 };
    return priority[left.status] - priority[right.status] || left.name.localeCompare(right.name);
  });
  const monitoringCsvFields = [
    { key: 'month', label: 'Month' },
    { key: 'name', label: 'School' },
    { key: 'organizerName', label: 'Community Organizer' },
    { key: 'schoolStatus', label: 'Status' },
    { key: 'motherBeneficiaries', label: 'Mothers' },
    { key: 'motherBeneficiariesDue', label: 'Mothers With Visits Due' },
    { key: 'motherUnscheduledBeneficiaries', label: 'Mothers Without Schedule Dates' },
    { key: 'motherExpectedVisits', label: 'Mother Check-ups Expected' },
    { key: 'motherRecordedVisits', label: 'Mother Forms Recorded' },
    { key: 'motherFormEntryRate', label: 'Mother Form Entry Rate' },
    { key: 'motherCompletedVisits', label: 'Mother Check-ups Completed' },
    { key: 'motherCompleteForms', label: 'Mother Forms Complete' },
    { key: 'motherFormCompleteness', label: 'Mother Data Completeness vs Expected' },
    { key: 'childBeneficiaries', label: 'Children' },
    { key: 'childBeneficiariesDue', label: 'Children With Visits Due' },
    { key: 'childUnscheduledBeneficiaries', label: 'Children Without Schedule Dates' },
    { key: 'childExpectedVisits', label: 'Child Check-ups Expected' },
    { key: 'childRecordedVisits', label: 'Child Forms Recorded' },
    { key: 'childFormEntryRate', label: 'Child Form Entry Rate' },
    { key: 'childCompletedVisits', label: 'Child Check-ups Completed' },
    { key: 'childCompleteForms', label: 'Child Forms Complete' },
    { key: 'childFormCompleteness', label: 'Child Data Completeness vs Expected' },
  ];
  const monitoringExportRows = sortedMonitoringRows.map((school) => ({
    ...school,
    month,
    schoolStatus: school.status === 'attention'
      ? 'Needs attention'
      : school.status === 'schedule'
        ? 'Schedule data needed'
        : school.status === 'complete'
          ? 'Complete'
          : 'No check-ups due',
    motherBeneficiaries: school.monitoring.mothers.beneficiaries,
    motherBeneficiariesDue: school.monitoring.mothers.beneficiariesDue,
    motherUnscheduledBeneficiaries: school.monitoring.mothers.unscheduledBeneficiaries,
    motherExpectedVisits: school.monitoring.mothers.expectedVisits,
    motherRecordedVisits: school.monitoring.mothers.recordedVisits,
    motherFormEntryRate: school.motherFormEntryRate,
    motherCompletedVisits: school.monitoring.mothers.completedVisits,
    motherCompleteForms: school.monitoring.mothers.completeForms,
    motherFormCompleteness: school.motherFormCompleteness,
    childBeneficiaries: school.monitoring.children.beneficiaries,
    childBeneficiariesDue: school.monitoring.children.beneficiariesDue,
    childUnscheduledBeneficiaries: school.monitoring.children.unscheduledBeneficiaries,
    childExpectedVisits: school.monitoring.children.expectedVisits,
    childRecordedVisits: school.monitoring.children.recordedVisits,
    childFormEntryRate: school.childFormEntryRate,
    childCompletedVisits: school.monitoring.children.completedVisits,
    childCompleteForms: school.monitoring.children.completeForms,
    childFormCompleteness: school.childFormCompleteness,
  }));
  const baseColumns = [
    {
      key: 'name',
      label: 'School',
      render: (school) => (
        <div className="school-performance-school-cell">
          <strong>{school.name}</strong>
          <button
            type="button"
            className="school-performance-details-toggle"
            aria-expanded={expandedSchoolId === String(school.id)}
            onClick={() => setExpandedSchoolId((current) => (
              current === String(school.id) ? null : String(school.id)
            ))}
          >
            {expandedSchoolId === String(school.id) ? 'Hide details' : 'View details'}
          </button>
        </div>
      ),
    },
    { key: 'organizer', label: 'Community Organizer', render: (school) => school.organizerName || 'Not assigned' },
  ];

  return (
    <div className="community-page school-performance-page">
      <PageHeader
        title="School Performance"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'School Performance' }]}
        actions={(
          <button type="button" className="btn-secondary" onClick={() => setRetry((current) => current + 1)} disabled={loading}>
            Refresh report
          </button>
        )}
      />

      <section
        className="school-performance-filters"
        aria-label="Beneficiary monitoring report filters"
      >
        <label>
          <span>Monitoring month</span>
          <input
            type="month"
            value={month}
            max={getCurrentMonth()}
            onChange={(event) => {
              setMonth(event.target.value || getCurrentMonth());
              setExpandedSchoolId(null);
            }}
          />
        </label>
        <label>
          <span>Search school or organizer</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Type a name"
          />
        </label>
      </section>

      {error && (
        <div className="error-message" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={() => setRetry((current) => current + 1)}>Retry</button>
        </div>
      )}
      {loading ? <p className="school-performance-state" role="status">Loading school performance data…</p> : !error && (
        <div className="school-performance-content">
          <TableSection
            title={`Monthly check-up completeness — ${formatMonth(month)}`}
            description={`Expected forms are check-ups scheduled for beneficiaries in ${formatMonth(month)}${getCurrentMonth() === month ? ' through today' : ''}, not every active beneficiary. A form is complete when its required date and health data are present.`}
            rows={monitoringExportRows}
            csvFields={monitoringCsvFields}
            filename="school-monitoring-completeness.csv"
            emptyMessage="No schools match the selected filters."
            expandedRowId={expandedSchoolId}
            renderExpandedRow={(school) => (
              <SchoolMonitoringDetails schoolId={school.id} schoolName={school.name} month={month} />
            )}
            columns={[
              ...baseColumns,
              {
                key: 'mothers',
                label: 'Maternal check-ups',
                render: (school) => <CheckupSummary summary={school.monitoring.mothers} beneficiaryLabel="mothers" />,
              },
              {
                key: 'children',
                label: 'Child check-ups',
                render: (school) => <CheckupSummary summary={school.monitoring.children} beneficiaryLabel="children" />,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
