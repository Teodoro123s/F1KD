import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGetChildrenByMother } from '../../../api/children';
import { apiGetMother } from '../../../api/mothers';
import BeneficiaryTable from '../BeneficiaryTable';
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
      }
    };

    loadMotherChildren();
    return () => { active = false; };
  }, [id, location.state]);

  const motherName = mother?.name || `${mother?.firstName || ''} ${mother?.lastName || ''}`.trim() || 'Mother';
  const motherIdentifier = mother?.motherId || mother?.id || id;
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
    <button type="button" className="pagination-btn active" aria-current="page">{currentPage}</button>
  );

  return (
    <section className="mother-detail-page">
      <header className="mother-detail-header">
        <div className="mother-detail-identity">
          <h1 className="mother-detail-name">Children of {motherName}</h1>
          <div className="mother-detail-meta">{motherIdentifier}</div>
        </div>
        <div className="mother-detail-actions">
          {canManage && <button type="button" className="btn-create-action" onClick={() => navigate(`/beneficiary/create/child`, { state: { mother, returnTo } })}>Create Child</button>}
          <button type="button" className="btn-secondary" onClick={() => navigate(returnTo || -1, { state: { mother } })}>Back</button>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}
      {!error && <BeneficiaryTable
        currentRows={currentRows}
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
