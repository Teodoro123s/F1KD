import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPageControls, getPageGuide, getRoleEntries, getRoleFlow } from './flowContent.mjs';

test('role guidance covers every canonical app role without demo accounts', () => {
  assert.deepEqual(getRoleEntries().map(({ key }) => key).sort(), [
    'admin',
    'community_coordinator',
    'health_worker',
    'partner',
    'super_admin',
  ]);
  assert.equal(getRoleFlow('health_worker').daily.some(({ path }) => path === '/monitoring'), true);
});

test('page guidance resolves nested routes to their actual module', () => {
  assert.equal(getPageGuide('/beneficiary/mother/12/profile')[0], 'Beneficiary');
  assert.equal(getPageGuide('/program/4/batch/8')[0], 'Projects');
});

test('page control collection uses visible accessible labels and caps output', () => {
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const controls = Array.from({ length: 14 }, (_, index) => ({
    disabled: false,
    getAttribute: (attribute) => attribute === 'aria-label' ? `Action ${index}` : null,
    getBoundingClientRect: () => ({ width: 10, height: 10 }),
    innerText: '',
    textContent: '',
  }));
  const container = {
    querySelectorAll: () => controls,
  };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });

  assert.equal(getPageControls(container).length, 12);
  assert.deepEqual(getPageControls(null), []);
  if (previousGetComputedStyle) globalThis.getComputedStyle = previousGetComputedStyle;
  else delete globalThis.getComputedStyle;
});
