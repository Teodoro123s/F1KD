const asBreadcrumbs = (items) => items.map(([label, to]) => ({ label, ...(to ? { to } : {}) }));
const isSafeInternalPath = (path) => typeof path === 'string'
  && path.startsWith('/')
  && !path.startsWith('//')
  && !path.includes('\\');

export const getRouteBreadcrumbs = (pathname = '/', locationState = {}) => {
  const parts = String(pathname).split('/').filter(Boolean);
  const [section, second, third, fourth] = parts;

  if (!section || section === 'dashboard') return asBreadcrumbs([['Dashboard']]);
  if (section === 'community') {
    const items = [['Community', '/community']];
    if (second === 'school') items.push(['School']);
    if (second === 'group') {
      items.push(['Group', third ? `/community/group/${third}` : undefined]);
      if (fourth === 'health-workers') items.push(['Health Workers']);
    }
    if (second === 'batch') items.push(['Batch']);
    return asBreadcrumbs(items);
  }
  if (section === 'beneficiary') {
    const items = [['Beneficiaries', '/beneficiary']];
    if (second === 'create') {
      items.push([third === 'mother' ? 'Create Mother' : 'Create Child']);
      return asBreadcrumbs(items);
    }
    if (second === 'child' && third) {
      const profilePath = `/beneficiary/child/${third}`;
      const childLabel = 'Child Profile';
      items.push([childLabel, profilePath]);
      if (fourth === 'edit') items.push(['Edit Child']);
      else if (fourth === 'program-report') items.push(['Project Report']);
      else if (fourth === 'profile') items[1] = [childLabel];
      return asBreadcrumbs(items);
    }
    if (second === 'mother' && third) {
      const profilePath = `/beneficiary/mother/${third}`;
      items.push(['Mother Profile', profilePath]);
      if (fourth === 'edit') items.push(['Edit Mother']);
      else if (fourth === 'monitoring') items.push(['Monitoring']);
      else if (fourth === 'child') items.push(['Children']);
      else if (fourth === 'program-report') items.push(['Project Report']);
      else if (fourth === 'profile') items[1] = ['Mother Profile'];
      return asBreadcrumbs(items);
    }
    return asBreadcrumbs(items);
  }
  if (section === 'monitoring' || section === 'checkup') return asBreadcrumbs([['Monitor']]);
  if (section === 'program') {
    const items = [['Projects', '/program']];
    if (second) {
      const programPath = `/program/${second}`;
      items.push(['Project', programPath]);
      if (parts.includes('receipt-history')) items.push(['Receipt History']);
      else if (third === 'cluster') items.push(['Cluster']);
      else if (third === 'school') items.push(['School']);
      else if (third === 'group') items.push(['Group']);
      else if (third === 'batch') items.push(['Batch']);
      else if (third === 'beneficiaries') items.push(['Beneficiary Project Report']);
      else if (parts.length === 2) items[1] = ['Project'];
    }
    return asBreadcrumbs(items);
  }
  if (section === 'progress-report') return asBreadcrumbs([['Dashboard', '/dashboard'], ['Progress Report']]);
  if (section === 'reports') return asBreadcrumbs([['Reports']]);
  if (section === 'notifications') return asBreadcrumbs([['Notifications']]);
  if (section === 'user-management') {
    const returnTo = isSafeInternalPath(locationState?.returnTo) ? locationState.returnTo : '/user-management';
    const parent = returnTo === '/community' || returnTo.startsWith('/community/')
      ? getRouteBreadcrumbs(returnTo)
      : asBreadcrumbs([['User Management', returnTo]]);
    if (returnTo === '/community' || returnTo.startsWith('/community/')) {
      parent[parent.length - 1] = { ...parent[parent.length - 1], to: returnTo };
    }
    const items = parent.map(({ label, to }) => [label, to]);
    if (second === 'health-workers') items.push(['Health Workers']);
    else if (second === 'school') items.push(['School Users']);
    else if (second === 'batch') items.push(['Batch Users']);
    else if (second === 'user') items.push(['User Details']);
    return asBreadcrumbs(items);
  }
  if (section === 'profile') return asBreadcrumbs([['Profile']]);
  if (section === 'settings') return asBreadcrumbs([['Settings']]);

  return asBreadcrumbs([[section.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())]]);
};
