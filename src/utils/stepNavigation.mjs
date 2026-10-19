const waitForPaint = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => resolve());
  } else {
    setTimeout(resolve, 0);
  }
});

const MINIMUM_LOADING_DURATION_MS = 300;

export function createStepNavigationRunner({
  onStart = () => {},
  onFinish = () => {},
  onError = () => {},
  beforeAction = waitForPaint,
} = {}) {
  let isRunning = false;

  return async function runStepNavigation(action, direction = 'next') {
    if (isRunning || typeof action !== 'function') return false;

    isRunning = true;
    const startedAt = Date.now();
    let succeeded = false;
    try {
      onStart(direction);
      await beforeAction();
      succeeded = (await action()) !== false;
    } catch (error) {
      onError(error, direction);
    } finally {
      const remainingLoadingTime = MINIMUM_LOADING_DURATION_MS - (Date.now() - startedAt);
      if (remainingLoadingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingLoadingTime));
      }
      isRunning = false;
      onFinish();
    }
    return succeeded;
  };
}
