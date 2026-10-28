import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { normalizeRole } from '../utils/permissions';
import { getPageControls, getPageGuide, getRoleEntries, getRoleFlow } from './flowContent.mjs';

const KinFlowContext = createContext(null);
const STORAGE_PREFIX = 'f1kd:kin-flow:onboarding:';
const PAGE_TARGET = '[data-kin-flow-target="page-content"]';

const NAV_LABELS = {
  '/dashboard': 'Dashboard',
  '/community': 'Community',
  '/beneficiary': 'Beneficiary',
  '/monitoring': 'Monitor',
  '/program': 'Projects',
  '/progress-report': 'Progress Report',
  '/user-management': 'User Management',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

function getNavigationTarget(path) {
  const label = NAV_LABELS[path];
  return label ? `[data-kin-flow-nav="${label}"]` : PAGE_TARGET;
}

function getOnboardingSteps(role) {
  const flow = getRoleFlow(role);
  if (!flow) return [];
  const steps = [{
    title: `Welcome, ${flow.label}`,
    body: 'Let’s look at the first pages for your role. You can skip this guide at any time.',
    target: getNavigationTarget('/dashboard'),
  }];
  const seenPaths = new Set();
  flow.once.forEach((item) => {
    if (seenPaths.has(item.path)) return;
    seenPaths.add(item.path);
    steps.push({ ...item, title: 'Set up first', target: getNavigationTarget(item.path) });
  });
  steps.push({
    title: 'You’re ready to begin',
    body: 'Use the actual pages to complete any setup you need. Nothing is created automatically.',
    target: '[data-kin-flow-help]',
  });
  return steps;
}

function getTourSteps(role) {
  const flow = getRoleFlow(role);
  if (!flow) return [];
  const steps = [{
    title: `Welcome, ${flow.label}`,
    body: 'Here is a quick tour of your part in MCHMS.',
    target: getNavigationTarget('/dashboard'),
  }];
  [
    ['Set up first', flow.once],
    ['Every day', flow.daily],
    ['Every week', flow.weekly],
  ].forEach(([section, tasks]) => {
    tasks.forEach((item) => {
      steps.push({ ...item, title: section, target: getNavigationTarget(item.path) });
    });
  });
  steps.push({
    title: 'You’re all set',
    body: 'Tap the ? at the top any time to see this again.',
    target: '[data-kin-flow-help]',
  });
  return steps;
}

export function KinFlowProvider({ children }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSteps, setActiveSteps] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [storageError, setStorageError] = useState('');
  const highlightedElement = useRef(null);
  const onboardingAttemptedUsers = useRef(new Set());
  const role = normalizeRole(auth.currentUser?.role);
  const flow = getRoleFlow(role);
  const pageGuide = useMemo(() => getPageGuide(location.pathname), [location.pathname]);

  const markOnboardingComplete = useCallback(() => {
    const userId = auth.currentUser?.id;
    if (!userId || typeof window === 'undefined') return;
    onboardingAttemptedUsers.current.add(String(userId));
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, 'done');
      setStorageError('');
    } catch (error) {
      console.error('[KinFlow] Unable to save onboarding state:', error);
      setStorageError('Your browser could not save this. The guide may appear again next time.');
    }
  }, [auth.currentUser?.id]);

  const closeGuide = useCallback(() => {
    if (mode === 'onboarding') markOnboardingComplete();
    setMode(null);
    setActiveSteps([]);
    setStepIndex(0);
    window.setTimeout(() => {
      document.querySelector('[data-kin-flow-help]')?.focus({ preventScroll: true });
    }, 0);
  }, [markOnboardingComplete, mode]);

  const startTour = useCallback((onboarding = false) => {
    const steps = onboarding ? getOnboardingSteps(role) : getTourSteps(role);
    if (!steps.length) {
      setStorageError('A guided flow is not available for this account role.');
      return;
    }
    setStorageError('');
    setActiveSteps(steps);
    setStepIndex(0);
    setMode(onboarding ? 'onboarding' : 'tour');
    if (steps[0].path && location.pathname !== steps[0].path) navigate(steps[0].path);
  }, [location.pathname, navigate, role]);

  const startExplain = useCallback(() => {
    const container = document.querySelector(PAGE_TARGET);
    const controls = getPageControls(container);
    const steps = [
      {
        title: pageGuide[0],
        body: pageGuide[1],
        target: PAGE_TARGET,
      },
      ...(controls.length
        ? [{
          title: 'Things you can use here',
          body: 'These are the visible controls on this page. Actions shown depend on your role.',
          points: controls,
          target: PAGE_TARGET,
        }]
        : [{
          title: 'Things you can use here',
          body: 'There are no visible actions on this page right now.',
          target: PAGE_TARGET,
        }]),
    ];
    setActiveSteps(steps);
    setStepIndex(0);
    setMode('explain');
  }, [pageGuide]);

  const startHowItWorks = useCallback(() => {
    setSelectedRole(role);
    setMode('map');
  }, [role]);

  useEffect(() => {
    if (['tour', 'onboarding', 'explain'].includes(mode)) {
      window.setTimeout(() => {
        document.querySelector('.kin-flow-tour-card .kin-flow-primary')?.focus({ preventScroll: true });
      }, 0);
    }
  }, [mode]);

  const nextStep = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= activeSteps.length) {
      closeGuide();
      return;
    }
    setStepIndex(nextIndex);
    const nextStepData = activeSteps[nextIndex];
    if (nextStepData.path && location.pathname !== nextStepData.path) {
      navigate(nextStepData.path);
    }
  }, [activeSteps, closeGuide, location.pathname, navigate, stepIndex]);

  const previousStep = useCallback(() => {
    const previousIndex = Math.max(0, stepIndex - 1);
    setStepIndex(previousIndex);
    const previousStepData = activeSteps[previousIndex];
    if (previousStepData?.path && location.pathname !== previousStepData.path) {
      navigate(previousStepData.path);
    }
  }, [activeSteps, location.pathname, navigate, stepIndex]);

  useEffect(() => {
    const userId = auth.currentUser?.id;
    const userKey = String(userId || '');
    if (auth.loading || !auth.isAuthenticated || !auth.currentUser?.has_accepted_terms || !userId || mode
      || onboardingAttemptedUsers.current.has(userKey)) return;
    let completed = false;
    let readFailed = false;
    try {
      completed = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === 'done';
    } catch (error) {
      console.error('[KinFlow] Unable to read onboarding state:', error);
      readFailed = true;
    }
    onboardingAttemptedUsers.current.add(userKey);
    if (!completed) {
      startTour(true);
      if (readFailed) setStorageError('Your browser could not save onboarding progress. You can still use and skip the guide.');
    }
  }, [auth.currentUser, auth.isAuthenticated, auth.loading, mode, startTour]);

  useEffect(() => {
    if (!['tour', 'onboarding', 'explain'].includes(mode)) {
      highlightedElement.current?.classList.remove('kin-flow-highlight');
      highlightedElement.current = null;
      return undefined;
    }
    const step = activeSteps[stepIndex];
    if (!step || stepIndex < 0) return undefined;

    let active = true;
    let attempts = 0;
    const highlight = () => {
      if (!active) return;
      const target = document.querySelector(step.target || PAGE_TARGET);
      if (!target && attempts < 20) {
        attempts += 1;
        window.setTimeout(highlight, 100);
        return;
      }
      highlightedElement.current?.classList.remove('kin-flow-highlight');
      highlightedElement.current = target;
      target?.classList.add('kin-flow-highlight');
      if (target) {
        const card = document.querySelector('.kin-flow-tour-card');
        const cardHeight = card?.getBoundingClientRect().height || 0;
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const safeTop = 64;
        const safeBottom = Math.max(safeTop, viewportHeight - cardHeight - 24);
        const bounds = target.getBoundingClientRect();
        const viewport = target.closest('.main');
        const scrollable = viewport
          && viewport.scrollHeight > viewport.clientHeight
          && getComputedStyle(viewport).overflowY !== 'visible'
          ? viewport
          : null;

        if (scrollable && (bounds.top < safeTop || bounds.bottom > safeBottom)) {
          const desiredDelta = bounds.top < safeTop
            ? bounds.top - safeTop
            : bounds.bottom - safeBottom;
          scrollable.scrollTop += desiredDelta;
        } else if (bounds.top < safeTop || bounds.bottom > safeBottom) {
          const desiredDelta = bounds.top < safeTop
            ? bounds.top - safeTop
            : bounds.bottom - safeBottom;
          window.scrollBy({ top: desiredDelta, behavior: 'smooth' });
        }
      }
    };
    const timer = window.setTimeout(highlight, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
      highlightedElement.current?.classList.remove('kin-flow-highlight');
      highlightedElement.current = null;
    };
  }, [activeSteps, location.pathname, mode, stepIndex]);

  useEffect(() => {
    if (mode === 'map') {
      document.querySelector('.kin-flow-map .kin-flow-close')?.focus({ preventScroll: true });
      const handleMapKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeGuide();
        }
      };
      document.addEventListener('keydown', handleMapKeyDown);
      return () => {
        document.removeEventListener('keydown', handleMapKeyDown);
        document.querySelector('[data-kin-flow-help]')?.focus({ preventScroll: true });
      };
    }
    if (!['tour', 'onboarding', 'explain'].includes(mode)) return undefined;
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (isTyping) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextStep();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousStep();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeGuide, mode, nextStep, previousStep]);

  const value = useMemo(() => ({
    mode,
    role,
    flow,
    pageGuide,
    stepIndex,
    activeSteps,
    selectedRole,
    setSelectedRole,
    storageError,
    startTour,
    startExplain,
    startHowItWorks,
    closeGuide,
    nextStep,
    previousStep,
    roleEntries: getRoleEntries(),
    selectedRoleFlow: getRoleFlow(selectedRole),
  }), [
    activeSteps, closeGuide, flow, mode, nextStep, pageGuide, previousStep, role,
    selectedRole, startExplain, startHowItWorks, startTour, stepIndex, storageError,
  ]);

  return (
    <KinFlowContext.Provider value={value}>
      {children}
      {!mode && storageError && (
        <div className="kin-flow-storage-status" role="status">
          <span>{storageError}</span>
          <button type="button" onClick={() => setStorageError('')}>Dismiss</button>
        </div>
      )}
      <KinFlowOverlay />
    </KinFlowContext.Provider>
  );
}

