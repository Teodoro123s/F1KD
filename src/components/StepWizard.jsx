import React from 'react';

const StepWizard = ({
  mother,
  activeTrimester = 1,
  activeStep = 1,
  startStep = 0,
  onStepClick = () => {},
  navigationDisabled = false,
  checkups = [],
}) => {
  const groups = [
    { id: 1, label: '1st Trimester' },
    { id: 2, label: '2nd Trimester' },
    { id: 3, label: '3rd Trimester' },
  ];

  const flattenedSteps = groups.flatMap((group, groupIdx) =>
    [0, 1, 2].map((stepIdx) => ({ group, groupIdx, stepIdx }))
  );

  const getStatus = (groupIdx, stepIdx, checkupIndex) => {
    const item = checkups?.[groupIdx]?.[stepIdx];
    if (checkupIndex < startStep) return 'excluded';
    if (item?.completed) return 'completed';
    const isActive = activeTrimester === groupIdx + 1 && activeStep === stepIdx + 1;
    if (isActive) return 'in-progress';
    return 'locked';
  };

  const isPhaseComplete = flattenedSteps.every(({ groupIdx, stepIdx, group }) => {
    const stepIndex = groupIdx * 3 + stepIdx;
    return stepIndex < startStep || checkups?.[group.id - 1]?.[stepIdx]?.completed;
  });

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
              const stepIndex = groupIdx * 3 + stepIdx;
              const status = getStatus(groupIdx, stepIdx, stepIndex);
              const isActive = !isPhaseComplete && activeTrimester === groupIdx + 1 && activeStep === stepIdx + 1;
              const lineActive = status === 'completed';
              const checkup = checkups?.[groupIdx]?.[stepIdx];
              const isExcluded = stepIndex < startStep;
              const screeningStatus = String(checkup?.developmentalStatus ?? checkup?.developmental_status ?? '').trim();
              const screeningClass = !checkup?.completed ? '' : screeningStatus === 'At Risk'
                ? 'at-risk'
                : screeningStatus === 'Needs Follow-up' ? 'needs-follow-up' : screeningStatus === 'Normal' ? 'normal-screening' : '';

              return (
                <div key={`${group.id}-${stepIdx}`} className="step-wizard-step-wrapper">
                  <button
                    type="button"
                    className={`step-wizard-step ${status} ${screeningClass} ${isExcluded ? 'excluded' : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => onStepClick(group.id, stepIdx + 1)}
                    aria-label={`Trimester ${group.id} ${stepIdx + 1} ${status}${isExcluded ? ', not counted toward monitoring progress' : ''}${screeningStatus ? `, developmental screening ${screeningStatus}` : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                    aria-describedby={isExcluded ? `step-wizard-excluded-${stepIndex}` : undefined}
                    disabled={navigationDisabled && !isExcluded}
                  >
                    <div className="step-wizard-step-circle">
                      {status === 'completed' ? '✓' : `T${group.id}-C${stepIdx + 1}`}
                    </div>
                    {isExcluded && (
                      <span id={`step-wizard-excluded-${stepIndex}`} className="step-wizard-step-label">
                        Not counted
                      </span>
                    )}
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
