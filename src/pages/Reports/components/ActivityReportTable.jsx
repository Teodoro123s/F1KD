import React, { useMemo } from 'react';
import CommunityTable from '../../Community/CommunityTable';
import CommunityPagination from '../../Community/components/CommunityPagination';
import { formatReportAction, formatReportDate } from '../utils/reportUtils.mjs';

export default function ActivityReportTable({
  report,
  loading,
  selectedGraphDate,
  page,
  pageCount,
  perPage,
  start,
  end,
  onPageChange,
  onPerPageChange,
  onClearDayFilter,
}) {
  const columns = useMemo(() => [
    {
      key: 'createdAt',
      header: 'Date & time',
      className: 'reports-date-cell',
      renderCell: (row) => {
        const formatted = formatReportDate(row.createdAt);
        if (formatted === '—') return formatted;
        return (
          <time className="reports-timestamp" dateTime={formatted.iso}>
            <span>{formatted.date}</span>
            <span>{formatted.time}</span>
          </time>
        );
      },
      style: { width: '16%' },
    },
    {
      key: 'actor',
      header: 'User',
      style: { width: '28%' },
      renderCell: (row) => (
        <div className="reports-login-user">
          <strong>{row.actorName || 'Unknown user'}</strong>
          {row.actorEmail && <div className="report-muted reports-login-user-email">{row.actorEmail}</div>}
        </div>
      ),
    },
    { key: 'actorRole', header: 'Role', style: { width: '17%' } },
    {
      key: 'action',
      header: 'Activity',
      style: { width: '16%' },
      renderCell: (row) => formatReportAction(row.action),
    },
    { key: 'description', header: 'Details', style: { width: '23%' } },
  ], []);

  return (
    <>
      {selectedGraphDate && (
        <div className="reports-day-filter" role="status">
          <span>
            Showing activity for {new Date(`${selectedGraphDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </span>
          <button type="button" onClick={onClearDayFilter}>
            Clear day filter
          </button>
        </div>
      )}
      <div className="reports-table-wrap" data-guide="reports-results">
        <CommunityTable
          columns={columns}
          data={report.activities}
          rowKey="id"
          tableClassName="reports-login-table"
          tableTitle={loading ? 'Loading login logs…' : 'User login report'}
          emptyMessage={loading ? 'Loading login logs…' : 'No login records found for these filters.'}
        />
      </div>
      <CommunityPagination
        currentPage={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        perPage={perPage}
        onPerPageChange={onPerPageChange}
        rangeStart={start}
        rangeEnd={end}
        totalItems={report.total}
      />
    </>
  );
}
