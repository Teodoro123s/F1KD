import React from 'react';

const StepWizard = ({
  mother,
  activeTrimester = 1,
  activeStep = 1,
  onStepClick = () => {},
  checkups = [],
}) => {
  const groups = [
    { id: 1, label: '1st Trimester' },
    { id: 2, label: '2nd Trimester' },
    { id: 3, label: '3rd Trimester' },
  ];

  const isPreviousStepsComplete = (groupIdx, stepIdx) => {
    for (let gi = 0; gi <= groupIdx; gi += 1) {
      for (let si = 0; si < 3; si += 1) {
        if (gi === groupIdx && si >= stepIdx) break;
        if (!checkups?.[gi]?.[si]?.completed) return false;
      }
    }
    return true;
  };

  const getStatus = (groupIdx, stepIdx) => {
    const item = checkups?.[groupIdx]?.[stepIdx];
    if (item?.completed) return 'completed';
    if (activeTrimester === groupIdx + 1 && activeStep === stepIdx + 1) return 'active';
    if (isPreviousStepsComplete(groupIdx, stepIdx)) return 'available';
    return 'locked';
  };

  const flattenedSteps = groups.flatMap((group, groupIdx) =>
    [0, 1, 2].map((stepIdx) => ({ group, groupIdx, stepIdx }))
  );

  return (
    <div className="step-wizard">
      <div className="step-wizard-body">
        <div className="step-wizard-trimesters-header">
          {groups.map((group) => (
            <div key={group.id} className="step-wizard-trimester-header">
              <span className="step-wizard-trimester-label">{group.label}</span>
            </div>
          ))}
        </div>

        <div className="step-wizard-steps-wrapper">
          <div className="step-wizard-steps">
            {flattenedSteps.map(({ group, groupIdx, stepIdx }, index) => {
              const status = getStatus(groupIdx, stepIdx);
              const isActive = status === 'active';
              const stepIndex = groupIdx * 3 + stepIdx;
              const lineActive = status === 'completed';

              return (
                <div key={`${group.id}-${stepIdx}`} className="step-wizard-step-wrapper">
                  <button
                    type="button"
                    className={`step-wizard-step ${status} ${isActive ? 'active' : ''}`}
                    onClick={() => status !== 'locked' && onStepClick(group.id, stepIdx + 1)}
                    disabled={status === 'locked'}
                    aria-label={`Trimester ${group.id} ${stepIdx + 1} ${status}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="step-wizard-step-circle">
                      {status === 'completed' ? '✓' : `T${group.id}-C${stepIdx + 1}`}
                    </div>
                  </button>
                  {index < flattenedSteps.length - 1 && (
                    <div className={`step-wizard-step-line ${lineActive ? 'active' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepWizard;
