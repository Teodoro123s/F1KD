import { useCallback, useRef, useState } from 'react';
import { createStepNavigationRunner } from './stepNavigation.mjs';

export function useStepNavigation() {
  const runnerRef = useRef(null);
  const [navigationDirection, setNavigationDirection] = useState('');
  const [navigationError, setNavigationError] = useState('');

  if (!runnerRef.current) {
    runnerRef.current = createStepNavigationRunner({
      onStart: (direction) => {
        setNavigationError('');
        setNavigationDirection(direction);
      },
      onFinish: () => setNavigationDirection(''),
      onError: (error) => {
        console.error('[StepNavigation] Unable to change form step:', error);
        setNavigationError(error?.message || 'Unable to change steps. Please try again.');
      },
    });
  }

  const runStepNavigation = useCallback((action, direction = 'next') => (
    runnerRef.current(action, direction)
  ), []);

  return {
    isNavigating: Boolean(navigationDirection),
    navigationDirection,
    navigationError,
    runStepNavigation,
  };
}
