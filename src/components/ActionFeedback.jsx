import React, { useEffect, useState } from 'react';

const EVENT_NAME = 'f1kd:action-feedback';

/** Broadcast a success or error message to the layout-level feedback toast. */
export function notifyAction(message, tone = 'success') {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, tone } }));
}

export default function ActionFeedback() {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Keep feedback rendering centralized so pages do not need their own toast state.
    const handleFeedback = (event) => {
      setFeedback(event.detail || null);
      window.setTimeout(() => setFeedback(null), 3200);
    };

    window.addEventListener(EVENT_NAME, handleFeedback);
    return () => window.removeEventListener(EVENT_NAME, handleFeedback);
  }, []);

  if (!feedback?.message) return null;

  return (
    <div className={`action-feedback action-feedback--${feedback.tone || 'success'}`} role="status" aria-live="polite">
      <span>{feedback.message}</span>
      <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button>
    </div>
  );
}
