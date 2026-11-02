export const GUIDE_ROLES = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  community_coordinator: 'Community Coordinator',
  health_worker: 'Health Worker',
  partner: 'Partner',
};

export const ROLE_FLOW = [
  {
    role: 'super_admin',
    what: 'Sets up schools and user access, then checks organization-wide activity.',
    once: [
      { text: 'Add schools and groups', path: 'Community → Create → Create School / Create Group', to: '/community' },
      { text: 'Create user accounts', path: 'User Management → Add User', to: '/user-management' },
    ],
    daily: [
      { text: 'Check organization activity', path: 'Dashboard', to: '/dashboard' },
    ],
    weekly: [
      { text: 'Review system activity', path: 'Reports', to: '/reports' },
    ],
  },
  {
    role: 'community_coordinator',
    what: 'Organizes community records, adds health workers, registers beneficiaries, and sets up projects.',
    once: [
      { text: 'Create groups and batches', path: 'Community → Create → Create Group / Create Batch', to: '/community' },
      { text: 'Add health workers', path: 'User Management → Add Health Worker', to: '/user-management/health-workers' },
      { text: 'Register mothers and children', path: 'Beneficiary → Create', to: '/beneficiary' },
      { text: 'Create projects', path: 'Projects → Create Project', to: '/program' },
    ],
    daily: [
      { text: 'Update beneficiary records and record check-ups', path: 'Beneficiary → Monitor', to: '/beneficiary' },
    ],
    weekly: [
      { text: 'Review progress across assigned communities', path: 'Progress Report', to: '/progress-report' },
    ],
  },
  {
    role: 'health_worker',
    what: 'Works with assigned beneficiaries and records their check-ups.',
    once: [
      { text: 'Open the community and beneficiaries assigned to you', path: 'Community → Beneficiary', to: '/community' },
    ],
    daily: [
      { text: 'Open a beneficiary and record a check-up', path: 'Monitor → Open record', to: '/monitoring' },
    ],
    weekly: [
      { text: 'Review pending or missing check-up records', path: 'Monitor → Missing records', to: '/monitoring' },
    ],
  },
  {
    role: 'partner',
    what: 'Reviews assigned beneficiary and project information.',
    once: [
      { text: 'Open assigned beneficiaries and projects', path: 'Beneficiary → Projects', to: '/beneficiary' },
    ],
    daily: [
      { text: 'Review project information', path: 'Projects', to: '/program' },
    ],
    weekly: [
      { text: 'Review available progress reports', path: 'Progress Report', to: '/progress-report' },
    ],
  },
  {
    role: 'admin',
    what: 'Reviews operational records and progress for the areas available to this account.',
    once: [
      { text: 'Check which community and beneficiary records are available', path: 'Community → Beneficiary', to: '/community' },
    ],
    daily: [
      { text: 'Review beneficiary, monitoring, and project records', path: 'Beneficiary → Monitor → Projects', to: '/beneficiary' },
    ],
    weekly: [
      { text: 'Build or review a progress report', path: 'Progress Report', to: '/progress-report' },
    ],
  },
];

