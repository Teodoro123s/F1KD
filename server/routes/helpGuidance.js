const express = require('express');
const pool = require('../db');
const { verifyToken, normalizeRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

const DEFAULT_PREFERENCES = {
  guidedToursEnabled: true,
  onboardingEnabled: true,
  contextualTooltipsEnabled: true,
  pageExplanationsEnabled: true,
  workflowGuideEnabled: true,
  onboardingCompleted: true,
  onboardingDismissed: false,
  tourRole: null,
  tourStatus: 'not_started',
  tourStep: 0,
};

const BOOLEAN_COLUMNS = {
  guidedToursEnabled: 'guided_tours_enabled',
  onboardingEnabled: 'onboarding_enabled',
  contextualTooltipsEnabled: 'contextual_tooltips_enabled',
  pageExplanationsEnabled: 'page_explanations_enabled',
  workflowGuideEnabled: 'workflow_guide_enabled',
  onboardingCompleted: 'onboarding_completed',
  onboardingDismissed: 'onboarding_dismissed',
};

const TOUR_STATUSES = new Set(['not_started', 'in_progress', 'completed']);
const SELECT_PREFERENCES = `SELECT guided_tours_enabled, onboarding_enabled,
  contextual_tooltips_enabled, page_explanations_enabled, workflow_guide_enabled,
  onboarding_completed, onboarding_dismissed, tour_role, tour_status, tour_step
  FROM help_guidance_preferences WHERE user_id = ? LIMIT 1`;

function formatPreferences(row, role) {
  if (!row) return { ...DEFAULT_PREFERENCES };
  const sameRole = normalizeRole(row.tour_role) === normalizeRole(role);
  return {
    guidedToursEnabled: Boolean(row.guided_tours_enabled),
    onboardingEnabled: Boolean(row.onboarding_enabled),
    contextualTooltipsEnabled: Boolean(row.contextual_tooltips_enabled),
    pageExplanationsEnabled: Boolean(row.page_explanations_enabled),
    workflowGuideEnabled: Boolean(row.workflow_guide_enabled),
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingDismissed: Boolean(row.onboarding_dismissed),
    tourRole: sameRole ? normalizeRole(row.tour_role) : null,
    tourStatus: sameRole ? row.tour_status : 'not_started',
    tourStep: sameRole ? Number(row.tour_step) || 0 : 0,
  };
}

router.get('/preferences', async (req, res) => {
  try {
    const [rows] = await pool.query(SELECT_PREFERENCES, [req.user.id]);
    res.set('Cache-Control', 'no-store');
    res.json({ preferences: formatPreferences(rows[0], req.user.role) });
  } catch (error) {
    console.error('[Help Guidance API] GET /preferences error:', error.message);
    res.status(500).json({ error: 'Unable to load help and guidance preferences' });
  }
});

router.put('/preferences', async (req, res) => {
  const updates = req.body?.preferences;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Provide help and guidance preference updates' });
  }

  const entries = Object.entries(updates);
  if (entries.length === 0 || entries.some(([key]) => (
    !Object.hasOwn(BOOLEAN_COLUMNS, key) && !['tourStatus', 'tourStep'].includes(key)
  ))) {
    return res.status(400).json({ error: 'Help and guidance preferences contain an unsupported setting' });
  }
  for (const [key, value] of entries) {
    if (Object.hasOwn(BOOLEAN_COLUMNS, key) && typeof value !== 'boolean') {
      return res.status(400).json({ error: `${key} must be a boolean` });
    }
    if (key === 'tourStatus' && !TOUR_STATUSES.has(value)) {
      return res.status(400).json({ error: 'tourStatus is invalid' });
    }
    if (key === 'tourStep' && (!Number.isInteger(value) || value < 0 || value > 30)) {
      return res.status(400).json({ error: 'tourStep must be an integer between 0 and 30' });
    }
  }

  const columns = [];
  const params = [];
  for (const [key, value] of entries) {
    if (BOOLEAN_COLUMNS[key]) {
      columns.push(`${BOOLEAN_COLUMNS[key]} = VALUES(${BOOLEAN_COLUMNS[key]})`);
      params.push(value);
    } else if (key === 'tourStatus') {
      columns.push('tour_status = VALUES(tour_status)');
      params.push(value);
    } else if (key === 'tourStep') {
      columns.push('tour_step = VALUES(tour_step)');
      params.push(value);
    }
  }
  if (entries.some(([key]) => key === 'tourStatus' || key === 'tourStep')) {
    columns.push('tour_role = VALUES(tour_role)');
  }

  const insertColumns = entries.map(([key]) => {
    if (BOOLEAN_COLUMNS[key]) return BOOLEAN_COLUMNS[key];
    if (key === 'tourStatus') return 'tour_status';
    return 'tour_step';
  });
  const values = insertColumns.map(() => '?');
  if (entries.some(([key]) => key === 'tourStatus' || key === 'tourStep')) {
    insertColumns.push('tour_role');
    values.push('?');
    params.push(normalizeRole(req.user.role));
  }
  insertColumns.unshift('user_id');
  values.unshift('?');
  params.unshift(req.user.id);

  try {
    await pool.query(
      `INSERT INTO help_guidance_preferences (${insertColumns.join(', ')})
       VALUES (${values.join(', ')})
       ON DUPLICATE KEY UPDATE ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP`,
      params,
    );
    const [rows] = await pool.query(SELECT_PREFERENCES, [req.user.id]);
    res.set('Cache-Control', 'no-store');
    res.json({ preferences: formatPreferences(rows[0], req.user.role) });
  } catch (error) {
    console.error('[Help Guidance API] PUT /preferences error:', error.message);
    res.status(500).json({ error: 'Unable to save help and guidance preferences' });
  }
});

router.post('/preferences/reset', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO help_guidance_preferences
        (user_id, guided_tours_enabled, onboarding_enabled, contextual_tooltips_enabled,
         page_explanations_enabled, workflow_guide_enabled, onboarding_completed,
         onboarding_dismissed, tour_role, tour_status, tour_step)
       VALUES (?, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, ?, 'not_started', 0)
       ON DUPLICATE KEY UPDATE guided_tours_enabled = TRUE, onboarding_enabled = TRUE,
         contextual_tooltips_enabled = TRUE, page_explanations_enabled = TRUE,
         workflow_guide_enabled = TRUE, onboarding_completed = FALSE,
         onboarding_dismissed = FALSE, tour_role = VALUES(tour_role),
         tour_status = 'not_started', tour_step = 0, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, normalizeRole(req.user.role)],
    );
    const [rows] = await pool.query(SELECT_PREFERENCES, [req.user.id]);
    res.set('Cache-Control', 'no-store');
    res.json({ preferences: formatPreferences(rows[0], req.user.role) });
  } catch (error) {
    console.error('[Help Guidance API] POST /preferences/reset error:', error.message);
    res.status(500).json({ error: 'Unable to reset help and guidance preferences' });
  }
});

module.exports = router;
