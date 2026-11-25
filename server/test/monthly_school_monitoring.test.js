const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMonthlySchoolMonitoring } = require('../utils/monthlySchoolMonitoring');

const schools = [{ id: 4 }];
const mothers = [{
  id: 21,
  schoolId: 4,
  prenatalRegDate: '2026-04-10',
  gestationalAge: 0,
  trimester: '1st Trimester',
}];
const motherCheckups = [{
  motherId: 21,
  trimester: '1st Trimester',
  checkupNumber: 1,
  checkupDate: '2026-04-10',
  weight: 62,
  height: 160,
  bloodPressure: '120/80',
}];
const children = [{ id: 9, schoolId: 4, birthDate: '2026-03-10' }];
const childCheckups = [{
  childId: 9,
  monthNumber: 1,
  visitDate: '2026-04-10',
  weight: 4,
  height: 54,
  feedingMethod: 'Exclusive breastfeeding',
}];

test('monthly school metrics match maternal registration and child age schedules', () => {
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-30',
    schools,
    mothers,
    motherCheckups,
    children,
    childCheckups,
  }).get('4');

  assert.deepEqual(metrics.mothers, {
    beneficiaries: 1,
    beneficiariesDue: 1,
    unscheduledBeneficiaries: 0,
    expectedVisits: 1,
    completedVisits: 1,
    recordedVisits: 1,
    completeForms: 1,
  });
  assert.deepEqual(metrics.children, {
    beneficiaries: 1,
    beneficiariesDue: 1,
    unscheduledBeneficiaries: 0,
    expectedVisits: 1,
    completedVisits: 1,
    recordedVisits: 1,
    completeForms: 1,
  });
});

test('zero stored gestational age falls back to the recorded maternal trimester', () => {
  const detailsBySchool = new Map();
  buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-30',
    schools,
    mothers: [{
      id: 21,
      schoolId: 4,
      prenatalRegDate: '2026-04-10',
      gestationalAge: 0,
      trimester: '2nd Trimester',
    }],
    motherCheckups: [],
    children: [],
    childCheckups: [],
    detailsBySchool,
  });

  assert.equal(detailsBySchool.get('4').mothers[0].visit, '2nd Trimester — Check-up 1');
});

test('monthly metrics exclude future due visits and flag incomplete recorded forms', () => {
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-15',
    schools,
    mothers: [{ ...mothers[0], prenatalRegDate: '2026-04-22' }],
    motherCheckups,
    children,
    childCheckups: [{
      ...childCheckups[0],
      visitDate: '2026-04-20',
      feedingMethod: '',
    }],
  }).get('4');

  assert.equal(metrics.mothers.expectedVisits, 0);
  assert.equal(metrics.children.expectedVisits, 1);
  assert.equal(metrics.children.recordedVisits, 1);
  assert.equal(metrics.children.completedVisits, 0);
  assert.equal(metrics.children.completeForms, 0);
});

test('late maternal check-ups complete their original scheduled month', () => {
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-06',
    asOfDate: '2026-07-31',
    schools,
    mothers: [{
      id: 21,
      schoolId: 4,
      prenatalRegDate: '2026-05-10',
      gestationalAge: 0,
    }],
    motherCheckups: [
      {
        motherId: 21,
        trimester: '1st Trimester',
        checkupNumber: 1,
        checkupDate: '2026-05-10',
        nextCheckupDate: '2026-06-10',
      },
      {
        motherId: 21,
        trimester: '1st Trimester',
        checkupNumber: 2,
        checkupDate: '2026-07-10',
        weight: 62,
        height: 160,
        bloodPressure: '120/80',
      },
    ],
    children: [],
    childCheckups: [],
  }).get('4');

  assert.equal(metrics.mothers.expectedVisits, 1);
  assert.equal(metrics.mothers.completedVisits, 1);
  assert.equal(metrics.mothers.completeForms, 1);
});

test('child monitoring follows the required next check-up date', () => {
  const detailsBySchool = new Map();
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-05',
    asOfDate: '2026-05-31',
    schools,
    mothers: [],
    motherCheckups: [],
    children: [{ id: 9, schoolId: 4, name: 'Sample Child', birthDate: '2026-03-10' }],
    childCheckups: [{
      childId: 9,
      monthNumber: 1,
      visitDate: '2026-04-10',
      nextCheckupDate: '2026-05-20',
      weight: 4,
      height: 54,
      feedingMethod: 'Exclusive breastfeeding',
    }],
    detailsBySchool,
  }).get('4');

  assert.equal(metrics.children.expectedVisits, 1);
  assert.equal(detailsBySchool.get('4').children[0].dueDate, '2026-05-20');
});

test('maternal forms with missing required blood pressure are incomplete', () => {
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-30',
    schools,
    mothers,
    motherCheckups: [{ ...motherCheckups[0], bloodPressure: '' }],
    children: [],
    childCheckups: [],
  }).get('4');

  assert.equal(metrics.mothers.recordedVisits, 1);
  assert.equal(metrics.mothers.completedVisits, 1);
  assert.equal(metrics.mothers.completeForms, 0);
});

test('beneficiaries without schedule dates are reported as unscheduled', () => {
  const metrics = buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-30',
    schools,
    mothers: [{ id: 22, schoolId: 4 }],
    motherCheckups: [],
    children: [{ id: 10, schoolId: 4 }],
    childCheckups: [],
  }).get('4');

  assert.equal(metrics.mothers.unscheduledBeneficiaries, 1);
  assert.equal(metrics.children.unscheduledBeneficiaries, 1);
  assert.equal(metrics.mothers.expectedVisits, 0);
  assert.equal(metrics.children.expectedVisits, 0);
});

test('school monitoring details identify incomplete and unentered due visits', () => {
  const detailsBySchool = new Map();
  buildMonthlySchoolMonitoring({
    month: '2026-04',
    asOfDate: '2026-04-30',
    schools,
    mothers: [
      { ...mothers[0], name: 'Sample Mother' },
      {
        id: 22,
        schoolId: 4,
        name: 'No Form Mother',
        prenatalRegDate: '2026-04-10',
        gestationalAge: 0,
      },
    ],
    motherCheckups: [{ ...motherCheckups[0], bloodPressure: '' }],
    children: [
      { ...children[0], name: 'Sample Child' },
      { id: 10, schoolId: 4, name: 'No Form Child', birthDate: '2026-03-10' },
    ],
    childCheckups: [{ ...childCheckups[0], feedingMethod: '' }],
    detailsBySchool,
  });

  const details = detailsBySchool.get('4');
  assert.equal(details.mothers[0].beneficiaryName, 'Sample Mother');
  assert.equal(details.mothers[0].status, 'incomplete');
  assert.equal(Object.prototype.hasOwnProperty.call(details.mothers[0], 'missingFields'), false);
  assert.equal(details.children[0].beneficiaryName, 'Sample Child');
  assert.equal(details.children[0].status, 'incomplete');
  const motherWithoutForm = details.mothers.find((visit) => visit.beneficiaryId === 22);
  assert.equal(motherWithoutForm.status, 'not-entered');
  const childWithoutForm = details.children.find((visit) => visit.beneficiaryId === 10);
  assert.equal(childWithoutForm.status, 'not-entered');
});
