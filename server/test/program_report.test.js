const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveProgramReportTargets, shouldApplyProgramMonitoringData } = require('../routes/progressReport');

test('program reports only include monitoring data when a program is explicitly selected', () => {
  assert.equal(shouldApplyProgramMonitoringData({ programName: '' }), false);
  assert.equal(shouldApplyProgramMonitoringData({ programName: '   ' }), false);
  assert.equal(shouldApplyProgramMonitoringData({ programName: 'Nutrition Program' }), true);
});

test('mixed-type program reports use the selected beneficiary type without duplicating maternal receipts', () => {
  const childTargets = resolveProgramReportTargets({
    row: { motherId: 12, childId: 55 },
    granularity: 'child',
    programBeneficiaryType: 'Mother and Child',
  });

  assert.deepEqual(childTargets, [{ type: 'child', id: 55 }]);
  assert.deepEqual(resolveProgramReportTargets({
    row: { motherId: 12, childId: 55 },
    granularity: 'mother',
    programBeneficiaryType: 'Mother and Child',
  }), [{ type: 'mother', id: 12 }]);
});

test('single-type programs only use the configured beneficiary type', () => {
  const targets = resolveProgramReportTargets({
    row: { motherId: 12, childId: 55 },
    granularity: 'mother',
    programBeneficiaryType: 'Mother',
  });

  assert.deepEqual(targets, [{ type: 'mother', id: 12 }]);
});
