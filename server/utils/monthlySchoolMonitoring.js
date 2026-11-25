const { getBloodPressureError } = require('./bloodPressure');

const MATERNAL_CHECKUP_STEPS = [
  { trimester: '1st Trimester', number: 1, week: 8 },
  { trimester: '1st Trimester', number: 2, week: 10 },
  { trimester: '1st Trimester', number: 3, week: 12 },
  { trimester: '2nd Trimester', number: 1, week: 16 },
  { trimester: '2nd Trimester', number: 2, week: 20 },
  { trimester: '2nd Trimester', number: 3, week: 24 },
  { trimester: '3rd Trimester', number: 1, week: 28 },
  { trimester: '3rd Trimester', number: 2, week: 32 },
  { trimester: '3rd Trimester', number: 3, week: 36 },
];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (value instanceof Date && Number.isNaN(value.getTime())) return null;
  const dateText = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText
    ? null
    : date;
}

function addMonthsPreservingDay(date, months, anchorDay = date.getUTCDate()) {
  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth(),
    Math.min(anchorDay, lastDay),
  ));
}

function getRegistrationWeeks(mother) {
  const lmpDate = parseDate(mother.lmpDate);
  const registrationDate = parseDate(mother.prenatalRegDate);
  if (lmpDate && registrationDate && registrationDate >= lmpDate) {
    return Math.floor((registrationDate - lmpDate) / (7 * DAY_MS));
  }
  const gestationalAge = Number.parseInt(mother.gestationalAge, 10);
  return Number.isFinite(gestationalAge) && gestationalAge > 0 ? gestationalAge : null;
}

function getMotherStartIndex(mother) {
  const registrationWeeks = getRegistrationWeeks(mother);
  if (registrationWeeks === null) {
    const trimester = String(mother.trimester || '').toLowerCase();
    if (trimester.includes('3rd') || trimester.includes('third')) return 6;
    if (trimester.includes('2nd') || trimester.includes('second')) return 3;
    return 0;
  }
  const index = MATERNAL_CHECKUP_STEPS.findIndex((step) => step.week >= registrationWeeks);
  return index < 0 ? MATERNAL_CHECKUP_STEPS.length - 1 : index;
}

function getMotherDueDates(mother, checkups) {
  const startIndex = getMotherStartIndex(mother);
  const dueDates = new Map();
  let previousDueDate = null;

  for (let index = startIndex; index < MATERNAL_CHECKUP_STEPS.length; index += 1) {
    const step = MATERNAL_CHECKUP_STEPS[index];
    const previousStep = MATERNAL_CHECKUP_STEPS[index - 1];
    const previousCheckup = previousStep
      ? checkups.get(`${previousStep.trimester.toLowerCase()}:${previousStep.number}`)
      : null;
    const currentCheckup = checkups.get(`${step.trimester.toLowerCase()}:${step.number}`);
    const previousCheckupDate = parseDate(previousCheckup?.checkupDate);
    const dueDate = parseDate(previousCheckup?.nextCheckupDate)
      || (previousCheckupDate && addMonthsPreservingDay(previousCheckupDate, 1))
      || (index === startIndex && parseDate(mother.prenatalRegDate))
      || (index === startIndex && parseDate(currentCheckup?.checkupDate))
      || (previousDueDate && addMonthsPreservingDay(previousDueDate, 1))
      || parseDate(currentCheckup?.checkupDate);

    dueDates.set(`${step.trimester.toLowerCase()}:${step.number}`, dueDate || null);
    if (dueDate) previousDueDate = dueDate;
  }
  return dueDates;
}

function getMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function createMonitoringCounter() {
  return {
    beneficiaries: 0,
    beneficiariesDue: 0,
    unscheduledBeneficiaries: 0,
    expectedVisits: 0,
    completedVisits: 0,
    recordedVisits: 0,
    completeForms: 0,
  };
}

function hasPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function isMaternalFormComplete(checkup) {
  return Boolean(
    parseDate(checkup.checkupDate)
      && hasPositiveNumber(checkup.weight)
      && hasPositiveNumber(checkup.height)
      && !getBloodPressureError(checkup.bloodPressure),
  );
}

function isChildFormComplete(checkup) {
  return Boolean(
    parseDate(checkup.visitDate)
      && hasPositiveNumber(checkup.weight)
      && hasPositiveNumber(checkup.height)
      && String(checkup.feedingMethod ?? '').trim(),
  );
}

function createDueVisitDetail(beneficiary, checkup, dueDate, visit, isFormComplete, getVisitDate, asOfDate) {
  const visitDate = parseDate(checkup ? getVisitDate(checkup) : null);
  return {
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name || 'Unnamed beneficiary',
    visit,
    dueDate: dueDate.toISOString().slice(0, 10),
    status: !checkup
      ? 'not-entered'
      : visitDate && visitDate <= asOfDate && isFormComplete(checkup)
        ? 'complete'
        : 'incomplete',
  };
}

function recordVisit(counter, checkup, asOfDate, isFormComplete) {
  if (!checkup) return;
  counter.recordedVisits += 1;
  const visitDate = parseDate(checkup.checkupDate ?? checkup.visitDate);
  if (!visitDate || visitDate > asOfDate) return;

  counter.completedVisits += 1;
  if (isFormComplete(checkup)) counter.completeForms += 1;
}

