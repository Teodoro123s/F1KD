import assert from 'node:assert/strict';
import test from 'node:test';
import { createStepNavigationRunner } from './stepNavigation.mjs';

test('locks out duplicate navigation until the active transition completes', async () => {
  let finishPaint;
  let transitionCount = 0;
  let startedDirection = '';
  let finished = false;
  const runStepNavigation = createStepNavigationRunner({
    onStart: (direction) => { startedDirection = direction; },
    onFinish: () => { finished = true; },
    beforeAction: () => new Promise((resolve) => { finishPaint = resolve; }),
  });

  const first = runStepNavigation(() => { transitionCount += 1; }, 'previous');
  assert.equal(await runStepNavigation(() => { transitionCount += 1; }), false);
  assert.equal(startedDirection, 'previous');
  finishPaint();

  assert.equal(await first, true);
  assert.equal(transitionCount, 1);
  assert.equal(finished, true);
});

test('does not report a validation-rejected transition as successful', async () => {
  const runStepNavigation = createStepNavigationRunner({ beforeAction: async () => {} });
  assert.equal(await runStepNavigation(() => false), false);
});

test('keeps the navigation lock visible for a short synchronous transition', async () => {
  let transitionCount = 0;
  const runStepNavigation = createStepNavigationRunner({ beforeAction: async () => {} });
  const startedAt = Date.now();
  const transition = runStepNavigation(() => { transitionCount += 1; });

  assert.equal(await runStepNavigation(() => { transitionCount += 1; }), false);
  assert.equal(await transition, true);
  assert.ok(Date.now() - startedAt >= 280);
  assert.equal(transitionCount, 1);
});

test('reports errors and releases the navigation lock for a retry', async () => {
  const errors = [];
  let attempts = 0;
  const runStepNavigation = createStepNavigationRunner({
    onError: (error) => errors.push(error.message),
    beforeAction: async () => {},
  });

  assert.equal(await runStepNavigation(() => { throw new Error('Step failed'); }), false);
  assert.equal(await runStepNavigation(() => { attempts += 1; }), true);
  assert.deepEqual(errors, ['Step failed']);
  assert.equal(attempts, 1);
});
