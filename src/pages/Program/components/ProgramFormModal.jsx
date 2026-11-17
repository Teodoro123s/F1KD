import React from 'react';
import { createPortal } from 'react-dom';
import { formFieldClasses, formLabelClasses } from '../../../utils/formFieldClasses';
import {
  getModalBackdropClasses,
  getModalSurfaceClasses,
  modalHeaderSectionClasses,
  modalCloseClasses,
  modalBodyClasses,
  modalFooterClasses,
} from '../../../components/ui/modalClasses';

export default function ProgramFormModal({ form, setForm, onSubmit, onClose }) {
  return createPortal(
    <div
      className={`modal-backdrop${form.id ? ' program-edit-drawer-backdrop' : ''} ${getModalBackdropClasses({ drawer: Boolean(form.id) })}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className={`modal program-product-modal${form.id ? ' program-edit-drawer' : ''} ${getModalSurfaceClasses()}`}
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`modal-header ${modalHeaderSectionClasses}`}>
          <h2>{form.id ? 'Edit project' : 'Create project'}</h2>
          <button type="button" className={`modal-close ${modalCloseClasses}`} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={`modal-body ${modalBodyClasses}`}>
          <label className={`${formLabelClasses} form-label`} htmlFor="program-name">
            Project name <span className="form-required-indicator" aria-hidden="true">*</span>
            <input
              id="program-name"
              className={`${formFieldClasses} form-input`}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className={`${formLabelClasses} form-label`} htmlFor="program-type">
            Project type <span className="form-required-indicator" aria-hidden="true">*</span>
            <select
              id="program-type"
              className={`${formFieldClasses} form-select`}
              value={form.type}
              required
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option>Feeding</option>
              <option>Milk Subsidy</option>
              <option>Vitamin / Supplement</option>
              <option>Community Talk</option>
              <option value="Other">Others</option>
            </select>
          </label>
          <label className={`${formLabelClasses} form-label`} htmlFor="program-provider">
            Provider / partner <span className="form-required-indicator" aria-hidden="true">*</span>
            <input
              id="program-provider"
              className={`${formFieldClasses} form-input`}
              value={form.provider}
              onChange={(event) => setForm({ ...form, provider: event.target.value })}
              required
            />
          </label>
          <label className={`${formLabelClasses} form-label`} htmlFor="program-description">
            Description <span className="form-optional-indicator">(Optional)</span>
            <textarea
              id="program-description"
              className={`${formFieldClasses} form-input`}
              rows="3"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className={`${formLabelClasses} form-label`} htmlFor="program-beneficiary-type">
            Beneficiary type <span className="form-required-indicator" aria-hidden="true">*</span>
            <select
              id="program-beneficiary-type"
              className={`${formFieldClasses} form-select`}
              value={form.beneficiaryType}
              required
              onChange={(event) => setForm({ ...form, beneficiaryType: event.target.value })}
            >
              <option>Mother</option>
              <option>Child</option>
            </select>
          </label>
        </div>
        <div className={`modal-footer ${modalFooterClasses}`}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{form.id ? 'Review changes' : 'Create active project'}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
