import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_COOLDOWN_MS = 1500;

export function useActionCooldown(cooldownMs = DEFAULT_COOLDOWN_MS) {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const locked = useRef(false);
  const timeout = useRef(null);

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  const runWithCooldown = useCallback((action) => async (...args) => {
    if (locked.current) return undefined;

    locked.current = true;
    setIsCoolingDown(true);
    const startedAt = Date.now();

    try {
      return await action(...args);
    } finally {
      const remainingCooldown = Math.max(cooldownMs - (Date.now() - startedAt), 0);
      timeout.current = window.setTimeout(() => {
        locked.current = false;
        setIsCoolingDown(false);
      }, remainingCooldown);
    }
  }, [cooldownMs]);

  return { isCoolingDown, runWithCooldown };
}
