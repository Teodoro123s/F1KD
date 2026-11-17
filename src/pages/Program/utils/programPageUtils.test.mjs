import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectDisplayCandidates,
  mapApiProgram,
  matchesSchoolGroupBatch,
  routeMatchesValue,
  valueMatchesTarget,
} from './programPageUtils.mjs';

test('maps API program fields into the page model', () => {
  assert.deepEqual(mapApiProgram({ id: '12', beneficiary_type: 'Child', target: '8' }), {
    id: 12,
    beneficiary_type: 'Child',
    beneficiaryType: 'Child',
    target: 8,
    received: 0,
    clusters: [],
    recipients: [],
    latest: 'No activity yet',
  });
});

test('normalizes and matches multiple route display candidates', () => {
  assert.deepEqual(collectDisplayCandidates('North-School / Group B', null), ['north', 'b']);
  assert.equal(valueMatchesTarget('North School', 'north'), true);
  assert.equal(valueMatchesTarget('North', ''), false);
  assert.equal(routeMatchesValue({ community_code: 'N-1' }, 'n-1'), true);
});

test('matches hierarchy records while preserving missing-field fallback behavior', () => {
  assert.equal(matchesSchoolGroupBatch({ school: 'North', group: 'A', batch: 'B' }, 'North', 'A', 'B'), true);
  assert.equal(matchesSchoolGroupBatch({ school: '', group: '', batch: '' }, 'North', '', ''), true);
  assert.equal(matchesSchoolGroupBatch({ school: 'South', group: 'A', batch: 'B' }, 'North', 'A', 'B'), false);
});
