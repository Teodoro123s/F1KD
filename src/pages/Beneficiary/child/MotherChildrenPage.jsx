import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGetChildrenByMother } from '../../../api/children';
import { apiGetMother } from '../../../api/mothers';
import BeneficiaryTable from '../BeneficiaryTable';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuth } from '../../../auth/AuthProvider';
import { can } from '../../../utils/permissions';

export default function MotherChildrenPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, 'admin-resources', 'create');
  const [mother, setMother] = useState(location.state?.mother || null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let active = true;
    const loadMotherChildren = async () => {
      try {
        const motherRecord = location.state?.mother || (await apiGetMother(id))?.mother;
        const childrenResponse = await apiGetChildrenByMother(motherRecord?.raw?.id || motherRecord?.id || id);
        if (active) {
          setMother(motherRecord);
          setChildren(childrenResponse?.children || []);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Unable to load children');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMotherChildren();
    return () => { active = false; };
  }, [id, location.state]);

  const motherName = mother?.name || `${mother?.firstName || ''} ${mother?.lastName || ''}`.trim() || 'Mother';
  const returnTo = location.state?.returnTo || (mother ? `/beneficiary/mother/${mother.motherId || mother.id || id}` : `/beneficiary/mother/${id}`);
  const childRows = useMemo(() => children.map((child) => ({
    id: child.id,
    name: child.name || [child.first_name, child.middle_name, child.last_name, child.suffix].filter(Boolean).join(' ') || child.child_code || 'Unnamed child',
    community: child.community_name || mother?.community || 'Unknown',
    progress: child.progress ?? 0,
    original: {
      ...child,
      group_name: child.group_name || child.group || '',
      batch_name: child.batch_name || child.batch || '',
    },
  })), [children, mother]);
  const pageCount = Math.max(1, Math.ceil(childRows.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentRows = childRows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const renderPaginationButtons = () => (
    <>
      <button
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
        onClick={() => setPage((value) => Math.max(1, value - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      <input
        type="number"
        min={1}
        max={pageCount}
        value={currentPage}
        className="pagination-page-input"
        placeholder="Page"
        aria-label="Jump to a page"
        onChange={(event) => {
          const nextPage = Number(event.target.value);
          if (!Number.isNaN(nextPage) && nextPage >= 1 && nextPage <= pageCount) {
            setPage(nextPage);
          }
        }}
      />

      <button
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
        onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
        disabled={currentPage === pageCount}
        aria-label="Next page"
      >
        ›
      </button>
    </>
  );

  return (
    <section className="community-page beneficiary-page mother-children-page">
      <PageHeader
        title={`Children of ${motherName}`}
        breadcrumbs={[{ label: 'Beneficiaries', to: '/beneficiary' }, { label: 'Children' }]}
        actions={(
          <>
            {canManage && <button type="button" className="view-btn view-btn--primary module-create-button" onClick={() => navigate(`/beneficiary/create/child`, { state: { mother, returnTo } })}>Create Child</button>}
            <button type="button" className="btn-secondary mother-children-back-button" onClick={() => navigate(returnTo || -1, { state: { mother } })}>Back</button>
          </>
        )}
      />

      {error && <div className="form-error">{error}</div>}
      {!error && <BeneficiaryTable
        currentRows={currentRows}
        loading={loading}
        filteredDataLength={childRows.length}
        rangeStart={childRows.length ? ((currentPage - 1) * perPage) + 1 : 0}
        rangeEnd={Math.min(currentPage * perPage, childRows.length)}
        perPage={perPage}
        handlePerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
        renderPaginationButtons={renderPaginationButtons}
        motherProgressByName={{}}
        onSelectChild={(row) => navigate(`/beneficiary/child/${row.original?.id || row.id}`, { state: { child: row.original || row, mother, returnTo } })}
        entityFilter="Child"
      />}
    </section>
  );
}
