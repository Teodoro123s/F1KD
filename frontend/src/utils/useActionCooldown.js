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

    try {
      await new Promise((resolve) => {
        timeout.current = window.setTimeout(resolve, cooldownMs);
      });
      return await action(...args);
    } finally {
      timeout.current = null;
      locked.current = false;
      setIsCoolingDown(false);
    }
  }, [cooldownMs]);

  return { isCoolingDown, runWithCooldown };
}
