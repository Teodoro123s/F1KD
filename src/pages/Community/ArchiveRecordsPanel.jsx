import React, { useEffect, useRef, useState } from 'react';
import { apiGetArchiveActivity, apiGetArchivedRecords, apiRestoreArchivedRecord } from '../../api/archives';
import { notifyAction } from '../../components/ActionFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import './archive-records.css';

const TYPE_LABELS = {
  school: 'Schools',
  group: 'Groups',
  batch: 'Batches',
  mother: 'Mothers',
  child: 'Children',
};
const TYPE_SINGULAR_LABELS = {
  school: 'School',
  group: 'Group',
  batch: 'Batch',
  mother: 'Mother',
  child: 'Child',
};

export default function ArchiveRecordsPanel({ types, view, onChanged }) {
  const [type, setType] = useState(types[0] || 'group');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingRestore, setPendingRestore] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [limit, setLimit] = useState(20);
  const requestIdRef = useRef(0);
  const activityRequestIdRef = useRef(0);

  useEffect(() => {
    if (!types.includes(type)) setType(types[0] || 'group');
  }, [type, types]);

  useEffect(() => {
    setPage(1);
  }, [view]);

  useEffect(() => {
    if (view !== 'records') return undefined;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiGetArchivedRecords(type, { search, page, limit });
        if (requestId !== requestIdRef.current) return;
        setRecords(response.records || []);
        setTotal(Number(response.total || 0));
      } catch (requestError) {
        if (requestId === requestIdRef.current) {
          setError(requestError?.message || 'Unable to load archived records.');
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [limit, page, search, type, view]);

  useEffect(() => {
    if (view !== 'activity') return undefined;
    const requestId = ++activityRequestIdRef.current;
    setActivityLoading(true);
    setActivityError('');
    apiGetArchiveActivity({ page, limit })
      .then((response) => {
        if (requestId !== activityRequestIdRef.current) return;
        setActivities(response.activities || []);
        setActivityTotal(Number(response.total || 0));
      })
      .catch((requestError) => {
        if (requestId === activityRequestIdRef.current) {
          setActivityError(requestError?.message || 'Unable to load archive activity.');
        }
      })
      .finally(() => {
        if (requestId === activityRequestIdRef.current) setActivityLoading(false);
      });
    return () => { activityRequestIdRef.current += 1; };
  }, [limit, page, view]);

  const restore = async () => {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await apiRestoreArchivedRecord(type, pendingRestore.id);
      setPendingRestore(null);
      setPage((current) => Math.max(1, current - (records.length === 1 && current > 1 ? 1 : 0)));
      await onChanged?.();
      notifyAction(`${TYPE_SINGULAR_LABELS[type]} restored successfully.`);
      requestIdRef.current += 1;
      setRecords((current) => current.filter((record) => String(record.id) !== String(pendingRestore.id)));
      setTotal((current) => Math.max(0, current - 1));
    } catch (restoreError) {
      notifyAction(restoreError?.message || 'Unable to restore record.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const activityPageCount = Math.max(1, Math.ceil(activityTotal / limit));

  return (
    <>
    <section className="table-card archive-records-panel" aria-label={view === 'records' ? 'Archived records' : 'Archive activity'} data-guide="archive-results">
      <div className="archive-records-toolbar">
        <div className="community-table-title">Archive management</div>
        {view === 'records' && (
          <div className="archive-records-controls">
            {types.length > 1 && (
              <label>
                <span className="sr-only">Record type</span>
                <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                  {types.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}
                </select>
              </label>
            )}
            <label className="archive-records-search">
              <span className="sr-only">Search archived records</span>
              <input
                type="search"
                value={search}
                placeholder="Search archived records"
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
          </div>
        )}
      </div>
      {view === 'records' ? (
        <>
          {error && <p className="error-message" role="alert">{error}</p>}
          {loading ? (
            <p className="archive-records-state" role="status">Loading archived records…</p>
          ) : (
            <>
              <div className="table-overflow" role="region" aria-label="Scrollable table" tabIndex={0}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Record</th>
                      <th scope="col">Archived date</th>
                      <th scope="col">Archived by</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length ? records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.name || record.code || `Record ${record.id}`}</td>
                        <td>{record.archived_at ? new Date(record.archived_at).toLocaleString() : '—'}</td>
                        <td>{record.archived_by || '—'}</td>
                        <td>{record.archive_reason || '—'}</td>
                        <td>
                          <button type="button" className="btn-secondary" onClick={() => setPendingRestore(record)}>
                            Restore
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="no-data">No archived records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {activityError && <p className="error-message" role="alert">{activityError}</p>}
          {activityLoading ? (
            <p className="archive-records-state" role="status">Loading archive activity…</p>
          ) : (
            <>
              <div className="table-overflow" role="region" aria-label="Scrollable table" tabIndex={0}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Action</th>
                      <th scope="col">Record type</th>
                      <th scope="col">Performed by</th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length ? activities.map((activity) => (
                      <tr key={activity.id}>
                        <td>{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : '—'}</td>
                        <td>{activity.action}</td>
                        <td>{activity.entityType}</td>
                        <td>{activity.actorName || '—'}</td>
                        <td>{activity.reason || '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="no-data">No archive activity found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
    {view === 'records' && !loading ? (
      <Pagination
        currentPage={page}
        pageCount={pageCount}
        onPageChange={setPage}
        perPage={limit}
        onPerPageChange={(value) => { setLimit(Number(value)); setPage(1); }}
        rangeStart={total ? (page - 1) * limit + 1 : 0}
        rangeEnd={Math.min(page * limit, total)}
        totalItems={total}
        itemLabel="records"
        ariaLabel="Archived records pagination"
      />
    ) : view === 'activity' && !activityLoading ? (
      <Pagination
        currentPage={page}
        pageCount={activityPageCount}
        onPageChange={setPage}
        perPage={limit}
        onPerPageChange={(value) => { setLimit(Number(value)); setPage(1); }}
        rangeStart={activityTotal ? (page - 1) * limit + 1 : 0}
        rangeEnd={Math.min(page * limit, activityTotal)}
        totalItems={activityTotal}
        itemLabel="activities"
        ariaLabel="Archive activity pagination"
      />
    ) : null}
      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title="Restore archived record?"
        description={pendingRestore ? `Restore "${pendingRestore.name || pendingRestore.code}"? The parent hierarchy must be active before this record can be used again.` : ''}
        variant="default"
        confirmLabel="Restore"
        loadingLabel="Restoring…"
        loading={restoring}
        onConfirm={restore}
        onCancel={() => setPendingRestore(null)}
      />
    </>
  );
}
