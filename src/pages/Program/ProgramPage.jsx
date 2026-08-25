import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BatchesIcon,
  BuildingIcon,
  GroupsIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
} from "../Community/CommunityIcons";
import {
  beneficiaryNames,
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
  const [scopeName, setScopeName] = useState("");
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [actionProgram, setActionProgram] = useState(null);

  const filteredPrograms = useMemo(() => {
    return filterPrograms(programs, query, activeTab);
  }, [programs, query, activeTab]);

  const saveProgram = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) return;
    if (form.id) {
      setPrograms((current) => current.map((program) => program.id === form.id ? { ...program, ...form, name: form.name.trim(), provider: form.provider.trim() } : program));
      setForm(emptyProgram);
      setShowModal(false);
      return;
    }
    setPrograms((current) => [
      ...current,
      {
        ...form,
        id: Date.now(),
        name: form.name.trim(),
        provider: form.provider.trim(),
        status: "Active",
        target: 0,
        received: 0,
        activities: 0,
        latest: "No activity yet",
        ended: "",
        clusters: [],
        recipients: [],
      },
    ]);
    setForm(emptyProgram);
    setShowModal(false);
  };

  const selectedProgram = programId
    ? programs.find((program) => program.id === Number(programId))
    : programs.find((program) => program.id === Number(form.id)) || filteredPrograms[0];
  const selectedCluster = getCluster(selectedProgram, clusterType, clusterName);
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
    setPrograms((current) =>
      current.map((program) =>
        program.id === programToEnd.id
          ? { ...program, status: "Ended", ended: "Aug 26, 2026" }
          : program,
      ),
    );
    setForm(emptyProgram);
  };
  const saveBeneficiaryScope = (event) => {
    event.preventDefault();
    if (!selectedProgram || !scopeName.trim()) return;
    const cluster = {
      type: beneficiaryScope,
      name: scopeName.trim(),
      beneficiaries: 0,
      received: 0,
    };
    setPrograms((current) =>
      current.map((program) =>
        program.id === selectedProgram.id
          ? {
              ...program,
              clusters: program.clusters.some((item) => item.type === cluster.type && item.name.toLowerCase() === cluster.name.toLowerCase())
                ? program.clusters
                : [...program.clusters, cluster],
            }
          : program,
      ),
    );
    setShowBeneficiaryModal(false);
    setScopeName("");
  };
  const editProgram = () => {
    setForm(actionProgram || selectedProgram);
    setActiveActionMenu(null);
    setShowModal(true);
  };
  const deleteProgram = () => {
    const programToDelete = actionProgram || selectedProgram;
    if (!programToDelete || !window.confirm(`Delete ${programToDelete.name}?`)) return;
    setPrograms((current) => current.filter((program) => program.id !== programToDelete.id));
    setActiveActionMenu(null);
    navigate("/program");
  };
  const renderActionMenu = (menuId, menuProgram = selectedProgram) => (
    <div className="program-action-menu-wrap" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="program-more-button" aria-label="Program actions" aria-haspopup="true" aria-expanded={activeActionMenu === menuId} onClick={(event) => { event.stopPropagation(); setActionProgram(menuProgram); setActiveActionMenu(activeActionMenu === menuId ? null : menuId); }}><MoreVerticalIcon /></button>
      {activeActionMenu === menuId && <div className="actions-dropdown program-actions-dropdown" role="menu"><button type="button" className="actions-dropdown-item" onClick={editProgram} role="menuitem">Edit</button><button type="button" className="actions-dropdown-item" onClick={() => { setActiveActionMenu(null); endProgram(actionProgram); }} role="menuitem">End program</button><button type="button" className="actions-dropdown-item delete" onClick={deleteProgram} role="menuitem">Delete</button></div>}
    </div>
  );

  return (
    <div className="community-page program-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>
            {viewMode && selectedProgram ? selectedProgram.name : "Program"}
          </h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-current">Program</span>
          </nav>
        </div>
        <button
          className="btn-create-action"
          type="button"
          onClick={() =>
            viewMode ? setShowBeneficiaryModal(true) : setShowModal(true)
          }
        >
          <PlusIcon />
          <span>{viewMode ? "Add beneficiary" : "Create Program"}</span>
        </button>
      </header>

      {clusterView && selectedProgram && (
        <section className="program-cluster-subheader" aria-label="Program beneficiary clusters">
          <div className="program-cluster-tabs" role="tablist" aria-label="Program cluster levels">
            {[['School', 'Schools', BuildingIcon], ['Group', 'Groups', GroupsIcon], ['Batch', 'Batches', BatchesIcon]].map(([type, label, Icon]) => { const cluster = selectedProgram.clusters.find((item) => item.type === type); return <button key={type} type="button" role="tab" aria-selected={clusterType === type} className={`program-cluster-tab${clusterType === type ? ' active' : ''}`} onClick={() => cluster && navigate(`/program/${selectedProgram.id}/cluster/${type}/${encodeURIComponent(cluster.name)}`)} disabled={!cluster}><Icon /><span>{label}</span></button>; })}
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
                  {beneficiaryNames(selectedCluster.beneficiaries).map((beneficiary, index) => (
                    <tr key={beneficiary}>
                      <td>
                        <strong>{beneficiary}</strong>
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
                  {selectedProgram?.clusters.map((cluster) => (
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
                      <td>{renderActionMenu(`program-${cluster.type}-${cluster.name}`)}</td>
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
              <label className="form-label" htmlFor="beneficiary-scope-name">
                School, community, group, or batch name
                <input
                  id="beneficiary-scope-name"
                  className="form-input"
                  value={scopeName}
                  onChange={(event) => setScopeName(event.target.value)}
                  placeholder={
                    beneficiaryScope === "School"
                      ? "e.g. Cebu Community"
                      : beneficiaryScope === "Group"
                        ? "e.g. March Group"
                        : "e.g. March Batch"
                  }
                  required
                />
              </label>
              <p className="program-scope-note">
                Beneficiaries will be included by this cluster. Individual
                selection is not required.
              </p>
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
                {selectedProgram.recipients.map((recipient) => (
                  <label key={recipient} className="program-recipient">
                    <input
                      type="checkbox"
                      checked={checkedRecipients.includes(recipient)}
                      onChange={() => toggleRecipient(recipient)}
                    />
                    <span>{recipient}</span>
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
