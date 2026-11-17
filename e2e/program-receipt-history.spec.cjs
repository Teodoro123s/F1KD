const { expect, test } = require('@playwright/test');

const jsonResponse = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test('receipt history loads, switches views, and saves a receipt', async ({ page }) => {
  const savedReceipts = [];
  const user = {
    id: 21,
    role: 'Community Coordinator',
    has_accepted_terms: true,
    first_name: 'Browser',
    last_name: 'Tester',
  };

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh') {
      return jsonResponse(route, { token: 'browser-test-token', user });
    }
    if (url.pathname === '/api/help-guidance/preferences') {
      return jsonResponse(route, { preferences: {} });
    }
    if (url.pathname === '/api/programs/7/monitoring/report/mother/1') {
      return jsonResponse(route, {
        programStatus: 'active',
        report: [{
          date: '2026-11-17',
          program_name: 'Test Project',
          beneficiary_id: 1,
          beneficiary_type: 'mother',
          beneficiary_name: 'Test Beneficiary',
          monitored: true,
          evidence_images: [],
        }],
      });
    }
    if (url.pathname === '/api/programs/7/monitoring' && route.request().method() === 'PATCH') {
      savedReceipts.push(JSON.parse(route.request().postData() || '{}'));
      return jsonResponse(route, {});
    }
    return jsonResponse(route, {});
  });

  await page.goto('/program/7/beneficiaries/mother/1/receipt-history');
  const table = page.locator('.program-receipt-beneficiary-table');
  await expect(page.getByRole('heading', { name: 'Receipt History' })).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(1);

  await page.getByRole('button', { name: 'Calendar View' }).click();
  await expect(page.locator('.program-calendar-day')).toHaveCount(42);
  await page.getByRole('button', { name: 'List View' }).click();

  await page.getByRole('button', { name: 'Record receipt' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record project receipt' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Received this project item?').selectOption('no');
  await dialog.getByRole('button', { name: 'Save status' }).click();
  await expect(dialog).toBeHidden();
  expect(savedReceipts).toHaveLength(1);
  expect(savedReceipts[0]).toMatchObject({
    beneficiaryId: '1',
    beneficiaryType: 'mother',
    monitored: false,
  });
});

test('cluster receipt history selects only the checked beneficiaries', async ({ page }) => {
  const savedReceipts = [];
  const user = {
    id: 21,
    role: 'Community Coordinator',
    has_accepted_terms: true,
    first_name: 'Browser',
    last_name: 'Tester',
  };

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh') {
      return jsonResponse(route, { token: 'browser-test-token', user });
    }
    if (url.pathname === '/api/help-guidance/preferences') {
      return jsonResponse(route, { preferences: {} });
    }
    if (url.pathname === '/api/programs') {
      return jsonResponse(route, { programs: [{ id: 7, beneficiaryType: 'Mother' }] });
    }
    if (url.pathname === '/api/mothers') {
      return jsonResponse(route, {
        mothers: [
          { id: 1, name: 'Mother One', group: 'North Group' },
          { id: 2, name: 'Mother Two', group: 'North Group' },
          { id: 3, name: 'Out of scope', group: 'South Group' },
        ],
        pagination: { total: 3, totalPages: 1, page: 1, perPage: 100 },
      });
    }
    if (decodeURIComponent(url.pathname) === '/api/programs/7/monitoring/cluster-report/group/North Group') {
      return jsonResponse(route, {
        programStatus: 'active',
        report: [
          { date: '2026-11-17', program_name: 'Test Project', beneficiary_id: 1, beneficiary_type: 'mother', beneficiary_name: 'Mother One', monitored: true, evidence_images: [] },
          { date: '2026-11-17', program_name: 'Test Project', beneficiary_id: 2, beneficiary_type: 'mother', beneficiary_name: 'Mother Two', monitored: false, evidence_images: [] },
        ],
      });
    }
    if (url.pathname === '/api/programs/7/monitoring' && route.request().method() === 'PATCH') {
      savedReceipts.push(JSON.parse(route.request().postData() || '{}'));
      return jsonResponse(route, {});
    }
    return jsonResponse(route, {});
  });

  await page.goto('/program/7/cluster/group/North%20Group/receipt-history');
  await expect(page.getByRole('heading', { name: 'North Group' })).toBeVisible();
  await expect(page.locator('.program-receipt-cluster-table tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Record receipt' }).click();

  const dialog = page.getByRole('dialog', { name: 'Record project receipt' });
  await expect(dialog.getByText('Beneficiaries (2/2)')).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Mother Two' }).uncheck();
  await expect(dialog.getByText('Beneficiaries (1/2)')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save status' }).click();
  await expect(dialog).toBeHidden();

  expect(savedReceipts).toHaveLength(1);
  expect(savedReceipts[0]).toMatchObject({
    beneficiaryId: 1,
    beneficiaryType: 'mother',
    monitored: false,
  });
});
