const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveProgramReportTargets, shouldApplyProgramMonitoringData } = require('../routes/progressReport');

test('program reports only include monitoring data when a program is explicitly selected', () => {
  assert.equal(shouldApplyProgramMonitoringData({ programName: '' }), false);
  assert.equal(shouldApplyProgramMonitoringData({ programName: '   ' }), false);
  assert.equal(shouldApplyProgramMonitoringData({ programName: 'Nutrition Program' }), true);
});

test('mixed-type programs include both mother and child beneficiaries in program totals', () => {
  const targets = resolveProgramReportTargets({
    row: { motherId: 12, childId: 55 },
    granularity: 'child',
    programBeneficiaryType: 'Mother and Child',
  });

  assert.deepEqual(targets, [
    { type: 'mother', id: 12 },
    { type: 'child', id: 55 },
  ]);
});

test('single-type programs only use the configured beneficiary type', () => {
  const targets = resolveProgramReportTargets({
    row: { motherId: 12, childId: 55 },
    granularity: 'mother',
    programBeneficiaryType: 'Mother',
  });

  assert.deepEqual(targets, [{ type: 'mother', id: 12 }]);
});
