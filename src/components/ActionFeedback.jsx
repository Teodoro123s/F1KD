import React, { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';

const EVENT_NAME = 'f1kd:action-feedback';
const EXIT_DURATION = 220;
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
      className={`action-feedback action-feedback--${feedback.tone || 'success'} fixed top-[max(76px,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] left-auto z-[var(--z-toast)] w-[min(420px,calc(100vw-2rem))] min-w-0 max-w-[calc(100vw-2rem)] flex items-center gap-3 border border-[var(--color-success-border)] rounded-[var(--radius-lg)] bg-[var(--color-success-bg)] px-4 py-[0.85rem] text-[var(--color-success)] text-[0.875rem] shadow-[var(--shadow-md)] font-bold justify-between m-[0.85rem_0.85rem_0_0.85rem] transition-[opacity,transform] duration-[var(--motion-modal-duration)] ease-[var(--motion-ease-out)] ${visible ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-3'} max-[640px]:top-[72px] ${feedback.tone === 'error' ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error)] [&_button:hover]:bg-[rgba(180,35,24,0.1)]' : feedback.tone === 'warning' ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)] [&_button:hover]:bg-[rgba(146,64,14,0.1)]' : feedback.tone === 'info' ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info)] [&_button:hover]:bg-[rgba(29,78,216,0.1)]' : '[&_button:hover]:bg-[rgba(22,101,52,0.1)]'}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
    >
      <svg className="action-feedback__icon w-[1.2rem] h-[1.2rem] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icons[feedback.tone] || icons.info}
      </svg>
      <span className="action-feedback__message flex-1 min-w-0 [overflow-wrap:anywhere]">{feedback.message}</span>
      <Button
        type="button"
        variant="icon"
        size="small"
        className="action-feedback__dismiss flex-[0_0_auto] rounded-[var(--radius-sm)] cursor-pointer border-0 bg-transparent text-current text-[1.2rem] leading-none"
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