function buildMonthlySchoolMonitoring({
  month,
  asOfDate,
  schools,
  mothers,
  motherCheckups,
  children,
  childCheckups,
  detailsBySchool,
}) {
  const parsedAsOfDate = parseDate(asOfDate);
  if (!parsedAsOfDate) throw new Error('A valid as-of date is required for monthly school monitoring.');

  const metrics = new Map(schools.map((school) => [String(school.id), {
    mothers: createMonitoringCounter(),
    children: createMonitoringCounter(),
  }]));
  if (detailsBySchool) {
    detailsBySchool.clear();
    for (const school of schools) {
      detailsBySchool.set(String(school.id), {
        mothers: [],
        mothersUnscheduled: [],
        children: [],
        childrenUnscheduled: [],
      });
    }
  }
  const checkupsByMother = new Map();
  for (const checkup of motherCheckups) {
    const key = String(checkup.motherId);
    if (!checkupsByMother.has(key)) checkupsByMother.set(key, new Map());
    checkupsByMother.get(key).set(
      `${String(checkup.trimester || '').trim().toLowerCase()}:${Number(checkup.checkupNumber)}`,
      checkup,
    );
  }

  for (const mother of mothers) {
    const counter = metrics.get(String(mother.schoolId))?.mothers;
    if (!counter) continue;
    counter.beneficiaries += 1;
    const checkups = checkupsByMother.get(String(mother.id)) || new Map();
    const dueDates = getMotherDueDates(mother, checkups);
    const hasSchedulableVisit = [...dueDates.values()].some(Boolean);
    let hasVisitDue = false;
    const schoolDetails = detailsBySchool?.get(String(mother.schoolId));

    for (let index = 0; index < MATERNAL_CHECKUP_STEPS.length; index += 1) {
      const step = MATERNAL_CHECKUP_STEPS[index];
      const dueDate = dueDates.get(`${step.trimester.toLowerCase()}:${step.number}`);
      if (!dueDate) continue;
      if (getMonthKey(dueDate) !== month || dueDate > parsedAsOfDate) continue;

      hasVisitDue = true;
      counter.expectedVisits += 1;
      const checkup = checkups.get(`${step.trimester.toLowerCase()}:${step.number}`);
      if (schoolDetails) {
        schoolDetails.mothers.push(createDueVisitDetail(
          mother,
          checkup,
          dueDate,
          `${step.trimester} — Check-up ${step.number}`,
          isMaternalFormComplete,
          (item) => item.checkupDate,
          parsedAsOfDate,
        ));
      }
      recordVisit(counter, checkup, parsedAsOfDate, isMaternalFormComplete);
    }

    if (!hasSchedulableVisit) {
      counter.unscheduledBeneficiaries += 1;
      schoolDetails?.mothersUnscheduled.push({
        id: mother.id,
        name: mother.name || 'Unnamed mother',
      });
    }
    if (hasVisitDue) counter.beneficiariesDue += 1;
  }

  const checkupsByChild = new Map();
  for (const checkup of childCheckups) {
    const key = String(checkup.childId);
    if (!checkupsByChild.has(key)) checkupsByChild.set(key, new Map());
    checkupsByChild.get(key).set(Number(checkup.monthNumber), checkup);
  }
  for (const child of children) {
    const counter = metrics.get(String(child.schoolId))?.children;
    if (!counter) continue;
    counter.beneficiaries += 1;
    const birthDate = parseDate(child.birthDate);
    const checkups = checkupsByChild.get(String(child.id)) || new Map();
    const schoolDetails = detailsBySchool?.get(String(child.schoolId));
    const firstRecordedCheckup = [...checkups.entries()]
      .map(([monthNumber, checkup]) => ({
        monthNumber,
        date: parseDate(checkup.visitDate),
      }))
      .filter((checkup) => checkup.date)
      .sort((left, right) => left.monthNumber - right.monthNumber)[0];
    if (!birthDate && !firstRecordedCheckup) {
      counter.unscheduledBeneficiaries += 1;
      schoolDetails?.childrenUnscheduled.push({
        id: child.id,
        name: child.name || 'Unnamed child',
      });
      continue;
    }
    const scheduleAnchorDate = birthDate || firstRecordedCheckup.date;
    const scheduleAnchorMonth = birthDate ? 0 : firstRecordedCheckup.monthNumber;
    const scheduleAnchorDay = scheduleAnchorDate.getUTCDate();
    let hasVisitDue = false;

    for (let monthNumber = 1; monthNumber <= 24; monthNumber += 1) {
      const previousCheckup = checkups.get(monthNumber - 1);
      const previousNextCheckupDate = parseDate(previousCheckup?.nextCheckupDate);
      const previousVisitDate = parseDate(previousCheckup?.visitDate);
      const dueDate = previousNextCheckupDate
        || (previousVisitDate
          ? addMonthsPreservingDay(previousVisitDate, 1)
          : addMonthsPreservingDay(
            scheduleAnchorDate,
            monthNumber - scheduleAnchorMonth,
            scheduleAnchorDay,
          ));
      if (getMonthKey(dueDate) !== month || dueDate > parsedAsOfDate) continue;

      hasVisitDue = true;
      counter.expectedVisits += 1;
      const checkup = checkups.get(monthNumber);
      if (schoolDetails) {
        schoolDetails.children.push(createDueVisitDetail(
          child,
          checkup,
          dueDate,
          `Month ${monthNumber}`,
          isChildFormComplete,
          (item) => item.visitDate,
          parsedAsOfDate,
        ));
      }
      recordVisit(counter, checkup, parsedAsOfDate, isChildFormComplete);
    }
    if (hasVisitDue) counter.beneficiariesDue += 1;
  }

  return metrics;
}

module.exports = {
  buildMonthlySchoolMonitoring,
};
