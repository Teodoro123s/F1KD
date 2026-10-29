const express = require('express');
const {
  ProgressReportAIError,
  getEncryptionKey,
  getPublicConfiguration,
  getUserAiConfiguration,
  normalizeConfiguration,
  removeUserConfiguration,
  saveUserConfiguration,
  testProviderConnection,
  testSavedConfiguration,
  userConfigurationEnvironment,
} = require('../services/userAiConfiguration');
const { createDashboardInsight, createReportProposal } = require('../utils/progressReportAI');
const { containsPotentialPii, isDisallowedAIRequest } = require('../utils/aiRequestPolicy');

const router = express.Router();

function sendAiSettingsError(res, error, action) {
  const status = error instanceof ProgressReportAIError ? error.status : 500;
  if (status >= 500) console.error(`[AI Settings] ${action} failed: ${error.message}`);
  return res.status(status).json({
    error: error instanceof ProgressReportAIError
      ? error.message
      : 'Unable to complete the AI settings request.',
  });
}

router.get('/configuration', async (req, res) => {
  try {
    const configuration = await getPublicConfiguration(req.user.id);
    res.set('Cache-Control', 'no-store');
    try {
      getEncryptionKey();
      res.json({ ...configuration, secureStorageReady: true });
    } catch (error) {
      if (!(error instanceof ProgressReportAIError)) throw error;
      res.json({ ...configuration, secureStorageReady: false });
    }
  } catch (error) {
    sendAiSettingsError(res, error, 'configuration lookup');
  }
});

router.post('/test', async (req, res) => {
  try {
    getEncryptionKey();
    const useSaved = req.body?.useSaved === true;
    const result = useSaved
      ? await testSavedConfiguration(req.user.id)
      : await testProviderConnection(normalizeConfiguration({ apiKey: req.body?.apiKey }));
    res.set('Cache-Control', 'no-store');
    res.json({ connected: true, configuration: useSaved ? result : undefined });
  } catch (error) {
    sendAiSettingsError(res, error, 'connection test');
  }
});

router.put('/configuration', async (req, res) => {
  try {
    const configuration = await saveUserConfiguration(req.user.id, {
      apiKey: req.body?.apiKey,
    });
    res.set('Cache-Control', 'no-store');
    res.json({ ...configuration, secureStorageReady: true });
  } catch (error) {
    sendAiSettingsError(res, error, 'configuration save');
  }
});

router.delete('/configuration', async (req, res) => {
  try {
    await removeUserConfiguration(req.user.id);
    res.status(204).end();
  } catch (error) {
    sendAiSettingsError(res, error, 'configuration removal');
  }
});

router.post('/proposal', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (containsPotentialPii(prompt)) {
      return res.status(400).json({
        error: 'This request may contain a name, contact detail, or identifying number. Remove personal details and try again.',
      });
    }
    if (isDisallowedAIRequest(prompt)) {
      return res.status(400).json({
        error: 'I can only analyze authorized records and generate read-only reports. Use the appropriate management module to change records.',
      });
    }
    const configuration = await getUserAiConfiguration(req.user.id);
    if (!configuration) {
      return res.status(409).json({ error: 'Configure and test your AI provider before using the reporting assistant.' });
    }
    const proposal = await createReportProposal(
      prompt,
      { env: userConfigurationEnvironment(configuration) },
    );
    res.set('Cache-Control', 'no-store');
    return res.json(proposal);
  } catch (error) {
    return sendAiSettingsError(res, error, 'report proposal');
  }
});

router.post('/dashboard-insight', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (containsPotentialPii(question)) {
      return res.status(400).json({
        error: 'This question may contain a name, contact detail, or identifying number. Remove personal details and try again.',
      });
    }
    if (isDisallowedAIRequest(question)) {
      return res.status(400).json({
        error: 'Dashboard insights can only answer read-only questions about the displayed aggregate totals.',
      });
    }
    const configuration = await getUserAiConfiguration(req.user.id);
    if (!configuration) {
      return res.status(409).json({ error: 'Configure and test your AI provider before using dashboard insights.' });
    }
    const insight = await createDashboardInsight(
      req.body?.metrics,
      question,
      { env: userConfigurationEnvironment(configuration) },
    );
    res.set('Cache-Control', 'no-store');
    return res.json({ insight });
  } catch (error) {
    return sendAiSettingsError(res, error, 'dashboard insight');
  }
});

module.exports = router;
