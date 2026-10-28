import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASHBOARD_INFO_KEYS, INFO } from './infoContent.mjs';

test('every dashboard and shared summary card has an explanation', async () => {
  const sourceFiles = [
    new URL('../pages/Dashboard/DashboardPage.jsx', import.meta.url),
    new URL('../pages/Dashboard/dashboardModuleMetrics.mjs', import.meta.url),
    new URL('../pages/Dashboard/DashboardInsights.jsx', import.meta.url),
    new URL('../pages/Monitoring/MonitoringPage.jsx', import.meta.url),
    new URL('../pages/Program/ProgramPage.jsx', import.meta.url),
    new URL('../pages/Program/BeneficiaryProgramReportPage.jsx', import.meta.url),
    new URL('../pages/Reports/ReportsPage.jsx', import.meta.url),
    new URL('../pages/UserManagement/UserDetailPage.jsx', import.meta.url),
    new URL('../pages/Community/CommunityPage.jsx', import.meta.url),
    new URL('../pages/Community/SuperAdminCommunityPage.jsx', import.meta.url),
    new URL('../pages/Beneficiary/BeneficiaryListPage.jsx', import.meta.url),
    new URL('../pages/UserManagement/UserManagementPage.jsx', import.meta.url),
  ];
  const sources = await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')));
  const literalTitles = sources.flatMap((source) => {
    const cardBlocks = [...source.matchAll(/<(?:ModuleSummaryCards|CommunityOverviewCards)\b[\s\S]*?\/>/g)];
    return cardBlocks.flatMap(([block]) => [
      ...block.matchAll(/\blabel:\s*'([^']+)'/g),
    ].map((match) => match[1]));
  });
  const required = new Set([...DASHBOARD_INFO_KEYS, ...literalTitles]);
  const missing = [...required].filter((title) => !INFO[title]);

  assert.deepEqual(missing, []);
});
