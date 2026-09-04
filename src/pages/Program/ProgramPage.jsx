import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from '../../components/ui/PageHeader';
import {
  BatchesIcon,
  BuildingIcon,
  GroupsIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
} from "../Community/CommunityIcons";
import { getSummary } from "../Community/communityService";
import { apiCompleteNamedProgramCluster, apiCompleteProgramCluster, apiCreateProgram, apiCreateProgramClusters, apiDeleteProgram, apiEndProgram, apiGetPrograms, apiUpdateProgram } from "../../api/programs";
import {
  beneficiaryNames,
  buildProgramsFromSummary,
  clusterPath,
  emptyProgram,
  filterPrograms,
  getCluster,
  initialPrograms,
} from "./programData";

export default function ProgramPage() {
  const navigate = useNavigate();
  const { programId, clusterType, clusterName } = useParams();
  const [activeTab, setActiveTab] = useState("Active");
  const [query, setQuery] = useState("");
  const [programs, setPrograms] = useState(initialPrograms);
  const [isLiveDataLoaded, setIsLiveDataLoaded] = useState(false);
  const viewMode = Boolean(programId);
  const clusterView = Boolean(clusterType && clusterName);
  const [showModal, setShowModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [form, setForm] = useState(emptyProgram);
  const [activityStatus, setActivityStatus] = useState("Open");
  const [checkedRecipients, setCheckedRecipients] = useState([
    "Maria Santos",
    "Juan Dela Cruz",
    "Ana Garcia",
    "Carlo Ramos",
  ]);
  const [beneficiaryScope, setBeneficiaryScope] = useState("School");
  const [scopeSchoolIds, setScopeSchoolIds] = useState([]);
  const [scopeGroupIds, setScopeGroupIds] = useState([]);
  const [scopeBatchIds, setScopeBatchIds] = useState([]);
  const [hierarchy, setHierarchy] = useState({ schools: [], groups: [], batches: [] });
  const [scopeError, setScopeError] = useState('');
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [actionProgram, setActionProgram] = useState(null);
  const [programError, setProgramError] = useState('');

  const mapApiProgram = (program) => ({
    ...program,
    id: Number(program.id),
    beneficiaryType: program.beneficiaryType || program.beneficiary_type || 'Mother and Child',
    target: Number(program.target || 0),
    received: Number(program.received || 0),
    clusters: program.clusters || [],
    recipients: program.recipients || [],
    latest: program.latest || 'No activity yet',
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([apiGetPrograms(), getSummary()])
      .then(([programResponse, summary]) => {
        if (!mounted) return;
        const savedPrograms = (programResponse.programs || []).map(mapApiProgram);
        setHierarchy({ schools: summary.communities || [], groups: summary.groups || [], batches: summary.batches || [] });
        setPrograms(savedPrograms.length ? savedPrograms : buildProgramsFromSummary(summary));
      })
      .then(() => {
        if (mounted) setIsLiveDataLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setProgramError('Unable to load saved programs.');
        setPrograms(initialPrograms);
        setIsLiveDataLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPrograms = useMemo(() => {
    return filterPrograms(programs, query, activeTab);
  }, [programs, query, activeTab]);

  const saveProgram = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) return;
    if (form.id) {
      const response = await apiUpdateProgram(form.id, form);
      setPrograms((current) => current.map((program) => program.id === form.id ? mapApiProgram(response.program) : program));
      setForm(emptyProgram);
      setShowModal(false);
      return;
    }
    const response = await apiCreateProgram(form);
    setPrograms((current) => [...current, mapApiProgram(response.program)]);
    setForm(emptyProgram);
    setShowModal(false);
  };

  const selectedProgram = programId
    ? programs.find((program) => program.id === Number(programId))
    : programs.find((program) => program.id === Number(form.id)) || filteredPrograms[0];
  const expandedClusters = useMemo(() => {
    if (!selectedProgram) return [];
    const clusters = [...(selectedProgram.clusters || [])];
    const addCluster = (type, name, beneficiaries) => {
      if (!name || clusters.some((cluster) => cluster.type === type && cluster.name.toLowerCase() === name.toLowerCase())) return;
      clusters.push({ type, name, beneficiaries: Number(beneficiaries || 0), received: 0, derived: true });
    };
    clusters.filter((cluster) => cluster.type === 'School').forEach((schoolCluster) => {
      const school = hierarchy.schools.find((item) => String(item.name || '').toLowerCase() === schoolCluster.name.toLowerCase());
      if (!school) return;
      const schoolGroups = hierarchy.groups.filter((group) => (
        String(group.community || group.community_name || '').toLowerCase() === String(school.name || '').toLowerCase()
      ));
      schoolGroups.forEach((group) => addCluster('Group', group.name || group.group_name, group.members));
      hierarchy.batches.filter((batch) => (
        String(batch.community || '').toLowerCase() === String(school.name || '').toLowerCase()
      )).forEach((batch) => addCluster('Batch', batch.name || batch.batch_code, batch.records));
    });
    return clusters;
  }, [hierarchy, selectedProgram]);
  const selectedProgramView = selectedProgram ? { ...selectedProgram, clusters: expandedClusters } : selectedProgram;
  const selectedCluster = getCluster(selectedProgramView, clusterType, clusterName);
  const selectedSchools = hierarchy.schools.filter((school) => scopeSchoolIds.includes(String(school.id)));
  const availableGroups = hierarchy.groups.filter((group) => (
    scopeSchoolIds.includes(String(group.community_id || ''))
    || selectedSchools.some((school) => String(group.community || group.community_name || '').toLowerCase() === String(school.name || '').toLowerCase())
  ));
  const selectedGroups = availableGroups.filter((group) => scopeGroupIds.includes(String(group.id)));
  const availableBatches = hierarchy.batches.filter((batch) => (
    scopeGroupIds.includes(String(batch.group_id || ''))
    || selectedGroups.some((group) => String(batch.group || batch.group_name || '').toLowerCase() === String(group.name || group.group_name || '').toLowerCase())
    || (scopeSchoolIds.includes(String(batch.community_id || '')) && !batch.group_id)
    || (selectedSchools.some((school) => String(batch.community || '').toLowerCase() === String(school.name || '').toLowerCase()) && !batch.group_id)
  ));
  const selectedBatches = availableBatches.filter((batch) => scopeBatchIds.includes(String(batch.id)));
  const toggleRecipient = (recipient) =>
    setCheckedRecipients((current) =>
      current.includes(recipient)
        ? current.filter((name) => name !== recipient)
        : [...current, recipient],
    );
  const saveActivity = (event) => {
    event.preventDefault();
    if (!selectedProgram) return;
    setPrograms((current) =>
      current.map((program) =>
        program.id === selectedProgram.id
          ? {
              ...program,
              received: Math.min(
                program.target,
                Math.max(program.received, checkedRecipients.length),
              ),
              activities: program.activities + 1,
              latest: "Aug 26, 2026",
            }
          : program,
      ),
    );
    setShowActivityModal(false);
  };
  const endProgram = (programToEnd = selectedProgram) => {
    if (!programToEnd) return;
    apiEndProgram(programToEnd.id)
      .then((response) => {
        setPrograms((current) => current.map((program) => program.id === programToEnd.id ? mapApiProgram(response.program) : program));
        setForm(emptyProgram);
      })
      .catch(() => setProgramError('Unable to end program.'));
  };
  const saveBeneficiaryScope = (event) => {
    event.preventDefault();
    const selectedScopes = beneficiaryScope === 'School' ? selectedSchools : beneficiaryScope === 'Group' ? selectedGroups : selectedBatches;
    if (!selectedProgram || !selectedScopes.length) {
      setScopeError(`Select at least one ${beneficiaryScope.toLowerCase()} before adding this cluster.`);
      return;
    }
    setScopeError('');
    const scopes = selectedScopes.flatMap((scope) => {
      const name = scope.name || scope.group_name || scope.batch_code;
      const coverage = [{ type: beneficiaryScope, name, beneficiaries: Number(scope.records || scope.members_count || 0) }];
      if (beneficiaryScope !== 'School') return coverage;
      const groups = hierarchy.groups.filter((group) => String(group.community || group.community_name || '').toLowerCase() === String(name || '').toLowerCase());
      const batches = hierarchy.batches.filter((batch) => String(batch.community || '').toLowerCase() === String(name || '').toLowerCase());
      return coverage.concat(
        groups.map((group) => ({ type: 'Group', name: group.name || group.group_name, beneficiaries: Number(group.members || 0) })),
        batches.map((batch) => ({ type: 'Batch', name: batch.name || batch.batch_code, beneficiaries: Number(batch.records || 0) })),
      );
    });
    apiCreateProgramClusters(selectedProgram.id, scopes).then((response) => setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? mapApiProgram(response.program) : program))).catch(() => setProgramError('Unable to save beneficiary cluster.'));
    setPrograms((current) =>
      current.map((program) =>
        program.id === selectedProgram.id
          ? {
              ...program,
              clusters: [...program.clusters, ...scopes
                .map((scope) => ({ ...scope, received: 0 }))
                .filter((cluster) => !program.clusters.some((item) => item.type === cluster.type && item.name.toLowerCase() === cluster.name.toLowerCase()))],
            }
          : program,
      ),
    );
    setShowBeneficiaryModal(false);
    setScopeSchoolIds([]);
    setScopeGroupIds([]);
    setScopeBatchIds([]);
  };
  const completeCluster = (cluster) => {
    const completeRequest = cluster.id
      ? apiCompleteProgramCluster(selectedProgram.id, cluster.id)
      : apiCompleteNamedProgramCluster(selectedProgram.id, cluster);
    completeRequest
      .then((response) => setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? mapApiProgram(response.program) : program)))
      .catch(() => setProgramError('Unable to mark this cluster as done.'));
  };
  const openBeneficiaryModal = () => {
    setScopeError('');
    setScopeSchoolIds([]);
    setScopeGroupIds([]);
    setScopeBatchIds([]);
    setShowBeneficiaryModal(true);
  };
  const editProgram = () => {
    setForm(actionProgram || selectedProgram);
    setActiveActionMenu(null);
    setShowModal(true);
  };
  const deleteProgram = () => {
    const programToDelete = actionProgram || selectedProgram;
    if (!programToDelete || !window.confirm(`Delete ${programToDelete.name}?`)) return;
    apiDeleteProgram(programToDelete.id).then(() => {
      setPrograms((current) => current.filter((program) => program.id !== programToDelete.id));
      setActiveActionMenu(null);
      navigate("/program");
    }).catch(() => setProgramError('Unable to delete program.'));
  };
  const renderActionMenu = (menuId, menuProgram = selectedProgram) => (
    <div className="program-action-menu-wrap" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="program-more-button" aria-label="Program actions" aria-haspopup="true" aria-expanded={activeActionMenu === menuId} onClick={(event) => { event.stopPropagation(); setActionProgram(menuProgram); setActiveActionMenu(activeActionMenu === menuId ? null : menuId); }}><MoreVerticalIcon /></button>
      {activeActionMenu === menuId && <div className="actions-dropdown program-actions-dropdown" role="menu"><button type="button" className="actions-dropdown-item" onClick={editProgram} role="menuitem">Edit</button><button type="button" className="actions-dropdown-item" onClick={() => { setActiveActionMenu(null); endProgram(actionProgram); }} role="menuitem">End program</button><button type="button" className="actions-dropdown-item delete" onClick={deleteProgram} role="menuitem">Delete</button></div>}
    </div>
  );

  return (
    <div className="community-page program-page">
      <PageHeader
        title={viewMode && selectedProgram ? selectedProgram.name : 'Program'}
        breadcrumbs={[{ label: 'Program' }]}
        actions={
          <button
            className="view-btn view-btn--primary"
            type="button"
            onClick={() =>
              viewMode ? openBeneficiaryModal() : setShowModal(true)
            }
          >
            <PlusIcon />
            <span>{viewMode ? 'Add beneficiary' : 'Create Program'}</span>
          </button>
        }
      />

      {isLiveDataLoaded && (
        <div className="program-live-status" style={{ padding: "0 0 12px", color: "#475569", fontSize: "0.9rem" }}>
          {programs.length > 0 ? `Showing ${programs.length} live program record${programs.length > 1 ? "s" : ""} from community data.` : "No program records available."}
        </div>
      )}

      {clusterView && selectedProgram && (
        <section className="program-cluster-subheader" aria-label="Program beneficiary clusters">
          <div className="program-cluster-tabs" role="tablist" aria-label="Program cluster levels">
            {[['School', 'Schools', BuildingIcon], ['Group', 'Groups', GroupsIcon], ['Batch', 'Batches', BatchesIcon]].map(([type, label, Icon]) => { const cluster = selectedProgramView.clusters.find((item) => item.type === type); return <button key={type} type="button" role="tab" aria-selected={clusterType === type} className={`program-cluster-tab${clusterType === type ? ' active' : ''}`} onClick={() => cluster && navigate(`/program/${selectedProgram.id}/cluster/${type}/${encodeURIComponent(cluster.name)}`)} disabled={!cluster}><Icon /><span>{label}</span></button>; })}
          </div>
        </section>
      )}

      {!viewMode && (
        <section className="tabs-row program-tabs-row">
          <div
            className="tabs-list"
            role="tablist"
            aria-label="Program sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Active"}
              className={`tab-btn${activeTab === "Active" ? " active" : ""}`}
              onClick={() => setActiveTab("Active")}
            >
              <GroupsIcon />
              <span>Active Programs</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "Ended"}
              className={`tab-btn${activeTab === "Ended" ? " active" : ""}`}
              onClick={() => setActiveTab("Ended")}
            >
              <BatchesIcon />
              <span>Ended Programs</span>
            </button>
          </div>
          <div className="search-container program-search">
            <div className="search-field-container">
              <SearchIcon />
              <input
                id="program-search"
                name="programSearch"
                type="text"
                className="search-input-field"
                placeholder="Search programs, partners, or communities..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search programs"
              />
            </div>
          </div>
        </section>
      )}

      <section className="table-card program-table-card">
        <div className="table-overflow">
          <table className="data-table">
            {clusterView && selectedCluster ? (
              <>
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Cluster</th>
                    <th>Program status</th>
                    <th>Latest activity</th>
                    <th>Distribution status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCluster.recipients?.length ? selectedCluster.recipients : beneficiaryNames(selectedCluster.beneficiaries).map((name) => ({ id: name, name }))).map((recipient, index) => (
                    <tr key={recipient.id}>
                      <td>
                        <strong>{recipient.name}</strong>
                        <span className="program-table-meta">
                          Cluster member
                        </span>
                      </td>
                      <td>{selectedCluster.name}</td>
                      <td>
                        <span className="program-status active">Covered</span>
                      </td>
                      <td>{selectedProgram.latest}</td>
                      <td>
                        <span
                          className={`program-recipient-status ${index < selectedCluster.received ? "received" : "pending"}`}
                        >
                          {index < selectedCluster.received
                            ? "Received"
                            : "Not yet recorded"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : viewMode ? (
              <>
                <thead>
                  <tr>
                    <th>Cluster</th>
                    <th>Cluster type</th>
                    <th>Beneficiaries</th>
                    <th>Program status</th>
                    <th>Latest activity</th>
                    <th>Distribution status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProgramView?.clusters.map((cluster) => (
                    <tr key={`${cluster.type}-${cluster.name}`} className="program-clickable-row" onClick={() => navigate(`/program/${selectedProgram.id}/cluster/${cluster.type}/${encodeURIComponent(cluster.name)}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/program/${selectedProgram.id}/cluster/${cluster.type}/${encodeURIComponent(cluster.name)}`); }} tabIndex="0">
                      <td>
                        <a className="program-row-link" href={clusterPath(selectedProgram.id, cluster)} onClick={(event) => event.stopPropagation()}>
                          <strong>{cluster.name}</strong>
                        <span className="program-table-meta">
                          Coverage cluster
                        </span>
                        </a>
                      </td>
                      <td>{cluster.type}</td>
                      <td>
                        {cluster.received} / {cluster.beneficiaries}
                      </td>
                      <td>
                        <span className="program-status active">Covered</span>
                      </td>
                      <td>{selectedProgram.latest}</td>
                      <td>
                        <span
                          className={`program-recipient-status ${cluster.received >= cluster.beneficiaries ? "received" : "pending"}`}
                        >
                          {cluster.received >= cluster.beneficiaries
                            ? "Received"
                            : "Not yet recorded"}
                        </span>
                      </td>
                        <td>
                          <button type="button" className="view-btn view-btn--secondary program-complete-button" onClick={(event) => { event.stopPropagation(); completeCluster(cluster); }} disabled={cluster.received >= cluster.beneficiaries}>
                            {cluster.received >= cluster.beneficiaries ? 'Done' : 'Mark done'}
                          </button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Reached</th>
                    <th>Latest activity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length ? (
                    filteredPrograms.map((program) => (
                      <tr key={program.id} className="program-clickable-row" onClick={() => navigate(`/program/${program.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/program/${program.id}`); }} tabIndex="0">
                        <td>
                          <a className="program-row-link" href={`/program/${program.id}`} onClick={(event) => event.stopPropagation()}>
                            <strong>{program.name}</strong>
                          <span className="program-table-meta">
                            {program.community} · {program.batch}
                          </span>
                          </a>
                        </td>
                        <td>{program.type}</td>
                        <td>{program.provider}</td>
                        <td>
                          {program.received} / {program.target}
                        </td>
                        <td>{program.latest}</td>
                        <td>{renderActionMenu(`main-${program.id}`, program)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No programs match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </section>

      {showBeneficiaryModal && selectedProgram && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowBeneficiaryModal(false)}
        >
          <form
            className="modal program-product-modal"
            onSubmit={saveBeneficiaryScope}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add beneficiary cluster</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowBeneficiaryModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="program-modal-context">
                {selectedProgram.name} · Choose the coverage cluster for this
                program.
              </p>
              <fieldset className="program-scope-options">
                <legend>Beneficiary scope</legend>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="School"
                    checked={beneficiaryScope === "School"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Whole school / community</span>
                  <small>
                    Cover all eligible beneficiaries in this school or
                    community.
                  </small>
                </label>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="Group"
                    checked={beneficiaryScope === "Group"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Group</span>
                  <small>Cover one group within the school or community.</small>
                </label>
                <label>
                  <input
                    type="radio"
                    name="beneficiary-scope"
                    value="Batch"
                    checked={beneficiaryScope === "Batch"}
                    onChange={(event) =>
                      setBeneficiaryScope(event.target.value)
                    }
                  />
                  <span>Batch</span>
                  <small>Cover one batch within the selected group.</small>
                </label>
              </fieldset>
              <label className="form-label" htmlFor="beneficiary-scope-school">
                1. Select school or community (you can choose more than one)
                <div id="beneficiary-scope-school" className="program-hierarchy-options">
                  {hierarchy.schools.map((school) => <label key={school.id} className="program-recipient">
                    <input type="checkbox" checked={scopeSchoolIds.includes(String(school.id))} onChange={() => {
                      const id = String(school.id);
                      setScopeSchoolIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                      setScopeGroupIds([]);
                      setScopeBatchIds([]);
                    }} />
                    <span>{school.name}</span>
                  </label>)}
                </div>
              </label>
              {beneficiaryScope !== "School" && (
                <label className="form-label" htmlFor="beneficiary-scope-group">
                  2. Select group within the chosen school(s)
                  <div id="beneficiary-scope-group" className="program-hierarchy-options">
                    {availableGroups.map((group) => <label key={group.id} className="program-recipient">
                      <input type="checkbox" checked={scopeGroupIds.includes(String(group.id))} onChange={() => {
                        const id = String(group.id);
                        setScopeGroupIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                        setScopeBatchIds([]);
                      }} />
                      <span>{group.name || group.group_name}</span>
                    </label>)}
                    {!scopeSchoolIds.length && <small>Choose a school first.</small>}
                  </div>
                </label>
              )}
              {beneficiaryScope === "Batch" && (
                <label className="form-label" htmlFor="beneficiary-scope-batch">
                  3. Select batch within the chosen group(s)
                  <div id="beneficiary-scope-batch" className="program-hierarchy-options">
                    {availableBatches.map((batch) => <label key={batch.id} className="program-recipient">
                      <input type="checkbox" checked={scopeBatchIds.includes(String(batch.id))} onChange={() => {
                        const id = String(batch.id);
                        setScopeBatchIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
                      }} />
                      <span>{batch.name || batch.batch_code}</span>
                    </label>)}
                    {!scopeGroupIds.length && <small>Choose a group first.</small>}
                  </div>
                </label>
              )}
              {scopeError && <p className="form-error" role="alert">{scopeError}</p>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowBeneficiaryModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add beneficiary cluster
              </button>
            </div>
          </form>
        </div>
      )}
      {showModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowModal(false)}
        >
          <form
            className="modal program-product-modal"
            onSubmit={saveProgram}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create program</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label" htmlFor="program-name">
                Program name
                <input
                  id="program-name"
                  className="form-input"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </label>
              <label className="form-label" htmlFor="program-type">
                Program type
                <select
                  id="program-type"
                  className="form-select"
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                >
                  <option>Feeding</option>
                  <option>Milk Subsidy</option>
                  <option>Vitamin / Supplement</option>
                  <option>Third-party Support</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="form-label" htmlFor="program-provider">
                Provider / partner
                <input
                  id="program-provider"
                  className="form-input"
                  value={form.provider}
                  onChange={(event) =>
                    setForm({ ...form, provider: event.target.value })
                  }
                  required
                />
              </label>
              <label className="form-label" htmlFor="program-description">
                Description
                <textarea
                  id="program-description"
                  className="form-input"
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <label className="form-label" htmlFor="program-beneficiary-type">
                Beneficiary type
                <select
                  id="program-beneficiary-type"
                  className="form-select"
                  value={form.beneficiaryType}
                  onChange={(event) =>
                    setForm({ ...form, beneficiaryType: event.target.value })
                  }
                >
                  <option>Mother</option>
                  <option>Child</option>
                  <option>Mother and Child</option>
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create active program
              </button>
            </div>
          </form>
        </div>
      )}
      {showActivityModal && selectedProgram && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowActivityModal(false)}
        >
          <form
            className="modal program-product-modal"
            onSubmit={(event) => {
              event.preventDefault();
              setShowActivityModal(false);
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Record activity</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowActivityModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="program-modal-context">
                {selectedProgram.name} · {selectedProgram.community} ·{" "}
                {selectedProgram.batch}
              </p>
              <label className="form-label" htmlFor="activity-date">
                Activity date
                <input
                  id="activity-date"
                  type="date"
                  className="form-input"
                  defaultValue="2026-08-26"
                  required
                />
              </label>
              <label className="form-label" htmlFor="activity-support">
                Support given
                <input
                  id="activity-support"
                  className="form-input"
                  defaultValue={selectedProgram.name}
                  required
                />
              </label>
              <div className="program-recipient-list">
                <div className="program-recipient-heading">
                  <strong>Recipients</strong>
                  <span>{checkedRecipients.length} selected</span>
                </div>
                {(selectedProgram.recipients || []).map((recipient) => (
                  <label key={recipient.id || recipient.name || recipient} className="program-recipient">
                    <input
                      type="checkbox"
                      checked={checkedRecipients.includes(recipient.id || recipient.name || recipient)}
                      onChange={() => toggleRecipient(recipient.id || recipient.name || recipient)}
                    />
                    <span>{recipient.name || recipient}</span>
                    <small>
                      {checkedRecipients.includes(recipient)
                        ? "Received"
                        : "Not yet recorded"}
                    </small>
                  </label>
                ))}
              </div>
              <label className="form-label" htmlFor="activity-status">
                Activity status
                <select
                  id="activity-status"
                  className="form-select"
                  value={activityStatus}
                  onChange={(event) => setActivityStatus(event.target.value)}
                >
                  <option>Open</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="form-label" htmlFor="activity-remarks">
                Remarks
                <textarea
                  id="activity-remarks"
                  className="form-input"
                  rows="2"
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowActivityModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save activity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
