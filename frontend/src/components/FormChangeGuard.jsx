import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ACTION_FEEDBACK_EVENT } from './ActionFeedback';

const LEAVE_WARNING = 'You have unsaved form changes. Leave this page?';

export default function FormChangeGuard() {
  const location = useLocation();
  const historyIndexRef = useRef(window.history.state?.idx);

  useEffect(() => {
    historyIndexRef.current = window.history.state?.idx;
  }, [location]);

  useEffect(() => {
    const dirtyForms = new Set();
    let skipRestoredPopstate = false;

    const markDirty = (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.matches('input[type="search"]')) return;
      const form = event.target.closest('form');
      if (form) dirtyForms.add(form);
    };

    const clearForm = (event) => {
      if (event.target instanceof HTMLFormElement) dirtyForms.delete(event.target);
    };

    const hasDirtyForms = () => {
      for (const form of dirtyForms) {
        if (!form.isConnected) dirtyForms.delete(form);
      }
      return dirtyForms.size > 0;
    };

    const protectPageExit = (event) => {
      if (!hasDirtyForms()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const protectRouteLink = (event) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || !hasDirtyForms()) return;

      const targetUrl = new URL(link.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname
        && targetUrl.search === window.location.search
        && targetUrl.hash === window.location.hash) return;

      if (!window.confirm(LEAVE_WARNING)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      dirtyForms.clear();
    };

    const protectHistoryNavigation = (event) => {
      if (skipRestoredPopstate) {
        skipRestoredPopstate = false;
        historyIndexRef.current = event.state?.idx;
        return;
      }
      if (!hasDirtyForms()) return;
      if (!window.confirm(LEAVE_WARNING)) {
        const previousIndex = historyIndexRef.current;
        const targetIndex = event.state?.idx;
        skipRestoredPopstate = true;
        window.history.go(Number.isInteger(previousIndex) && Number.isInteger(targetIndex)
          ? previousIndex - targetIndex
          : 1);
        return;
      }
      dirtyForms.clear();
    };

    const clearAfterSuccessfulAction = (event) => {
      if (event.detail?.tone === 'success') dirtyForms.clear();
    };

    document.addEventListener('input', markDirty, true);
    document.addEventListener('change', markDirty, true);
    document.addEventListener('reset', clearForm, true);
    document.addEventListener('click', protectRouteLink, true);
    window.addEventListener('beforeunload', protectPageExit);
    window.addEventListener('popstate', protectHistoryNavigation);
    window.addEventListener(ACTION_FEEDBACK_EVENT, clearAfterSuccessfulAction);

    return () => {
      document.removeEventListener('input', markDirty, true);
      document.removeEventListener('change', markDirty, true);
      document.removeEventListener('reset', clearForm, true);
      document.removeEventListener('click', protectRouteLink, true);
      window.removeEventListener('beforeunload', protectPageExit);
      window.removeEventListener('popstate', protectHistoryNavigation);
      window.removeEventListener(ACTION_FEEDBACK_EVENT, clearAfterSuccessfulAction);
    };
  }, []);

  return null;
}
