import React, { useEffect, useRef, useState } from 'react';

export const ACTION_FEEDBACK_EVENT = 'f1kd:action-feedback';
const FEEDBACK_DURATION = 3200;

/** Broadcast a temporary success, warning, or error message to the layout toast. */
export function notifyAction(message, tone = 'success') {
  window.dispatchEvent(new CustomEvent(ACTION_FEEDBACK_EVENT, { detail: { message, tone } }));
}

export default function ActionFeedback() {
  const [feedback, setFeedback] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleFeedback = (event) => {
      const detail = event.detail || {};
      if (!detail.message) return;

      window.clearTimeout(timeoutRef.current);
      const tone = ['success', 'warning', 'error'].includes(detail.tone) ? detail.tone : 'success';
      setFeedback({ message: detail.message, tone });
      timeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_DURATION);
    };

    window.addEventListener(ACTION_FEEDBACK_EVENT, handleFeedback);
    return () => {
      window.removeEventListener(ACTION_FEEDBACK_EVENT, handleFeedback);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!feedback?.message) return null;

  return (
    <div
      className={`action-feedback action-feedback--${feedback.tone}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={() => {
          window.clearTimeout(timeoutRef.current);
          setFeedback(null);
        }}
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  );
}
