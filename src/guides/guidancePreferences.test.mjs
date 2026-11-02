import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKUP_HELP, DEFAULT_GUIDANCE_PREFERENCES, normalizeGuidancePreferences } from './guidancePreferences.mjs';

test('guidance preferences have enabled defaults and normalize invalid tour state', () => {
  assert.equal(DEFAULT_GUIDANCE_PREFERENCES.guidedToursEnabled, true);
  assert.equal(DEFAULT_GUIDANCE_PREFERENCES.contextualTooltipsEnabled, true);
  assert.equal(DEFAULT_GUIDANCE_PREFERENCES.onboardingCompleted, true);
  assert.deepEqual(normalizeGuidancePreferences({ tourStatus: 'unknown', tourStep: -2 }), {
    ...DEFAULT_GUIDANCE_PREFERENCES,
    tourStatus: 'not_started',
    tourStep: 0,
  });
});

test('clinical screening guidance is marked essential when optional tooltips are disabled', () => {
  assert.equal(CHECKUP_HELP.maternal.bloodPressure.essential, true);
  assert.equal(CHECKUP_HELP.maternal.bmiStatus.essential, true);
  assert.equal(CHECKUP_HELP.child.weightForAge.essential, true);
  assert.equal(CHECKUP_HELP.child.weightForLength.essential, true);
  assert.equal(CHECKUP_HELP.child.feedingMethod.essential, undefined);
});
