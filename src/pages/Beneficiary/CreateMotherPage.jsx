import React from 'react';
import { MotherFormFields } from './BeneficiaryMother';

export default function CreateMotherPage({
  communities,
  groups,
  batches,
  createActiveTab,
  setCreateActiveTab,
  createActiveIndex,
  CREATE_STEPS,
  handleCreateCommunity,
  communityForm,
  setCommunityForm,
  navigate,
}) {
  return (
    <section className="tabs-row create-view">
      <div className="stepper-progress">
        <div className="stepper-steps" role="tablist">
          {CREATE_STEPS.map((s, i) => {
            const label = s === 'general' ? 'General' : s === 'prenatal' ? 'Prenatal/OB' : s === 'medical_dental' ? 'Medical & Dental' : 'Vaccine';
            const isActive = createActiveTab === s;
            const isCompleted = i < createActiveIndex;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setCreateActiveTab(s)}
              >
                <span className="stepper-step-index">
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="stepper-step-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="create-form-body">
        <form onSubmit={handleCreateCommunity}>
          <div className="modal-body-scrollable">
            <MotherFormFields
              activeTab={createActiveTab}
              form={communityForm}
              setForm={setCommunityForm}
              communities={communities}
              groups={groups}
              batches={batches}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => navigate('/beneficiary')}>Cancel</button>
            {createActiveTab !== 'general' && (
              <button type="button" className="btn-secondary btn-back" onClick={() => {
                if (createActiveTab === 'vaccine') setCreateActiveTab('medical_dental');
                else if (createActiveTab === 'medical_dental') setCreateActiveTab('prenatal');
                else setCreateActiveTab('general');
              }}>Back</button>
            )}
            {createActiveTab !== 'vaccine' ? (
              <button type="button" className="btn-primary btn-next" onClick={() => {
                if (createActiveTab === 'general') setCreateActiveTab('prenatal');
                else if (createActiveTab === 'prenatal') setCreateActiveTab('medical_dental');
                else if (createActiveTab === 'medical_dental') setCreateActiveTab('vaccine');
              }}>Next</button>
            ) : (
              <button type="submit" className="btn-primary">Create</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