export const ROLE_TOURS = {
  super_admin: [
    { title: 'Set up community records', body: 'Create the schools and groups used by the rest of the system.', to: '/community', target: 'community-create', phase: 'Set up first', points: ['Select Create, then choose Create School or Create Group.'] },
    { title: 'Add user accounts', body: 'Create accounts so each person can use the parts of the system allowed for their role.', to: '/user-management', target: 'user-add', phase: 'Set up first', points: ['Select Add User.'] },
    { title: 'Your dashboard', body: 'Start here to see organization-wide activity.', to: '/dashboard', target: 'dashboard-summary', phase: 'Every day', points: ['Open a dashboard card to go to its records.'] },
    { title: 'Review system reports', body: 'Use Reports to review organization-wide activity.', to: '/reports', target: 'page-title', phase: 'Every week', points: ['Choose Reports from the sidebar.'] },
  ],
  admin: [
    { title: 'Your dashboard', body: 'Start here to see the operational information available to your account.', to: '/dashboard', target: 'dashboard-summary', phase: 'Every day', points: ['Open a dashboard card to go to its records.'] },
    { title: 'Review beneficiaries', body: 'Find beneficiary records available to your account.', to: '/beneficiary', target: 'beneficiary-list', phase: 'Every day', points: ['Use the search and filters to find a record.'] },
    { title: 'Review monitoring records', body: 'Check which monitoring records are missing, pending, or complete.', to: '/monitoring', target: 'monitoring-records', phase: 'Every day', points: ['Select a summary card to show its records.'] },
    { title: 'Build a progress report', body: 'Choose the community and report focus before selecting metrics.', to: '/progress-report', target: 'report-parameters', phase: 'Every week', points: ['Use Community & Report Focus, Growth Metrics, and Results.'] },
  ],
  community_coordinator: [
    { title: 'Your assigned school', body: 'Your school is already assigned to your account. Community opens its groups, where you can create groups or batches.', to: '/community', target: 'community-create', phase: 'Set up first', points: ['Select Create, then choose Create Group or Create Batch.'] },
    { title: 'Add health workers', body: 'Create accounts for health workers in your assigned community.', to: '/user-management/health-workers', target: 'user-add', phase: 'Set up first', points: ['Select Add Health Worker.'] },
    { title: 'Register beneficiaries', body: 'Add mothers and children so their records can be followed over time.', to: '/beneficiary', target: 'beneficiary-create', phase: 'Set up first', points: ['Select Create, then choose Create Mother or Create Child.'] },
    { title: 'Set up projects', body: 'Create a project and choose the community it covers.', to: '/program', target: 'projects-create', phase: 'Set up first', points: ['Select Create Project.'] },
    { title: 'Your dashboard', body: 'Start here to see the community activity available to your account.', to: '/dashboard', target: 'dashboard-summary', phase: 'Every day', points: ['Open a dashboard card to go to its records.'] },
    { title: 'Review progress', body: 'Build a report to review records for the communities you support.', to: '/progress-report', target: 'report-parameters', phase: 'Every week', points: ['Use Community & Report Focus, Growth Metrics, and Results.'] },
  ],
  health_worker: [
    { title: 'Your assigned group', body: 'Your group is already assigned to your account. Community opens its batches.', to: '/community', target: 'page-title', phase: 'Set up first', points: ['Open a batch to see its beneficiaries.'] },
    { title: 'Your dashboard', body: 'Start here to see the information available to your account.', to: '/dashboard', target: 'dashboard-summary', phase: 'Every day', points: ['Open a dashboard card to go to its records.'] },
    { title: 'Find a beneficiary', body: 'Search for a mother or child record assigned to you.', to: '/beneficiary', target: 'beneficiary-list', phase: 'Every day', points: ['Use the search and filters to find a record.'] },
    { title: 'Record a check-up', body: 'Open a beneficiary record from Monitor to review or record a check-up.', to: '/monitoring', target: 'monitoring-records', phase: 'Every day', points: ['Select a summary card, then choose Open record.'] },
    { title: 'Review progress', body: 'Use Progress Report to review the available records for your assigned community.', to: '/progress-report', target: 'report-parameters', phase: 'Every week', points: ['Use Community & Report Focus, Growth Metrics, and Results.'] },
  ],
  partner: [
    { title: 'Your dashboard', body: 'Start here to see the information available to your account.', to: '/dashboard', target: 'dashboard-summary', phase: 'Every day', points: ['Open a dashboard card to go to its records.'] },
    { title: 'Review beneficiaries', body: 'Find beneficiary records available to your account.', to: '/beneficiary', target: 'beneficiary-list', phase: 'Every day', points: ['Use the search and filters to find a record.'] },
    { title: 'Review projects', body: 'Open a project to see its coverage and activity.', to: '/program', target: 'projects-overview', phase: 'Every day', points: ['Choose a project from the list.'] },
    { title: 'Review progress', body: 'Use the report steps to review available progress information.', to: '/progress-report', target: 'report-parameters', phase: 'Every week', points: ['Use Community & Report Focus, Growth Metrics, and Results.'] },
  ],
};

