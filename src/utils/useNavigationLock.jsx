import React, { useEffect, useRef, useState } from 'react';

// Hook for unsaved-change confirmation and debounced step navigation.
// isDirty: boolean indicating there are unsaved changes
// blocking: boolean indicating an ongoing save/submit process (prevents navigation)
// Returns { confirmNavigate, NavigationConfirm, isNavLocked, withDebounce }

export function useNavigationLock(isDirty, blocking = false) {
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingActionRef = useRef(null);
  const lastNavAtRef = useRef(0);
  const [isNavLocked, setNavLocked] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (blocking) return undefined;
      if (!isDirty) return undefined;
      const message = 'You have unsaved changes. Are you sure you want to leave?';
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, blocking]);

  // Request navigation: provide an action (function) to run if navigation is allowed / confirmed
  const confirmNavigate = (action) => {
    if (blocking) return; // ignore navigation while blocked
    if (!isDirty) {
      // no unsaved changes, proceed immediately
      action();
      return;
    }
    pendingActionRef.current = action;
    setShowConfirm(true);
  };

  const proceed = () => {
    setShowConfirm(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (typeof action === 'function') action();
  };

  const cancel = () => {
    pendingActionRef.current = null;
    setShowConfirm(false);
  };

  // Small debounce wrapper for quick internal navigation (e.g., stepper buttons)
  const withDebounce = (action, ms = 300) => {
    const now = Date.now();
    if (now - lastNavAtRef.current < ms) return; // ignore rapid clicks
    lastNavAtRef.current = now;
    setNavLocked(true);
    try {
      action();
    } finally {
      setTimeout(() => setNavLocked(false), ms);
    }
  };

  const NavigationConfirm = showConfirm ? (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
      <div className="modal-content signout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="nav-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header-section">
          <h3 id="nav-confirm-title">Discard changes?</h3>
          <button type="button" className="btn-close-modal" onClick={cancel} aria-label="Close confirmation">✕</button>
        </div>
        <div className="modal-body">
          <p>There are unsaved changes. Leaving this page will discard them. Continue?</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={cancel}>Cancel</button>
          <button type="button" className="btn-primary" onClick={proceed}>Discard and leave</button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmNavigate, NavigationConfirm, isNavLocked, withDebounce };
}
