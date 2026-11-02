import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import FloatingLayer from './ui/FloatingLayer';
import { getPageGuide, getRoleFlow, GUIDE_ROLES, normalizeGuideRole, ROLE_TOURS } from '../guides/kinFlowGuides.mjs';
import { ADDITIONAL_FIELD_HELP, CHECKUP_HELP } from '../guides/guidancePreferences.mjs';
import { useAuth } from '../auth/AuthProvider';
import { notifyAction } from './ActionFeedback';

const PAGE_LABELS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/community', label: 'Community' },
  { path: '/beneficiary', label: 'Beneficiary' },
  { path: '/monitoring', label: 'Monitor' },
  { path: '/program', label: 'Projects' },
  { path: '/progress-report', label: 'Progress Report' },
  { path: '/user-management', label: 'User Management' },
  { path: '/reports', label: 'Reports' },
];

function isTypingTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));
}

function findVisibleGuideTarget(targetName) {
  const target = document.querySelector(`[data-guide="${targetName}"]`);
  if (!target || target.closest('[hidden], [aria-hidden="true"]')) return null;
  return target.getClientRects().length > 0 ? target : null;
}

function GuideDialog({ mode, onClose, children, dialogRef }) {
  return createPortal(
    <div className={`kin-guide-overlay kin-guide-overlay--${mode}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="kin-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kin-guide-title"
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

export default function HelpCenter({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const role = normalizeGuideRole(currentUser?.role);
  const roleLabel = GUIDE_ROLES[role] || 'your role';
  const roleTourSteps = ROLE_TOURS[role] || [];
  const guidancePreferences = auth?.guidancePreferences;
  const saveGuidancePreferences = auth?.saveGuidancePreferences;
  const tourProgress = guidancePreferences?.tourRole === role
    ? guidancePreferences
    : { tourStatus: 'not_started', tourStep: 0 };
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [tourIndex, setTourIndex] = useState(0);
  const [visibleGuideSections, setVisibleGuideSections] = useState([]);
  const onboardingShownForUser = useRef(new Set());
  const lastGuidanceResetSequence = useRef(auth?.guidanceResetSequence || 0);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const highlightedElementRef = useRef(null);

  const tourSteps = useMemo(() => [
    {
      title: 'Show me around',
      body: `Here is a quick tour of your part as the ${roleLabel}.`,
      phase: 'Welcome',
    },
    ...roleTourSteps,
    {
      title: "You're all set",
      body: 'Tap the ? at the top any time to see this again.',
      phase: 'Finish',
    },
  ], [roleLabel, roleTourSteps]);
  const activeTourStep = dialogMode === 'tour' ? tourSteps[tourIndex] : null;
  const pageGuide = getPageGuide(location.pathname, currentUser?.role);
  const roleFlow = getRoleFlow(currentUser?.role);

  useEffect(() => {
    const resetSequence = auth?.guidanceResetSequence || 0;
    if (resetSequence === lastGuidanceResetSequence.current) return;
    lastGuidanceResetSequence.current = resetSequence;
    if (currentUser?.id) onboardingShownForUser.current.delete(currentUser.id);
  }, [auth?.guidanceResetSequence, currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (
      !userId
      || auth?.guidancePreferencesLoading
      || auth?.guidancePreferencesError
      || !guidancePreferences
      || !guidancePreferences.onboardingEnabled
      || guidancePreferences.onboardingCompleted
      || guidancePreferences.onboardingDismissed
      || onboardingShownForUser.current.has(userId)
    ) return;
    onboardingShownForUser.current.add(userId);
    setDialogMode('welcome');
  }, [
    auth?.guidancePreferencesError,
    auth?.guidancePreferencesLoading,
    currentUser?.id,
    guidancePreferences,
  ]);

  useEffect(() => {
    if (!dialogMode) return undefined;
    dialogRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        const focusable = Array.from(dialog?.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') || []);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog?.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (dialogMode !== 'tour' || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight' && tourIndex < tourSteps.length - 1) {
        event.preventDefault();
        const nextIndex = tourIndex + 1;
        setTourIndex(nextIndex);
        saveGuidancePreferences?.({
          tourStatus: 'in_progress',
          tourStep: nextIndex,
          onboardingCompleted: true,
        }).catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
      } else if (event.key === 'ArrowLeft' && tourIndex > 0) {
        event.preventDefault();
        const previousIndex = tourIndex - 1;
        setTourIndex(previousIndex);
        saveGuidancePreferences?.({
          tourStatus: 'in_progress',
          tourStep: previousIndex,
        }).catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialogMode, saveGuidancePreferences, tourIndex, tourSteps.length]);

  useEffect(() => {
    if (dialogMode !== 'tour' || !activeTourStep) return undefined;
    if (activeTourStep.to && location.pathname !== activeTourStep.to) {
      navigate(activeTourStep.to);
      return undefined;
    }

    if (!activeTourStep.target) return undefined;
    let attempts = 0;
    let timer;
    const highlightTarget = () => {
      const target = findVisibleGuideTarget(activeTourStep.target)
        || (attempts >= 19 ? findVisibleGuideTarget('page-title') : null);
      attempts += 1;
      if (target) {
        target.scrollIntoView({
          block: window.innerWidth <= 680 ? 'start' : 'center',
          behavior: 'smooth',
        });
        target.classList.add('kin-tour-highlight');
        highlightedElementRef.current = target;
        window.clearInterval(timer);
        return;
      }
      if (attempts >= 20) window.clearInterval(timer);
    };

    highlightTarget();
    if (!highlightedElementRef.current) timer = window.setInterval(highlightTarget, 150);
    return () => {
      window.clearInterval(timer);
      highlightedElementRef.current?.classList.remove('kin-tour-highlight');
      highlightedElementRef.current = null;
    };
  }, [activeTourStep, dialogMode, location.pathname, navigate]);

  const closeDialog = () => {
    if (dialogMode === 'tour') {
      saveGuidancePreferences?.({
        tourStatus: 'in_progress',
        tourStep: tourIndex,
        onboardingCompleted: true,
      }).catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
    } else if (dialogMode === 'welcome') {
      saveGuidancePreferences?.({
        onboardingCompleted: true,
        onboardingDismissed: true,
      }).catch((error) => notifyAction(error.message || 'Unable to save onboarding status', 'error'));
    }
    setDialogMode(null);
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };

  const startTour = (resume = tourProgress.tourStatus === 'in_progress') => {
    setMenuOpen(false);
    const startIndex = resume
      ? Math.min(tourProgress.tourStep, tourSteps.length - 1)
      : 0;
    setTourIndex(startIndex);
    setDialogMode('tour');
    saveGuidancePreferences?.({
      onboardingCompleted: true,
      onboardingDismissed: false,
      tourStatus: 'in_progress',
      tourStep: startIndex,
    }).catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
  };

  const finishTour = async (dismissed = false) => {
    try {
      await saveGuidancePreferences?.({
        onboardingCompleted: true,
        onboardingDismissed: dismissed,
        tourStatus: dismissed ? 'not_started' : 'completed',
        tourStep: dismissed ? 0 : tourIndex,
      });
    } catch (error) {
      notifyAction(error.message || 'Unable to save tour progress', 'error');
    }
    setDialogMode(null);
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };

  const advanceTour = (skip = false) => {
    if (tourIndex >= tourSteps.length - 1) {
      finishTour();
      return;
    }
    const nextIndex = tourIndex + 1;
    setTourIndex(nextIndex);
    saveGuidancePreferences?.({
      tourStatus: 'in_progress',
      tourStep: nextIndex,
      onboardingCompleted: true,
    }).catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
    if (skip) notifyAction('Tour step skipped', 'info');
  };

  const openExplanation = () => {
    setVisibleGuideSections(pageGuide.sections.filter((section) => (
      findVisibleGuideTarget(section.target)
    )));
    setMenuOpen(false);
    setDialogMode('explain');
  };

  const openFlow = () => {
    setMenuOpen(false);
    setDialogMode('flow');
  };

  const openFlowFromWelcome = async () => {
    try {
      await saveGuidancePreferences?.({ onboardingCompleted: true, onboardingDismissed: false });
    } catch (error) {
      notifyAction(error.message || 'Unable to save onboarding status', 'error');
    }
    setDialogMode('flow');
  };

  const openFieldDefinitions = () => {
    setMenuOpen(false);
    setDialogMode('terms');
  };

  const goToPage = (path) => {
    closeDialog();
    navigate(path);
  };

  return (
    <>
      <span className="action-wrapper kin-help-wrapper">
        <button
          ref={triggerRef}
          type="button"
          className="icon-button kin-help-trigger"
          aria-label="Help and guides"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ?
        </button>
        <FloatingLayer
          open={menuOpen}
          anchorRef={triggerRef}
          onDismiss={() => setMenuOpen(false)}
          className="dropdown kin-help-menu"
          role="menu"
          aria-label="Help and guides"
        >
          {guidancePreferences?.guidedToursEnabled !== false && roleTourSteps.length > 0 && (
            <button type="button" className="kin-help-menu-item" role="menuitem" onClick={() => startTour()}>
              <strong>{tourProgress.tourStatus === 'in_progress' ? 'Resume tour' : tourProgress.tourStatus === 'completed' ? 'Restart tour' : 'Show me around'}</strong>
              <span>{tourProgress.tourStatus === 'in_progress' ? `Continue at step ${tourProgress.tourStep + 1} of ${tourSteps.length}` : 'A quick tour of your main pages'}</span>
            </button>
          )}
          {guidancePreferences?.pageExplanationsEnabled !== false && (
            <button type="button" className="kin-help-menu-item" role="menuitem" onClick={openExplanation}>
              <strong>Explain this page</strong>
              <span>What the controls here do</span>
            </button>
          )}
          {guidancePreferences?.workflowGuideEnabled !== false && (
            <button type="button" className="kin-help-menu-item" role="menuitem" onClick={openFlow}>
              <strong>How it works</strong>
              <span>Your role's tasks, step by step</span>
            </button>
          )}
          <button type="button" className="kin-help-menu-item" role="menuitem" onClick={openFieldDefinitions}>
            <strong>Field definitions</strong>
            <span>Check-up terms and screening indicators</span>
          </button>
        </FloatingLayer>
      </span>

      {dialogMode === 'welcome' && (
        <GuideDialog mode="welcome" onClose={closeDialog} dialogRef={dialogRef}>
          <div className="kin-guide-header">
            <div>
              <span className="kin-guide-eyebrow">Welcome to F1KD</span>
              <h2 id="kin-guide-title">A guide for your {roleLabel} account</h2>
            </div>
          </div>
          <p className="kin-guide-body">Your account is set up for your assigned role. You can take a short tour, review your role's workflow, or skip this and explore on your own.</p>
          <div className="kin-guide-footer kin-guide-footer--welcome">
            <button type="button" className="kin-guide-secondary" onClick={closeDialog}>Not now</button>
            {guidancePreferences?.workflowGuideEnabled !== false && roleFlow && (
              <button type="button" className="kin-guide-secondary" onClick={openFlowFromWelcome}>How it works</button>
            )}
            {guidancePreferences?.guidedToursEnabled !== false && roleTourSteps.length > 0 && (
              <button type="button" className="kin-guide-primary" onClick={() => startTour(false)}>Start my tour</button>
            )}
          </div>
        </GuideDialog>
      )}

      {dialogMode === 'tour' && activeTourStep && (
        <GuideDialog mode="tour" onClose={closeDialog} dialogRef={dialogRef}>
          <div className="kin-guide-header">
            <div>
              <span className="kin-guide-eyebrow">{activeTourStep.phase}</span>
              <h2 id="kin-guide-title">{activeTourStep.title}</h2>
            </div>
            <button type="button" className="kin-guide-close" onClick={closeDialog} aria-label="Close tour">×</button>
          </div>
          <p className="kin-guide-body">{activeTourStep.body}</p>
          {activeTourStep.points?.length > 0 && (
            <ul className="kin-guide-points">
              {activeTourStep.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          )}
          {activeTourStep.to && (
            <button type="button" className="kin-guide-current-page" onClick={() => goToPage(activeTourStep.to)}>
              Open {PAGE_LABELS.find((page) => activeTourStep.to.startsWith(page.path))?.label || 'this page'}
            </button>
          )}
          <div className="kin-guide-footer">
            <span>Step {tourIndex + 1} of {tourSteps.length}</span>
            <div>
              <button type="button" className="kin-guide-secondary" onClick={() => finishTour(true)}>Exit tour</button>
              <button type="button" className="kin-guide-secondary" onClick={() => advanceTour(true)}>Skip step</button>
              {tourIndex > 0 && (
                <button
                  type="button"
                  className="kin-guide-secondary"
                  onClick={() => {
                    const previousIndex = tourIndex - 1;
                    setTourIndex(previousIndex);
                    saveGuidancePreferences?.({ tourStatus: 'in_progress', tourStep: previousIndex })
                      .catch((error) => notifyAction(error.message || 'Unable to save tour progress', 'error'));
                  }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="kin-guide-primary"
                onClick={() => advanceTour()}
              >
                {tourIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </GuideDialog>
      )}

      {dialogMode === 'terms' && (
        <GuideDialog mode="terms" onClose={closeDialog} dialogRef={dialogRef}>
          <div className="kin-guide-header">
            <div>
              <span className="kin-guide-eyebrow">Field definitions</span>
              <h2 id="kin-guide-title">Check-up terms and results</h2>
            </div>
            <button type="button" className="kin-guide-close" onClick={closeDialog} aria-label="Close field definitions">×</button>
          </div>
          {Object.entries(CHECKUP_HELP).map(([category, definitions]) => (
            <section className="kin-guide-glossary" key={category}>
              <h3>{category === 'maternal' ? 'Maternal check-up' : 'Child check-up'}</h3>
              <dl>
                {Object.values(definitions).map(({ label, content }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{content}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {Object.values(ADDITIONAL_FIELD_HELP).map(({ label, definitions }) => (
            <section className="kin-guide-glossary" key={label}>
              <h3>{label}</h3>
              <dl>
                {definitions.map(({ label: term, content }) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{content}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <div className="kin-guide-footer">
            <span>Information only; not a diagnosis</span>
            <button type="button" className="kin-guide-primary" onClick={closeDialog}>Done</button>
          </div>
        </GuideDialog>
      )}

      {dialogMode === 'explain' && (
        <GuideDialog mode="explain" onClose={closeDialog} dialogRef={dialogRef}>
          <div className="kin-guide-header">
            <div>
              <span className="kin-guide-eyebrow">This page</span>
              <h2 id="kin-guide-title">{findVisibleGuideTarget('page-title')?.textContent?.trim() || pageGuide.title}</h2>
            </div>
            <button type="button" className="kin-guide-close" onClick={closeDialog} aria-label="Close page guide">×</button>
          </div>
          <p className="kin-guide-body">{pageGuide.description}</p>
          {visibleGuideSections.length > 0 ? (
            <ul className="kin-explain-list">
              {visibleGuideSections.map((section) => (
                <li key={section.target}>
                  <strong>{section.title}</strong>
                  <span>{section.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kin-guide-note">Use the page heading and the available controls to review this section.</p>
          )}
          <div className="kin-guide-footer">
            <span>{roleLabel}</span>
            <button type="button" className="kin-guide-primary" onClick={closeDialog}>Done</button>
          </div>
        </GuideDialog>
      )}

      {dialogMode === 'flow' && (
        <GuideDialog mode="flow" onClose={closeDialog} dialogRef={dialogRef}>
          <div className="kin-guide-header">
            <div>
              <span className="kin-guide-eyebrow">How it works</span>
              <h2 id="kin-guide-title">{roleFlow ? `How it works for ${roleLabel}` : 'How it works'}</h2>
            </div>
            <button type="button" className="kin-guide-close" onClick={closeDialog} aria-label="Close workflow guide">×</button>
          </div>
          {roleFlow ? (
            <>
              <div className="kin-flow-setup">
                <strong>Your role</strong>
                <p>{roleFlow.what}</p>
              </div>
              <p className="kin-flow-caption">Suggested steps for your role. Once, Daily, and Weekly are guidance, not an enforced schedule.</p>
              <section className="kin-flow-role-detail" aria-live="polite">
                <div className="kin-flow-role-heading">
                  <div>
                    <span className="kin-guide-eyebrow">Your steps</span>
                    <h3>{GUIDE_ROLES[role]}</h3>
                  </div>
                  <span className="kin-flow-you">Your role</span>
                </div>
                <div className="kin-flow-task-groups">
                  {[
                    ['Once', roleFlow.once],
                    ['Daily', roleFlow.daily],
                    ['Weekly', roleFlow.weekly],
                  ].map(([label, tasks]) => (
                    <div className="kin-flow-task-group" key={label}>
                      <h4>{label}</h4>
                      <ul>
                        {tasks.map((task) => (
                          <li key={`${task.text}-${task.path}`}>
                            <span>{task.text}</span>
                            <small>{task.path}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="kin-flow-setup">
              <strong>Role-specific guide unavailable</strong>
              <p>There is no workflow guide configured for this account role yet.</p>
            </div>
          )}
          <div className="kin-guide-footer">
            <span>{roleFlow ? `${roleLabel} workflow` : 'F1KD workflow'}</span>
            <button type="button" className="kin-guide-primary" onClick={closeDialog}>Done</button>
          </div>
        </GuideDialog>
      )}
    </>
  );
}
