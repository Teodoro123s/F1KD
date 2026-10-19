import { hasCheckupThisMonth } from '../../utils/monthlyCheckups.js';

function hasMonitoringRecord(record) {
  return Array.isArray(record.checkups) && record.checkups.flat(Infinity).some(Boolean);
}

export function buildDashboardModuleSummaries({
  mothers = [],
  children = [],
  programs = [],
  staffMetrics = { active: 0, suspended: 0, unassigned: 0 },
  isSuperAdmin = false,
  isCommunityOrganizer = false,
  now = new Date(),
} = {}) {
  const beneficiaries = [...mothers, ...children];
  const checkedThisMonth = beneficiaries.filter((record) => hasCheckupThisMonth(record, now)).length;
  const recordsWithMonitoring = beneficiaries.filter(hasMonitoringRecord).length;
  const activePrograms = programs.filter((program) => (
    String(program.status || 'Active').trim().toLowerCase() !== 'ended'
  ));

  const modules = isSuperAdmin
    ? [{
      key: 'users',
      title: 'User Management',
      to: '/user-management',
      metrics: [
        { label: 'Active staff', value: staffMetrics.active },
        { label: 'Suspended', value: staffMetrics.suspended },
        { label: 'Unassigned', value: staffMetrics.unassigned },
      ],
      note: 'Operational accounts',
    }]
    : [
      {
        key: 'beneficiaries',
        title: 'Beneficiaries',
        to: '/beneficiary',
        metrics: [
          { label: 'Total profiles', value: beneficiaries.length },
          { label: 'Mothers', value: mothers.length },
          { label: 'Children', value: children.length },
        ],
        note: 'Current scoped records',
      },
      {
        key: 'monitoring',
        title: 'Monitoring',
        to: '/monitoring',
        metrics: [
          { label: 'Beneficiaries checked this month', value: checkedThisMonth },
          { label: 'No check-up recorded this month', value: beneficiaries.length - checkedThisMonth },
        ],
        note: 'Based on saved beneficiary check-ups',
      },
      {
        key: 'programs',
        title: 'Programs',
        to: '/program',
        metrics: [
          { label: 'Active programs', value: activePrograms.length },
          {
            label: 'Recorded reach / target',
            value: `${activePrograms.reduce((total, program) => total + (Number(program.received) || 0), 0).toLocaleString()} / ${activePrograms.reduce((total, program) => total + (Number(program.target) || 0), 0).toLocaleString()}`,
          },
        ],
        note: 'Reach uses saved program check-ins',
      },
      {
        key: 'progress',
        title: 'Progress Report',
        to: '/progress-report',
        metrics: [
          { label: 'Profiles with check-up history', value: recordsWithMonitoring },
          { label: 'Reportable profiles', value: beneficiaries.length },
          {
            label: 'Monitoring data coverage',
            value: `${beneficiaries.length ? Math.round((recordsWithMonitoring / beneficiaries.length) * 100) : 0}%`,
          },
        ],
        note: 'Reports are generated from current records',
      },
      ...(isCommunityOrganizer ? [{
        key: 'users',
        title: 'User Management',
        to: '/user-management',
        metrics: [{ label: 'Active health workers', value: staffMetrics.active }],
        note: 'Health workers in your assigned school',
      }] : []),
    ];

  return modules;
}
