import React, { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';

const EVENT_NAME = 'f1kd:action-feedback';
const EXIT_DURATION = 240;
const DISPLAY_DURATION = 3200;
const FEEDBACK_TONES = new Set(['success', 'error', 'warning', 'info']);

/** Broadcast a semantic status message to the layout-level feedback toast. */
export function notifyAction(message, tone = 'success') {
  if (!FEEDBACK_TONES.has(tone)) throw new TypeError(`Unsupported feedback tone: ${tone}`);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, tone } }));
}

export default function ActionFeedback() {
  const [feedback, setFeedback] = useState(null);
  const [visible, setVisible] = useState(false);
  const feedbackRef = useRef(null);
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
      if (!FEEDBACK_TONES.has(nextFeedback.tone)) {
        throw new TypeError(`Unsupported feedback tone: ${nextFeedback.tone}`);
      }
      const normalizedFeedback = nextFeedback;
      if (feedbackRef.current?.message === normalizedFeedback.message
        && feedbackRef.current?.tone === normalizedFeedback.tone) return;

      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(removalTimeoutRef.current);
      window.cancelAnimationFrame(animationFrameRef.current);

      const feedbackId = ++feedbackIdRef.current;
      feedbackRef.current = normalizedFeedback;
      setVisible(false);
      setFeedback({ ...normalizedFeedback, id: feedbackId });
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setVisible(true);
      });
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        removalTimeoutRef.current = window.setTimeout(() => {
          if (feedbackIdRef.current === feedbackId) {
            feedbackRef.current = null;
            setFeedback(null);
          }
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

  const icons = {
    success: <path d="m5 12 4 4L19 6" />,
    error: <path d="M12 8v4m0 4h.01M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
    warning: <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  };

  return (
    <div
      className={`action-feedback action-feedback--${feedback.tone || 'success'}${visible ? ' action-feedback--visible' : ''}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
    >
      <svg className="action-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icons[feedback.tone] || icons.info}
      </svg>
      <span className="action-feedback__message">{feedback.message}</span>
      <Button
        type="button"
        variant="icon"
        size="small"
        className="action-feedback__dismiss"
        onClick={() => {
          window.clearTimeout(timeoutRef.current);
          window.clearTimeout(removalTimeoutRef.current);
          setVisible(false);
          removalTimeoutRef.current = window.setTimeout(() => {
            feedbackRef.current = null;
            setFeedback(null);
          }, EXIT_DURATION);
        }}
        aria-label="Dismiss message"
      >
        ×
      </Button>
    </div>
  );
}
