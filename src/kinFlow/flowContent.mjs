import { normalizeRole, ROLES } from '../utils/permissions.js';

const FLOW_ROLES = {
  [ROLES.SUPER_ADMIN]: {
    label: 'Superadmin',
    purpose: 'Sets up the platform and reviews system activity.',
    once: [
      { path: '/community', task: 'Check the school structure in Community.' },
      { path: '/user-management', task: 'Create or review user accounts in User Management.' },
    ],
    daily: [
      { path: '/reports', task: 'Review recent system activity in Reports.' },
      { path: '/notifications', task: 'Check Notifications for account and community updates.' },
    ],
    weekly: [
      { path: '/reports', task: 'Review sign-in and activity trends in Reports.' },
    ],
  },
  [ROLES.COMMUNITY_COORDINATOR]: {
    label: 'Community Coordinator',
    purpose: 'Prepares the assigned school, team, beneficiaries, and projects.',
    once: [
      { path: '/community', task: 'Review the assigned school, groups, and batches in Community.' },
      { path: '/user-management', task: 'Set up Health Worker accounts in User Management.' },
      { path: '/beneficiary', task: 'Register mothers and children in Beneficiary.' },
      { path: '/program', task: 'Set up school project scopes in Projects.' },
    ],
    daily: [
      { path: '/monitoring', task: 'Record or review check-ups in Monitor.' },
      { path: '/program', task: 'Review project activity in Projects.' },
      { path: '/notifications', task: 'Check Notifications for assigned-school updates.' },
    ],
    weekly: [
      { path: '/progress-report', task: 'Review and export the assigned-school Progress Report.' },
    ],
  },
  [ROLES.HEALTH_WORKER]: {
    label: 'Health Worker',
    purpose: 'Follows up with beneficiaries in the assigned group.',
    once: [
      { path: '/beneficiary', task: 'Find the assigned group’s mother and child records in Beneficiary.' },
      { path: '/monitoring', task: 'Learn where to record check-ups in Monitor.' },
      { path: '/program', task: 'Review assigned projects in Projects.' },
    ],
    daily: [
      { path: '/beneficiary', task: 'Review beneficiary details in Beneficiary.' },
      { path: '/monitoring', task: 'Record permitted check-ups in Monitor.' },
      { path: '/program', task: 'Record allowed project receipts in Projects.' },
    ],
    weekly: [
      { path: '/progress-report', task: 'Review assigned-group results in Progress Report.' },
    ],
  },
  [ROLES.ADMIN]: {
    label: 'Admin',
    purpose: 'Reviews operational activity across accessible schools.',
    once: [
      { path: '/dashboard', task: 'Review the operational overview on Dashboard.' },
      { path: '/community', task: 'Learn where to review schools and groups in Community.' },
    ],
    daily: [
      { path: '/monitoring', task: 'Review check-up activity in Monitor.' },
      { path: '/notifications', task: 'Check Notifications for operational updates.' },
    ],
    weekly: [
      { path: '/progress-report', task: 'Review and export operational results in Progress Report.' },
    ],
  },
  [ROLES.PARTNER]: {
    label: 'Partner',
    purpose: 'Reviews read-only operational activity and results.',
    once: [
      { path: '/dashboard', task: 'Review the operational overview on Dashboard.' },
      { path: '/community', task: 'Learn where to review schools and groups in Community.' },
    ],
    daily: [
      { path: '/program', task: 'Review project activity in Projects.' },
      { path: '/notifications', task: 'Check Notifications for operational updates.' },
    ],
    weekly: [
      { path: '/progress-report', task: 'Review and export operational results in Progress Report.' },
    ],
  },
};

const PAGE_GUIDES = [
  ['/dashboard', 'Dashboard', 'Review the summary cards and recent activity available to your role.'],
  ['/community', 'Community', 'Review schools, groups, and batches available to your role.'],
  ['/beneficiary', 'Beneficiary', 'Find mother and child records. Coordinators can register records; Health Workers can update permitted details.'],
  ['/monitoring', 'Monitor', 'Review check-up activity and record permitted follow-up.'],
  ['/checkup', 'Monitor', 'Review check-up activity and record permitted follow-up.'],
  ['/program', 'Projects', 'Review projects and record receipts when your role allows it.'],
  ['/progress-report', 'Progress Report', 'Choose the available report filters, review results, and export when permitted.'],
  ['/user-management', 'User Management', 'Review accounts. Account actions depend on your role and school assignment.'],
  ['/reports', 'Reports', 'Review platform activity available to Superadmins.'],
  ['/notifications', 'Notifications', 'Review account and operational updates available to your role.'],
  ['/profile', 'Profile', 'Review your account profile.'],
  ['/settings', 'Settings', 'Review your account settings.'],
];

export function getRoleFlow(role) {
  return FLOW_ROLES[normalizeRole(role)] || null;
}

export function getRoleEntries() {
  return Object.entries(FLOW_ROLES).map(([key, flow]) => ({ key, ...flow }));
}

export function getPageGuide(pathname = '/') {
  const path = `/${String(pathname).split('/').filter(Boolean)[0] || ''}`;
  return PAGE_GUIDES.find(([route]) => route === path)?.slice(1) || [
    'This page',
    'Use the page controls shown here. Available actions depend on your role.',
  ];
}

export function getPageControls(container) {
  if (!container) return [];
  const controls = Array.from(container.querySelectorAll('button, a[href], select, input, textarea'))
    .filter((element) => {
      if (element.disabled || element.getAttribute('aria-hidden') === 'true') return false;
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0
        && getComputedStyle(element).visibility !== 'hidden';
    })
    .map((element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const label = labelledBy
        ? labelledBy.split(/\s+/).map((id) => (
          Array.from(container.querySelectorAll('[id]')).find((candidate) => candidate.id === id)?.textContent || ''
        )).join(' ')
        : '';
      const associatedLabel = element.labels
        ? Array.from(element.labels).map((item) => item.textContent).join(' ')
        : '';
      const name = element.getAttribute('aria-label')
        || label
        || associatedLabel
        || element.innerText
        || element.textContent
        || element.getAttribute('placeholder')
        || '';
      return String(name).replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);

  return [...new Set(controls)].slice(0, 12);
}