export const PAGE_GUIDES = [
  {
    match: (path) => path === '/dashboard',
    title: 'Dashboard',
    description: 'A role-based summary of records and activity available to your account.',
    sections: [
      { target: 'dashboard-summary', title: 'Summary cards', text: 'Select a card to open the related records.' },
      { target: 'dashboard-activity', title: 'Recent activity', text: 'Review recent changes and activity shown for your role.' },
    ],
  },
  {
    match: (path) => path.startsWith('/community'),
    title: 'Community',
    description: 'Find schools, groups, batches, and health workers available to your account.',
    sections: [
      { target: 'community-create', title: 'Create', text: 'If your role allows it, use Create to add a school, group, or batch.' },
      { target: 'community-overview', title: 'Community summaries', text: 'Select a summary card to open the related list.' },
      { target: 'community-list', title: 'Community list', text: 'Use the list and search to open a school, group, or batch.' },
    ],
  },
  {
    match: (path) => path === '/beneficiary',
    title: 'Beneficiary',
    description: 'Find and review mother and child records. Available actions depend on your role.',
    sections: [
      { target: 'beneficiary-create', title: 'Create', text: 'If your role allows it, add a mother or child record.' },
      { target: 'beneficiary-list', title: 'Beneficiary records', text: 'Search the available records and open one to see its details.' },
    ],
  },
  {
    match: (path) => path.startsWith('/beneficiary/create'),
    title: 'Beneficiary record',
    description: 'Complete the fields on this form to add a mother or child record.',
    sections: [],
  },
  {
    match: (path) => path.startsWith('/beneficiary'),
    title: 'Beneficiary record',
    description: 'Review the selected mother or child record and the information available on its tabs.',
    sections: [],
  },
  {
    match: (path) => path.startsWith('/monitoring') || path.startsWith('/checkup'),
    title: 'Monitor',
    description: 'Review monitoring records and open a beneficiary to see check-up details.',
    sections: [
      { target: 'monitoring-records', title: 'Monitoring records', text: 'Select a summary card to filter records, then choose Open record.' },
    ],
  },
  {
    match: (path) => path.startsWith('/program'),
    title: 'Projects',
    description: 'Review projects, their coverage, and related activity.',
    sections: [
      { target: 'projects-create', title: 'Create Project', text: 'If your role allows it, create a project and select its coverage.' },
      { target: 'projects-overview', title: 'Project list', text: 'Choose a project to review its coverage and beneficiaries.' },
    ],
  },
  {
    match: (path) => path.startsWith('/progress-report'),
    title: 'Progress Report',
    description: 'Choose the community and report focus, select metrics, then review the results.',
    sections: [
      { target: 'report-parameters', title: 'Report steps', text: 'Move through Community & Report Focus, Growth Metrics, and Results.' },
    ],
  },
  {
    match: (path) => path.startsWith('/user-management'),
    title: 'User Management',
    description: 'Find user accounts available to your role and community.',
    sections: [
      { target: 'user-add', title: 'Add account', text: 'If your role allows it, add a user or health worker.' },
    ],
  },
  {
    match: (path) => path.startsWith('/reports'),
    title: 'Reports',
    description: 'Review system activity and organization-wide reporting available to Super Admins.',
    sections: [
      { target: 'reports-summary', title: 'User Logins', text: 'Select User Logins to show the report controls and results.' },
      { target: 'reports-filters', title: 'Report controls', text: 'Choose a report level, search, set a date range, and switch between Graph view and Table view.' },
      { target: 'reports-results', title: 'Report results', text: 'Review the chart or table. In Graph view, select a day to see its matching login records.' },
    ],
  },
  {
    match: (path) => path.startsWith('/archive'),
    title: 'Archive',
    description: 'Review archived records and restore records when your role allows it.',
    sections: [
      { target: 'archive-summary', title: 'Archive views', text: 'Select Archived records or Archive activity to open that list.' },
      { target: 'archive-results', title: 'Archive list', text: 'Search and review the archived records or archive activity shown here.' },
    ],
  },
  {
    match: (path) => path.startsWith('/notifications'),
    title: 'Notifications',
    description: 'Review notices about activity and changes in the system.',
    sections: [
      { target: 'notifications-filters', title: 'Find notifications', text: 'Filter by read status or search for a notification.' },
    ],
  },
  {
    match: (path) => path.startsWith('/profile'),
    title: 'Profile',
    description: 'Review the account details associated with your sign-in.',
    sections: [
      { target: 'profile-details', title: 'Profile details', text: 'Review your name, contact details, email, and role.' },
      { target: 'settings-password', title: 'Change password', text: 'Enter your current password and choose a new password.' },
    ],
  },
  {
    match: (path) => path.startsWith('/settings'),
    title: 'Settings',
    description: 'Review the preferences and settings available to your account.',
    sections: [
      { target: 'settings-guidance', title: 'Help and Guidance', text: 'Choose your guidance preferences and review onboarding and tour progress. Changes apply only to your account.' },
      { target: 'settings-appearance', title: 'Appearance', text: 'Use Dark mode to change the app’s appearance.' },
      { target: 'settings-password', title: 'Change password', text: 'Enter your current password and choose a new password.' },
    ],
  },
  {
    match: (path) => path.startsWith('/ai-setting'),
    title: 'AI Setting',
    description: 'Review AI reporting options available to your account.',
    sections: [],
  },
];

export function normalizeGuideRole(role) {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'superadmin') return 'super_admin';
  if (normalized === 'communityorganizer' || normalized === 'community_organizer') return 'community_coordinator';
  if (normalized === 'healthworker') return 'health_worker';
  return normalized;
}