export function useKinFlow() {
  const context = useContext(KinFlowContext);
  if (!context) throw new Error('useKinFlow must be used within KinFlowProvider.');
  return context;
}

function KinFlowOverlay() {
  const {
    mode,
    role,
    flow,
    pageGuide,
    stepIndex,
    activeSteps,
    selectedRole,
    setSelectedRole,
    storageError,
    closeGuide,
    nextStep,
    previousStep,
    roleEntries,
    selectedRoleFlow,
  } = useKinFlow();

  if (!mode) return null;

  if (mode === 'map') {
    const assignedFlow = selectedRoleFlow;
    return (
      <div className="kin-flow-scrim" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeGuide();
      }}>
        <section className="kin-flow-map" role="dialog" aria-modal="true" aria-labelledby="kin-flow-map-title">
          <header className="kin-flow-panel-heading">
            <div><p className="kin-flow-eyebrow">HOW IT WORKS</p><h2 id="kin-flow-map-title">How work moves through MCHMS</h2></div>
            <button type="button" className="kin-flow-close" onClick={() => closeGuide()} aria-label="Close How it works">×</button>
          </header>
          <p className="kin-flow-sequence">1. Superadmin <span aria-hidden="true">→</span> 2. Community Coordinator <span aria-hidden="true">→</span> 3. Health Worker <span aria-hidden="true">→</span> 4. Admin and Partner review</p>
          <p className="kin-flow-map-note">Admin and Partner accounts review operational information. Superadmin handles platform setup and system activity.</p>
          <div className="kin-flow-role-picker" aria-label="Choose a role">
            {roleEntries.map((entry) => (
              <button
                type="button"
                key={entry.key}
                className={selectedRole === entry.key ? 'is-selected' : ''}
                aria-pressed={selectedRole === entry.key}
                onClick={() => setSelectedRole(entry.key)}
              >
                {entry.label}{entry.key === role ? <span> · You</span> : ''}
              </button>
            ))}
          </div>
          {assignedFlow && (
            <div className="kin-flow-role-detail">
              <h3>{assignedFlow.label}{selectedRole === role ? ' · You' : ''}</h3>
              <p>{assignedFlow.purpose}</p>
              <div className="kin-flow-rhythm">
                {[
                  ['Once', assignedFlow.once],
                  ['Daily', assignedFlow.daily],
                  ['Weekly', assignedFlow.weekly],
                ].map(([label, tasks]) => (
                  <section key={label}>
                    <h4>{label}</h4>
                    <ul>{tasks.map((task, index) => (
                      <li key={`${task.path}-${index}`}><span>{task.task}</span><small>Tap: {NAV_LABELS[task.path] || task.path}</small></li>
                    ))}</ul>
                  </section>
                ))}
              </div>
            </div>
          )}
          {storageError && <p className="kin-flow-storage-warning" role="status">{storageError}</p>}
        </section>
      </div>
    );
  }

  const step = activeSteps[stepIndex];
  if (!step) return null;
  const isExplain = mode === 'explain';
  const isLastStep = stepIndex >= activeSteps.length - 1;

  return (
    <>
      <div className="kin-flow-tour-shade" aria-hidden="true" />
      <section
        className={`kin-flow-tour-card${mode === 'onboarding' ? ' is-onboarding' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="kin-flow-tour-title"
        aria-describedby="kin-flow-tour-body"
      >
        <div className="kin-flow-tour-count">
          {mode === 'onboarding' ? 'FIRST SIGN-IN GUIDE' : isExplain ? pageGuide[0] : flow?.label || 'Guided tour'}
          <span>{stepIndex + 1} / {activeSteps.length}</span>
        </div>
        <h2 id="kin-flow-tour-title">{step.title}</h2>
        <p id="kin-flow-tour-body">{step.body || step.task}</p>
        {step.points?.length > 0 && (
          <ul className="kin-flow-points">{step.points.map((point) => <li key={point}>{point}</li>)}</ul>
        )}
        {storageError && mode === 'onboarding' && <p className="kin-flow-storage-warning" role="status">{storageError}</p>}
        <footer className="kin-flow-tour-actions">
          <button type="button" className="kin-flow-skip" onClick={() => closeGuide()}>Skip</button>
          <div>
            {stepIndex > 0 && <button type="button" className="kin-flow-secondary" onClick={previousStep}>Back</button>}
            <button type="button" className="kin-flow-primary" onClick={nextStep}>
              {isLastStep ? (mode === 'onboarding' ? 'Finish setup guide' : 'Done') : 'Next'}
            </button>
          </div>
        </footer>
        {!isExplain && <p className="kin-flow-repeat-hint">Open the ? at the top any time to see this again.</p>}
      </section>
    </>
  );
}
