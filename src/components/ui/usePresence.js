import { useEffect, useState } from 'react';

function getDurationMilliseconds(token) {
  const value = window.getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value);
  if (!match) throw new Error(`Invalid motion duration token: ${token}`);
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1);
}

export default function usePresence(open, durationToken = '--motion-modal-duration') {
  const [present, setPresent] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      return undefined;
    }
    if (!present) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const exitDuration = getDurationMilliseconds(durationToken);
    const timeout = window.setTimeout(
      () => setPresent(false),
      reducedMotion ? 0 : exitDuration,
    );
    return () => window.clearTimeout(timeout);
  }, [durationToken, open, present]);

  return present;
}
