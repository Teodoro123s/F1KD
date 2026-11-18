const { expect, test } = require('@playwright/test');

const jsonResponse = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test('health worker row Edit opens group assignment form and saves the selected group', async ({ page }) => {
  const user = {
    id: 1,
    role: 'Super Admin',
    has_accepted_terms: true,
    first_name: 'Browser',
    last_name: 'Admin',
  };
  const summary = {
    communities: [{
      id: 11,
      name: 'Test School',
      area: 'North',
      code: 'COM-0011',
      coordinatorId: '',
      coordinatorName: '',
      batches: 0,
      records: 0,
    }],
    groups: [{
      id: 21,
      name: 'Test Group',
      communityId: 11,
      community: 'Test School',
      leader: '',
      members: 0,
      status: 'Active',
    }, {
      id: 22,
      name: 'Other School Group',
      communityId: 12,
      community: 'Other School',
      leader: '',
      members: 0,
      status: 'Active',
    }],
    batches: [],
    mothers: [],
    totalHealthWorkers: 1,
  };
  const worker = {
    id: 42,
    name: 'Taylor Worker',
    full_name: 'Taylor Worker',
    first_name: 'Taylor',
    last_name: 'Worker',
    middle_initial: '',
    role: 'Health worker',
    status: 'Active',
    email: 'worker@example.com',
    contact_number: '09171234567',
    gender: 'Female',
    dob: '1990-01-01',
    location: 'Poblacion',
    school_id: null,
    group_id: 21,
    group_name: 'Test Group',
  };
  let updatePayload;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh') {
      return jsonResponse(route, { token: 'browser-test-token', user });
    }
    if (url.pathname === '/api/community/summary') return jsonResponse(route, summary);
    if (url.pathname === '/api/users/coordinators') return jsonResponse(route, { users: [] });
    if (url.pathname === '/api/users/all-health-workers') {
      return jsonResponse(route, { total: 1, users: [worker] });
    }
    if (url.pathname === '/api/users/42' && request.method() === 'GET') {
      return jsonResponse(route, worker);
    }
    if (url.pathname === '/api/users/42' && request.method() === 'PUT') {
      updatePayload = request.postDataJSON();
      return jsonResponse(route, { ...worker, school_id: 11, group_id: 21 });
    }
    return jsonResponse(route, {});
  });

  await page.goto('/community');
  await page.getByRole('button', { name: /Total Health Workers/ }).click();
  const workerRow = page.getByRole('row', { name: /Taylor Worker/ });
  await expect(workerRow).toBeVisible();
  await workerRow.getByRole('button', { name: 'Actions menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'View User' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Edit User' })).toBeVisible();
  const schoolDropdown = dialog.getByRole('combobox', { name: 'Assigned School' });
  const groupDropdown = dialog.getByRole('combobox', { name: 'Assigned Group' });
  await expect(schoolDropdown).toHaveText(/Select assigned school/);
  await expect(groupDropdown).toBeDisabled();
  await expect(groupDropdown).toHaveText(/No assigned group options available/);
  await schoolDropdown.click();
  await page.getByRole('option', { name: 'Test School' }).click();
  await expect(groupDropdown).toBeEnabled();
  await groupDropdown.click();
  await expect(page.getByRole('option', { name: 'Other School Group' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Test Group' }).click();
  await dialog.getByRole('button', { name: 'Save Changes' }).click();

  await expect(dialog).toHaveCount(0);
  expect(updatePayload).toMatchObject({ schoolId: '11', groupId: '21' });
});
