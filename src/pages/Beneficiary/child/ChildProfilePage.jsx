import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMothers } from '../../../context/MothersContext';

const formatValue = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

const ChildField = ({ label, value, className = '' }) => (
  <div className={`detail-form-field ${className}`}>
    <div className="detail-form-label">{label}</div>
    <div className={`detail-form-value ${value === null || value === undefined || value === '' || value === '—' ? 'empty' : ''}`}>
      {formatValue(value)}
    </div>
  </div>
);

const ChildSection = ({ title, children, fullWidth = false }) => (
  <section className="child-detail-section">
    <h3 className="child-detail-section-title">{title}</h3>
    <div className={`child-detail-grid ${fullWidth ? 'child-detail-grid--full' : ''}`}>{children}</div>
  </section>
);

const calculateAgeDecimal = (dobString) => {
  if (!dobString) return null;
  const birth = new Date(dobString);
  const now = new Date();
  const diffMs = now - birth;
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
};

const getBmiValue = (weight, heightCm) => {
  const numericWeight = Number(weight);
  const numericHeight = Number(heightCm);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericHeight) || numericHeight <= 0) return '—';
  const heightM = numericHeight / 100;
  const bmi = numericWeight / (heightM * heightM);
  return Number.isFinite(bmi) ? bmi.toFixed(1) : '—';
};

