import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMothers } from '../../../context/MothersContext';
import { formatDateForDisplay } from '../../../utils/dateFormat';

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

const normalizeChild = (child = {}) => ({
  ...child,
  firstName: child.firstName || child.first_name || '',
  middleName: child.middleName || child.middle_name || '',
  lastName: child.lastName || child.last_name || '',
  suffix: child.suffix || '',
  motherId: child.motherId || child.mother_id || '',
  motherName: child.motherName || [child.mother_first_name, child.mother_last_name].filter(Boolean).join(' '),
  birthDate: child.birthDate || child.birth_date || '',
  birthWeight: child.birthWeight || child.birth_weight || '',
  birthLength: child.birthLength || child.birth_length || '',
  gender: child.gender || '',
  bloodType: child.bloodType || child.blood_type || '',
  noOfChildDelivered: child.noOfChildDelivered || child.no_of_child_delivered || '',
  exclusiveBreastfeeding: child.exclusiveBreastfeeding || child.exclusive_breastfeeding || '',
  expandedNewbornScreening: child.expandedNewbornScreening || child.expanded_newborn_screening || '',
  expandedNewbornScreeningResult: child.expandedNewbornScreeningResult || child.expanded_newborn_screening_result || '',
  birthPlace: child.birthPlace || child.birth_place || '',
  fatherName: child.fatherName || child.father_name || '',
  community: child.community || child.community_name || '',
  batch: child.batch || child.batch_name || '',
});

export default function ChildProfilePage() {
  const { childId, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateMother = location.state?.mother || null;
  const { mothers: contextMothers } = useMothers();
  const childFromState = location.state?.child ? normalizeChild(location.state.child) : null;

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

  const initialSelected = childFromState || (resolvedFromUrl?.child ? normalizeChild(resolvedFromUrl.child) : null);
  const [selectedChild, setSelectedChild] = useState(initialSelected);

  React.useEffect(() => {
    if (location.state?.updatedChild) {
      setSelectedChild((current) => ({ ...(current || {}), ...location.state.updatedChild }));
    }
  }, [location.state?.updatedChild]);

  // Determine the most likely mother for display
  const findMotherForChild = (child) => {
    if (!child) return stateMother || null;
    // If child has explicit mother id, search context
    if (child.mother_id || child.motherId) {
      const mid = child.mother_id || child.motherId;
        const found = contextMothers.find((m) => (
          String(m.id) === String(mid) ||
          String(m.motherId) === String(mid) ||
          String(m.raw?.id) === String(mid)
        ));
      if (found) return found;
    }
    if (child.motherName) {
      return { id: child.motherId || child.mother_id, motherId: child.motherId || child.mother_id, name: child.motherName };
    }
    // if resolvedFromUrl had a mother
    if (resolvedFromUrl && resolvedFromUrl.mother) return resolvedFromUrl.mother;
    // fallback to state mother
    return stateMother || null;
  };

  const resolvedMother = findMotherForChild(selectedChild || initialSelected || resolvedFromUrl?.child);

  // Refresh the URL record so navigation state cannot leave stale or partial details displayed.
  React.useEffect(() => {
    let canceled = false;
    const idToFetch = (childId || id);
    if (idToFetch) {
      (async () => {
        try {
          const mod = await import('../../../api/children');
          const res = await mod.apiGetChild(idToFetch);
          if (res && res.child && !canceled) {
            // normalize returned child to match expected shape
            const c = res.child;
            setSelectedChild(normalizeChild({
              ...c,
              motherId: c.mother_code || c.mother_id,
              motherName: [c.mother_first_name, c.mother_last_name].filter(Boolean).join(' '),
              bcgDate: c.BCG?.vaccine_date,
              bcgRemarks: c.BCG?.remarks,
              hepbDate: c.HepB?.vaccine_date,
              hepbRemarks: c.HepB?.remarks,
              opvDate: c.OPV?.vaccine_date,
              opvRemarks: c.OPV?.remarks,
              dptDate: c.DPT?.vaccine_date,
              dptRemarks: c.DPT?.remarks,
              mmrDate: c.MMR?.vaccine_date,
              mmrRemarks: c.MMR?.remarks,
            }));
          }
        } catch (err) {
          // ignore - child likely not found or network error
          console.warn('Could not fetch child from server', err);
        }
      })();
    }
    return () => { canceled = true; };
  }, [childId, id]);


  // Helper to render vaccination info
  const renderVaccine = (date, remarks) => (date ? `${date}${remarks ? ' — ' + remarks : ''}` : '—');

  const childName = selectedChild?.name || `${selectedChild?.firstName || ''} ${selectedChild?.middleName || ''} ${selectedChild?.lastName || ''} ${selectedChild?.suffix || ''}`.replace(/\s+/g, ' ').trim();
  const childBirthDate = formatDateForDisplay(selectedChild?.birthDate || selectedChild?.birth_date);
  const childWeight = selectedChild?.birthWeight || selectedChild?.birth_weight || '—';
  const childHeight = selectedChild?.birthLength || selectedChild?.birth_length || '—';
  const childBmi = getBmiValue(childWeight, childHeight);
  const childBmiStatus = getBmiStatus(childWeight, childHeight);
  const vaccineRows = [
    { label: 'BCG', date: formatDateForDisplay(selectedChild?.bcgDate), remarks: selectedChild?.bcgRemarks || '—' },
    { label: 'Hepatitis B', date: formatDateForDisplay(selectedChild?.hepbDate), remarks: selectedChild?.hepbRemarks || '—' },
    { label: 'Inactivated Polio Vaccine', date: formatDateForDisplay(selectedChild?.ipvDate || selectedChild?.ipv_date), remarks: selectedChild?.ipvRemarks || selectedChild?.ipv_remarks || '—' },
    { label: 'Pentavalent Vaccine', date: formatDateForDisplay(selectedChild?.dptDate), remarks: selectedChild?.dptRemarks || '—' },
    { label: 'Oral Polio Vaccine (OPV)', date: formatDateForDisplay(selectedChild?.opvDate), remarks: selectedChild?.opvRemarks || '—' },
    { label: 'Pneumococcal (PCV)', date: formatDateForDisplay(selectedChild?.pcvDate || selectedChild?.pcv_date), remarks: selectedChild?.pcvRemarks || selectedChild?.pcv_remarks || '—' },
    { label: 'Measles, Mumps, Rubella (MMR)', date: formatDateForDisplay(selectedChild?.mmrDate), remarks: selectedChild?.mmrRemarks || '—' },
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
              <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/child/${selectedChild.id}/edit`, { state: { child: selectedChild, mother: resolvedMother } })}>Edit</button>
          <button type="button" className="btn-secondary" onClick={() => {
            const mid = resolvedMother?.motherId || resolvedMother?.id || selectedChild.mother_id || selectedChild.motherId || '';
            const stateMother = resolvedMother || (mid ? { id: mid, name: selectedChild.mother_first_name ? `${selectedChild.mother_first_name} ${selectedChild.mother_last_name || ''}`.trim() : undefined } : null);
            navigate('/monitoring', { state: { child: selectedChild, mother: stateMother } });
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
              {resolvedMother ? (`Mother: ${resolvedMother.name || resolvedMother.motherName || `${resolvedMother.firstName || ''} ${resolvedMother.lastName || ''}`.trim()} • ${resolvedMother.motherId || resolvedMother.id || ''}`) : (selectedChild ? (`Mother ID: ${selectedChild.mother_id || selectedChild.motherId || '—'}`) : '')}
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

      <main className="beneficiary-main">
        <section style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          {rightColumnContent}
        </section>
      </main>
    </div>
  );
}
