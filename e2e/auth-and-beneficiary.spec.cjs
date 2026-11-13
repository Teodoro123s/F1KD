const { expect, test } = require('@playwright/test');

const jsonResponse = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test('login feedback warns on the last attempt and unlocks after countdown', async ({ page }) => {
  let failedAttempts = 0;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh') {
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === '/api/auth/login-status') {
      return jsonResponse(route, {
        maxAttempts: 5,
        remainingAttempts: Math.max(0, 5 - failedAttempts),
        retryAfterSeconds: 0,
      });
    }
    if (url.pathname === '/api/auth/login') {
      failedAttempts += 1;
      const remainingAttempts = Math.max(0, 5 - failedAttempts);
      return jsonResponse(route, {
        code: failedAttempts === 5 ? 'LOGIN_LOCKED' : 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
        maxAttempts: 5,
        remainingAttempts,
        ...(failedAttempts === 5 ? { retryAfterSeconds: 3 } : {}),
      }, failedAttempts === 5 ? 423 : 401);
    }
    return jsonResponse(route, {});
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill('browser-test@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('incorrect-password');

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.getByRole('button', { name: 'Sign in' }).click();
    if (attempt === 4) {
      await expect(page.locator('.login-attempts')).toHaveText(
        'Warning: Only 1 login attempt remaining before temporary lockout.',
      );
    } else {
      await expect(page.locator('.login-attempts')).toContainText(
        `You have ${5 - attempt} login attempts remaining.`,
      );
    }
  }

  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.login-lockout')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Please wait' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 6000 });
});

test('beneficiary list requests and renders only the selected server page', async ({ page }) => {
  const motherListRequests = [];
  const user = {
    id: 21,
    role: 'Community Coordinator',
    school_id: 1,
    has_accepted_terms: true,
    first_name: 'Browser',
    last_name: 'Test',
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
    if (url.pathname === '/api/community/reference-options') {
      return jsonResponse(route, { communities: [], groups: [], batches: [] });
    }
    if (url.pathname === '/api/mothers') {
      const pageNumber = Number(url.searchParams.get('page'));
      const perPage = Number(url.searchParams.get('perPage'));
      if (perPage === 1) {
        return jsonResponse(route, {
          mothers: [{ id: 1 }],
          pagination: { total: 11, totalPages: 11, page: 1, perPage: 1 },
        });
      }
      motherListRequests.push({ page: pageNumber, perPage });
      const start = (pageNumber - 1) * perPage + 1;
      const end = Math.min(start + perPage - 1, 11);
      const mothers = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => {
        const number = start + index;
        return {
          id: number,
          first_name: 'Mother',
          last_name: String(number),
          mother_code: `M-${number}`,
          community: 'Test School',
          checkups: [],
        };
      });
      return jsonResponse(route, {
        mothers,
        pagination: { total: 11, totalPages: 2, page: pageNumber, perPage },
      });
    }
    if (url.pathname === '/api/children') {
      return jsonResponse(route, {
        children: [],
        pagination: { total: 0, totalPages: 0, page: 1, perPage: 1 },
      });
    }
    return jsonResponse(route, {});
  });

  await page.goto('/beneficiary');
  await page.getByRole('button', { name: /Registered mothers/ }).click();
  await expect(page.getByText('Mother 1', { exact: true })).toBeVisible();
  await expect(page.locator('.app-pagination-summary')).toContainText('Showing 1 to 10 of 11');
  expect(motherListRequests).toContainEqual({ page: 1, perPage: 10 });
  expect(motherListRequests.some((request) => request.perPage === 100)).toBe(false);

  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page.getByText('Mother 11', { exact: true })).toBeVisible();
  await expect(page.locator('.app-pagination-summary')).toContainText('Showing 11 to 11 of 11');
  expect(motherListRequests).toContainEqual({ page: 2, perPage: 10 });
});
