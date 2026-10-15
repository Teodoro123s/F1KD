import React, { useEffect, useRef, useState } from 'react';

const EVENT_NAME = 'f1kd:action-feedback';
const EXIT_DURATION = 240;
const DISPLAY_DURATION = 3200;

/** Broadcast a success or error message to the layout-level feedback toast. */
export function notifyAction(message, tone = 'success') {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, tone } }));
}

export default function ActionFeedback() {
  const [feedback, setFeedback] = useState(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const removalTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const feedbackIdRef = useRef(0);

  useEffect(() => {
    // Keep feedback rendering centralized so pages do not need their own toast state.
    const invalidForms = new WeakSet();
    const handleFeedback = (event) => {
      const nextFeedback = event.detail;
      if (!nextFeedback?.message) return;

      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(removalTimeoutRef.current);
      window.cancelAnimationFrame(animationFrameRef.current);

      const feedbackId = ++feedbackIdRef.current;
      setVisible(false);
      setFeedback({ ...nextFeedback, id: feedbackId });
      animationFrameRef.current = window.requestAnimationFrame(() => setVisible(true));
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        removalTimeoutRef.current = window.setTimeout(() => {
          if (feedbackIdRef.current === feedbackId) setFeedback(null);
        }, EXIT_DURATION);
      }, DISPLAY_DURATION);
    };

    const handleInvalidField = (event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;

      event.preventDefault();
      const form = field.form;
      if (form && invalidForms.has(form)) return;
      if (form) {
        invalidForms.add(form);
        window.queueMicrotask(() => invalidForms.delete(form));
      }

      field.focus();
      notifyAction(field.validationMessage || 'Please check this field and try again.', 'error');
    };

    window.addEventListener(EVENT_NAME, handleFeedback);
    document.addEventListener('invalid', handleInvalidField, true);
    return () => {
      window.removeEventListener(EVENT_NAME, handleFeedback);
      document.removeEventListener('invalid', handleInvalidField, true);
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(removalTimeoutRef.current);
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  if (!feedback?.message) return null;

  return (
    <div
      className={`action-feedback action-feedback--${feedback.tone || 'success'}${visible ? ' action-feedback--visible' : ''}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={() => {
          window.clearTimeout(timeoutRef.current);
          window.clearTimeout(removalTimeoutRef.current);
          setVisible(false);
          removalTimeoutRef.current = window.setTimeout(() => setFeedback(null), EXIT_DURATION);
        }}
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  );
}