export function getRoleFlow(userRole) {
  const normalizedRole = normalizeGuideRole(userRole);
  return ROLE_FLOW.find((item) => item.role === normalizedRole);
}

export function getPageGuide(pathname, userRole) {
  const guide = PAGE_GUIDES.find((item) => item.match(pathname)) || {
    title: 'This page',
    description: 'Use this page to review the information and actions available for this part of the system.',
    sections: [],
  };
  const role = normalizeGuideRole(userRole);

  if (pathname.startsWith('/community')) {
    if (role === 'community_coordinator') {
      return {
        ...guide,
        description: 'Your assigned school is already selected. Open one of its groups to see batches, or create groups and batches within your school.',
        sections: [
          { target: 'community-list', title: 'Groups in your school', text: 'Your assigned school is already applied. Open a group to see its batches.' },
          { target: 'community-overview', title: 'Community summaries', text: 'Select a summary card to open its list.' },
          { target: 'community-create', title: 'Create a group or batch', text: 'Select Create, then choose Create Group or Create Batch. Your school assignment is applied automatically.' },
        ],
      };
    }

    if (role === 'super_admin') {
      return {
        ...guide,
        description: 'Add schools and groups, then open a record to review its community structure.',
        sections: [
          { target: 'community-create', title: 'Create schools and groups', text: 'Select Create, then choose Create School or Create Group.' },
          { target: 'community-overview', title: 'Community summaries', text: 'Select a summary card to open its list.' },
          { target: 'community-list', title: 'Community list', text: 'Choose a school, group, or batch to open its details.' },
        ],
      };
    }

    return {
      ...guide,
      description: 'Review the schools, groups, batches, or health workers available to your account.',
      sections: [
        { target: 'community-overview', title: 'Community summaries', text: 'Select a summary card to open its list.' },
        { target: 'community-list', title: 'Community list', text: 'Search and open a community record available to your account.' },
      ],
    };
  }

  if (pathname.startsWith('/beneficiary')) {
    const canCreateBeneficiaries = role === 'community_coordinator';
    return {
      ...guide,
      description: canCreateBeneficiaries
        ? 'Find beneficiary records or add a mother or child to your assigned community.'
        : 'Find and review beneficiary records available to your account.',
      sections: [
        ...(canCreateBeneficiaries
          ? [{ target: 'beneficiary-create', title: 'Create a beneficiary', text: 'Select Create, then choose Create Mother or Create Child.' }]
          : []),
        { target: 'beneficiary-list', title: 'Beneficiary records', text: 'Search the available records and open one to see its details.' },
      ],
    };
  }

  if (pathname.startsWith('/monitoring') || pathname.startsWith('/checkup')) {
    const canRecordCheckups = ['community_coordinator', 'health_worker'].includes(role);
    return {
      ...guide,
      description: canRecordCheckups
        ? 'Review monitoring records, then open an assigned beneficiary to record or update a check-up.'
        : 'Review monitoring records available to your account. Your role does not allow editing check-ups.',
      sections: [
        { target: 'monitoring-records', title: 'Monitoring records', text: canRecordCheckups
          ? 'Select a summary card to filter records, then choose Open record to review or record a check-up.'
          : 'Select a summary card to filter records, then choose Open record to review the beneficiary details.' },
      ],
    };
  }

  if (pathname.startsWith('/program')) {
    const canCreateProjects = role === 'community_coordinator';
    return {
      ...guide,
      description: canCreateProjects
        ? 'Review projects or create a project for communities in your assigned scope.'
        : 'Review project coverage and activity available to your account.',
      sections: [
        ...(canCreateProjects
          ? [{ target: 'projects-create', title: 'Create Project', text: 'Create a project and select the communities it covers.' }]
          : []),
        { target: 'projects-overview', title: 'Project list', text: 'Choose a project to review its coverage and beneficiaries.' },
      ],
    };
  }

  if (pathname.startsWith('/user-management')) {
    const isSuperAdmin = role === 'super_admin';
    const isCoordinator = role === 'community_coordinator';
    return {
      ...guide,
      description: isSuperAdmin
        ? 'Create user accounts and review accounts available across the organization.'
        : isCoordinator
          ? 'Add health workers for your assigned school and review their accounts.'
          : 'Review user accounts available to your account.',
      sections: [
        ...((isSuperAdmin || isCoordinator)
          ? [{ target: 'user-add', title: isCoordinator ? 'Add a health worker' : 'Add a user', text: isCoordinator
            ? 'Select Add Health Worker to add a worker to your assigned school.'
            : 'Select Add User to create an account with the appropriate role and assignment.' }]
          : []),
      ],
    };
  }

  return guide;
}