const getBmiStatus = (weight, heightCm) => {
  const bmiText = getBmiValue(weight, heightCm);
  if (bmiText === '—') return '—';
  const bmi = Number(bmiText);
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export default function ChildProfilePage() {
  const { childId, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateMother = location.state?.mother || null;
  const { mothers: contextMothers } = useMothers();
  const childFromState = location.state?.child || null;

  // Helper: find a child in session sources and return { child, mother }
  const findChildInSession = (searchId) => {
    if (!searchId) return null;

    // search mothers provided in location state first
    if (Array.isArray(location.state?.mothers)) {
      for (const m of location.state.mothers) {
        if (Array.isArray(m.children)) {
          const found = m.children.find((c) => String(c.id) === String(searchId));
          if (found) return { child: found, mother: m };
        }
      }
    }

    // search context mothers
    if (Array.isArray(contextMothers)) {
      for (const m of contextMothers) {
        if (Array.isArray(m.children)) {
          const found = m.children.find((c) => String(c.id) === String(searchId));
          if (found) return { child: found, mother: m };
        }
        // if mother has id matching child.mother_id later
      }
    }

    // search direct children list from state
    if (Array.isArray(location.state?.children)) {
      const found = location.state.children.find((c) => String(c.id) === String(searchId));
      if (found) return { child: found };
    }
    // search groups (where CreateChildPage may have added new child records)
    if (Array.isArray(location.state?.groups)) {
      const found = location.state.groups.find((c) => String(c.id) === String(searchId));
      if (found) return { child: found };
    }

    return null;
  };

  const resolvedFromUrl = childId ? findChildInSession(childId) : (id ? findChildInSession(id) : null);

  const initialSelected = childFromState || resolvedFromUrl?.child || null;
  const [selectedChild, setSelectedChild] = useState(initialSelected);

  // Determine the most likely mother for display
  const findMotherForChild = (child) => {
    if (!child) return stateMother || null;
    // If child has explicit mother id, search context
    if (child.mother_id || child.motherId) {
      const mid = child.mother_id || child.motherId;
      const found = contextMothers.find((m) => String(m.id) === String(mid) || String(m.motherId) === String(mid));
      if (found) return found;
    }
    // if resolvedFromUrl had a mother
    if (resolvedFromUrl && resolvedFromUrl.mother) return resolvedFromUrl.mother;
    // fallback to state mother
    return stateMother || null;
  };

  const [fetchedChildrenForMother, setFetchedChildrenForMother] = React.useState(null);

  const resolvedMother = findMotherForChild(initialSelected || resolvedFromUrl?.child);

  // children list to show in sidebar: prefer mother.children, then fetchedChildrenForMother, then location.state.children
  const children = (resolvedMother && Array.isArray(resolvedMother.children) && resolvedMother.children.length) ? resolvedMother.children : (Array.isArray(fetchedChildrenForMother) ? fetchedChildrenForMother : (Array.isArray(location.state?.children) ? location.state.children : []));

  // Ensure the selected child appears in the sidebar even if it was fetched separately
  const sidebarChildren = selectedChild ? (children.find((c) => String(c.id) === String(selectedChild.id)) ? children : [selectedChild, ...children]) : children;

  // If we don't have the child in session but there's a childId in the URL, attempt to fetch from backend
  React.useEffect(() => {
    let canceled = false;
    const idToFetch = (childId || id);
    if (!selectedChild && idToFetch) {
      (async () => {
        try {
          const mod = await import('../../../api/children');
          const res = await mod.apiGetChild(idToFetch);
          if (res && res.child && !canceled) {
            // normalize returned child to match expected shape
            const c = res.child;
            const normalized = {
              id: c.id,
              child_code: c.child_code,
              firstName: c.first_name,
              middleName: c.middle_name,
              lastName: c.last_name,
              suffix: c.suffix,
              birthDate: c.birth_date,
              birthWeight: c.birth_weight,
              birthLength: c.birth_length,
              gender: c.gender,
              deliveryType: c.delivery_type,
              healthStatus: c.health_status,
              birthPlace: c.birth_place,
              birthAttendant: c.birth_attendant,
              apgarScore: c.apgar_score,
              feedingType: c.feeding_type,
              nutritionNotes: c.nutrition_notes,
              community: c.community_id,
              batch: c.batch_id,
              progress: c.progress,
            };
            setSelectedChild(normalized);
          }
        } catch (err) {
          // ignore - child likely not found or network error
          console.warn('Could not fetch child from server', err);
        }
      })();
    }
    return () => { canceled = true; };
  }, [childId, id, selectedChild]);


  // Helper to render vaccination info
  const renderVaccine = (date, remarks) => (date ? `${date}${remarks ? ' — ' + remarks : ''}` : '—');

  const handleCreateChild = () => {
    // Navigate to create child and pass mother so the form can prefill mother info
    navigate('/beneficiary/create/child', { state: { mother: resolvedMother } });
  };

  const childName = selectedChild?.name || `${selectedChild?.firstName || ''} ${selectedChild?.middleName || ''} ${selectedChild?.lastName || ''} ${selectedChild?.suffix || ''}`.replace(/\s+/g, ' ').trim();
  const childBirthDate = selectedChild?.birthDate || selectedChild?.birth_date || '—';
  const childWeight = selectedChild?.birthWeight || selectedChild?.birth_weight || '—';
  const childHeight = selectedChild?.birthLength || selectedChild?.birth_length || '—';
  const childBmi = getBmiValue(childWeight, childHeight);
  const childBmiStatus = getBmiStatus(childWeight, childHeight);
  const vaccineRows = [
    { label: 'BCG', date: selectedChild?.bcgDate || '—', remarks: selectedChild?.bcgRemarks || '—' },
    { label: 'Hepatitis B', date: selectedChild?.hepbDate || '—', remarks: selectedChild?.hepbRemarks || '—' },
    { label: 'Inactivated Polio Vaccine', date: selectedChild?.ipvDate || selectedChild?.ipv_date || '—', remarks: selectedChild?.ipvRemarks || selectedChild?.ipv_remarks || '—' },
    { label: 'Pentavalent Vaccine', date: selectedChild?.dptDate || '—', remarks: selectedChild?.dptRemarks || '—' },
    { label: 'Oral Polio Vaccine (OPV)', date: selectedChild?.opvDate || '—', remarks: selectedChild?.opvRemarks || '—' },
    { label: 'Pneumococcal (PCV)', date: selectedChild?.pcvDate || selectedChild?.pcv_date || '—', remarks: selectedChild?.pcvRemarks || selectedChild?.pcv_remarks || '—' },
    { label: 'Measles, Mumps, Rubella (MMR)', date: selectedChild?.mmrDate || '—', remarks: selectedChild?.mmrRemarks || '—' },
  ];

  const rightColumnContent = (!selectedChild && (childId || id)) ? (
    <div>
      <h2>Child data not available in this session</h2>
      <p>The child with ID <strong>{childId || id}</strong> could not be found in the current client state. Deep links work in-session when a child object is provided via navigation state or when the app has loaded that child earlier.</p>
      <p>If you navigated here from another page in this session, return to that page and open the child from there. Otherwise, the child record will be visible after the app loads child lists from the backend.</p>
    </div>
  ) : (!selectedChild ? (
    <div>
      <h2>No child selected</h2>
      <p>Select a child from the list or create a new child record for this mother.</p>
    </div>
  ) : (
    <div className="child-detail-page">
      <div className="mother-detail-header" style={{ paddingBottom: 12 }}>
        <div className="mother-detail-identity">
          <h2 className="mother-detail-name" style={{ margin: 0 }}>{childName || 'Unnamed Child'}</h2>
          <div className="mother-detail-meta">{selectedChild.child_code || selectedChild.id || 'Child ID'} • {selectedChild.community || selectedChild.batch || 'Community / Batch'}</div>
        </div>
        <div className="mother-detail-actions">
          <button type="button" className="btn-secondary" onClick={() => alert('Edit child (not implemented)')}>Edit</button>
          <button type="button" className="btn-secondary" onClick={() => {
            const mid = resolvedMother?.motherId || resolvedMother?.id || selectedChild.mother_id || selectedChild.motherId || '';
            const stateMother = resolvedMother || (mid ? { id: mid, name: selectedChild.mother_first_name ? `${selectedChild.mother_first_name} ${selectedChild.mother_last_name || ''}`.trim() : undefined } : null);
            navigate(`/beneficiary/mother/${mid}/monitoring`, { state: { mother: stateMother } });
          }}>Open mother monitoring</button>
        </div>
      </div>

      <ChildSection title="I.A Child Information">
        <ChildField label="First Name" value={selectedChild.firstName || '—'} />
        <ChildField label="Middle Name" value={selectedChild.middleName || '—'} />
        <ChildField label="Last Name" value={selectedChild.lastName || '—'} />
        <ChildField label="Suffix" value={selectedChild.suffix || '—'} />
        <ChildField label="Sex" value={selectedChild.gender || '—'} />
        <ChildField label="Blood Type" value={selectedChild.bloodType || '—'} />
        <ChildField label="Date of Birth" value={childBirthDate} />
        <ChildField label="Place of Birth" value={selectedChild.birthPlace || selectedChild.birth_place || '—'} />
        <ChildField label="Weight" value={childWeight} />
        <ChildField label="Height" value={childHeight} />
        <ChildField label="BMI" value={childBmi} />
        <ChildField label="BMI status" value={childBmiStatus} />
        <ChildField label="No. Old Child Delivered" value={selectedChild.noOfChildDelivered || selectedChild.childrenDelivered || '—'} />
        <ChildField label="Exclusive Breastfeeding" value={selectedChild.exclusiveBreastfeeding || selectedChild.feedingType || '—'} />
        <ChildField label="Expanded Newborn Screening" value={selectedChild.expandedNewbornScreening || selectedChild.nutritionNotes || '—'} />
        <ChildField label="Expanded Newborn Screening Result" value={selectedChild.expandedNewbornScreeningResult || '—'} className="full-width" />
      </ChildSection>

      <ChildSection title="I.A VACCINE RECORD">
        <div className="detail-form-field full-width">
          <div className="mother-detail-table-wrap">
            <table className="mother-detail-table">
              <thead>
                <tr>
                  <th>Vaccines</th>
                  <th>Date Given</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {vaccineRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.date}</td>
                    <td>{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ChildSection>
    </div>
  ));

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Child Profile</h1>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: '0.95rem', color: '#64748b' }}>{resolvedMother ? `Child of ${resolvedMother.name || resolvedMother.firstName || resolvedMother.motherName}` : `Child ID: ${childId || 'n/a'}`}</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>
              {resolvedMother ? (`Mother: ${resolvedMother.name || resolvedMother.firstName ? `${resolvedMother.firstName || ''} ${resolvedMother.lastName || ''}`.trim() : resolvedMother.motherName} • ${resolvedMother.motherId || resolvedMother.id || ''}`) : (selectedChild ? (`Mother ID: ${selectedChild.mother_id || selectedChild.motherId || '—'}`) : '')}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
              {selectedChild ? (`Father: ${selectedChild.fatherName || selectedChild.father_name || '—'} • Relationship: ${selectedChild.relationship || '—'}`) : ''}
            </div>
          </div>
        </div>
        <div>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <main className="beneficiary-main" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <aside style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Children</strong>
            <button className="btn-primary" onClick={handleCreateChild}>Create Child</button>
          </div>

          {sidebarChildren.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sidebarChildren.map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <button type="button" onClick={() => setSelectedChild(c)} style={{ width: '100%', textAlign: 'left', padding: 8, border: '1px solid transparent', background: selectedChild?.id === c.id ? '#eef2ff' : 'transparent' }}>
                    {c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.id}
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.birthDate || c.birthDate}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#64748b' }}>No children recorded for this mother.</div>
          )}
        </aside>

        <section style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          {rightColumnContent}
        </section>
      </main>
    </div>
  );
}
