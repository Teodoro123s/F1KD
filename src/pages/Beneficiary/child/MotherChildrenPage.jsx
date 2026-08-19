import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGetChildrenByMother } from '../../../api/children';
import { apiGetMother } from '../../../api/mothers';
import { formatDateForDisplay } from '../../../utils/dateFormat';

const childName = (child) => [child.first_name || child.firstName, child.middle_name || child.middleName, child.last_name || child.lastName, child.suffix]
  .filter(Boolean)
  .join(' ');

export default function MotherChildrenPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [mother, setMother] = useState(location.state?.mother || null);
  const [children, setChildren] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const motherResponse = location.state?.mother ? { mother: location.state.mother } : await apiGetMother(id);
      const motherRecord = motherResponse?.mother || motherResponse;
      const childrenResponse = await apiGetChildrenByMother(motherRecord?.raw?.id || motherRecord?.id || id);
      if (active) {
        setMother(motherRecord);
        setChildren(childrenResponse?.children || []);
      }
    })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || 'Unable to load children');
      });
    return () => { active = false; };
  }, [id, location.state]);

  const motherName = mother?.name || `${mother?.firstName || ''} ${mother?.lastName || ''}`.trim() || 'Mother';
  const motherIdentifier = mother?.motherId || mother?.id || id;

  return (
    <section className="mother-detail-page">
      <header className="mother-detail-header">
        <div className="mother-detail-identity">
          <h1 className="mother-detail-name">Children of {motherName}</h1>
          <div className="mother-detail-meta">{motherIdentifier}</div>
        </div>
        <div className="mother-detail-actions">
          <button type="button" className="btn-create-action" onClick={() => navigate(`/beneficiary/create/child`, { state: { mother } })}>Create Child</button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}
      {!error && !children.length && <p className="mother-detail-empty">No children recorded for this mother.</p>}
      {!!children.length && (
        <section className="mother-detail-section">
          <h2 className="mother-detail-section-title">Child Records</h2>
          <div className="mother-detail-grid">
            {children.map((child) => (
              <button
                type="button"
                className="entity-card-button name-cell"
                key={child.id}
                onClick={() => navigate(`/beneficiary/child/${child.id}`, { state: { child, mother } })}
              >
                <strong>{childName(child) || child.child_code || child.id}</strong>
                <span>{formatDateForDisplay(child.birth_date || child.birthDate) || 'Birth date not recorded'}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
