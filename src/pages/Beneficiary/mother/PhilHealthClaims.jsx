import React, { useEffect, useState } from 'react';
import { formatDateForDisplay } from '../../../utils/dateFormat';
import {
  apiCreateMotherClaim,
  apiGetMotherClaims,
  apiUpdateMotherClaim,
} from '../../../api/mothers';

const CLAIM_STATUSES = ['Draft', 'Submitted', 'Approved', 'Denied', 'Paid'];
const EMPTY_FORM = {
  claimReference: '',
  claimDate: '',
  status: 'Draft',
  amount: '',
  notes: '',
};

export default function PhilHealthClaims({ motherId, canManage }) {
  const [claims, setClaims] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadClaims = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGetMotherClaims(motherId);
      setClaims(Array.isArray(result?.claims) ? result.claims : []);
    } catch (loadError) {
      setClaims([]);
      setError(loadError.message || 'Unable to load PhilHealth claim records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [motherId]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await apiUpdateMotherClaim(motherId, editingId, form);
      } else {
        await apiCreateMotherClaim(motherId, form);
      }
      resetForm();
      await loadClaims();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save PhilHealth claim record.');
    } finally {
      setSaving(false);
    }
  };

  const editClaim = (claim) => {
    setEditingId(claim.id);
    setForm({
      claimReference: claim.claimReference || '',
      claimDate: String(claim.claimDate || '').slice(0, 10),
      status: claim.status || 'Draft',
      amount: claim.amount === null || claim.amount === undefined ? '' : String(claim.amount),
      notes: claim.notes || '',
    });
    setError('');
  };

  return (
    <section className="mother-detail-section mother-philhealth-claims-section">
      <h3 className="mother-detail-section-title">PhilHealth Claim Records</h3>
      <p className="mother-claims-note">
        Internal tracking only; this does not submit a claim to PhilHealth.
      </p>

      {canManage && (
        <form className="mother-claims-form" onSubmit={submitClaim}>
          <div className="form-row-2 full-width">
            <div className="form-group">
              <label className="form-label" htmlFor="claim-reference">Claim reference</label>
              <input
                className="form-input"
                id="claim-reference"
                name="claimReference"
                maxLength={80}
                value={form.claimReference}
                onChange={updateField}
                placeholder="Optional until assigned"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="claim-date">Claim date</label>
              <input
                className="form-input"
                id="claim-date"
                name="claimDate"
                type="date"
                required
                value={form.claimDate}
                onChange={updateField}
              />
            </div>
          </div>

          <div className="form-row-2 full-width">
            <div className="form-group">
              <label className="form-label" htmlFor="claim-status">Status</label>
              <select className="form-input" id="claim-status" name="status" value={form.status} onChange={updateField}>
                {CLAIM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="claim-amount">Amount (PHP)</label>
              <input
                className="form-input"
                id="claim-amount"
                name="amount"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                value={form.amount}
                onChange={updateField}
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label className="form-label" htmlFor="claim-notes">Notes</label>
            <textarea
              className="form-input"
              id="claim-notes"
              name="notes"
              rows="3"
              maxLength={1000}
              value={form.notes}
              onChange={updateField}
            />
          </div>

          <div className="mother-detail-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update claim record' : 'Add claim record'}
            </button>
            {editingId && (
              <button className="btn-secondary" type="button" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <p className="mother-detail-empty">Loading PhilHealth claims…</p>
      ) : claims.length ? (
        <div className="mother-detail-table-wrap">
          <table className="mother-detail-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount (PHP)</th>
                <th>Notes</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.claimReference || 'Not assigned'}</td>
                  <td>{formatDateForDisplay(claim.claimDate)}</td>
                  <td>{claim.status}</td>
                  <td>{Number(claim.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{claim.notes || '—'}</td>
                  {canManage && (
                    <td>
                      <button className="btn-secondary" type="button" onClick={() => editClaim(claim)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mother-detail-empty">No PhilHealth claim records.</p>
      )}
    </section>
  );
}
