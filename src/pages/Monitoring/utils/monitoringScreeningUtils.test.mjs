import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMonthlyDevelopmentalStatus,
  getMonitoringScreeningRoute,
  getMonitoringScreeningRouteFilters,
  normalizeDevelopmentalStatus,
} from './monitoringScreeningUtils.mjs';

test('normalizes screening status values and uses the latest recorded result', () => {
  assert.equal(normalizeDevelopmentalStatus('Needs_Follow-up'), 'needs follow up');
  assert.equal(getMonthlyDevelopmentalStatus({
    checkups: [[{ developmentalStatus: 'At Risk' }, { developmentalStatus: '' }]],
  }), 'at risk');
  assert.equal(getMonthlyDevelopmentalStatus({
    checkups: [{ developmentalStatus: 'At Risk' }, { developmental_status: 'Needs Follow-up' }],
  }), 'needs follow up');
  assert.equal(getMonthlyDevelopmentalStatus({ checkups: [] }), '');
});

test('creates and parses Monitor routes with an active screening filter', () => {
  const route = getMonitoringScreeningRoute('Child', 'Needs Follow-up');
  assert.equal(route, '/monitoring?beneficiaryType=Child&screening=Needs%20Follow-up');
  assert.deepEqual(getMonitoringScreeningRouteFilters(route.split('?')[1]), {
    beneficiaryType: 'Child',
    screeningStatus: 'Needs Follow-up',
  });
  assert.equal(getMonitoringScreeningRouteFilters('?beneficiaryType=Mother&screening=Normal'), null);
});
