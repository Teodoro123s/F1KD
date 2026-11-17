const { expect, test } = require('@playwright/test');

const jsonResponse = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const user = {
  id: 34,
  role: 'Admin',
  has_accepted_terms: true,
  first_name: 'Browser',
  last_name: 'Tester',
};

async function openAssistant(page, routeProposal) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/refresh') {
      return jsonResponse(route, { token: 'browser-test-token', user });
    }
    if (url.pathname === '/api/help-guidance/preferences') {
      return jsonResponse(route, { preferences: {} });
    }
    if (url.pathname === '/api/progress-report/ai/status') {
      return jsonResponse(route, { configured: true, available: true, model: 'test-model' });
    }
    if (url.pathname === '/api/programs') {
      return jsonResponse(route, { programs: [] });
    }
    if (url.pathname === '/api/progress-report/ai/proposal') {
      return routeProposal(route);
    }
    if (url.pathname === '/api/progress-report') {
      return jsonResponse(route, {
        rows: [{ motherId: 1, name: 'Test Mother', measurementDate: '2026-11-18' }],
        pagination: { total: 1 },
        summary: {},
      });
    }
    return jsonResponse(route, {});
  });

  await page.goto('/settings');
  await page.getByRole('button', { name: 'AI Assistant' }).click();
  return page.getByRole('dialog', { name: 'AI Reporting Assistant' });
}

test('unsupported count of mothers with no check-up this month is explained clearly', async ({ page }) => {
  const query = 'number of mothers who have not have checkup this month';
  let receivedPrompt = '';
  const dialog = await openAssistant(page, async (route) => {
    receivedPrompt = route.request().postDataJSON().prompt;
    return jsonResponse(route, {
      error: 'The assistant cannot count or list beneficiaries with no saved check-up this month. It can report check-ups recorded during the month.',
    }, 422);
  });

  await dialog.getByRole('textbox', { name: 'Message the AI Reporting Assistant' }).fill(query);
  await dialog.getByRole('button', { name: 'Send request' }).click();

  await expect(dialog.getByText(/cannot count or list beneficiaries with no saved check-up this month/)).toBeVisible();
  expect(receivedPrompt).toBe(query);
  await expect(dialog.getByText(/invalid report proposal/i)).toHaveCount(0);
});

test('clarification replies retain the original question and cannot be sent as new requests', async ({ page }) => {
  const clarification = {
    question: 'Would you like an individual mother check-up report instead?',
    options: ['Yes, show the report', 'No, choose a different report'],
  };
  const proposalRequests = [];
  const dialog = await openAssistant(page, async (route) => {
    const body = route.request().postDataJSON();
    proposalRequests.push(body);
    return jsonResponse(route, proposalRequests.length === 1
      ? { needsClarification: true, ...clarification }
      : {
        reportCategory: 'monitor',
        beneficiaryType: 'mother',
        metricIds: ['measurementDate'],
        explanation: 'Shows saved check-up dates.',
      });
  });

  await dialog.getByRole('textbox', { name: 'Message the AI Reporting Assistant' }).fill('Show a mother check-up report.');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog.getByText(clarification.question)).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Message the AI Reporting Assistant' })).toBeDisabled();
  await expect(dialog.getByText('Yes, show the report')).toBeVisible();

  await dialog.getByRole('textbox', { name: 'Your clarification' }).fill('ok');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Shows saved check-up dates.')).toBeVisible();
  expect(proposalRequests).toHaveLength(2);
  expect(proposalRequests[1]).toMatchObject({
    prompt: 'Show a mother check-up report.',
    clarification: {
      ...clarification,
      answer: 'ok',
    },
  });
});
