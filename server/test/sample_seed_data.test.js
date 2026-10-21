const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSeedPlan } = require('../scripts/seed_sample_data');
const {
  getMotherInitialCheckupSlot,
  getMotherRegistrationGestationalAge,
} = require('../utils/motherMonitoring');

test('maternal registration measurements map to the next scheduled checkup', () => {
  const lmpDate = '2026-01-01';
  const registrationWeeks = [10, 12, 20];
  const expectedSlots = [
    { trimester: '1st Trimester', number: 2, week: 10 },
    { trimester: '1st Trimester', number: 3, week: 12 },
    { trimester: '2nd Trimester', number: 2, week: 20 },
  ];

  registrationWeeks.forEach((weeks, index) => {
    const prenatalRegDate = new Date(Date.UTC(2026, 0, 1 + weeks * 7)).toISOString().slice(0, 10);
    const gestationalAge = getMotherRegistrationGestationalAge({
      lmpDate,
      prenatalRegDate,
      gestationalAge: '8',
      trimester: '1st Trimester',
    });
    assert.equal(gestationalAge, weeks);
    assert.deepEqual(getMotherInitialCheckupSlot(gestationalAge), expectedSlots[index]);
  });
});

test('sample seed plan creates two separately staffed schools with substantial demo data', () => {
  const plan = buildSeedPlan();

  assert.equal(plan.schools.length, 2);
  assert.equal(plan.groups.length, 4);
  assert.equal(plan.batches.length, 8);
  assert.equal(plan.mothers.length, 80);
  assert.equal(plan.children.length, 80);
  assert.equal(plan.completedChildCodes.length, 56);
  assert.equal(plan.completedMotherCodes.length, 56);
  assert.equal(plan.programs.length, 4);
  assert.equal(plan.maternalCheckups.length, 533);
  assert.equal(plan.childCheckups.length, 1920);
  assert.equal(plan.users.length, 8);
  assert.deepEqual(
    plan.users.map((user) => user.role).sort(),
    ['Admin', 'Community Organizer', 'Community Organizer', 'Health Worker', 'Health Worker', 'Health Worker', 'Health Worker', 'Partner'].sort(),
  );
  for (const school of plan.schools) {
    const schoolGroups = plan.groups.filter((group) => group.schoolCode === school.code);
    const schoolBatches = plan.batches.filter((batch) => batch.schoolCode === school.code);
    assert.equal(schoolGroups.length, 2);
    assert.equal(schoolBatches.length, 4);
    assert.equal(plan.users.filter((user) => user.role === 'Community Organizer' && user.schoolCode === school.code).length, 1);
    assert.equal(plan.mothers.filter((mother) => mother.schoolCode === school.code).length, 40);
    assert.equal(plan.children.filter((child) => child.schoolCode === school.code).length, 40);
    assert.equal(plan.users.filter((user) => user.role === 'Health Worker' && user.schoolCode === school.code).length, 2);
    assert.equal(plan.programs.filter((program) => program.schoolCode === school.code).length, 2);
    assert.deepEqual(
      plan.programs.filter((program) => program.schoolCode === school.code).map((program) => program.beneficiaryType).sort(),
      ['Child', 'Mother'],
    );
  }
  assert.deepEqual(
    plan.users.filter((user) => user.role === 'Health Worker').map((user) => user.groupCode).sort(),
    plan.groups.map((group) => group.code).sort(),
  );

  for (const batch of plan.batches) {
    assert.equal(plan.mothers.filter((mother) => mother.batchCode === batch.code).length, 10);
    assert.equal(plan.children.filter((child) => child.batchCode === batch.code).length, 10);
    assert.equal(
      plan.maternalCheckups.filter((checkup) => (
        plan.mothers.find((mother) => mother.code === checkup.motherCode)?.batchCode === batch.code
      )).length,
      plan.mothers
        .filter((mother) => mother.batchCode === batch.code)
        .reduce((total, mother) => total + mother.expectedCheckups, 0),
    );
    assert.equal(
      plan.childCheckups.filter((checkup) => (
        plan.children.find((child) => child.code === checkup.childCode)?.batchCode === batch.code
      )).length,
      240,
    );
    assert.equal(
      plan.completedChildCodes.filter((code) => (
        plan.children.find((child) => child.code === code)?.batchCode === batch.code
      )).length,
      7,
    );
  }

  for (const group of plan.groups) {
    assert.equal(plan.batches.filter((batch) => batch.groupCode === group.code).length, 2);
  }

  for (const mother of plan.mothers) {
    const checkups = plan.maternalCheckups.filter((checkup) => checkup.motherCode === mother.code);
    assert.equal(checkups.length, mother.expectedCheckups);
    assert.equal(checkups[0].trimester, mother.startingTrimester);
    assert.equal(checkups[0].gestationalAge, mother.startingGestationalWeek);
  }

  assert.equal(plan.mothers.filter((mother) => mother.startingTrimester === '1st Trimester').length, 53);
  assert.equal(plan.mothers.filter((mother) => mother.startingTrimester === '2nd Trimester').length, 27);
  assert.equal(plan.mothers.filter((mother) => mother.startingGestationalWeek === 10).length, 27);
  assert.equal(plan.mothers.filter((mother) => mother.startingGestationalWeek === 12).length, 26);
  assert.equal(plan.mothers.filter((mother) => mother.startingGestationalWeek === 20).length, 27);

  for (const child of plan.children) {
    const monthlyCheckups = plan.childCheckups.filter((checkup) => checkup.childCode === child.code);
    assert.equal(monthlyCheckups.length, 24);
    assert.equal(monthlyCheckups[0].month, 1);
    assert.equal(monthlyCheckups.at(-1).month, 24);
    assert.deepEqual(monthlyCheckups.map((checkup) => checkup.month), Array.from({ length: 24 }, (_, index) => index + 1));
  }
});
