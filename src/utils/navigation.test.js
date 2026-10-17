import test from 'node:test';
import assert from 'node:assert/strict';
import { navigateBack } from './navigation.js';

const withHistoryIndex = (index, callback) => {
  const previousWindow = globalThis.window;
  globalThis.window = { history: { state: { idx: index } } };
  try {
    callback();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
};

test('returns to an explicit in-app route before using browser history', () => {
  withHistoryIndex(4, () => {
    const calls = [];
    navigateBack((...args) => calls.push(args), {
      pathname: '/monitoring',
      search: '',
      state: { returnTo: '/beneficiary/mother/123', returnToState: { mother: { id: '123' } } },
    }, '/beneficiary', { updatedMother: { id: '123' } });

    assert.deepEqual(calls, [[
      '/beneficiary/mother/123',
      { replace: true, state: { updatedMother: { id: '123' } } },
    ]]);
  });
});

test('uses browser history when there is no explicit return route', () => {
  withHistoryIndex(2, () => {
    const calls = [];
    navigateBack((...args) => calls.push(args), { pathname: '/detail', state: null }, '/list');
    assert.deepEqual(calls, [[-1, undefined]]);
  });
});

test('uses a safe fallback when there is no in-app history entry', () => {
  withHistoryIndex(0, () => {
    const calls = [];
    navigateBack((...args) => calls.push(args), { pathname: '/detail', state: null }, '/list');
    assert.deepEqual(calls, [['/list', { replace: true }]]);
  });
});

test('does not navigate to an external or same-page return target', () => {
  withHistoryIndex(0, () => {
    const calls = [];
    navigateBack((...args) => calls.push(args), {
      pathname: '/detail',
      state: { returnTo: '//example.com' },
    }, '/list');
    navigateBack((...args) => calls.push(args), {
      pathname: '/detail',
      state: { returnTo: '/detail' },
    }, '/list');
    assert.deepEqual(calls, [
      ['/list', { replace: true }],
      ['/list', { replace: true }],
    ]);
  });
});
