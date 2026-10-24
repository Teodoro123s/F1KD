const isInternalPath = (path) => typeof path === 'string'
  && path.startsWith('/')
  && !path.startsWith('//');

export const navigateBack = (navigate, location, fallback, state) => {
  const returnTo = location?.state?.returnTo;
  const returnState = state ?? location?.state?.returnToState;
  const currentPath = `${location?.pathname || ''}${location?.search || ''}`;

  if (isInternalPath(returnTo) && returnTo !== currentPath) {
    navigate(returnTo, {
      replace: true,
      ...(returnState === undefined ? {} : { state: returnState }),
    });
    return;
  }

  const historyState = typeof window !== 'undefined' ? window.history?.state : undefined;
  const historyIndex = historyState?.idx;
  if (Number.isInteger(historyIndex) && historyIndex > 0) {
    navigate(-1, returnState === undefined ? undefined : { state: returnState });
    return;
  }

  navigate(fallback, {
    replace: true,
    ...(returnState === undefined ? {} : { state: returnState }),
  });
};
