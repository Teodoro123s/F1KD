const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'help-guidance-preferences-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const preferenceRows = new Map();
const userRoles = new Map([[10, 'Super Admin'], [20, 'Health Worker']]);
const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};

mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const helpGuidanceRouter = require('../routes/helpGuidance');

function defaultRow(userId, role = null) {
  return {
    user_id: userId,
    guided_tours_enabled: 1,
    onboarding_enabled: 1,
    contextual_tooltips_enabled: 1,
    page_explanations_enabled: 1,
    workflow_guide_enabled: 1,
    onboarding_completed: 1,
    onboarding_dismissed: 0,
    tour_role: role,
    tour_status: 'not_started',
    tour_step: 0,
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/help-guidance', helpGuidanceRouter);
  return app.listen(0);
}

function requestFor(server, userId, path, options = {}) {
  const token = jwt.sign({ id: userId, sid: `session-${userId}` }, process.env.JWT_SECRET);
  return fetch(`http://127.0.0.1:${server.address().port}/api/help-guidance${path}`, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
}

test('guidance preferences are private to the authenticated user and validate updates', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  preferenceRows.clear();
  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      const userId = Number(params[1]);
      return [[{
        user_id: userId,
        email: `user-${userId}@example.test`,
        role: userRoles.get(userId),
        status: 'Active',
        consent_accepted_at: new Date(),
      }]];
    }
    if (sql.includes('FROM help_guidance_preferences WHERE user_id = ?')) {
      const row = preferenceRows.get(Number(params[0]));
      return [row ? [row] : []];
    }
    if (sql.startsWith('INSERT INTO help_guidance_preferences')) {
      const userId = Number(params[0]);
      if (sql.includes('VALUES (?, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE')) {
        preferenceRows.set(userId, {
          ...defaultRow(userId, params[1]),
          onboarding_completed: 0,
          onboarding_dismissed: 0,
        });
        return [{ affectedRows: 1 }];
      }
      const columns = sql.match(/help_guidance_preferences \(([^)]+)\)/)[1]
        .split(',')
        .map((column) => column.trim());
      const row = { ...(preferenceRows.get(userId) || defaultRow(userId, null)) };
      columns.forEach((column, index) => {
        const key = column === 'user_id'
          ? 'user_id'
          : column === 'guided_tours_enabled'
            ? 'guided_tours_enabled'
            : column === 'onboarding_enabled'
              ? 'onboarding_enabled'
              : column === 'contextual_tooltips_enabled'
                ? 'contextual_tooltips_enabled'
                : column === 'page_explanations_enabled'
                  ? 'page_explanations_enabled'
                  : column === 'workflow_guide_enabled'
                    ? 'workflow_guide_enabled'
                    : column === 'onboarding_completed'
                      ? 'onboarding_completed'
                      : column === 'onboarding_dismissed'
                        ? 'onboarding_dismissed'
                        : column === 'tour_status'
                          ? 'tour_status'
                          : column === 'tour_step'
                            ? 'tour_step'
                            : 'tour_role';
        const value = params[index];
        row[key] = typeof value === 'boolean' ? Number(value) : value;
      });
      preferenceRows.set(userId, row);
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected help guidance preferences SQL: ${sql}`);
  };

  const server = createApp();
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const initial = await requestFor(server, 10, '/preferences');
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).preferences.onboardingCompleted, true);

  const update = await requestFor(server, 10, '/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      preferences: {
        contextualTooltipsEnabled: false,
        onboardingCompleted: true,
        tourStatus: 'in_progress',
        tourStep: 2,
      },
    }),
  });
  assert.equal(update.status, 200);
  const saved = (await update.json()).preferences;
  assert.equal(saved.contextualTooltipsEnabled, false);
  assert.equal(saved.tourStatus, 'in_progress');
  assert.equal(saved.tourStep, 2);

  const otherUser = await requestFor(server, 20, '/preferences');
  assert.equal((await otherUser.json()).preferences.contextualTooltipsEnabled, true);

  const unsupportedOwner = await requestFor(server, 10, '/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences: { userId: 20, contextualTooltipsEnabled: true } }),
  });
  assert.equal(unsupportedOwner.status, 400);

  const invalidValue = await requestFor(server, 10, '/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences: { contextualTooltipsEnabled: 'false' } }),
  });
  assert.equal(invalidValue.status, 400);

  userRoles.set(10, 'Admin');
  const changedRole = await requestFor(server, 10, '/preferences');
  const rolePreferences = (await changedRole.json()).preferences;
  assert.equal(rolePreferences.tourStatus, 'not_started');
  assert.equal(rolePreferences.tourStep, 0);

  const reset = await requestFor(server, 10, '/preferences/reset', { method: 'POST' });
  assert.equal(reset.status, 200);
  const resetPreferences = (await reset.json()).preferences;
  assert.equal(resetPreferences.contextualTooltipsEnabled, true);
  assert.equal(resetPreferences.onboardingCompleted, false);
  assert.equal(resetPreferences.tourStatus, 'not_started');
});
